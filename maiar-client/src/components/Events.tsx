import { Box, Typography, Paper, Stack, alpha } from "@mui/material";
import { useRef } from "react";

interface Event {
  type: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface EventsProps {
  events: Event[];
}

export function Events({ events }: EventsProps) {
  const eventsContainerRef = useRef<HTMLDivElement>(null);

  const renderEventMetadata = (event: Event) => {
    if (event.type === "pipeline.generation.complete") {
      // For pipeline generation events, show the pipeline steps visualization
      const metadata = event.metadata as {
        pipeline: Array<{ pluginId: string; action: string }>;
      };
      return metadata?.pipeline ? (
        <Box sx={{ width: "100%" }}>
          {/* We'll handle pipeline visualization separately */}
          <pre>{JSON.stringify(metadata.pipeline, null, 2)}</pre>
        </Box>
      ) : null;
    }

    if (event.type === "pipeline.modification") {
      const metadata = event.metadata as {
        explanation: string;
        currentStep: { pluginId: string; action: string };
        modifiedSteps: Array<{ pluginId: string; action: string }>;
        pipeline: Array<{ pluginId: string; action: string }>;
      };

      return (
        <Box sx={{ width: "100%" }}>
          {/* We'll handle pipeline visualization separately */}
          <pre>{JSON.stringify(metadata, null, 2)}</pre>
        </Box>
      );
    }

    if (event.type === "pipeline.generation.start") {
      // For pipeline start events, only show platform and message
      const { platform, message } = event.metadata || {};
      return platform || message ? (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 2,
            width: "100%",
            bgcolor: "background.paper",
            fontFamily: "monospace",
            fontSize: "0.875rem"
          }}
        >
          <Box
            sx={{
              width: "100%",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word"
            }}
          >
            {JSON.stringify({ platform, message }, null, 2)}
          </Box>
        </Paper>
      ) : null;
    }

    // For all other events, show full metadata
    return event.metadata ? (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mt: 2,
          width: "100%",
          bgcolor: "background.paper",
          fontFamily: "monospace",
          fontSize: "0.875rem"
        }}
      >
        <Box
          sx={{
            width: "100%",
            overflow: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word"
          }}
        >
          {JSON.stringify(event.metadata, null, 2)}
        </Box>
      </Paper>
    ) : null;
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
        display: "flex",
        flexDirection: "column",
        height: "100%"
      }}
    >
      <Box
        ref={eventsContainerRef}
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
            backdropFilter: "blur(2px)",
            borderBottom: 1,
            borderColor: "divider"
          }}
        >
          <Typography variant="h6">Events</Typography>
        </Box>
        <Box sx={{ p: 3, pt: 2 }}>
          <Stack spacing={2}>
            {events.map((event, index) => (
              <Paper
                key={index}
                elevation={0}
                sx={{
                  p: 3,
                  width: "100%",
                  display: "block",
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
                    borderColor: (theme) =>
                      alpha(theme.palette.primary.main, 0.2)
                  }
                }}
              >
                <Stack spacing={1}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: "primary.main",
                      fontWeight: 500
                    }}
                  >
                    {event.type}
                  </Typography>
                  <Typography variant="body1">{event.message}</Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block"
                    }}
                  >
                    {new Date(event.timestamp).toLocaleString()}
                  </Typography>
                  {renderEventMetadata(event)}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}
