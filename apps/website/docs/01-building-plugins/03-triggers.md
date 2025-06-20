---
sidebar_position: 3
title: Triggers
description: Learn about the role of triggers in MAIAR
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
export class TextGenerationPlugin extends Plugin {
  constructor() {
    super({
      id: "plugin-text",
      name: "Text Generation",
      description: "Generate text",
      ...
    });


    this.triggers = [
      {
        name: "server_chat",
        route: {
          path: "/chat",
          handler: this.handleChat.bind(this),
          middleware: [express.json()]
        }
      }
    ];
  }



  private async handleChat(req: Request, res: Response): Promise<void> {
    const { message, user } = req.body;

    // Create event with initial context and response handler
    const platformContext: ChatPlatformContext = {
      platform: this.id,
      responseHandler: (result: unknown) => res.json(result)
    };

    // Create initial context item
    const initialContext: Context = {
      id: `${this.id}-${Date.now()}`,
      pluginId: this.id,
      content: message,
      timestamp: Date.now(),
      metadata: {
        user,
        platformContext
      }
    };

    // Create space for the event to define related memory items
    const spacePrefix = `${this.id}-${user}`;

    const space: Space = {
      id: `${spacePrefix}-${Date.now()}`,
      relatedSpaces: {
        prefix: spacePrefix
      }
    };

    // Add event to the runtime scheduler
    await this.runtime.createEvent(initialContext, space);
  }

  ...
}
```

### Event Creation

Create events with complete context and proper space management:

Demonstrates a one-to-one relationship between events and spaces.

```typescript
const spacePrefix = `${this.id}-${user}`;

const space: Space = {
  id: `${spacePrefix}-${Date.now()}`,
  relatedSpaces: {
    prefix: spacePrefix
  }
};

await this.runtime.createEvent(initialContext, space);
```

:::tip Learn More About Spaces
Spaces are a powerful way to group related memory items together based on forum and function. You can learn more about them [here](../core-utilities/spaces).
:::

### Resource Management

Utilize the plugin lifecycle to initialize and clean up resources.

```typescript
  public async init(): Promise<void> {}

  public async shutdown(): Promise<void> {}
```

:::tip Next Steps

- Learn about [Executors](./executors) for handling events
- Explore [Core Utilities](../core-utilities/runtime) for implementation details
- Check out [Model Providers](../model-providers/overview) for LLM integration
- See [Memory Providers](../memory-providers/overview) for state management

:::
