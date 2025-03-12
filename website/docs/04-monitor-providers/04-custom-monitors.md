---
title: Custom Monitors
description: Create your own monitor providers for Maiar
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

## Custom Monitor Ideas

### File-Based Monitor

A file-based monitor saves events to local JSON files for later analysis:

- **Key concepts:**
  - Create a unique log file per session using timestamps
  - Use Node.js file system APIs to write events
  - Append new events to existing file content
  - Consider batching writes for performance
  - Include health checks to verify file accessibility

### External Service Integration

Integrate with external monitoring services like Datadog, New Relic, or CloudWatch:

- **Key concepts:**
  - Initialize API clients with authentication credentials
  - Map Maiar event structure to service-specific format
  - Consider rate limiting and batching
  - Add appropriate tags and metadata for filtering
  - Implement robust error handling
  - Add health checks that verify API connectivity

## Common Design Patterns

### The Wrapper Pattern

The wrapper pattern allows you to enhance an existing monitor:

- **Key concepts:**
  - Wrap an existing monitor implementation
  - Add pre-processing or post-processing logic
  - Enrich events with additional metadata
  - Filter events based on custom rules
  - Transform event data

**Example use cases:**

- Adding environment information to events
- Filtering out sensitive information
- Converting event formats
- Adding timing information

### The Combiner Pattern

The combiner pattern lets you use multiple monitors as one:

- **Key concepts:**
  - Accept an array of monitor providers
  - Forward events to all child monitors
  - Handle errors in individual monitors gracefully
  - Implement health checks across all providers
  - Consider performance implications

**Example use cases:**

- Send events to both local console and remote service
- Record events at different detail levels
- Support both development and production monitoring simultaneously

## Best Practices for Custom Monitors

1. **Error Handling** - Monitor failures should never cause the agent to fail. Always catch and log errors within your monitor methods.

2. **Batching** - For efficiency, consider batching events when sending to external services instead of making a network request for each event.

3. **Async Operations** - Monitor methods should return promises that resolve when the operation is complete, allowing the runtime to know when events have been processed.

4. **Configurable Verbosity** - Allow users to configure the level of detail or types of events they want to monitor.

5. **Resource Management** - Implement proper cleanup in your monitor to prevent resource leaks, especially for monitors that open connections or file handles.

6. **Testing** - Test your monitor with a variety of event types and edge cases to ensure it handles all situations gracefully.

7. **Documentation** - Document the expected format and types of events your monitor supports, especially if it has specific requirements.

## Common Monitor Events

While you can create custom event types for your specific needs, here are some common event types used across Maiar:

- `runtime_start` - When the agent runtime starts
- `runtime_stop` - When the agent runtime stops
- `model_request` - When a request is sent to the language model
- `model_response` - When a response is received from the language model
- `memory_save` - When data is saved to memory
- `memory_load` - When data is loaded from memory
- `plugin_register` - When a plugin is registered
- `plugin_action` - When a plugin performs an action
- `error` - When an error occurs

Using consistent event types makes it easier to analyze and visualize agent behavior across different monitoring tools.

## Real-World Integration Ideas

- **Slack Monitor** - Send important events to a Slack channel
- **Email Monitor** - Email critical errors or daily summaries
- **Database Monitor** - Store events in a database for analysis
- **Prometheus Monitor** - Export metrics for Prometheus scraping
- **Elastic Stack Monitor** - Send events to Elasticsearch for Kibana visualization
- **Custom UI Monitor** - Power a specialized monitoring UI for your application

## Conclusion

Creating custom monitor providers allows you to integrate your Maiar agent with your existing monitoring infrastructure or build specialized visualization and debugging tools. By starting with these patterns and ideas, you can create robust, efficient monitors tailored to your specific requirements.

:::tip Next Steps

- See how the [Console Monitor](./console-monitor) is implemented for a simple example
- Examine the [WebSocket Monitor](./websocket-monitor) for a more complex implementation
- Try the [Maiar Client Dashboard](./maiar-client) to understand what can be built with monitors
  :::
