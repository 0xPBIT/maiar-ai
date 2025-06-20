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
const runtime = createRuntime({
  plugins: [
    new XPlugin(), // Handle X communication
    new SolanaPlugin(), // Handle Solana transactions
    new WeatherPlugin() // Provide weather data
  ]
});
```

### Context-Aware

Plugins should be mindful of the context chain:

```typescript
execute: async (params: any, context: PluginContext) => {
  // Read existing context
  const userData = context.get("user_data");

  // Add new data to context
  context.set("weather_data", await this.getWeather(userData.location));

  return { success: true };
};
```

### Declarative Interface

Plugins declare their capabilities through metadata:

```typescript
super({
  id: "weather-plugin",
  name: "Weather",
  description: "Provides weather information",
  capabilities: ["get_weather", "weather_alerts"]
});
```

This pipeline architecture enables:

- Clean separation of concerns
- Flexible composition of functionality
- Clear data flow through the system
- Easy addition of new capabilities

:::tip Next Steps

- Learn about [Executors](./executors) in detail
- Understand [Triggers](./triggers) and event handling
- Explore [Core Utilities](../core-utilities/runtime) for implementation details
- Check out [Model Providers](../model-providers/overview) for model integration
- See [Memory Providers](../memory-providers/overview) for state management

:::
