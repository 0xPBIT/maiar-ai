---
sidebar_position: 3
title: Triggers
description: Learn about the role of triggers in Maiar
---

# Triggers

Triggers are event listeners that determine when your agent should act. They are initialized when the agent starts and create events which kick off the runtime processing pipeline.

## Understanding Triggers

A trigger consists of two main parts:

1. **Initialization** - Setup code that runs when the agent starts
2. **Event Creation** - Code that creates events in response to external actions

The initialization happens through `addTrigger`, where you set up your servers, connections, and listeners. Then, these listeners use `createEvent` to start the runtime processing when something happens.

## Trigger Initialization

Here's how different types of triggers initialize:

```typescript
export class MyPlugin extends PluginBase {
  constructor() {
    super({ id: "my-plugin" });

    // Express Server Trigger
    this.addTrigger({
      id: "http_server",
      start: () => {
        // Initialize Express server
        const app = express();
        app.use(express.json());

        // Set up routes that will create events
        app.post("/webhook", async (req, res) => {
          await this.runtime.createEvent(
            {
              pluginId: this.id,
              action: "webhook_received",
              data: req.body
            },
            {
              responseHandler: (result) => res.json(result)
            }
          );
        });

        // Start server
        app.listen(3000);
      }
    });

    // WebSocket Trigger
    this.addTrigger({
      id: "websocket_server",
      start: () => {
        // Initialize WebSocket server
        const wss = new WebSocketServer({ port: 8080 });

        // Set up connection handler
        wss.on("connection", (ws) => {
          // Set up message handler that will create events
          ws.on("message", async (message) => {
            await this.runtime.createEvent(
              {
                pluginId: this.id,
                action: "ws_message_received",
                data: message
              },
              {
                responseHandler: (result) => ws.send(JSON.stringify(result))
              }
            );
          });
        });
      }
    });

    // File Watcher Trigger
    this.addTrigger({
      id: "file_watcher",
      start: () => {
        // Initialize file watcher
        const watcher = chokidar.watch("some/directory");

        // Set up change handler that will create events
        watcher.on("change", async (path) => {
          await this.runtime.createEvent({
            pluginId: this.id,
            action: "file_changed",
            data: { path }
          });
        });
      },
      // Clean up when plugin stops
      stop: () => {
        watcher.close();
      }
    });
  }
}
```

## Event Creation

After initialization, triggers create events in response to external actions:

```typescript
// Express route creates events for HTTP requests
app.post("/message", async (req, res) => {
  await this.runtime.createEvent(
    {
      pluginId: this.id,
      action: "receive_message",
      timestamp: Date.now(),
      data: req.body
    },
    {
      responseHandler: (result) => res.json(result)
    }
  );
});

// WebSocket handler creates events for messages
ws.on("message", async (message) => {
  await this.runtime.createEvent(
    {
      pluginId: this.id,
      action: "ws_message",
      timestamp: Date.now(),
      data: JSON.parse(message)
    },
    {
      responseHandler: (result) => ws.send(JSON.stringify(result))
    }
  );
});
```

## Trigger Lifecycle

The trigger lifecycle looks like this:

```
[Agent Starts] → [Trigger Initialization] → [Wait for Events]
                        ↓                          ↓
                   Start Servers             Create Events
                   Setup Listeners           Start Runtime
                   Initialize Connections    Handle Responses
```

## Best Practices

### Clean Initialization

Keep your trigger initialization clean and focused:

```typescript
this.addTrigger({
  id: "my_trigger",
  start: async () => {
    try {
      // Initialize resources
      const server = await this.initializeServer();

      // Set up event handlers
      server.on("event", this.handleEvent.bind(this));

      // Store cleanup functions
      this.cleanup = () => server.close();
    } catch (error) {
      console.error("Failed to initialize trigger:", error);
      throw error; // Let the agent know initialization failed
    }
  },
  stop: async () => {
    // Clean up resources
    if (this.cleanup) {
      await this.cleanup();
    }
  }
});
```

### Event Creation

Create events with complete context:

```typescript
private async handleEvent(data: any) {
  await this.runtime.createEvent({
    pluginId: this.id,
    action: "handle_event",
    timestamp: Date.now(),
    data,
    metadata: {
      source: "my_trigger",
      version: "1.0"
    }
  }, {
    responseHandler: this.handleResponse.bind(this),
    errorHandler: this.handleError.bind(this)
  });
}
```

### Resource Management

Always clean up resources when the trigger stops:

```typescript
this.addTrigger({
  id: "my_trigger",
  start: () => {
    this.server = new Server();
    this.watcher = new FileWatcher();
    this.connections = new Set();
  },
  stop: async () => {
    // Clean up in reverse order of creation
    for (const conn of this.connections) {
      await conn.close();
    }
    await this.watcher.close();
    await this.server.shutdown();
  }
});
```

:::tip Next Steps

- Learn about [Executors](./executors) for handling events
- Explore [Core Utilities](../core-utilities/runtime) for implementation details
- Check out [Model Providers](../model-providers/overview) for LLM integration
- See [Memory Providers](../memory-providers/overview) for state management

:::
