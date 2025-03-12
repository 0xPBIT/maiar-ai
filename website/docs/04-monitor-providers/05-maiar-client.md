---
title: Maiar Client Dashboard
description: Real-time visualization and control for your Maiar agent
sidebar_position: 5
---

# Maiar Client Dashboard

The Maiar Client Dashboard provides a sleek, intuitive interface for real-time monitoring and interaction with your Maiar agent. By connecting to the WebSocket Monitor, it offers unparalleled visibility into your agent's operations, thought processes, and activities.

:::tip Related Documentation
This dashboard relies on the [WebSocket Monitor Provider](./websocket-monitor) to function. We recommend reviewing the WebSocket Monitor documentation to understand the underlying communication system.
:::

## Getting Started

### Prerequisites

To use the Maiar Client Dashboard, you need:

1. A running Maiar agent with the WebSocket Monitor enabled
2. A web browser to access the dashboard
3. Access to the Maiar monorepo (for now, as the client is not yet available as a standalone package)

### Setting Up the WebSocket Monitor

First, ensure your agent is configured to use the WebSocket Monitor:

```typescript
import { createRuntime } from "@maiar-ai/core";
import { OpenAIProvider } from "@maiar-ai/model-openai";
import { WebSocketMonitorProvider } from "@maiar-ai/monitor-websocket";

const runtime = createRuntime({
  model: new OpenAIProvider({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o"
  }),
  monitors: [
    new WebSocketMonitorProvider({
      port: 3001, // Default port
      path: "/monitor" // Default path
    })
  ]
});

await runtime.start();
```

For more detailed configuration options for the WebSocket Monitor, see the [WebSocket Monitor documentation](./websocket-monitor.md#configuration-options).

### Launching the Dashboard

To run the Maiar Client Dashboard:

1. Clone the Maiar monorepo if you haven't already:

```bash
git clone https://github.com/maiar-ai/maiar.git
cd maiar
```

2. Install dependencies if you haven't already:

```bash
pnpm install
```

3. Navigate to the client directory:

```bash
cd packages/maiar-client
```

4. Start the development server:

```bash
pnpm dev
```

5. The dashboard will automatically open in your default browser, or you can manually navigate to the URL shown in the terminal (typically http://localhost:3000)

## Dashboard Features

The Maiar Client Dashboard is your agent's control center, offering comprehensive monitoring and interaction capabilities:

### Agent Status

At the top of the dashboard, you'll find the agent's current status:

- **Connection Status**: Whether the dashboard is connected to your agent
- **Runtime Status**: If the agent is running or stopped
- **Queue Status**: The number of tasks in the agent's processing queue

### Pipeline Visualization

The pipeline visualization shows the sequence of steps your agent is planning to execute:

- See the entire thought process as a flowchart
- Watch in real-time as steps are completed or modified
- Understand the decision-making process behind your agent's actions

### Context Chain

The context chain panel displays the history and current state of your agent's reasoning:

- View the accumulated context your agent is using for decisions
- See how previous interactions influence current responses
- Track how memories are being accessed and applied

### Events Log

The events log provides a chronological record of all activities:

- Model requests and responses
- Plugin activations and results
- Runtime state changes
- Errors and warnings
- Performance metrics

Each event entry includes:

- Timestamp
- Event type
- Description
- Expandable metadata with detailed information

### Live Chat

The live chat interface lets you interact directly with your agent:

- Send messages to your agent
- Receive responses in real-time
- See the thought process behind each response
- Test different inputs and observe the resulting behavior

## Technical Details

### How It Works

The Maiar Client Dashboard operates on a WebSocket connection to your agent:

1. Your agent runs with the WebSocket Monitor provider enabled
2. The monitor broadcasts events and state changes as JSON messages
3. The dashboard client connects to this WebSocket endpoint
4. Messages are processed, categorized, and visualized in the interface

The communication protocol between the client and agent is the same as described in the [WebSocket Monitor documentation](./websocket-monitor.md#connecting-from-a-client), with additional message types specific to the dashboard interface.

### Message Structure

The WebSocket Monitor sends several types of messages:

```javascript
// Connection confirmation
{
  type: "connection",
  message: "Connected to Maiar WebSocket Monitor",
  timestamp: 1679012345678
}

// Event publication
{
  type: "publish_event",
  data: {
    type: "model_request", // Event type
    message: "Sending prompt to model",
    timestamp: 1679012345678,
    metadata: {
      tokens: 156,
      model: "gpt-4o"
    }
  },
  timestamp: 1679012345678
}

// Pipeline update
{
  type: "pipeline_update",
  data: {
    steps: [...],
    current_step: 2,
    status: "running"
  },
  timestamp: 1679012345678
}
```

### Advanced Configuration

The dashboard can be configured with various options:

```bash
# Set custom WebSocket URL
npx maiar-client --url ws://your-agent:3001/monitor

# Set a specific polling interval (ms)
npx maiar-client --polling 2000

# Enable debug mode
npx maiar-client --debug

# Launch without automatically opening the browser
npx maiar-client --no-open
```

## Use Cases

### For Developers

- **Debugging**: Identify exactly where and why something went wrong
- **Plugin Development**: Track how your custom plugins interact with the agent
- **Performance Monitoring**: Measure response times and resource usage
- **Behavior Analysis**: Understand the agent's decision-making process

### For Users

- **Transparency**: See what your agent is doing behind the scenes
- **Learning**: Understand how AI assistants process information
- **Troubleshooting**: Identify issues without technical knowledge
- **Customization**: Observe how changes to your agent affect its behavior

## Conclusion

The Maiar Client Dashboard transforms the way you interact with and understand your AI assistant. By providing real-time visibility into your agent's operations, it brings transparency, debuggability, and enhanced control to your Maiar experience.

Whether you're developing complex plugins, building a production application, or simply curious about how your AI assistant thinks, the client dashboard gives you the insights you need to make the most of Maiar's capabilities.

:::tip Next Steps

- Explore the [WebSocket Monitor](./websocket-monitor) to understand the underlying technology
- Learn about [creating custom monitors](./custom-monitors) if you want to build your own visualization tools
  :::
