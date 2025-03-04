import { useMonitorSocket } from "./hooks/useMonitorSocket";
import { CurrentPipeline } from "./components/CurrentPipeline";
import { CurrentContextChain } from "./components/CurrentContextChain";
import { Events } from "./components/Events";
import { Chat } from "./components/Chat";
import { ThemeProvider } from "./theme/ThemeProvider";
import { GridLayout } from "./components/GridLayout";
import { Box, Typography, AppBar, Toolbar, Chip, Grid } from "@mui/material";
import { useState, useEffect } from "react";

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

  return (
    <ThemeProvider>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "auto",
          minHeight: "100vh",
          width: "100%",
          boxSizing: "border-box",
          overflow: "hidden"
        }}
      >
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            bgcolor: "background.paper",
            borderBottom: 1,
            borderColor: "divider"
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
        {/* Grid Layout */}
        <GridLayout
          children={{
            status: (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center"
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Queue
                    </Typography>
                    <Typography variant="h6">
                      {agentState?.queueLength || 0}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center"
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Status
                    </Typography>
                    <Typography variant="h6">
                      {agentState?.isRunning ? "Running" : "Idle"}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center"
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      Updated
                    </Typography>
                    <Typography variant="h6">
                      {agentState?.lastUpdate
                        ? new Date(agentState.lastUpdate).toLocaleTimeString()
                        : "-"}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            ),
            pipeline: <CurrentPipeline {...(currentPipelineState || {})} />,
            contextChain: (
              <CurrentContextChain
                contextChain={agentState?.currentContext?.contextChain}
              />
            ),
            chat: <Chat connected={connected} />,
            events: <Events events={events} />
          }}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;
