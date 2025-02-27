import { createLogger } from "../utils/logger";
import { MonitorProvider, AgentState } from "./types";

const log = createLogger("monitor");

/**
 * Service for managing monitoring operations
 */
export class MonitorService {
  private provider: MonitorProvider;

  constructor(provider: MonitorProvider) {
    if (!provider) {
      throw new Error("Monitor provider is required");
    }

    this.provider = provider;
    log.info({
      msg: `Initialized monitor service with provider: ${provider.id}`
    });
  }

  /**
   * Update the agent state in the monitoring system
   */
  async updateState(state: AgentState): Promise<void> {
    log.debug({
      msg: "MonitorService.updateState called",
      state
    });
    return this.provider.updateState(state);
  }

  /**
   * Log an event in the monitoring system
   */
  async logEvent(event: {
    type: string;
    message: string;
    timestamp?: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const timestamp = event.timestamp || Date.now();
    log.debug({
      msg: "MonitorService.logEvent called",
      event: { ...event, timestamp }
    });
    return this.provider.logEvent({ ...event, timestamp });
  }

  /**
   * Check the health of the monitoring system
   */
  async checkHealth(): Promise<void> {
    return this.provider.checkHealth();
  }
}
