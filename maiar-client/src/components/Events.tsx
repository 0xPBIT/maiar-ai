import { useEffect, useMemo, useState } from "react";

import { alpha, Box, Paper, Stack, Typography } from "@mui/material";

import { useMonitor } from "../hooks/useMonitor";
import { MonitorEvent } from "../types/monitor";
import { AutoScroll } from "./AutoScroll";
import { EventFilter } from "./EventFilter";
import JsonView from "./JsonView";

export function Events() {
  const { events, filteredEvents, lastEventTime } = useMonitor();
  const [filter, setFilter] = useState<string>("");

  // Debug: Log events array when it changes
  useEffect(() => {
    console.log(`Events component: received ${events.length} events`);
    if (events.length > 0) {
      console.log("Sample event:", events[events.length - 1]);
    }
  }, [events]);

  // Get filtered events based on the current filter
  const displayEvents = useMemo(() => {
    return filteredEvents(filter);
  }, [filteredEvents, filter]);

  const renderEventMetadata = (event: MonitorEvent) => {
    // Special case for pipeline.generation.complete
    if (event.type === "pipeline.generation.complete") {
      return event.metadata?.pipeline ? (
        <Box sx={{ width: "100%" }}>
          <JsonView data={event.metadata.pipeline} />
        </Box>
      ) : null;
    }

    // Special case for pipeline.modification
    if (event.type === "pipeline.modification") {
      return (
        <Box sx={{ width: "100%" }}>
          <JsonView data={event.metadata} />
        </Box>
      );
    }

    // Special case for pipeline.generation.start
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

    // Special case for state events
    if (event.type === "state" && event.metadata?.state) {
      return (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 2,
            width: "100%",
            bgcolor: "background.paper"
          }}
        >
          <JsonView data={event.metadata.state} />
        </Paper>
      );
    }

    // Default case for any other event with metadata
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
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: (theme) => alpha(theme.palette.background.paper, 0.8),
          display: "flex",
          justifyContent: "flex-end"
        }}
      >
        <EventFilter
          onFilterChange={setFilter}
          totalEvents={events.length}
          filteredEvents={displayEvents.length}
          lastEventTime={lastEventTime}
        />
      </Box>
      <AutoScroll flex={1} p={3} triggerValue={events.length}>
        <Stack spacing={2}>
          {displayEvents.map((event, index) => (
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
      </AutoScroll>
    </Paper>
  );
}
