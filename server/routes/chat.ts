import { randomUUID } from "crypto";
import express, { type Request, type Response } from "express";
import OpenAI from "openai";
import { z } from "zod";
import { createRedisClient } from "../redis";
import {
  fetchGeoapifyRoute,
  type GeoapifyMode,
} from "../services/geoapifyRouting";
import { geocodePlace } from "../services/geoapifyGeocode";

const router = express.Router();

const redis = createRedisClient();

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
type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

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

    const locationSchema = z
      .object({
        lat: z.number().optional(),
        lng: z.number().optional(),
        query: z.string().optional(),
      })
      .superRefine((value, ctx) => {
        const hasCoords = value.lat !== undefined || value.lng !== undefined;
        const hasQuery = typeof value.query === "string" && value.query.trim();

        if (hasCoords) {
          if (value.lat === undefined || value.lng === undefined) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "lat and lng must both be provided when specifying coordinates",
            });
          }
        } else if (!hasQuery) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Provide either lat/lng or a query for this location",
          });
        }
      });

    const planRouteArgsSchema = z
      .object({
        waypoints: z.array(locationSchema).min(2).optional(),
        start: locationSchema.optional(),
        via: z.array(locationSchema).optional(),
        end: locationSchema.optional(),
        mode: z.enum(["driving", "walking", "cycling"]).optional(),
      })
      .superRefine((value, ctx) => {
        if (value.waypoints && value.waypoints.length >= 2) {
          return;
        }
        if (value.start && value.end) {
          return;
        }
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Provide either a waypoints array with two or more entries, or both start and end locations",
        });
      });

    const resolveLocation = async (
      location: z.infer<typeof locationSchema>,
      label: string
    ) => {
      if (
        location.lat !== undefined &&
        location.lng !== undefined &&
        Number.isFinite(location.lat) &&
        Number.isFinite(location.lng)
      ) {
        return {
          coords: { lat: location.lat, lng: location.lng },
          resolvedQuery: null,
        };
      }

      const query = location.query?.trim();
      if (query) {
        const geocoded = await geocodePlace(query);
        return {
          coords: { lat: geocoded.lat, lng: geocoded.lng },
          resolvedQuery: geocoded.formatted ?? query,
        };
      }

      throw new Error(
        `Unable to resolve ${label} location. Provide lat/lng or a textual description.`
      );
    };

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "plan_route",
          description:
            "Plan a route between two coordinates using the Geoapify routing API. Returns distance, duration, and path coordinates.",
          parameters: {
            type: "object",
            properties: {
              waypoints: {
                type: "array",
                description:
                  "Ordered list of waypoints to visit. Provide at least two entries to define a full itinerary.",
                items: {
                  type: "object",
                  properties: {
                    lat: {
                      type: "number",
                      description: "Waypoint latitude",
                    },
                    lng: {
                      type: "number",
                      description: "Waypoint longitude",
                    },
                    query: {
                      type: "string",
                      description:
                        "Free-form place description to geocode when coordinates are not known.",
                    },
                  },
                },
              },
              start: {
                type: "object",
                description:
                  "Starting location. Provide either numeric lat/lng or a textual query.",
                properties: {
                  lat: {
                    type: "number",
                    description: "Starting latitude",
                  },
                  lng: {
                    type: "number",
                    description: "Starting longitude",
                  },
                  query: {
                    type: "string",
                    description:
                      "Free-form place description when coordinates are unknown.",
                  },
                },
              },
              via: {
                type: "array",
                description:
                  "Intermediate stops between the start and end locations.",
                items: {
                  type: "object",
                  properties: {
                    lat: {
                      type: "number",
                      description: "Stop latitude",
                    },
                    lng: {
                      type: "number",
                      description: "Stop longitude",
                    },
                    query: {
                      type: "string",
                      description:
                        "Free-form place description to geocode when coordinates are not known.",
                    },
                  },
                },
              },
              end: {
                type: "object",
                description:
                  "Destination location. Provide either numeric lat/lng or a textual query.",
                properties: {
                  lat: {
                    type: "number",
                    description: "Destination latitude",
                  },
                  lng: {
                    type: "number",
                    description: "Destination longitude",
                  },
                  query: {
                    type: "string",
                    description:
                      "Free-form place description when coordinates are unknown.",
                  },
                },
              },
              mode: {
                type: "string",
                enum: ["driving", "walking", "cycling"],
                description:
                  "Travel mode. Defaults to driving when omitted.",
              },
            },
          },
        },
      },
    ];

    const conversationMessages: ChatMessage[] = [
      ...session.history,
      session.userMessage,
    ];

    let resolved = false;

    while (!resolved) {
      const toolProbe = await client.chat.completions.create({
        model: OPENAI_MODEL,
        messages: conversationMessages,
        tools,
      });

      const choice = toolProbe.choices[0];
      const message = choice.message;

      if (
        choice.finish_reason === "tool_calls" &&
        message?.tool_calls &&
        message.tool_calls.length > 0
      ) {
        conversationMessages.push({
          role: "assistant",
          content: message.content ?? "",
          tool_calls: message.tool_calls,
        });

        for (const toolCall of message.tool_calls) {
          if (toolCall.type !== "function") {
            continue;
          }

          if (toolCall.function.name === "plan_route") {
            let parsedArgs;
            try {
              const args = JSON.parse(toolCall.function.arguments ?? "{}");
              parsedArgs = planRouteArgsSchema.parse(args);
            } catch (err) {
              const errorPayload = {
                error:
                  err instanceof Error
                    ? err.message
                    : "Invalid arguments for plan_route",
              };
              conversationMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(errorPayload),
              });
              continue;
            }

            try {
              const locationInputs = parsedArgs.waypoints
                ? parsedArgs.waypoints
                : [
                    parsedArgs.start!,
                    ...(parsedArgs.via ?? []),
                    parsedArgs.end!,
                  ];

              const resolvedLocations = await Promise.all(
                locationInputs.map((location, idx) =>
                  resolveLocation(location, `waypoint[${idx}]`)
                )
              );

              const coords = resolvedLocations.map((loc) => loc.coords);

              const route = await fetchGeoapifyRoute({
                waypoints: coords,
                mode: parsedArgs.mode as GeoapifyMode | undefined,
              });

              const stops = resolvedLocations.map((loc, idx) => ({
                lat: loc.coords.lat,
                lng: loc.coords.lng,
                label: loc.resolvedQuery ?? locationInputs[idx]?.query ?? null,
              }));

              const enriched = {
                ...route,
                stops,
                start: stops[0] ?? null,
                end: stops[stops.length - 1] ?? null,
                waypointCount: coords.length,
                mode: parsedArgs.mode ?? "driving",
              };

              conversationMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(enriched),
              });

              sendEvent("tool-result", {
                tool: "plan_route",
                data: enriched,
              });
            } catch (err) {
              conversationMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  error:
                    err instanceof Error
                      ? err.message
                      : "Failed to plan route",
                }),
              });

              sendEvent("tool-result", {
                tool: "plan_route",
                error:
                  err instanceof Error
                    ? err.message
                    : "Failed to plan route",
              });
            }
          } else {
            conversationMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: JSON.stringify({
                error: `Unknown function ${toolCall.function.name}`,
              }),
            });

            sendEvent("tool-result", {
              tool: toolCall.function.name,
              error: `Unknown function ${toolCall.function.name}`,
            });
          }
        }
      } else {
        resolved = true;
      }
    }

    const stream = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: conversationMessages,
      stream: true,
      tools,
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
      conversationMessages.push(assistantMessage);
      await saveConversation(session.conversationId, conversationMessages);
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
