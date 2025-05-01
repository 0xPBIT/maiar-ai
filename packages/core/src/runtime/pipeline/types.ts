import { z } from "zod";

// DEV NOTE: GET RID OF THIS ENTIRE FILE OR MOVE THE CONTENTS TO SOMEWHERE ELSE
import { Space } from "../providers/memory";
import { OperationConfig } from "./operations";

// Base context item that all items must include
export interface Context {
  id: string; // Unique identifier for this context item
  pluginId: string; // Which plugin created this context
  content: string; // Serialized content for model consumption
  timestamp: number; // When this context was added
  helpfulInstruction?: string; // Instructions for how to use this context item's data
  metadata?: Record<string, unknown>; // Additional metadata for the context item
}

// The full context chain container
export interface AgentTask {
  trigger: Context;
  contextChain: Context[];
  space: Space;
  metadata: Record<string, unknown>;
}

/**
 * A step in the execution pipeline
 */
export const PipelineStepSchema = z
  .object({
    pluginId: z.string().describe("ID of the plugin to execute"),
    action: z.string().describe("Name of the executor/action to run")
  })
  .describe("A single step in the execution pipeline");

/**
 * Pipeline definition, a sequence of steps to execute in order
 */
export const PipelineSchema = z
  .object({
    steps: z
      .array(PipelineStepSchema)
      .describe("A sequence of steps to execute in order"),
    relatedMemories: z
      .string()
      .describe("The memory context to use for the pipeline during execution")
  })
  .describe("A sequence of steps to execute in order");

export type PipelineStep = z.infer<typeof PipelineStepSchema>;
export type Pipeline = z.infer<typeof PipelineSchema>;

interface PluginExecutor {
  name: string;
  description: string;
}

interface AvailablePlugin {
  id: string;
  name: string;
  description: string;
  executors: PluginExecutor[];
}

/**
 * Context passed to the runtime for pipeline generation
 */
export interface PipelineGenerationContext {
  trigger: AgentTask["trigger"];
  availablePlugins: AvailablePlugin[];
  currentContext: {
    relatedMemoriesContext: string;
  };
}

/**
 * Context passed to the runtime for pipeline modification evaluation
 */
export interface PipelineModificationContext {
  contextChain: AgentTask["contextChain"];
  currentStep: PipelineStep;
  pipeline: PipelineStep[];
}

/**
 * Schema for pipeline modification results from model
 */
export const PipelineModificationSchema = z
  .object({
    shouldModify: z
      .boolean()
      .describe("Whether the pipeline should be modified"),
    explanation: z
      .string()
      .describe("Explanation of why the pipeline needs to be modified"),
    modifiedSteps: z
      .array(PipelineStepSchema)
      .nullable()
      .describe("The new steps to use if modification is needed")
  })
  .describe("Result of pipeline modification evaluation");

export type PipelineModification = z.infer<typeof PipelineModificationSchema>;

export interface GetObjectConfig extends OperationConfig {
  maxRetries?: number;
}
