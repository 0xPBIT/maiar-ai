/*
 * DUPLICATED canonical monitor-event definitions (v0)
 * NOTE: keep in sync with packages/core/src/monitor/events.ts until we extract a shared package.
 */

export interface BaseEvent {
  type: string;
  message: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface PipelineGenerationComplete extends BaseEvent {
  type: "pipeline.generation.complete";
  metadata: {
    pipeline: {
      steps: Array<{ pluginId: string; action: string }>;
      relatedMemories: string;
    };
    currentStepIndex: number;
  };
}

export interface PipelineStepExecuted extends BaseEvent {
  type: "runtime.pipeline.step.executed";
  metadata: {
    pipeline: Array<{ pluginId: string; action: string }>;
    currentStep: { pluginId: string; action: string };
    currentStepIndex: number;
  };
}

export interface PipelineModificationApplied extends BaseEvent {
  type: "runtime.pipeline.modification.applied";
  metadata: {
    explanation: string;
    modifiedSteps: Array<{ pluginId: string; action: string }>;
    currentStep: { pluginId: string; action: string };
    pipeline: Array<{ pluginId: string; action: string }>;
  };
}

export interface AgentStatePayload {
  queueLength: number;
  isRunning: boolean;
  lastUpdate: number;
  currentContext?: unknown;
  /** Number of currently active concurrent tasks */
  activeTasks?: number;
  /** Maximum number of concurrent tasks allowed */
  maxConcurrentTasks?: number;

  // --- pipeline UI fields (optional) ---
  pipeline?: Array<{ pluginId: string; action: string }>;
  relatedMemories?: string;
  currentStepIndex?: number;
  currentStep?: { pluginId: string; action: string };
  modifiedSteps?: Array<{ pluginId: string; action: string }>;
  explanation?: string;
  modificationCheckInProgress?: boolean;
}

export interface StateUpdate extends BaseEvent {
  type: "state";
  metadata: {
    state: AgentStatePayload;
  };
}

export type MonitorEvent = StateUpdate | BaseEvent;
