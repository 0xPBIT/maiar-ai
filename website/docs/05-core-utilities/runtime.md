---
sidebar_position: 1
---

# Runtime

The Runtime is the core building block of Maiar's plugin system. It manages the execution of plugins, handles the event queue, and provides essential operations for plugins to interact with the LLM and memory services.

## Creating a Runtime

The simplest way to create a runtime is using the `createRuntime` function:

```typescript
import { createRuntime } from "@maiar-ai/core";
import { ModelProvider } from "@maiar-ai/model-ollama";

const runtime = createRuntime({
  model: ModelProvider.DeepSeek,
  memory: new SQLiteMemoryProvider(),
  plugins: [
    /* your plugins here */
  ]
});
```

## Runtime Components

The Runtime consists of several key components:

### 1. Plugin Registry

The runtime maintains a registry of all installed plugins and manages their lifecycle:

```typescript
// Register a new plugin
await runtime.registerPlugin(new MyCustomPlugin());

// Get all registered plugins
const plugins = runtime.getPlugins();
```

### 2. LLM Service

The runtime provides access to the Language Model service through its operations:

```typescript
// Available through runtime.operations
const operations = {
  getText: (prompt: string, config?) => string,
  getObject: <T>(schema: ZodType<T>, prompt: string, config?) => T,
  getBoolean: (prompt: string, config?) => boolean
};
```

### 3. Memory Service

The runtime includes a memory service for persistent storage:

```typescript
// Access memory service in plugins
const memory = runtime.memory;
await memory.storeUserInteraction(user, platform, message);
await memory.getRecentConversationHistory(user, platform);
```

### 4. Event Queue

The runtime manages an event queue for handling asynchronous operations and maintaining conversation state:

```typescript
// Push new context to the queue
await runtime.createEvent({
  pluginId: "my-plugin",
  action: "my-action",
  timestamp: Date.now(),
  platform: "cli",
  rawMessage: "Hello",
  user: "user123",
  triggeredBy: "trigger-id"
});
```

## Context Management

The runtime maintains a context chain that represents the state of the conversation:

```typescript
// Access current context in plugins
const context = runtime.context;

// Add to context chain
runtime.pushToContextChain({
  pluginId: "my-plugin",
  action: "my-action",
  timestamp: Date.now()
  // ... additional data
});
```

## Plugin Operations

The runtime provides three core operations that plugins can use:

### getText

Get raw text completion from the LLM:

```typescript
const response = await runtime.operations.getText(
  "What is the capital of France?",
  { temperature: 0.7 }
);
```

### getObject

Extract structured data using Zod schemas:

```typescript
const schema = z.object({
  city: z.string(),
  country: z.string()
});

const location = await runtime.operations.getObject(
  schema,
  "Extract the city and country from: 'I live in Paris, France'",
  { temperature: 0.1 }
);
```

### getBoolean

Get boolean decisions from the LLM:

```typescript
const isQuestion = await runtime.operations.getBoolean(
  "Is this a question: 'What time is it?'",
  { temperature: 0.1 }
);
```

## Error Handling

The runtime includes comprehensive error handling and logging:

```typescript
try {
  await runtime.start();
} catch (error) {
  console.error("Failed to start runtime:", error);
  process.exit(1);
}
```

## Best Practices

1. **Initialization**

   - Always initialize plugins before starting the runtime
   - Handle startup errors appropriately
   - Configure logging as needed

2. **Context Management**

   - Keep context chain items focused and relevant
   - Clean up context when no longer needed
   - Use meaningful timestamps

3. **Operations**

   - Use appropriate temperature settings for different tasks
   - Provide clear prompts for LLM operations
   - Handle operation errors gracefully

4. **Event Queue**
   - Monitor queue length to prevent memory issues
   - Handle event failures appropriately
   - Clean up completed events

## Example: Complete Runtime Setup

Here's a complete example of setting up a runtime with multiple plugins and error handling:

```typescript
import { createRuntime } from "@maiar-ai/core";
import { ModelProvider } from "@maiar-ai/model-ollama";
import { SQLiteMemoryProvider } from "@maiar-ai/memory-sqlite";
import { PluginTerminal } from "@maiar-ai/plugin-terminal";
import { PluginExpress } from "@maiar-ai/plugin-express";

async function main() {
  try {
    // Create runtime with multiple plugins
    const runtime = createRuntime({
      model: ModelProvider.DeepSeek,
      memory: new SQLiteMemoryProvider({
        path: "./memory.db"
      }),
      plugins: [
        new PluginTerminal({ prompt: "agent> " }),
        new PluginExpress({ port: 3000 })
      ]
    });

    // Start the runtime
    await runtime.start();

    // Handle cleanup on exit
    process.on("SIGINT", async () => {
      await runtime.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start agent:", error);
    process.exit(1);
  }
}

main();
```

- Learn about [createEvent](./createEvent) for event handling
- Explore [Building Plugins](../building-plugins/philosophy) for using getObject in plugins
- Check out [Model Providers](../model-providers/overview) for LLM configuration
- Read about [Executors](../building-plugins/executors) for practical usage examples
