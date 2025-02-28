import { MonitorProvider, AgentState } from "@maiar-ai/core";
import { WebSocket, WebSocketServer } from "ws";

interface WebSocketMonitorOptions {
  port?: number;
  path?: string;
}

export class WebSocketMonitorProvider implements MonitorProvider {
  readonly id = "websocket";
  readonly name = "WebSocket Monitor";
  readonly description = "Monitors agent state through WebSocket connections";

  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(options: WebSocketMonitorOptions = {}) {
    const { port = 3001, path = "/monitor" } = options;

    this.wss = new WebSocketServer({ port, path });

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);

      ws.on("close", () => {
        this.clients.delete(ws);
      });

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "connection",
          message: "Connected to Maiar WebSocket Monitor",
          timestamp: Date.now()
        })
      );
    });
  }

  async init(): Promise<void> {
    // Server is already initialized in constructor
    return Promise.resolve();
  }

  async updateState(state: AgentState): Promise<void> {
    console.log("[WebSocketMonitor] Updating state:", {
      hasContext: !!state.currentContext,
      contextChainLength: state.currentContext?.contextChain?.length,
      state
    });

    const message = {
      type: "state_update",
      data: state,
      timestamp: Date.now()
    };

    this.broadcast(message);
  }

  async logEvent(event: {
    type: string;
    message: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const message = {
      type: "event",
      data: event,
      timestamp: event.timestamp
    };

    this.broadcast(message);
  }

  async checkHealth(): Promise<void> {
    if (!this.wss) {
      throw new Error("WebSocket server is not initialized");
    }
    return Promise.resolve();
  }

  private broadcast(message: unknown): void {
    const payload = JSON.stringify(message);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    }
  }

  // Cleanup method to close server and connections
  public close(): void {
    for (const client of this.clients) {
      client.close();
    }
    this.clients.clear();
    this.wss.close();
  }
}
