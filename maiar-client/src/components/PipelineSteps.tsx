import { Paper, Stack, Chip, Typography, Box, alpha } from "@mui/material";
import { styled, Theme } from "@mui/material/styles";
import {
  Timeline,
  TimelineItem,
  TimelineContent,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector
} from "@mui/lab";

interface PipelineStep {
  pluginId: string;
  action: string;
}

interface PipelineStepsProps {
  steps: PipelineStep[];
  modifiedSteps?: PipelineStep[];
  currentStep?: PipelineStep;
  explanation?: string;
}

const StyledTimelineItem = styled(TimelineItem)(
  ({ theme }: { theme: Theme }) => ({
    "&:before": {
      flex: 0,
      padding: 0
    },
    minHeight: "auto",
    "&:last-child": {
      marginBottom: 0
    }
  })
);

const StyledPaper = styled(Paper)(({ theme }: { theme: Theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: alpha(theme.palette.background.paper, 0.5),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
  transition: "all 0.2s ease",
  "&:hover": {
    backgroundColor: alpha(theme.palette.primary.main, 0.05),
    borderColor: alpha(theme.palette.primary.main, 0.2)
  }
}));

const DividerPaper = styled(Paper)(({ theme }: { theme: Theme }) => ({
  padding: theme.spacing(1.5),
  backgroundColor: alpha(theme.palette.secondary.main, 0.05),
  border: `1px dashed ${alpha(theme.palette.secondary.main, 0.3)}`,
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
}));

export function PipelineSteps({
  steps,
  modifiedSteps,
  currentStep,
  explanation
}: PipelineStepsProps) {
  // Find the index where modification starts
  const modificationStartIndex = modifiedSteps
    ? steps.findIndex(
        (step) =>
          step.pluginId === currentStep?.pluginId &&
          step.action === currentStep?.action
      )
    : -1;

  // Split the pipeline into original and modified parts if there's a modification
  const originalSteps = modifiedSteps
    ? steps.slice(0, modificationStartIndex + 1)
    : steps;
  const remainingSteps = modifiedSteps || [];

  const renderTimeline = (
    pipelineSteps: PipelineStep[],
    isModified: boolean = false
  ) => (
    <Timeline
      position="left"
      sx={{
        m: 0,
        p: 2,
        bgcolor: (theme) =>
          alpha(theme.palette[isModified ? "secondary" : "primary"].main, 0.03),
        borderRadius: 2,
        border: 1,
        borderColor: (theme) =>
          alpha(theme.palette[isModified ? "secondary" : "primary"].main, 0.1),
        "& .MuiTimelineItem-root": {
          "&:before": {
            display: "none"
          }
        }
      }}
    >
      {pipelineSteps.map((step, index) => {
        const isCurrentStep =
          currentStep &&
          step.pluginId === currentStep.pluginId &&
          step.action === currentStep.action;

        return (
          <StyledTimelineItem key={index}>
            <TimelineSeparator>
              <TimelineDot
                variant={isModified ? "filled" : "outlined"}
                sx={{
                  bgcolor: isModified ? "secondary.main" : "background.paper",
                  borderColor: isCurrentStep
                    ? "secondary.main"
                    : isModified
                      ? "secondary.main"
                      : "primary.main",
                  borderWidth: isCurrentStep ? 2 : 1,
                  m: 0
                }}
              />
              {index < pipelineSteps.length - 1 && (
                <TimelineConnector
                  sx={{
                    bgcolor: (theme) =>
                      alpha(
                        theme.palette[isModified ? "secondary" : "primary"]
                          .main,
                        0.2
                      ),
                    width: 2
                  }}
                />
              )}
            </TimelineSeparator>
            <TimelineContent sx={{ py: 0, px: 2 }}>
              <StyledPaper
                elevation={0}
                sx={{
                  borderColor: (theme) =>
                    isModified
                      ? alpha(theme.palette.secondary.main, 0.2)
                      : alpha(theme.palette.primary.main, 0.1),
                  ...(isCurrentStep && {
                    borderStyle: "dashed",
                    borderWidth: 2,
                    borderColor: "secondary.main"
                  })
                }}
              >
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: "text.secondary",
                        width: "2rem",
                        textAlign: "center",
                        fontFamily: "monospace"
                      }}
                    >
                      {(index + 1).toString().padStart(2, "0")}
                    </Typography>
                    <Chip
                      label={step.pluginId.replace("plugin-", "")}
                      size="small"
                      sx={{
                        bgcolor: (theme) =>
                          alpha(
                            theme.palette[isModified ? "secondary" : "primary"]
                              .main,
                            0.1
                          ),
                        color: isModified ? "secondary.main" : "primary.main",
                        borderRadius: 1,
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        minWidth: "100px"
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{
                        color: "text.primary",
                        fontFamily: "monospace",
                        flex: 1
                      }}
                    >
                      {step.action}
                    </Typography>
                  </Box>
                </Stack>
              </StyledPaper>
            </TimelineContent>
          </StyledTimelineItem>
        );
      })}
    </Timeline>
  );

  return (
    <Stack spacing={2}>
      {explanation && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.05),
            border: 1,
            borderColor: (theme) => alpha(theme.palette.secondary.main, 0.2),
            borderStyle: "dashed"
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontFamily: "monospace",
              color: "secondary.main"
            }}
          >
            {explanation}
          </Typography>
        </Paper>
      )}

      {/* Original pipeline steps */}
      {renderTimeline(originalSteps)}

      {/* Divider between original and modified steps */}
      {modifiedSteps && modifiedSteps.length > 0 && (
        <DividerPaper>
          <Typography
            variant="subtitle2"
            sx={{
              color: "secondary.main",
              fontFamily: "monospace",
              fontWeight: 500
            }}
          >
            Pipeline Modified ↓
          </Typography>
        </DividerPaper>
      )}

      {/* Modified pipeline steps */}
      {modifiedSteps &&
        modifiedSteps.length > 0 &&
        renderTimeline(modifiedSteps, true)}
    </Stack>
  );
}
