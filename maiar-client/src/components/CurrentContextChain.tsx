import { Paper, Typography, Box } from "@mui/material";
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot
} from "@mui/lab";
import { useState, useEffect } from "react";

interface BaseContextItem {
  id: string;
  pluginId: string;
  type: string;
  action: string;
  content: string;
  timestamp: number;
  error?: string;
}

interface CurrentContextChainProps {
  contextChain?: BaseContextItem[];
}

export function CurrentContextChain({
  contextChain
}: CurrentContextChainProps) {
  // Store the last non-empty context chain
  const [lastContextChain, setLastContextChain] = useState<BaseContextItem[]>(
    []
  );

  useEffect(() => {
    if (contextChain && contextChain.length > 0) {
      setLastContextChain(contextChain);
    }
  }, [contextChain]);

  // Use the last non-empty context chain or current one
  const displayChain =
    lastContextChain.length > 0 ? lastContextChain : contextChain;

  if (!displayChain || displayChain.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 3,
          width: "100%",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          overflow: "hidden",
          height: "100%",
          display: "flex",
          flexDirection: "column"
        }}
      >
        <Typography variant="body1" color="text.secondary">
          No active context chain
        </Typography>
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
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: 3
        }}
      >
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
      </Box>
    </Paper>
  );
}
