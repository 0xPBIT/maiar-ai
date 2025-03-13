---
title: Custom Monitors
description: Create your own monitor providers for MAIAR
sidebar_position: 4
---

# Creating Custom Monitor Providers

Maiar's monitor system is designed to be extensible, allowing you to create custom monitor providers that integrate with your specific monitoring infrastructure or provide specialized visualization capabilities.

## The Monitor Provider Interface

Every monitor provider must implement the `MonitorProvider` interface from `@maiar-ai/core`:

```typescript
interface MonitorProvider {
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
```

This simple interface is all you need to implement to create a custom monitor.

## Real-World Integration Ideas

- **Slack Monitor** - Send important events to a Slack channel
- **Email Monitor** - Email critical errors or daily summaries
- **Database Monitor** - Store events in a database for analysis
- **Prometheus Monitor** - Export metrics for Prometheus scraping
- **Elastic Stack Monitor** - Send events to Elasticsearch for Kibana visualization
- **Custom UI Monitor** - Power a specialized monitoring UI for your application

## Conclusion

Creating custom monitor providers allows you to integrate your MAIAR agent with your existing monitoring infrastructure or build specialized visualization and debugging tools. By starting with these patterns and ideas, you can create robust, efficient monitors tailored to your specific requirements.

:::tip Next Steps

- See how the [Console Monitor](./console-monitor) is implemented for a simple example
- Examine the [WebSocket Monitor](./websocket-monitor) for a more complex implementation
- Try the [Maiar Client Dashboard](./maiar-client) to understand what can be built with monitors
  :::
