// DEV NOTE: GET RID OF THIS ENTIRE FILE OR MOVE THE CONTENTS TO SOMEWHERE ELSE
import { Space } from "../providers/memory";

// Base context item that all items must include
export interface Context {
  id: string; // Unique identifier for this context item
  pluginId: string; // Which plugin created this context
  action: string; // What action/executor was used
  type: string; // Type of context item for model understanding
  content: string; // Serialized content for model consumption
  timestamp: number; // When this context was added
  helpfulInstruction?: string; // Instructions for how to use this context item's data
  metadata?: Record<string, unknown>; // Additional metadata for the context item
}

// The full context chain container
export interface AgentTask {
  trigger: Context;
  context: Context[];
  space: Space;
  metadata: Record<string, unknown>;
  platformContext?: {
    platform: string;
    responseHandler?: (response: unknown) => void;
    metadata?: Record<string, unknown>;
  };
}
