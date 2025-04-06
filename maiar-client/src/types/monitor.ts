// Base event type
export interface BaseMonitorEvent {
  type: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

// Specific event types with proper metadata typing
export interface PipelineGenerationCompleteEvent extends BaseMonitorEvent {
  type: "pipeline.generation.complete";
  metadata: {
    pipeline: Array<{ pluginId: string; action: string }>;
    currentStepIndex: number;
  };
}

export interface PipelineStepExecutedEvent extends BaseMonitorEvent {
  type: "runtime.pipeline.step.executed";
  metadata: {
    pipeline: Array<{ pluginId: string; action: string }>;
    currentStep: { pluginId: string; action: string };
    currentStepIndex?: number;
  };
}

export interface PipelineModificationEvent extends BaseMonitorEvent {
  type: "pipeline.modification";
  metadata: {
    explanation: string;
    shouldModify: boolean;
    currentStep: { pluginId: string; action: string };
    modifiedSteps: Array<{ pluginId: string; action: string }>;
    pipeline: Array<{ pluginId: string; action: string }>;
  };
}

export interface PipelineGenerationStartEvent extends BaseMonitorEvent {
  type: "pipeline.generation.start";
  metadata: {
    platform?: string;
    message?: string;
  };
}

export interface StateUpdateEvent extends BaseMonitorEvent {
  type: "state";
  metadata: {
    state: AgentState;
  };
}

// Union type of all known event types
export type MonitorEvent =
  | PipelineGenerationCompleteEvent
  | PipelineModificationEvent
  | PipelineGenerationStartEvent
  | StateUpdateEvent
  | BaseMonitorEvent; // Fallback for unknown event types

// Agent state structure
export interface AgentState {
  queueLength: number;
  isRunning: boolean;
  lastUpdate: number;
  metadata?: Record<string, unknown>;
  currentContext?: {
    contextChain: Array<ContextChainItem>;
  };
}

// Context chain item
export interface ContextChainItem {
  id: string;
  pluginId: string;
  type: string;
  action: string;
  content: string;
  timestamp: number;
  error?: string;
}

// Pipeline state
export interface PipelineState {
  pipeline: Array<{ pluginId: string; action: string }>;
  currentStepIndex?: number;
  currentStep?: { pluginId: string; action: string };
  modifiedSteps?: Array<{ pluginId: string; action: string }>;
  explanation?: string;
}

// WebSocket message structure
export interface WebSocketMessage {
  type: "publish_event" | "connection";
  data?: MonitorEvent;
  timestamp: number;
  message?: string;
}
