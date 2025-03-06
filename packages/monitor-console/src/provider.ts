import { MonitorProvider } from "@maiar-ai/core";

// ANSI escape codes for neon green
const NEON_GREEN = "\x1b[38;2;0;255;0m"; // RGB(0, 255, 0)
const RESET = "\x1b[0m";

// Helper to wrap text in neon green
const neonGreen = (text: string) => `${NEON_GREEN}${text}${RESET}`;

/**
 * A monitor provider that logs agent state and events to the console.
 *
 * This provider uses ANSI color codes to highlight monitoring information
 * in neon green, making it easy to distinguish from other console output.
 *
 * It's useful for:
 * - Local development and debugging
 * - Server-side deployments where console logs are captured
 * - Simple monitoring without additional infrastructure
 */
export class ConsoleMonitorProvider implements MonitorProvider {
  /** Unique identifier for this monitor */
  readonly id = "console";

  /** Human-readable name of this monitor */
  readonly name = "Console Monitor";

  /** Description of what this monitor does */
  readonly description = "Monitors agent state through console logging";

  /**
   * Initializes the console monitor.
   * Outputs a message to the console indicating the monitor is ready.
   */
  async init(): Promise<void> {
    console.log(neonGreen("[Monitor] Console monitor initialized"));
  }

  /**
   * Publishes an event to the console.
   *
   * @param event - Event details to publish
   */
  async publishEvent(event: {
    type: string;
    message: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    console.log(
      neonGreen(
        `[Monitor] Event: ${event.type} | ${event.message} | ${new Date(
          event.timestamp
        ).toISOString()}`
      )
    );

    // Log metadata if present
    if (event.metadata && Object.keys(event.metadata).length > 0) {
      console.log(neonGreen("[Monitor] Event Metadata:"), event.metadata);
    }
  }

  /**
   * Logs an event to the console.
   * @deprecated Use publishEvent instead
   *
   * @param event - Event details to log
   */
  async logEvent(event: {
    type: string;
    message: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    // Forward to publishEvent for backward compatibility
    return this.publishEvent(event);
  }

  /**
   * Checks the health of the console monitor.
   * The console logger is always considered healthy.
   */
  async checkHealth(): Promise<void> {
    // Console logger is always healthy
    return Promise.resolve();
  }
}
