import {
  Box,
  Fab,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  CircularProgress,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import MinimizeIcon from "@mui/icons-material/Minimize";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiUrl } from "@/lib/api";
import { useCityExplorer } from "@/context/CityExplorerContext";
import type { RouteLeg } from "@/types/models";

const ASSISTANT_STORAGE_KEY = "city-explorer-assistant-conversation";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const defaultMessages: ChatMessage[] = [
  {
    id: "assistant-seed",
    role: "assistant",
    content:
      "Hey there! I'm your AI co-pilot for exploring cities. Ask me about destinations, landmarks, or routes and I'll help you plan.",
  },
];

const FloatingAssistant = () => {
  const { applyRouteLeg, focusCoords } = useCityExplorer();
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const ensureConversationId = useCallback(() => {
    if (conversationId) return conversationId;
    const stored = localStorage.getItem(ASSISTANT_STORAGE_KEY);
    if (stored) {
      setConversationId(stored);
      return stored;
    }
    const fresh = crypto.randomUUID();
    localStorage.setItem(ASSISTANT_STORAGE_KEY, fresh);
    setConversationId(fresh);
    return fresh;
  }, [conversationId]);

  const fetchHistory = useCallback(async () => {
    const id = ensureConversationId();
    try {
      const res = await fetch(apiUrl(`/api/chat/${id}`));
      if (res.status === 404) {
        setMessages(defaultMessages);
        return;
      }
      if (!res.ok) {
        throw new Error("History fetch failed");
      }
      const data = (await res.json()) as {
        messages: Array<{ role: "user" | "assistant"; content: string }>;
      };
      if (data.messages.length) {
        const normalized = data.messages.map((msg) => ({
          id: crypto.randomUUID(),
          role: msg.role,
          content: msg.content,
        }));
        setMessages(normalized);
      } else {
        setMessages(defaultMessages);
      }
    } catch (err) {
      console.warn("Chat history load failed", err);
    }
  }, [ensureConversationId]);

  useEffect(() => {
    if (isOpen) {
      void fetchHistory();
    }
  }, [isOpen, fetchHistory]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(
    () => () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    },
    []
  );

  const handleToggle = () => {
    setError(null);
    setIsOpen((prev) => {
      const next = !prev;
      if (prev && eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
        setIsStreaming(false);
      }
      return next;
    });
  };

  const handleClose = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsStreaming(false);
    }
    setIsOpen(false);
  };

  const streamAssistant = useCallback(
    (sessionId: string, assistantMessageId: string) => {
      eventSourceRef.current?.close();
      const es = new EventSource(
        apiUrl(`/api/chat/events/${sessionId}`)
      );
      eventSourceRef.current = es;
      setIsStreaming(true);

      let assistantContent = "";

      const updateAssistantMessage = (content: string) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content } : msg
          )
        );
      };

      es.addEventListener("token", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data) as {
            content?: string;
          };
          if (!data?.content) return;
          assistantContent += data.content;
          updateAssistantMessage(assistantContent);
        } catch (err) {
          console.warn("Failed to parse token event", err);
        }
      });

      es.addEventListener("tool-result", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data) as {
            tool?: string;
            error?: string;
            data?: {
              coordinates: Array<{ lat: number; lng: number }>;
              distanceMeters: number;
              durationSeconds: number;
              mode: "driving" | "walking" | "cycling";
              start?: { lat: number; lng: number; label: string | null };
              end?: { lat: number; lng: number; label: string | null };
            };
          };

          if (data.tool === "plan_route" && data.data) {
            const result = data.data as {
              coordinates: Array<{ lat: number; lng: number }>;
              distanceMeters: number;
              durationSeconds: number;
              mode: "driving" | "walking" | "cycling";
              stops?: Array<{ lat: number; lng: number; label?: string | null }>;
            };

            const coords = Array.isArray(result.coordinates)
              ? result.coordinates
              : [];

            if (coords.length) {
              const routeLeg: RouteLeg = {
                coordinates: coords.map((point) => ({
                  lat: point.lat,
                  lng: point.lng,
                })),
                distanceMeters: result.distanceMeters,
                durationSeconds: result.durationSeconds,
              };
              const stops = Array.isArray(result.stops)
                ? result.stops
                    .map((stop) => ({
                      lat: stop.lat,
                      lng: stop.lng,
                      label: stop.label ?? null,
                    }))
                    .filter(
                      (stop) =>
                        Number.isFinite(stop.lat) && Number.isFinite(stop.lng)
                    )
                : [];

              applyRouteLeg(routeLeg, stops);

              const focusTarget = stops[0] ?? routeLeg.coordinates[0];
              if (focusTarget) {
                focusCoords(focusTarget, {
                  height: 1800,
                  speed: 1.4,
                });
              }
            }
          }

          if (data.error) {
            console.warn("Assistant tool error", data.error);
          }
        } catch (err) {
          console.warn("Failed to parse tool-result", err);
        }
      });

      es.addEventListener("done", () => {
        updateAssistantMessage(assistantContent);
        setIsStreaming(false);
        es.close();
        eventSourceRef.current = null;
      });

      es.addEventListener("error", (event) => {
        try {
          const data = JSON.parse((event as MessageEvent).data) as {
            message?: string;
          };
          if (data?.message) {
            setError(data.message);
            updateAssistantMessage(data.message);
          } else {
            setError("Assistant failed to respond");
          }
        } catch {
          setError("Assistant failed to respond");
        }
        setIsStreaming(false);
        es.close();
        eventSourceRef.current = null;
      });
    },
    [applyRouteLeg, focusCoords]
  );

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput("");
    setError(null);

    const id = ensureConversationId();
    const userMessageId = crypto.randomUUID();
    const assistantMessageId = crypto.randomUUID();

    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: text },
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, message: text }),
      });

      if (!response.ok) {
        throw new Error("Unable to start streaming session");
      }

      const data = (await response.json()) as { sessionId?: string };
      if (!data.sessionId) {
        throw new Error("Missing session id");
      }

      streamAssistant(data.sessionId, assistantMessageId);
    } catch (err) {
      console.error("Failed to initiate assistant", err);
      setError("Could not talk to the assistant. Try again later.");
      setIsStreaming(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: "Could not reach the assistant. Please retry soon.",
              }
            : msg
        )
      );
    }
  };

  const assistantPanel = useMemo(
    () => (
      <Paper
        elevation={12}
        sx={{
          position: "fixed",
          bottom: { xs: 16, sm: 28 },
          right: { xs: 16, sm: 28 },
          width: { xs: "calc(100vw - 2rem)", sm: 360, md: 420 },
          borderRadius: "1.2rem",
          padding: "1rem",
          background:
            "linear-gradient(140deg, rgba(15,23,42,0.94), rgba(24,34,56,0.92))",
          border: "1px solid rgba(148, 163, 184, 0.25)",
          color: "#f8fafc",
          boxShadow: "0 24px 60px rgba(2,6,23,0.55)",
          zIndex: 20,
        }}
      >
        <Stack spacing={1.2} sx={{ height: 420 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Stack spacing={0.25}>
              <Typography fontWeight={700}>AI Sidekick</Typography>
              <Typography variant="body2" sx={{ color: "#cbd5f5" }}>
                Ask me about places, routes, or trip ideas.
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              <IconButton
                size="small"
                onClick={handleToggle}
                sx={{ color: "#cbd5f5" }}
              >
                <MinimizeIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleClose}
                sx={{ color: "#cbd5f5" }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>

          <Stack
            spacing={1}
            sx={{
              flex: 1,
              overflowY: "auto",
              paddingRight: "0.25rem",
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(148, 163, 184, 0.35) transparent",
              "&::-webkit-scrollbar": { width: "6px" },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "rgba(148, 163, 184, 0.32)",
                borderRadius: "999px",
              },
            }}
          >
            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  borderRadius: "0.9rem",
                  padding: "0.65rem 0.9rem",
                  backgroundColor:
                    msg.role === "user"
                      ? "rgba(59, 130, 246, 0.25)"
                      : "rgba(15, 23, 42, 0.65)",
                  border:
                    msg.role === "user"
                      ? "1px solid rgba(96, 165, 250, 0.4)"
                      : "1px solid rgba(148, 163, 184, 0.25)",
                  boxShadow:
                    msg.role === "user"
                      ? "0 12px 26px rgba(59, 130, 246, 0.25)"
                      : "0 12px 24px rgba(2, 6, 23, 0.45)",
                  color: "#e2e8f0",
                  fontSize: "0.95rem",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content || (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CircularProgress size={16} sx={{ color: "#7dd3fc" }} />
                    <Typography variant="body2" sx={{ color: "#cbd5f5" }}>
                      Thinking…
                    </Typography>
                  </Stack>
                )}
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Stack>

          {error ? (
            <Typography variant="caption" color="#fda4af">
              {error}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder={
                isStreaming ? "Hold up…" : "Ask about a city or landmark"
              }
              fullWidth
              multiline
              maxRows={4}
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "0.9rem",
                  backgroundColor: "rgba(15, 23, 42, 0.55)",
                  color: "#f8fafc",
                  "& fieldset": { borderColor: "rgba(148, 163, 184, 0.25)" },
                  "&:hover fieldset": {
                    borderColor: "rgba(148, 163, 184, 0.4)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "rgba(96, 165, 250, 0.6)",
                  },
                },
              }}
            />
            <IconButton
              onClick={() => void handleSend()}
              disabled={!input.trim() || isStreaming}
              sx={{
                background:
                  "linear-gradient(135deg, rgba(56, 189, 248, 0.3), rgba(129, 140, 248, 0.5))",
                color: "#0b1120",
                borderRadius: "0.8rem",
                width: 48,
                height: 48,
                boxShadow: "0 14px 28px rgba(96, 165, 250, 0.35)",
                "&:hover": {
                  transform: "translateY(-1px)",
                },
                "&.Mui-disabled": {
                  filter: "grayscale(0.4)",
                  boxShadow: "none",
                },
              }}
            >
              <SendIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      </Paper>
    ),
    [error, handleClose, handleSend, handleToggle, input, isStreaming, messages]
  );

  return (
    <>
      {isOpen && assistantPanel}
      {!isOpen ? (
        <Fab
          color="primary"
          onClick={handleToggle}
          sx={{
            position: "fixed",
            bottom: { xs: 16, sm: 24 },
            right: { xs: 16, sm: 24 },
            background:
              "linear-gradient(135deg, rgba(56,189,248,0.6), rgba(129,140,248,0.7))",
            color: "#0b1120",
            boxShadow: "0 20px 40px rgba(2, 6, 23, 0.45)",
            zIndex: 20,
            "&:hover": {
              filter: "brightness(1.05)",
            },
          }}
        >
          <ChatBubbleOutlineIcon />
        </Fab>
      ) : (
        <Fab
          onClick={handleToggle}
          sx={{
            position: "fixed",
            bottom: { xs: 16, sm: 20 },
            right: { xs: 16, sm: 24 },
            background: "rgba(15, 23, 42, 0.9)",
            color: "#f8fafc",
            zIndex: 21,
            boxShadow: "0 12px 26px rgba(2, 6, 23, 0.6)",
          }}
          size="small"
        >
          <ExpandLessIcon />
        </Fab>
      )}
    </>
  );
};

export default FloatingAssistant;
