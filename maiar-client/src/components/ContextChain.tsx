import { useEffect, useState } from "react";

import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineSeparator
} from "@mui/lab";
import { Box, Paper, Typography } from "@mui/material";

import { useMonitor } from "../hooks/useMonitor";
import { AutoScroll } from "./AutoScroll";

export function ContextChain() {
  const { contextChain } = useMonitor();

  /**
   * Once the agent is done running it emits an empty context chain.
   * So we store the last non-empty context chain and use it to display the timeline.
   */
  const [lastNonEmptyChain, setLastNonEmptyChain] = useState<
    typeof contextChain
  >([]);

  useEffect(() => {
    if (contextChain && contextChain.length > 0) {
      setLastNonEmptyChain(contextChain);
    }
  }, [contextChain]);

  const displayChain =
    contextChain && contextChain.length > 0
      ? contextChain
      : lastNonEmptyChain || [];

  if (displayChain.length === 0) {
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
            flex: 1,
            overflow: "auto",
            p: 3
          }}
        >
          <Typography variant="body1" color="text.secondary">
            No context chain available
          </Typography>
        </Box>
      </Paper>
    );
  }

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
      <AutoScroll flex={1} p={3} triggerValue={displayChain.length}>
        <Timeline
          sx={{
            [`& .MuiTimelineItem-root:before`]: {
              flex: 0,
              padding: 0
            },
            m: 0,
            p: 0
          }}
        >
          {displayChain.map((item, index) => (
            <TimelineItem key={item.id}>
              <TimelineSeparator>
                <TimelineDot
                  color={item.type === "error" ? "error" : "primary"}
                  variant={item.type === "error" ? "outlined" : "filled"}
                />
                {index < displayChain.length - 1 && (
                  <TimelineConnector
                    sx={{
                      bgcolor: "divider",
                      width: "2px"
                    }}
                  />
                )}
              </TimelineSeparator>
              <TimelineContent>
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" component="span">
                    {item.pluginId}:{item.action}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ ml: 1 }}
                  >
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
                <Typography
                  variant="body2"
                  color={item.type === "error" ? "error" : "text.primary"}
                  sx={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    bgcolor: "background.paper",
                    p: 1.5,
                    borderRadius: 1,
                    border: 1,
                    borderColor: "divider"
                  }}
                >
                  {item.type === "error" ? item.error : item.content}
                </Typography>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </AutoScroll>
    </Paper>
  );
}
