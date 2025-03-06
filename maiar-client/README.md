# Maiar Client

A React-based monitoring dashboard for Maiar AI agents. This client connects to a running Maiar agent via WebSocket and provides real-time visualization of agent state, context chains, events, and more.

![Maiar Client Dashboard](./.github/screenshots/dashboard.png)

## Features

- Real-time monitoring of your Maiar agent
- Visualize current pipeline execution
- Track context chains and state transitions
- Monitor events as they occur
- Chat interface for direct interaction with your agent
- Responsive, grid-based layout
- Dynamic WebSocket URL configuration from the UI

## Prerequisites

- Node.js v22.13.1 or higher
- pnpm (recommended) or npm/yarn

## Getting Started

### Installation

1. Clone the repository (if you haven't already):

```bash
git clone https://github.com/maiar-ai/maiar.git
cd maiar
```

2. Install dependencies:

```bash
pnpm install
```

3. Navigate to the client directory:

```bash
cd maiar-client
```

### Development

To start the client in development mode:

```bash
pnpm dev
```

This will start the client on `http://localhost:5173`.

## Usage

### Connecting to a Maiar Agent

By default, the client connects to WebSocket at `ws://localhost:3001/monitor`. Make sure your Maiar agent is running with the WebSocket monitor provider enabled.

To enable the WebSocket monitor in your Maiar agent, add the provider to your agent configuration:

```typescript
import { createRuntime } from "@maiar-ai/core";
import { WebSocketMonitorProvider } from "@maiar-ai/monitor-websocket";

const runtime = createRuntime({
  // ...other configurations
  monitors: [
    new WebSocketMonitorProvider({
      port: 3001, // Default port
      path: "/monitor" // Default path
    })
  ]
});
```

### Custom WebSocket Configuration

If you need to configure a custom port or path for the WebSocket connection, you'll need to update both the agent's WebSocketMonitorProvider and the client's connection settings.

#### Example: Using a custom WebSocket URL

1. Configure the WebSocketMonitorProvider on your agent:

```typescript
import { createRuntime } from "@maiar-ai/core";
import { WebSocketMonitorProvider } from "@maiar-ai/monitor-websocket";

const runtime = createRuntime({
  // ...other configurations
  monitors: [
    new WebSocketMonitorProvider({
      port: 8080, // Custom port
      path: "/agent-monitor" // Custom path
    })
  ]
});
```

2. Update your client application to connect to the same endpoint by providing the complete WebSocket URL:

```typescript
// In your component or custom hook
import { useMonitorSocket } from "../hooks/useMonitorSocket";

function MyComponent() {
  const { connected, agentState, events } = useMonitorSocket({
    url: "ws://localhost:8080/agent-monitor" // Must match the agent's configuration
  });

  // Rest of your component...
}
```

#### Changing the WebSocket URL from the UI

You can also change the WebSocket URL directly from the client interface:

1. Click on the Connection status chip in the top-right corner of the dashboard
2. Enter your custom WebSocket URL in the provided field
3. Click "Apply" to connect to the new endpoint
4. Use "Reset to Default" to revert to the default WebSocket URL (`ws://localhost:3001/monitor`)

This feature is particularly useful when:

- Testing with different agent configurations
- Connecting to remote Maiar agents
- Switching between different agent instances
- Working in development environments with varying port configurations

### Dashboard Components

The dashboard includes the following components:

- **Current Pipeline**: Visualizes the current execution pipeline and its status
- **Context Chain**: Displays the current context chain being processed
- **Events**: Shows a log of events from the agent
- **Chat**: Provides a simple interface to interact with the agent (if chat functionality is enabled)

### Customizing the Layout

The dashboard uses React Grid Layout for a flexible, responsive layout. You can customize the layout by modifying the grid configuration in `src/components/GridLayout.tsx` or by dragging and dropping the panels to different positions in the client interface.

## Development

### Project Structure

- `src/components/`: React components for the dashboard
- `src/hooks/`: Custom React hooks, including WebSocket connection
- `src/theme/`: Material UI theme configuration
- `src/assets/`: Static assets like images and icons

### Technology Stack

- React 19
- Material UI 6
- React Grid Layout
- TypeScript
- Vite
