import { useMonitorSocket } from "./hooks/useMonitorSocket";
import { CurrentPipeline } from "./components/CurrentPipeline";
import { CurrentContextChain } from "./components/CurrentContextChain";
import { Events } from "./components/Events";
import { ThemeProvider } from "./theme/ThemeProvider";
import {
  Box,
  Typography,
  Paper,
  AppBar,
  Toolbar,
  Chip,
  Stack,
  Divider,
  alpha
} from "@mui/material";
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
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 600px",
            gridTemplateRows: "auto 1fr",
            gap: 3,
            p: 3,
            height: "calc(100vh - 64px)", // Account for AppBar
            width: "100vw",
            maxWidth: "100vw",
            boxSizing: "border-box",
            overflow: "hidden"
          }}
        >
          {/* Agent State - first column */}
          <Box>
            <Paper
              elevation={0}
              sx={{
                px: 2,
                py: 1.5,
                bgcolor: alpha("#50fa7b", 0.05),
                border: 1,
                borderColor: alpha("#50fa7b", 0.1),
                mb: 3
              }}
            >
              <Stack
                direction="row"
                alignItems="stretch"
                spacing={3}
                divider={<Divider orientation="vertical" flexItem />}
              >
                <Stack
                  direction="row"
                  spacing={3}
                  divider={<Divider orientation="vertical" flexItem />}
                  sx={{ flex: 1 }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: 1
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
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: 1
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
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: 1
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
                </Stack>
              </Stack>
            </Paper>
            <CurrentPipeline {...(currentPipelineState || {})} />
          </Box>

          {/* Context Chain */}
          <Box sx={{ overflow: "auto" }}>
            <CurrentContextChain
              contextChain={agentState?.currentContext?.contextChain}
            />
          </Box>

          {/* Events Panel */}
          <Box sx={{ overflow: "auto" }}>
            <Events events={events} />
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
