import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_URLS, STORAGE_KEYS } from "../config";
import { AgentState, MonitorEvent, PipelineState } from "../types/monitor";
import { MonitorContext } from "./MonitorContext";

export function MonitorProvider({ children }: { children: ReactNode }) {
  // URL and connection state
  const getSavedUrl = () => {
    try {
      return (
        localStorage.getItem(STORAGE_KEYS.MONITOR_WEBSOCKET_URL) ||
        DEFAULT_URLS.MONITOR_WEBSOCKET
      );
    } catch (error) {
      console.error("Failed to load WebSocket URL from localStorage:", error);
      return DEFAULT_URLS.MONITOR_WEBSOCKET;
    }
  };

  const [url, setUrlState] = useState<string>(getSavedUrl());
  const [connected, setConnected] = useState<boolean>(false);

  // Data state
  const [agentState, setAgentState] = useState<AgentState | undefined>(
    undefined
  );
  const [events, setEvents] = useState<MonitorEvent[]>([]);
  const [pipelineState, setPipelineState] = useState<PipelineState | null>(
    null
  );

  // WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const isChangingUrlRef = useRef<boolean>(false);

  // Custom URL setter that saves to localStorage
  const setUrl = useCallback((newUrl: string) => {
    try {
      localStorage.setItem(STORAGE_KEYS.MONITOR_WEBSOCKET_URL, newUrl);
    } catch (error) {
      console.error("Failed to save URL to localStorage:", error);
    }

    isChangingUrlRef.current = true;
    setUrlState(newUrl);
  }, []);

  // Handle WebSocket connection
  const connect = useCallback(() => {
    const cleanup = () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      setConnected(false);
    };

    // Clear previous connection
    cleanup();

    // Create new connection
    try {
      console.log(`Connecting to WebSocket: ${url}`);
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setConnected(true);
        isChangingUrlRef.current = false;
      };

      ws.onclose = (event) => {
        console.log(`WebSocket disconnected, code: ${event.code}`);
        setConnected(false);

        // Only attempt reconnect if not deliberately changing URL
        if (!isChangingUrlRef.current) {
          console.log("Will attempt to reconnect in 3s");
          reconnectTimeoutRef.current = window.setTimeout(() => {
            console.log("Attempting to reconnect");
            connect();
          }, 3000);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onmessage = (event) => {
        try {
          // Log only that a message was received, not the entire data
          console.log("WebSocket message received");
          const message = JSON.parse(event.data);

          // Convert the message to our MonitorEvent format
          const monitorEvent: MonitorEvent = {
            type: message.type || "unknown",
            message: message.message || "",
            timestamp: message.timestamp
              ? new Date(message.timestamp).getTime()
              : Date.now(),
            metadata: { ...message }
          };

          console.log("Processed monitor event:", monitorEvent.type);

          // Handle state updates
          if (message.type === "runtime.state.update" && message.state) {
            console.log("Updating agent state");
            setAgentState(message.state as AgentState);

            // Also ensure we map the state update event correctly to match our types
            monitorEvent.type = "state";
            monitorEvent.metadata = { state: message.state };
          }

          // Handle pipeline generation complete
          else if (
            message.type === "pipeline.generation.complete" &&
            message.pipeline
          ) {
            console.log("Updating pipeline state from generation complete");
            setPipelineState({
              pipeline: message.pipeline
            });
          }

          // Handle pipeline modification
          else if (message.type === "pipeline.modification") {
            console.log("Updating pipeline state from modification");
            setPipelineState({
              pipeline: message.pipeline,
              currentStep: message.currentStep,
              modifiedSteps: message.modifiedSteps,
              explanation: message.explanation
            });
          }

          // Add to events array regardless of type
          setEvents((prev) => {
            const newEvents = [...prev, monitorEvent].slice(-100);
            console.log(`Added event, now have ${newEvents.length} events`);
            return newEvents;
          });
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
    }

    return cleanup;
  }, [url]);

  // Handle URL changes
  useEffect(() => {
    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Clear any existing reconnection timeout
    if (reconnectTimeoutRef.current !== undefined) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    // Short delay to ensure previous connection is closed
    setTimeout(() => {
      connect();
    }, 100);

    return () => {
      if (reconnectTimeoutRef.current !== undefined) {
        window.clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect, url]);

  // Compute derived state
  const contextChain = agentState?.currentContext?.contextChain;
  const lastEventTime =
    events.length > 0 ? events[events.length - 1].timestamp : undefined;

  // Context value
  const value = {
    connected,
    url,
    setUrl,
    agentState,
    contextChain,
    pipelineState,
    events,
    lastEventTime
  };

  return (
    <MonitorContext.Provider value={value}>{children}</MonitorContext.Provider>
  );
}
