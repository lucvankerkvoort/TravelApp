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

const ASSISTANT_STORAGE_KEY = "city-explorer-assistant-conversation";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface StreamPayload {
  event: "token" | "done" | "error";
  content?: string;
  message?: string;
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
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      const res = await fetch(`/api/chat/${id}`);
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
        const normalized = data.messages.map((msg, idx) => ({
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

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setError(null);
  };

  const handleClose = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
    setIsOpen(false);
  };

  const streamAssistant = useCallback(async (id: string, prompt: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsStreaming(true);

    try {
      debugger;
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: id, message: prompt }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Chat stream failed to start");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split("\n\n");
        for (const event of events) {
          if (!event.trim() || !event.startsWith("data:")) continue;
          const payloadString = event.replace(/^data:\s*/, "").trim();
          if (!payloadString) continue;
          let payload: StreamPayload;
          try {
            payload = JSON.parse(payloadString) as StreamPayload;
          } catch {
            continue;
          }
          if (payload.event === "token" && payload.content) {
            assistantContent += payload.content;
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0) {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: assistantContent,
                };
              }
              return updated;
            });
          }
          if (payload.event === "error") {
            setError(payload.message ?? "Assistant failed to respond");
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0) {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content:
                    payload.message ??
                    "Couldn't finish that thought. Try again soon.",
                };
              }
              return updated;
            });
          }
          if (payload.event === "done") {
            setMessages((prev) => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              if (lastIndex >= 0) {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: assistantContent,
                };
              }
              return updated;
            });
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Streaming error", err);
        setError("Something went wrong. Try again in a moment.");
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const text = input.trim();
    setInput("");
    setError(null);

    const id = ensureConversationId();

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: text },
      { id: crypto.randomUUID(), role: "assistant", content: "" },
    ]);

    await streamAssistant(id, text);
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
    [
      error,
      handleClose,
      handleSend,
      handleToggle,
      input,
      isStreaming,
      messages,
      isStreaming,
    ]
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
