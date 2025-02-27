import { AgentContext } from "../types/agent";

/**
 * The state of the agent that can be monitored
 */
export interface AgentState {
  currentContext?: AgentContext;
  queueLength: number;
  isRunning: boolean;
  lastUpdate: number;
  metadata?: Record<string, unknown>;
}

/**
 * Interface that all monitor providers must implement
 */
export interface MonitorProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  /**
   * Initialize the monitor with any necessary setup
   */
  init?(): Promise<void>;

  /**
   * Update the agent state in the monitoring system
   */
  updateState(state: AgentState): Promise<void>;

  /**
   * Log an event in the monitoring system
   */
  logEvent(event: {
    type: string;
    message: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  /**
   * Check the health of the monitoring system
   */
  checkHealth(): Promise<void>;
}
