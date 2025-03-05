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
