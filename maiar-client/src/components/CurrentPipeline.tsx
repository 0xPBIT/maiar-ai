import { Paper, Typography, Box } from "@mui/material";
import { PipelineSteps } from "./PipelineSteps";

interface CurrentPipelineProps {
  pipeline?: Array<{ pluginId: string; action: string }>;
  currentStep?: { pluginId: string; action: string };
  modifiedSteps?: Array<{ pluginId: string; action: string }>;
  explanation?: string;
}

export function CurrentPipeline({
  pipeline,
  currentStep,
  modifiedSteps,
  explanation
}: CurrentPipelineProps) {
  if (!pipeline) {
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
      <Box
        sx={{
          flex: 1,
          overflow: "auto",
          p: 3
        }}
      >
        <Box
          sx={{
            width: "100%",
            "& .MuiChip-root": {
              maxWidth: "100%",
              "& .MuiChip-label": {
                overflow: "hidden",
                whiteSpace: "normal",
                textOverflow: "clip",
                height: "auto",
                maxHeight: "none",
                wordBreak: "break-word"
              }
            }
          }}
        >
          <PipelineSteps
            steps={pipeline}
            currentStep={currentStep}
            modifiedSteps={modifiedSteps}
            explanation={explanation}
          />
        </Box>
      </Box>
    </Paper>
  );
}
