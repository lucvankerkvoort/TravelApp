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

const redisKey = (conversationId: string) => `chat:session:${conversationId}`;
const REDIS_TTL_SECONDS = 60 * 60; // 1 hour

const resolveOpenAIKey = () =>
  process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_KEY ?? "";

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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
      redisKey(conversationId),
      JSON.stringify({ messages }),
      "EX",
      REDIS_TTL_SECONDS
    );
  } catch (err) {
    console.warn("Failed to persist conversation", err);
  }
};

router.get("/:conversationId", async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  if (!conversationId) {
    return res.status(400).json({ error: "conversationId required" });
  }

  try {
    const cached = await redis.get(redisKey(conversationId));
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

router.post("/stream", async (req: Request, res: Response) => {
  const apiKey = resolveOpenAIKey();
  debugger;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: "OPENAI_API_KEY must be configured on the server" });
  }

  const { conversationId, message } = req.body as {
    conversationId?: string;
    message?: string;
  };

  if (!conversationId || !message?.trim()) {
    return res
      .status(400)
      .json({ error: "conversationId and message are required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let aborted = false;
  req.on("close", () => {
    aborted = true;
  });

  const history = parseConversation(await redis.get(redisKey(conversationId)));
  const trimmedHistory = history.slice(-20); // keep context lean
  const userMessage: ChatMessage = { role: "user", content: message.trim() };

  const messagesForModel = [...trimmedHistory, userMessage];

  const sendEvent = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const client = new OpenAI({ apiKey });
    const stream = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: messagesForModel,
      stream: true,
    });

    let assistantContent = "";

    for await (const part of stream) {
      if (aborted) {
        break;
      }
      const token = part.choices[0]?.delta?.content ?? "";
      if (token) {
        assistantContent += token;
        sendEvent({ event: "token", content: token });
      }
      const finishReason = part.choices[0]?.finish_reason;
      if (finishReason === "stop") {
        break;
      }
    }

    if (!aborted) {
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: assistantContent,
      };
      const updatedHistory = [...trimmedHistory, userMessage, assistantMessage];
      await saveConversation(conversationId, updatedHistory);
      sendEvent({ event: "done" });
    }
  } catch (err) {
    console.error("Chat streaming failed", err);
    sendEvent({
      event: "error",
      message:
        err instanceof Error
          ? err.message
          : "OpenAI request failed unexpectedly",
    });
  } finally {
    res.end();
  }
});

export default router;
