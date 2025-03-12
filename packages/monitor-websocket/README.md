# @maiar-ai/monitor-websocket

This package is part of the [Maiar](https://maiar.dev) ecosystem, designed to work seamlessly with `@maiar-ai/core`.

## Information

The WebSocket Monitor provides real-time monitoring capabilities for your Maiar agent through WebSockets. This is particularly useful for building dashboards, visualizations, or any real-time monitoring interface.

## Configuration Options

The WebSocket Monitor accepts the following configuration options:

```typescript
interface WebSocketMonitorOptions {
  /** Port to run the WebSocket server on (default: 3001) */
  port?: number;

  /** WebSocket server path (default: "/monitor") */
  path?: string;
}
```

## How It Works

The WebSocket Monitor:

1. Sets up a WebSocket server when the agent is initialized
2. Accepts connections from clients (browsers, applications, etc.)
3. Broadcasts agent events to all connected clients
4. Handles client connections and disconnections automatically
5. Provides a clean shutdown mechanism when the agent stops

## More Documentation

For detailed documentation, examples, and API reference, visit:
https://maiar.dev/docs/monitor-providers/websocket-monitor
