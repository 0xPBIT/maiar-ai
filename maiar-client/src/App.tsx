import { useMonitorSocket } from "./hooks/useMonitorSocket";
import { PipelineSteps } from "./components/PipelineSteps";
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

function App() {
  const { connected, agentState, events } = useMonitorSocket();

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
        <PipelineSteps steps={metadata.pipeline} />
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
        <PipelineSteps
          steps={metadata.pipeline}
          modifiedSteps={metadata.modifiedSteps}
          currentStep={metadata.currentStep}
          explanation={metadata.explanation}
        />
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
            bgcolor: "background.paper",
            fontFamily: "monospace",
            fontSize: "0.875rem"
          }}
        >
          {JSON.stringify({ platform, message }, null, 2)}
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
          bgcolor: "background.paper",
          fontFamily: "monospace",
          fontSize: "0.875rem"
        }}
      >
        {JSON.stringify(event.metadata, null, 2)}
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
          maxWidth="lg"
          sx={{
            py: 4,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 4
          }}
        >
          {agentState && (
            <Paper
              elevation={0}
              sx={{
                p: 3,
                bgcolor: alpha("#50fa7b", 0.05),
                border: 1,
                borderColor: alpha("#50fa7b", 0.1)
              }}
            >
              <Typography variant="h6" sx={{ mb: 3 }}>
                Agent State
              </Typography>
              <Stack
                spacing={2}
                direction="row"
                divider={<Divider orientation="vertical" flexItem />}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Queue Length
                  </Typography>
                  <Typography variant="h6">{agentState.queueLength}</Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="h6">
                    {agentState.isRunning ? "Running" : "Idle"}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Last Update
                  </Typography>
                  <Typography variant="h6">
                    {new Date(agentState.lastUpdate).toLocaleString()}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}

          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Events
            </Typography>
            <Stack spacing={2}>
              {events.map((event, index) => (
                <Paper
                  key={index}
                  elevation={0}
                  sx={{
                    p: 3,
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
                      sx={{ color: "primary.main", fontWeight: 500 }}
                    >
                      {event.type}
                    </Typography>
                    <Typography variant="body1">{event.message}</Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: "text.secondary" }}
                    >
                      {new Date(event.timestamp).toLocaleString()}
                    </Typography>
                    {renderEventMetadata(event)}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
