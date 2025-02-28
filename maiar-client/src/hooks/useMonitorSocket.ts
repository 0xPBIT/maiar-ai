import { useEffect, useRef, useState, useCallback } from "react";

// Types from the monitor
interface AgentState {
  queueLength: number;
  isRunning: boolean;
  lastUpdate: number;
  metadata?: Record<string, unknown>;
  currentContext?: {
    contextChain: Array<{
      id: string;
      pluginId: string;
      type: string;
      action: string;
      content: string;
      timestamp: number;
      error?: string;
    }>;
  };
}

interface MonitorEvent {
  type: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface WebSocketMessage {
  type: "state_update" | "event" | "connection";
  data?: AgentState | MonitorEvent;
  timestamp: number;
  message?: string;
}

interface UseMonitorSocketOptions {
  url?: string;
}

interface MonitorSocketState {
  connected: boolean;
  agentState?: AgentState;
  events: MonitorEvent[];
}

export function useMonitorSocket({
  url = "ws://localhost:3001/monitor"
}: UseMonitorSocketOptions = {}) {
  const [state, setState] = useState<MonitorSocketState>({
    connected: false,
    events: []
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>();

  const connect = useCallback(() => {
    const cleanup = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return cleanup;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, connected: true }));
      // Clear any existing reconnection timeout
      if (reconnectTimeoutRef.current !== undefined) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
      // Start polling for reconnection
      reconnectTimeoutRef.current = window.setTimeout(connect, 1000); // Poll every second
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case "state_update":
            console.log("Received state update:", message.data);
            setState((prev) => ({
              ...prev,
              agentState: message.data as AgentState
            }));
            break;

          case "event":
            setState((prev) => ({
              ...prev,
              events: [...prev.events, message.data as MonitorEvent].slice(-100) // Keep last 100 events
            }));
            break;

          case "connection":
            // Handle connection message if needed
            break;
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    return cleanup;
  }, [url]);

  useEffect(() => {
    const cleanup = connect();

    return () => {
      if (reconnectTimeoutRef.current !== undefined) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      cleanup?.();
      wsRef.current?.close();
    };
  }, [connect]);

  return state;
}
