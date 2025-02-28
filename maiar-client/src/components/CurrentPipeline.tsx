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
          p: 3,
          width: "100%",
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Typography variant="body1" color="text.secondary">
          No active pipeline
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        width: "100%",
        bgcolor: "background.paper",
        border: 1,
        borderColor: "divider",
        overflow: "hidden"
      }}
    >
      <Typography variant="h6" sx={{ mb: 3 }}>
        Current Pipeline
      </Typography>
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
    </Paper>
  );
}
