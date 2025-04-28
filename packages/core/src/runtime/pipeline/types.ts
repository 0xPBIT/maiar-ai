import { z } from "zod";

import { Memory } from "../providers/memory";
import { AgentTask } from "./agent";
import { OperationConfig } from "./operations";

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
  .array(PipelineStepSchema)
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
    relatedMemories: Memory[];
  };
}

/**
 * Context passed to the runtime for pipeline modification evaluation
 */
export interface PipelineModificationContext {
  context: AgentTask["context"];
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
