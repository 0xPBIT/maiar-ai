import { Box, Typography, Paper, Stack, alpha } from "@mui/material";
import { useRef, useEffect, useState } from "react";
import JsonView from "./JsonView";

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
  const [shouldAutoScroll, setShouldAutoScroll] = useState<boolean>(true);
  const prevEventsLengthRef = useRef<number>(events.length);

  // Handle scroll events to determine if auto-scroll should be enabled
  const handleScroll = () => {
    if (eventsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        eventsContainerRef.current;
      // If user is near the bottom (within 20px), enable auto-scrolling
      setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 20);
    }
  };

  // Auto-scroll to bottom when new events arrive, but only if we should auto-scroll
  useEffect(() => {
    // Only try to scroll if there are new events and we should auto-scroll
    if (
      shouldAutoScroll &&
      events.length > prevEventsLengthRef.current &&
      eventsContainerRef.current
    ) {
      // Use requestAnimationFrame to ensure the DOM has updated before scrolling
      requestAnimationFrame(() => {
        if (eventsContainerRef.current) {
          // Directly set the scrollTop to the bottom
          eventsContainerRef.current.scrollTop =
            eventsContainerRef.current.scrollHeight;
        }
      });
    }

    // Update the previous length ref
    prevEventsLengthRef.current = events.length;
  }, [events, shouldAutoScroll]);

  const renderEventMetadata = (event: Event) => {
    if (event.type === "pipeline.generation.complete") {
      const metadata = event.metadata as {
        pipeline: Array<{ pluginId: string; action: string }>;
      };
      return metadata?.pipeline ? (
        <Box sx={{ width: "100%" }}>
          <JsonView data={metadata.pipeline} />
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
          <JsonView data={metadata} />
        </Box>
      );
    }

    if (event.type === "pipeline.generation.start") {
      const { platform, message } = event.metadata || {};
      return platform || message ? (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 2,
            width: "100%",
            bgcolor: "background.paper"
          }}
        >
          <JsonView data={{ platform, message }} />
        </Paper>
      ) : null;
    }

    return event.metadata ? (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mt: 2,
          width: "100%",
          bgcolor: "background.paper"
        }}
      >
        <JsonView data={event.metadata} />
      </Paper>
    ) : null;
  };

  return (
    <Paper
      elevation={0}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        overflow: "hidden"
      }}
    >
      <Box
        ref={eventsContainerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          p: 3
        }}
        onScroll={handleScroll}
      >
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
                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.2)
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
    </Paper>
  );
}
