import { createContext } from "react";

import {
  AgentState,
  ContextChainItem,
  MonitorEvent,
  PipelineState
} from "../types/monitor";

export interface MonitorContextType {
  // Connection state
  connected: boolean;
  url: string;
  setUrl: (url: string) => void;

  // Agent state
  agentState?: AgentState;
  contextChain?: ContextChainItem[];

  // Pipeline state
  pipelineState: PipelineState | null;

  // Events
  events: MonitorEvent[];
  filteredEvents: (filter: string) => MonitorEvent[];
  lastEventTime?: number;
}

export const MonitorContext = createContext<MonitorContextType | null>(null);
