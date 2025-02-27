import { MonitorProvider, AgentState } from "@maiar-ai/core";

// ANSI escape codes for neon green
const NEON_GREEN = "\x1b[38;2;0;255;0m"; // RGB(0, 255, 0)
const RESET = "\x1b[0m";

// Helper to wrap text in neon green
const neonGreen = (text: string) => `${NEON_GREEN}${text}${RESET}`;

export class ConsoleMonitorProvider implements MonitorProvider {
  readonly id = "console";
  readonly name = "Console Monitor";
  readonly description = "Monitors agent state through console logging";

  async init(): Promise<void> {
    console.log(neonGreen("[Monitor] Console monitor initialized"));
  }

  async updateState(state: AgentState): Promise<void> {
    const { queueLength, isRunning, lastUpdate } = state;

    console.log(
      neonGreen(
        `[Monitor] State Update | Queue: ${queueLength} | Running: ${isRunning} | Last Update: ${new Date(lastUpdate).toISOString()}`
      )
    );
  }

  async logEvent(event: {
    type: string;
    message: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const timestamp = new Date(event.timestamp).toISOString();
    const metadataStr = event.metadata
      ? ` | Metadata: ${JSON.stringify(event.metadata)}`
      : "";

    console.log(
      neonGreen(
        `[Monitor] Event | Type: ${event.type} | ${event.message} | Time: ${timestamp}${metadataStr}`
      )
    );
  }

  async checkHealth(): Promise<void> {
    // Console logger is always healthy
    return Promise.resolve();
  }
}
