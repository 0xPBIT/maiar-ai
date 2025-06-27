![Maiar banner](./apps/website/static/img/banner.png)

# MAIAR: A Composable, Plugin-Based AI Agent Framework

MAIAR is designed around the **thesis** that AI agents, in their current iteration, primarily consist of three major steps:

1. **Data Ingestion & Triggers** – What causes the AI to act.
2. **Decision-Making** – How the AI determines the appropriate action.
3. **Action Execution** – Carrying out the selected operation.

Instead of rigid workflows or monolithic agent logic, Maiar abstracts these steps into a **modular, plugin-based system**. Developers define **triggers** and **actions** as standalone plugins, while the core runtime dynamically handles decision-making. This enables a highly extensible, composable, and model driven framework where new functionality can be added seamlessly.

## Table of Contents

- [Getting Started with MAIAR](#getting-started-with-maiar)
- [Getting Started Contributing to MAIAR](#getting-started-contributing-to-maiar)
- [How It Works](#how-it-works)
- [Pipes & Context Chains](#pipes--context-chains)
- [Extensibility & Modularity](#extensibility--modularity)
- [Design Principles](#design-principles)
- [Why MAIAR?](#why-maiar)
- [Contributors](#contributors)
- [Star History](#star-history)

## Getting Started with MAIAR

Welcome to MAIAR. This guide will help you set up and run your own AI agent using the MAIAR framework.

### Prerequisites

Before you begin, make sure you have the following installed:

[Node.js](https://nodejs.org/) (v22.13.x) - We recommend using [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to manage Node.js versions:

```bash
nvm install 22.13.1
nvm use 22.13.1
```

A package manager ([npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/))

### Quick Start

1. Initialize the project with your package manager:

```bash
pnpm create maiar
```

> [!NOTE]
>
> The CLI defaults to the OpenAI model provider. To use it, you'll need to:
>
> 1. Create an OpenAI account at [platform.openai.com](https://platform.openai.com)
> 2. Generate an API key in your account settings.
> 3. Add funds to your account to use the API
> 4. Add your API key when the CLI prompts you for it

2. Build and start your agent:

```bash
pnpm build
pnpm start
```

3. Test your agent with a simple prompt:

```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"user": "Bob", "message": "Hello, how are you?"}'
```

You should recieve a response from the agent.

### Configuration

The basic configuration above includes:

- OpenAI's GPT-4.1 as the language model, and DALL-E 3 for image generation.
- SQLite-based conversation memory
- Text and image generation capabilities
- Rich console logging
- Logging over WebSocket for remote monitoring

You can customize the configuration by:

- Changing the OpenAI models used for text and image generation
- Configuring memory storage options (e.g. SQLite, Postgres, etc.)
- Adding more plugins and adjusting their settings

### Adding Plugins

You can extend your agent's capabilities by installing additional plugins:

```bash
pnpm add @maiar-ai/plugin-discord
```

Then add them to your runtime configuration:

```typescript
import { PluginDiscord } from "@maiar-ai/plugin-discord";

// ... other imports

const agent = await Runtime.init({
  // ... other config
  plugins: [
    new PluginDiscord({
      /* Configuration options go here */
    })
    // ... other plugins
  ]
});
```

## Getting Started Contributing to Maiar

### Prerequisites

> [!IMPORTANT]
>
> **Please make sure to checkout the [contributing guide](.github/CONTRIBUTING.md) first and foremost**

1. Make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v22.13.1) - We recommend using [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to manage Node.js versions:

```bash
nvm install 22.13.1
nvm use 22.13.1
```

- The [pnpm](https://pnpm.io/) package manager explicitly - Required for managing the monorepo workspace and its dependencies efficiently

2. Install the project dependencies:

```bash
# From the root of the repository
pnpm install
```

3. Start the development environment. You'll need two terminal windows:

**Terminal 1 - Core Packages:**

```bash
# From the root of the repository
pnpm dev
```

This command watches for changes in the core packages (`packages/**/*.ts`) and automatically rebuilds them. It:

1. Cleans any previous build state
2. Builds all core packages
3. Updates the `.build-complete` marker file with current timestamp to indicate the core packages build is finished as a state file to communicate with the development project
4. Watches for changes and repeats the process

**Terminal 2 - Development Project:**

```bash
# From the root of the repository
cd apps/starter # or your own development project
pnpm dev
```

This command runs the starter project in development mode. It:

1. Watches for changes in both the starter project's source files and the core packages through the `.build-complete` marker file
2. Rebuilds the starter project
3. Restarts the application automatically and handles exiting gracefully so orphaned processes are cleaned up

This setup ensures that changes to either the core packages or the starter project are automatically rebuilt and reflected in your running application, providing a seamless development experience.

> [!NOTE]
>
> The `apps/starter` project serves as a reference implementation demonstrating how to develop against the core MAIAR packages. You can apply this same development setup to any project that depends on MAIAR packages - simply mirror the dev script configuration and `.build-complete` marker file handling shown in the starter project's package.json. The key focus of this repository is the core packages in `packages/*`, with `apps/starter` serving as an example consumer.

## **How It Works**

At its core, MAIAR builds execution pipelines dynamically. When an event or request is received, the runtime:

1. **Processes triggers** to determine when and how the AI should act.
2. **Uses model assisted reasoning** to construct an execution pipeline.
3. **Runs plugins in sequence**, modifying a structured **context chain** as it progresses.

Rather than hardcoding client logic, MAIAR produces **emergent behavior** by selecting the most relevant plugins and actions based on context. This enables adaptability and ensures that agents can evolve without rewriting core logic.

## **Pipes & Context Chains**

MAIAR's architecture is influenced by **Unix pipes**, where structured input flows through a sequence of operations, using a standard in and out data interface. Each plugin acts as an independent unit:

1. **Receives input (context) from prior steps**
2. **Performs a specific operation**
3. **Outputs a structured result to the next step**

This structured **context chain** ensures:

- **Highly composable plugins** – New functionality can be added without modifying existing logic.
- **Dynamic execution pipelines** – Workflows are built on-the-fly rather than being hardcoded.
- **Transparent debugging & monitoring** – Each step in the chain is tracked and can be audited.

This design enables MAIAR to remain **declarative** and **extensible**, allowing developers to build complex AI workflows without locking themselves into rigid architectures.

## **Extensibility & Modularity**

MAIAR is intentionally **unopinionated** about external dependencies, ensuring developers have full control over their infrastructure. The framework avoids enforcing specific technologies, making it easy to integrate with:

- **Database Adapters** – Works with any database system.
- **Model Providers** – Supports OpenAI, local models, or custom integrations.
- **Logging & Monitoring** – Custom logging systems can be plugged in without modifying core logic.
- **Future Expansions** – As needs evolve, new capabilities can be added without disrupting existing workflows.

By maintaining a **flexible core**, MAIAR ensures that AI agents can adapt to different environments and use cases without unnecessary constraints.

## **Design Principles**

- **Plugin-First** – Every capability, from event ingestion to action execution, is encapsulated in a plugin.
- **Modular & Composable** – No rigid loops, no hardcoded workflows. The agent dynamically assembles execution pipelines.
- **Model Driven Behavior** – Instead of pre-defined workflows, the AI evaluates its available tools and selects the best course of action.
- **Declarative Plugin Interface** – Plugins declare their triggers and actions, while the runtime orchestrates them.
- **Pipes & Context Chains** – Input flows through plugins in a structured sequence, mirroring Unix pipes.
- **Extensibility & Flexibility** – The core library avoids enforcing specific tools or integrations. It's designed around interfaces and providers that allow you to plug in your own tools and integrations.

## **Why MAIAR?**

- **Effortless Development** – Define a plugin, specify its triggers & actions, and the agent handles the rest.
- **Dynamic AI Workflows** – Pipelines are built on-the-fly, allowing flexible and emergent behavior.
- **Composability-First** – Standardized context chains make plugins reusable and easily integrable.
- **Unopinionated & Extensible** – Developers have full control over databases, models, and infrastructure choices.

MAIAR isn't just another AI agent framework—it's a **declarative, extensible, and composable way to build intelligent applications**. Whether you're adding new capabilities or integrating with existing platforms, MAIAR makes it simple.

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=UraniumCorporation/maiar-ai&type=Date)](https://www.star-history.com/#UraniumCorporation/maiar-ai&Date)

## Contributors

<a href="https://github.com/UraniumCorporation/maiar-ai/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=UraniumCorporation/maiar-ai" />
</a>
