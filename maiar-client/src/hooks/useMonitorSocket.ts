import { useEffect, useRef, useState } from "react";

// Types from the monitor
interface AgentState {
  queueLength: number;
  isRunning: boolean;
  lastUpdate: number;
  metadata?: Record<string, unknown>;
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

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, connected: true }));
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case "state_update":
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

    return () => {
      ws.close();
    };
  }, [url]);

  return state;
}
