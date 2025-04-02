import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList as List } from "react-window";

import { alpha, Box, Paper, Stack, Typography } from "@mui/material";

import { useMonitor } from "../hooks/useMonitor";
import { MonitorEvent } from "../types/monitor";
import { EventFilter } from "./EventFilter";
import JsonView from "./JsonView";

// Estimated height for each event item - increased to better accommodate content
const EVENT_ITEM_HEIGHT = 220;

export function Events() {
  const { events, lastEventTime } = useMonitor();
  const [filter, setFilter] = useState<string>("");
  const listRef = useRef<List>(null);

  // Auto-scroll to bottom when new events come in
  const prevEventsLengthRef = useRef(events.length);

  // Debug: Log events array when it changes
  useEffect(() => {
    console.log(`Events component: received ${events.length} events`);
    if (events.length > 0) {
      console.log("Sample event:", events[events.length - 1]);
    }

    // Auto-scroll to the bottom when new events are added
    if (events.length > prevEventsLengthRef.current) {
      if (listRef.current) {
        listRef.current.scrollToItem(events.length - 1);
      }
    }
    prevEventsLengthRef.current = events.length;
  }, [events]);

  // Get filtered events based on the current filter
  const filterEvents = useCallback(
    (filter: string) => {
      if (!filter) return events;

      const patterns = filter
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);

      return events.filter((event) => {
        return patterns.some((pattern) => {
          const regexPattern = pattern
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/\*/g, ".*");
          const regex = new RegExp(regexPattern, "i");
          return regex.test(event.type);
        });
      });
    },
    [events]
  );

  // Memoize the filtered events to avoid recalculating on every render
  const displayEvents = useMemo(() => {
    return filterEvents(filter);
  }, [filterEvents, filter]);

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

  // Row renderer for the virtualized list
  const Row = ({
    index,
    style
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const event = displayEvents[index];

    return (
      <div
        style={{
          ...style,
          boxSizing: "border-box",
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 8,
          paddingBottom: 8
        }}
      >
        <Paper
          elevation={0}
          sx={{
            p: 2,
            width: "100%",
            height: `${EVENT_ITEM_HEIGHT - 16}px`,
            overflow: "auto", // Allow scrolling within each event box
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
      </div>
    );
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
      <Box
        sx={{
          flex: 1,
          overflow: "hidden"
        }}
      >
        {displayEvents.length > 0 ? (
          <AutoSizer>
            {({ height, width }: { height: number; width: number }) => (
              <List
                ref={listRef}
                height={height}
                width={width}
                itemCount={displayEvents.length}
                itemSize={EVENT_ITEM_HEIGHT}
                overscanCount={2}
              >
                {Row}
              </List>
            )}
          </AutoSizer>
        ) : (
          <Box
            sx={{
              p: 3,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "100%"
            }}
          >
            <Typography variant="subtitle1" color="text.secondary">
              {filter ? "No events match your filter" : "No events yet"}
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
