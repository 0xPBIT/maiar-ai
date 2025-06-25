---
sidebar_position: 1
---

# Getting Started with MAIAR

Welcome to MAIAR. This guide will help you set up and run your own AI agent using the MAIAR framework.

## Prerequisites

Before you begin, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v22.13.x) - We recommend using [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) to manage Node.js versions:

```bash
nvm install 22.13.1
nvm use 22.13.1
```

- A package manager ([npm](https://www.npmjs.com/), [yarn](https://yarnpkg.com/), or [pnpm](https://pnpm.io/))

## Quick Start

1. Initialize the project with your package manager:

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

<Tabs groupId="package-manager">
<TabItem value="npm" label="npm">
```bash
npm create maiar@latest
```
</TabItem>
<TabItem value="yarn" label="yarn">
```bash
yarn create maiar
```
</TabItem>
<TabItem value="pnpm" label="pnpm" default>
```bash
pnpm create maiar
```
</TabItem>
</Tabs>

:::info OpenAI API Setup
The CLI defaults to the OpenAI model provider. To use it, you'll need to:

1. Create an OpenAI account at [platform.openai.com](https://platform.openai.com)
2. Generate an API key in your account settings.
3. Add funds to your account to use the API
4. Add your API key when the CLI prompts you for it

:::

2. Build and start your agent:

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm">
```bash
npm run build
npm start
```
  </TabItem>
  <TabItem value="yarn" label="yarn">
```bash
yarn build
yarn start
```
  </TabItem>
  <TabItem value="pnpm" label="pnpm" default>
```bash
pnpm build
pnpm start
```
  </TabItem>
</Tabs>

3. Test your agent with a simple prompt:

```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"user": "Bob", "message": "Hello, how are you?"}'
```

You should recieve a response from the agent.

## Configuration

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

## Adding Plugins

You can extend your agent's capabilities by installing additional plugins:

<Tabs groupId="package-manager">
  <TabItem value="npm" label="npm">
```bash
npm install @maiar-ai/plugin-discord
````
  </TabItem>
  <TabItem value="yarn" label="yarn">
```bash
yarn add @maiar-ai/plugin-discord
````

  </TabItem>
  <TabItem value="pnpm" label="pnpm" default>
```bash
pnpm add @maiar-ai/plugin-discord
````

  </TabItem>
</Tabs>

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

Check out some of our [plugins](/plugins) to get started.

:::info Troubleshooting

If you encounter any issues:

1. Make sure your OpenAI API key is properly set in the `.env` file
2. Check that all dependencies are installed with your package manager
3. Ensure the `data` directory exists for SQLite storage
4. Check the TypeScript compilation output for any errors

For more help, please [open an issue](https://github.com/maiar-ai/maiar/issues) on our GitHub repository.

:::

:::tip Next Steps

- Explore the [API Reference](/api) to learn about available methods and configurations
- Check out the [Plugins Guide](/docs/building-plugins) to learn how to extend your agent's capabilities
- Join our [Discord](https://discord.gg/7CAjkpCsED) to get help and share your experiences
  :::
