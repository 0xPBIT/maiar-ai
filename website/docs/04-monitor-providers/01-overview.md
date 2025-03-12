---
title: Monitor Providers
description: Learn how to use monitor providers in Maiar
sidebar_position: 1
---

# Monitoring in Maiar

Maiar's monitoring system provides a way to observe and track your agent's activities in real-time. Whether you need to debug complex behavior, visualize performance metrics, or integrate with external monitoring solutions, Maiar's monitor providers offer a flexible solution.

## The Monitor Provider System

At its core, a monitor provider in Maiar implements a simple interface that receives events from the runtime:

```typescript
interface MonitorProvider {
  readonly id: string;
  readonly name: string;
  readonly description: string;

  init?(): Promise<void>;
  publishEvent(event: {
    type: string;
    message: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
  checkHealth(): Promise<void>;
}
```

This interface allows Maiar to:

- Support multiple monitoring solutions simultaneously
- Handle provider failures gracefully
- Provide consistent event publishing across all monitors
- Easily extend with custom monitoring implementations

## Why Monitor Providers Matter

Monitoring is critical for understanding your agent's behavior, especially as they grow more complex. Consider these use cases:

1. **Debugging** - Track model inputs and outputs to identify issues
2. **Performance Metrics** - Measure response times and resource usage
3. **User Interactions** - Log conversations and user engagement
4. **Integration** - Connect your agent to existing monitoring infrastructure
5. **Visualization** - Create dashboards or real-time displays of agent activity

## Built-in Providers

Maiar includes several official monitor providers:

### Console Monitor

The simplest monitor provider logs events directly to the console with distinctive neon green formatting:

```typescript
import { ConsoleMonitorProvider } from "@maiar-ai/monitor-console";

const runtime = createRuntime({
  model: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o"
  }),
  monitors: new ConsoleMonitorProvider()
});
```

When events occur, you'll see them in your terminal:

```
[Monitor] Event: model_request | Sending prompt to model | 2023-03-15T12:34:56.789Z
[Monitor] Event Metadata: { tokens: 156, model: "gpt-4o" }
```

### WebSocket Monitor

For real-time monitoring in web applications or dashboards, the WebSocket monitor broadcasts events to connected clients:

```typescript
import { WebSocketMonitorProvider } from "@maiar-ai/monitor-websocket";

const runtime = createRuntime({
  model: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o"
  }),
  monitors: new WebSocketMonitorProvider({
    port: 3001,
    path: "/monitor"
  })
});
```

Client code can then connect and receive events:

```javascript
const ws = new WebSocket("ws://localhost:3001/monitor");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Received monitor event:", data);
};
```

## Creating Custom Monitors

You can easily create your own monitor provider to integrate with any monitoring service:

```typescript
import { MonitorProvider } from "@maiar-ai/core";

export class CloudWatchMonitorProvider implements MonitorProvider {
  readonly id = "cloudwatch";
  readonly name = "AWS CloudWatch Monitor";
  readonly description = "Sends agent events to AWS CloudWatch";

  // AWS SDK client (simplified for example)
  private cloudWatch: any;

  constructor(config: { region: string; credentials: any }) {
    // Initialize AWS CloudWatch client
    this.cloudWatch = new CloudWatchClient(config);
  }

  async init(): Promise<void> {
    // Create log group if it doesn't exist
    // ...
  }

  async publishEvent(event: {
    type: string;
    message: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    // Send event to CloudWatch
    await this.cloudWatch.putLogEvents({
      logGroupName: "MaiarAgent",
      logStreamName: event.type,
      logEvents: [
        {
          timestamp: event.timestamp,
          message: JSON.stringify({
            message: event.message,
            metadata: event.metadata || {}
          })
        }
      ]
    });
  }

  async checkHealth(): Promise<void> {
    // Verify connection to CloudWatch
    // ...
  }
}
```

## Using Multiple Monitors

One of the strengths of Maiar's monitoring system is the ability to use multiple providers simultaneously:

```typescript
import { ConsoleMonitorProvider } from "@maiar-ai/monitor-console";
import { WebSocketMonitorProvider } from "@maiar-ai/monitor-websocket";
import { CustomMonitorProvider } from "./custom-monitor";

const runtime = createRuntime({
  model: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o"
  }),
  monitors: [
    new ConsoleMonitorProvider(),
    new WebSocketMonitorProvider({ port: 3001 }),
    new CustomMonitorProvider()
  ]
});
```

Each monitor will receive the same events, allowing you to view agent activity through multiple interfaces or systems.

## Best Practices

1. **Use specific event types** - Create a consistent taxonomy of event types (`model_request`, `user_message`, etc.)
2. **Include relevant metadata** - Add context to events with metadata like token counts, user IDs, or timing information
3. **Health checks** - Implement robust `checkHealth()` methods to ensure your monitoring is operational
4. **Error handling** - Design monitors to fail gracefully without affecting the main agent functionality
5. **Performance** - Be mindful of performance impacts, especially with network-based monitors

:::tip Next Steps

- Explore the [Console Monitor](./console-monitor) for basic monitoring
- Check out the [WebSocket Monitor](./websocket-monitor) for real-time dashboard capabilities
- Try the [Maiar Client Dashboard](./maiar-client) for a ready-made visualization tool
- Learn about [creating custom monitors](./custom-monitors) for your specific needs
  :::
