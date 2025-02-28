import { useMonitorSocket } from "./hooks/useMonitorSocket";
import { PipelineSteps } from "./components/PipelineSteps";
import { CurrentPipeline } from "./components/CurrentPipeline";
import { CurrentContextChain } from "./components/CurrentContextChain";
import { ThemeProvider } from "./theme/ThemeProvider";
import {
  Box,
  Container,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  Chip,
  Stack,
  Divider,
  alpha
} from "@mui/material";
import { useState, useEffect, useRef } from "react";

function App() {
  const { connected, agentState, events } = useMonitorSocket();

  // Debug logging for agentState updates
  useEffect(() => {
    if (agentState) {
      console.log("Agent state updated:", {
        hasContext: !!agentState.currentContext,
        contextChainLength: agentState.currentContext?.contextChain?.length,
        contextChain: agentState.currentContext?.contextChain,
        fullAgentState: agentState
      });
    }
  }, [agentState]);

  const [currentPipelineState, setCurrentPipelineState] = useState<{
    pipeline: Array<{ pluginId: string; action: string }>;
    currentStep?: { pluginId: string; action: string };
    modifiedSteps?: Array<{ pluginId: string; action: string }>;
    explanation?: string;
  } | null>(null);
  const eventsContainerRef = useRef<HTMLDivElement>(null);

  // Update current pipeline state when relevant events are received
  useEffect(() => {
    if (events.length === 0) return;

    const lastEvent = events[events.length - 1];

    if (lastEvent.type === "pipeline.generation.complete") {
      const metadata = lastEvent.metadata as {
        pipeline: Array<{ pluginId: string; action: string }>;
      };
      if (metadata?.pipeline) {
        setCurrentPipelineState({
          pipeline: metadata.pipeline
        });
      }
    } else if (lastEvent.type === "pipeline.modification") {
      const metadata = lastEvent.metadata as {
        explanation: string;
        currentStep: { pluginId: string; action: string };
        modifiedSteps: Array<{ pluginId: string; action: string }>;
        pipeline: Array<{ pluginId: string; action: string }>;
      };
      setCurrentPipelineState({
        pipeline: metadata.pipeline,
        currentStep: metadata.currentStep,
        modifiedSteps: metadata.modifiedSteps,
        explanation: metadata.explanation
      });
    }
  }, [events]);

  // Auto-scroll to bottom when new events are added
  useEffect(() => {
    if (eventsContainerRef.current) {
      eventsContainerRef.current.scrollTop =
        eventsContainerRef.current.scrollHeight;
    }
  }, [events]);

  const renderEventMetadata = (event: {
    type: string;
    metadata?: Record<string, unknown>;
  }) => {
    if (event.type === "pipeline.generation.complete") {
      // For pipeline generation events, show the pipeline steps visualization
      const metadata = event.metadata as {
        pipeline: Array<{ pluginId: string; action: string }>;
      };
      return metadata?.pipeline ? (
        <Box sx={{ width: "100%" }}>
          <PipelineSteps steps={metadata.pipeline} />
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
          <PipelineSteps
            steps={metadata.pipeline}
            modifiedSteps={metadata.modifiedSteps}
            currentStep={metadata.currentStep}
            explanation={metadata.explanation}
          />
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
    <ThemeProvider>
      <Box
        sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}
      >
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: alpha("#000000", 0.7),
            backdropFilter: "blur(8px)"
          }}
        >
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
              Maiar Agent Monitor
            </Typography>
            <Chip
              label={connected ? "Connected" : "Disconnected"}
              color={connected ? "primary" : "error"}
              variant="outlined"
              size="small"
              sx={{
                borderWidth: 2,
                px: 1
              }}
            />
          </Toolbar>
        </AppBar>
        <Toolbar /> {/* Spacer for fixed AppBar */}
        <Container
          maxWidth={false}
          sx={{
            py: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "100%",
            position: "relative",
            flex: 1,
            height: "calc(100vh - 64px)", // Account for AppBar
            overflow: "hidden"
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 600px",
              gap: 4,
              width: "100%",
              position: "relative",
              justifyContent: "center",
              height: "100%"
            }}
          >
            {/* Left Column - Pipeline and Context Chain */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 4,
                width: "100%",
                height: "100%"
              }}
            >
              {/* Current Pipeline Panel */}
              <Box>
                {currentPipelineState && (
                  <CurrentPipeline {...currentPipelineState} />
                )}
              </Box>

              {/* Current Context Chain Panel */}
              <Box>
                <CurrentContextChain
                  contextChain={agentState?.currentContext?.contextChain}
                />
              </Box>
            </Box>

            {/* Right Column - Agent State and Events */}
            <Box
              sx={{
                height: "calc(100vh - 140px)",
                display: "flex",
                flexDirection: "column"
              }}
            >
              {/* Agent State Panel */}
              {agentState && (
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.5,
                    width: "100%",
                    bgcolor: alpha("#50fa7b", 0.05),
                    border: 1,
                    borderColor: alpha("#50fa7b", 0.1)
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={3}
                    divider={<Divider orientation="vertical" flexItem />}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        color: "primary.main",
                        fontWeight: 500,
                        minWidth: "fit-content"
                      }}
                    >
                      Agent State
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={3}
                      divider={<Divider orientation="vertical" flexItem />}
                      sx={{ flex: 1 }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Queue:
                        </Typography>
                        <Typography variant="body1">
                          {agentState.queueLength}
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Status:
                        </Typography>
                        <Typography variant="body1">
                          {agentState.isRunning ? "Running" : "Idle"}
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Updated:
                        </Typography>
                        <Typography variant="body1">
                          {new Date(agentState.lastUpdate).toLocaleTimeString()}
                        </Typography>
                      </Box>
                    </Stack>
                  </Stack>
                </Paper>
              )}

              {/* Events Panel */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  width: "100%",
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  overflow: "hidden",
                  flex: 1,
                  mt: 4,
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <Typography variant="h6" sx={{ mb: 3 }}>
                  Events
                </Typography>
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
                      backgroundColor: (theme) =>
                        alpha(theme.palette.primary.main, 0.2),
                      borderRadius: "4px",
                      "&:hover": {
                        backgroundColor: (theme) =>
                          alpha(theme.palette.primary.main, 0.3)
                      }
                    }
                  }}
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
                            bgcolor: (theme) =>
                              alpha(theme.palette.primary.main, 0.05),
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
                          <Typography variant="body1">
                            {event.message}
                          </Typography>
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
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
