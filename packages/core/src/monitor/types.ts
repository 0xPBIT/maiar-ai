import { AgentContext } from "../types/agent";

/**
 * The state of the agent that can be monitored.
 * This represents a snapshot of the runtime's current state
 * which monitor providers can use to track system activity.
 */
export interface AgentState {
  /** The current context of the agent's execution */
  currentContext?: AgentContext;

  /** Number of pending contexts waiting for processing */
  queueLength: number;

  /** Whether the agent is currently processing events */
  isRunning: boolean;

  /** Timestamp of when this state was last updated */
  lastUpdate: number;

  /** Optional metadata with additional state information */
  metadata?: Record<string, unknown>;
}

/**
 * Interface that all monitor providers must implement.
 *
 * Monitors are responsible for observing and recording the agent's state
 * and activities. They can be used for debugging, logging, visualization,
 * or integration with external monitoring systems.
 *
 * The runtime can use multiple monitors simultaneously, allowing different
 * visualization or tracking mechanisms to operate in parallel.
 */
export interface MonitorProvider {
  /** Unique identifier for this monitor provider */
  readonly id: string;

  /** Human-readable name of this monitor */
  readonly name: string;

  /** Description of what this monitor does */
  readonly description: string;

  /**
   * Initialize the monitor with any necessary setup.
   * Called when the runtime starts.
   */
  init?(): Promise<void>;

  /**
   * Publish a specific event in the monitoring system.
   * Used to track important actions or state changes.
   *
   * @param event Event details including type, message, and metadata
   */
  publishEvent(event: {
    /** Category or type of event */
    type: string;

    /** Human-readable message describing the event */
    message: string;

    /** When the event occurred */
    timestamp: number;

    /** Optional additional data about the event */
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  /**
   * Check the health of the monitoring system.
   * Used to verify the monitor is operational.
   * Should resolve successfully if healthy, or throw an error if not.
   */
  checkHealth(): Promise<void>;
}
