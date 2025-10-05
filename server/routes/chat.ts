import { randomUUID } from "crypto";
import express, { type Request, type Response } from "express";
import OpenAI from "openai";
import Redis from "ioredis";

const router = express.Router();

const redis = new Redis({
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? "6379"),
  lazyConnect: true,
  enableReadyCheck: false,
});

const ensureRedisConnection = async () => {
  if (redis.status === "connecting" || redis.status === "connect") {
    return;
  }
  try {
    await redis.connect();
  } catch (err) {
    console.warn("Redis connect failed for chat route", err);
  }
};

void ensureRedisConnection();

const conversationKey = (conversationId: string) =>
  `chat:conversation:${conversationId}`;
const sessionKey = (sessionId: string) => `chat:session:${sessionId}`;

const CONVERSATION_TTL_SECONDS = 60 * 60; // 1 hour
const SESSION_TTL_SECONDS = 60 * 5; // 5 minutes

const resolveOpenAIKey = () =>
  process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_KEY ?? "";

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

console.log({ openAiKey: resolveOpenAIKey() });
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SessionPayload = {
  conversationId: string;
  history: ChatMessage[];
  userMessage: ChatMessage;
};

const parseConversation = (raw: string | null): ChatMessage[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { messages?: ChatMessage[] };
    return parsed?.messages ?? [];
  } catch (err) {
    console.warn("Failed to parse cached conversation", err);
    return [];
  }
};

const saveConversation = async (
  conversationId: string,
  messages: ChatMessage[]
): Promise<void> => {
  try {
    await redis.set(
      conversationKey(conversationId),
      JSON.stringify({ messages }),
      "EX",
      CONVERSATION_TTL_SECONDS
    );
  } catch (err) {
    console.warn("Failed to persist conversation", err);
  }
};

router.post("/", async (req: Request, res: Response) => {
  const { conversationId, message } = req.body as {
    conversationId?: string;
    message?: string;
  };

  if (!conversationId || !message?.trim()) {
    return res
      .status(400)
      .json({ error: "conversationId and message are required" });
  }

  try {
    const history = parseConversation(
      await redis.get(conversationKey(conversationId))
    ).slice(-20);

    const userMessage: ChatMessage = {
      role: "user",
      content: message.trim(),
    };

    const sessionId = randomUUID();
    const payload: SessionPayload = {
      conversationId,
      history,
      userMessage,
    };

    await redis.set(
      sessionKey(sessionId),
      JSON.stringify(payload),
      "EX",
      SESSION_TTL_SECONDS
    );

    return res.json({ sessionId });
  } catch (err) {
    console.error("Failed to create chat session", err);
    return res.status(500).json({ error: "Unable to start chat session" });
  }
});

router.get("/events/:sessionId", async (req: Request, res: Response) => {
  const apiKey = resolveOpenAIKey();
  if (!apiKey) {
    res.status(500);
    res.write(
      `event: error\ndata: ${JSON.stringify({
        message: "OPENAI_API_KEY must be configured on the server",
      })}\n\n`
    );
    return res.end();
  }

  const { sessionId } = req.params;
  const sessionRaw = await redis.get(sessionKey(sessionId));
  if (!sessionRaw) {
    res.status(404);
    res.write(
      `event: error\ndata: ${JSON.stringify({
        message: "Session not found",
      })}\n\n`
    );
    return res.end();
  }

  const session = JSON.parse(sessionRaw) as SessionPayload;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  const sendEvent = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [...session.history, session.userMessage],
      stream: true,
    });

    let assistantContent = "";

    for await (const part of stream) {
      if (aborted) break;
      const token = part.choices[0]?.delta?.content ?? "";
      if (token) {
        assistantContent += token;
        sendEvent("token", { content: token });
      }
      if (part.choices[0]?.finish_reason === "stop") {
        break;
      }
    }

    if (!aborted) {
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: assistantContent,
      };
      const updatedHistory = [
        ...session.history,
        session.userMessage,
        assistantMessage,
      ];
      await saveConversation(session.conversationId, updatedHistory);
      sendEvent("done", {});
    }
  } catch (err) {
    console.error("Chat streaming failed", err);
    sendEvent("error", {
      message:
        err instanceof Error
          ? err.message
          : "OpenAI request failed unexpectedly",
    });
  } finally {
    await redis.del(sessionKey(sessionId));
    res.end();
  }
});

router.get("/:conversationId", async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  if (!conversationId) {
    return res.status(400).json({ error: "conversationId required" });
  }

  try {
    const cached = await redis.get(conversationKey(conversationId));
    if (!cached) {
      return res.status(404).json({ messages: [] });
    }
    const history = parseConversation(cached);
    return res.json({ messages: history });
  } catch (err) {
    console.error("Failed to fetch conversation", err);
    return res
      .status(500)
      .json({ error: "Unable to load conversation history" });
  }
});

export default router;
