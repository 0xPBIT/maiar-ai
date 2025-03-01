import { useState, useRef, useEffect } from "react";
import {
  Paper,
  Box,
  Typography,
  TextField,
  IconButton,
  Stack,
  alpha
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

interface Message {
  content: string;
  sender: "user" | "agent";
  timestamp: number;
}

interface ChatProps {
  connected: boolean;
}

export function Chat({ connected }: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !connected) return;

    const userMessage: Message = {
      content: input,
      sender: "user",
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await fetch("http://localhost:3002/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: input,
          user: "web-client"
        })
      });

      const data = await response.json();
      console.log("Server response:", data);
      const agentMessage: Message = {
        content:
          typeof data === "string"
            ? data
            : data.message || "No response received",
        sender: "agent",
        timestamp: Date.now()
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        content: "Error: Could not send message. Please try again.",
        sender: "agent",
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 0,
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        overflow: "hidden",
        height: "100%",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <Box
        ref={chatContainerRef}
        sx={{
          width: "100%",
          flex: 1,
          overflow: "auto",
          "&::-webkit-scrollbar": {
            width: "8px"
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent"
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.2),
            borderRadius: "4px",
            "&:hover": {
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.3)
            }
          }
        }}
      >
        <Box
          sx={{
            position: "sticky",
            top: 0,
            zIndex: 1,
            p: 3,
            pb: 2,
            backgroundColor: (theme) =>
              alpha(theme.palette.background.paper, 0.8),
            backdropFilter: "blur(8px)",
            borderBottom: 1,
            borderColor: "divider"
          }}
        >
          <Typography variant="h6">Chat</Typography>
        </Box>
        <Box sx={{ p: 3, pt: 2 }}>
          <Stack spacing={2}>
            {messages.map((message, index) => (
              <Box
                key={index}
                sx={{
                  display: "flex",
                  justifyContent:
                    message.sender === "user" ? "flex-end" : "flex-start"
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    maxWidth: "80%",
                    bgcolor:
                      message.sender === "user"
                        ? (theme) => alpha(theme.palette.primary.main, 0.1)
                        : (theme) => alpha(theme.palette.background.paper, 0.5),
                    borderRadius: 2,
                    border: 1,
                    borderColor:
                      message.sender === "user" ? "primary.main" : "divider"
                  }}
                >
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                    {message.content}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 1,
                      color: "text.secondary"
                    }}
                  >
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            ))}
            <div ref={messagesEndRef} />
          </Stack>
        </Box>
      </Box>
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8)
        }}
      >
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={connected ? "Type a message..." : "Disconnected"}
            disabled={!connected}
            sx={{
              "& .MuiOutlinedInput-root": {
                bgcolor: "background.paper"
              }
            }}
          />
          <IconButton
            color="primary"
            onClick={handleSend}
            disabled={!connected || !input.trim()}
            sx={{
              alignSelf: "flex-end",
              height: 56
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
}
