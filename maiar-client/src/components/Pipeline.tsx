import { Box, Paper, Typography } from "@mui/material";

import { useMonitor } from "../hooks/useMonitor";
import { AutoScroll } from "./AutoScroll";
import { PipelineSteps } from "./PipelineSteps";

export function Pipeline() {
  const { pipelineState } = useMonitor();

  if (!pipelineState?.pipeline) {
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
            No active pipeline
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
      <AutoScroll
        flex={1}
        p={3}
        triggerValue={{
          pipelineLength: pipelineState.pipeline?.length,
          currentStepPluginId: pipelineState.currentStep?.pluginId,
          currentStepAction: pipelineState.currentStep?.action
        }}
      >
        <PipelineSteps
          steps={pipelineState.pipeline}
          currentStep={pipelineState.currentStep}
          modifiedSteps={pipelineState.modifiedSteps}
          explanation={pipelineState.explanation}
        />
      </AutoScroll>
    </Paper>
  );
}
