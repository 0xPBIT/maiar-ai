import { createLogger } from "../utils/logger";
import { MonitorProvider } from "./types";

/**
 * Service for managing monitoring operations.
 *
 * The MonitorService acts as a facade over multiple monitor implementations,
 * allowing the runtime to easily communicate with all registered monitors.
 * It handles the distribution of state updates and event logging to all
 * registered monitor providers.
 *
 * This service is designed to:
 * - Support zero, one, or multiple monitor providers
 * - Handle failures in individual monitors gracefully
 * - Provide consistent logging across all monitoring activities
 */
export class MonitorService {
  private logger = createLogger("monitor");
  private providers: MonitorProvider[] = [];

  /**
   * Creates a new MonitorService with the specified providers.
   *
   * @param providers - One or more monitor providers to initialize the service with
   */
  constructor(providers?: MonitorProvider | MonitorProvider[]) {
    const log = this.logger;

    if (!providers) {
      log.info({
        msg: "Initialized monitor service with no providers"
      });
      return;
    }

    if (Array.isArray(providers)) {
      this.providers = providers;
      log.info({
        msg: `Initialized monitor service with ${providers.length} providers: ${providers.map((p) => p.id).join(", ")}`
      });
    } else {
      this.providers = [providers];
      log.info({
        msg: `Initialized monitor service with provider: ${providers.id}`
      });
    }
  }

  /**
   * Publishes an event to all registered monitor providers.
   *
   * @param event - Event details to publish
   * @returns Promise that resolves when all providers have published the event (or failed)
   */
  async publishEvent(event: {
    type: string;
    message: string;
    timestamp?: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    if (this.providers.length === 0) return;

    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || Date.now()
    };

    const log = this.logger;
    log.debug({
      msg: "MonitorService.publishEvent called",
      event: eventWithTimestamp
    });

    // Call publishEvent on all providers
    await Promise.all(
      this.providers.map((provider) =>
        provider.publishEvent(eventWithTimestamp).catch((err) => {
          log.error({
            msg: `Error publishing event to provider ${provider.id}`,
            error: err
          });
        })
      )
    );
  }

  /**
   * Checks the health of all registered monitor providers.
   *
   * @returns Promise that resolves when all health checks complete (or fail)
   */
  async checkHealth(): Promise<void> {
    if (this.providers.length === 0) return;

    // Check health of all providers
    await Promise.all(
      this.providers.map((provider) =>
        provider.checkHealth().catch((err) => {
          this.logger.error({
            msg: `Health check failed for provider ${provider.id}`,
            error: err
          });
        })
      )
    );
  }
}
