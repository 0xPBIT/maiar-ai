---
sidebar_position: 1
title: Philosophy
description: Learn the philosophy of building plugins for MAIAR
---

# Plugin Philosophy

MAIAR is built around the concept of Unix-style pipelines, where data flows through a sequence of operations. This design philosophy enables highly composable and flexible AI agents.

## Core Concepts

### Pipeline Architecture

Just like Unix commands can be chained together with pipes (`|`), MAIAR plugins form a pipeline where:

1. Data flows through a sequence of operations
2. Each plugin is an independent unit
3. Plugins can be composed to create complex behaviors
4. Context is passed and transformed along the chain

### Plugin Components

Each plugin in MAIAR can have two main types of components:

1. **Triggers** - Event listeners that determine when the agent should act

   - Listen for external events (HTTP requests, messages, etc.)
   - Create initial context for the agent
   - Set up response handlers for communication

2. **Executors** - Actions that the agent can perform
   - Provide specific functionality (e.g., getting weather data)
   - Transform or enhance context
   - Return structured results

### Context Chain

The context chain is central to MAIAR's pipeline architecture:

```
[Trigger] → [Initial Context] → [Executor 1] → [Executor 2] → [Response]
                ↑                    ↑              ↑
           User Input          Transform Data    Add Data
```

Each step in the pipeline can:

- Read from the context
- Modify or enhance the context
- Pass the modified context forward

## Design Principles

### Single Responsibility

Each plugin should have a clear, focused purpose. For example:

- A weather plugin provides weather data
- A X plugin handles X communication
- A Solana plugin handles Solana transactions

### Composability

Plugins should be designed to work together. For example:

```typescript
// Plugins can be combined to create complex behaviors
const agent = await Runtime.init({
  // ... other configurations
  plugins: [
    new TextGenerationPlugin(),
    new TimePlugin(),
    new SearchPlugin({
      apiKey: process.env.PERPLEXITY_API_KEY as string
    })
    // ... other plugins
  ]
});
```

### Declarative Interface

Plugins declare their capabilities through metadata:

```typescript
// Snippet from inside a plugin, this is not a full implementation
export class WeatherPlugin extends Plugin {
  constructor() {
    super({
      id: "weather-plugin",
      requiredCapabilities: [multiModalTextGenerationCapability.id] // generate text using text and images as input
    });
    // other constructor code ...
  }

  // plugin implementation code ...
}
```

This pipeline architecture enables:

- Clean separation of concerns
- Flexible composition of functionality
- Clear data flow through the system
- Easy addition of new capabilities

:::tip Next Steps

- Learn about [Executors](./executors) in detail
- Understand [Triggers](./triggers) and event handling
- Learn more about [Capabilities](../capabilities/capabilities)

:::
