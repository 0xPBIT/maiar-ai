import { z } from "zod";
import { Plugin } from "../plugin";
import { LLMService } from "../models/service";
import { MemoryService } from "../memory/service";
import { MemoryProvider } from "../memory/types";
import { ModelProvider } from "../models/service";
import { BaseContextItem } from "../types/agent";

/**
 * A step in the execution pipeline
 */
export const PipelineStepSchema = z
  .object({
    pluginId: z.string().describe("ID of the plugin to execute"),
    action: z.string().describe("Name of the executor/action to run")
  })
  .describe("A single step in the execution pipeline");

export const PipelineSchema = z
  .array(PipelineStepSchema)
  .describe("A sequence of steps to execute in order");

export type PipelineStep = z.infer<typeof PipelineStepSchema>;
export type Pipeline = z.infer<typeof PipelineSchema>;

/**
 * Configuration options for the Runtime
 */
export interface RuntimeConfig {
  plugins?: Plugin[];
  llmService: LLMService;
  memoryService: MemoryService;
}

/**
 * Options for creating a new Runtime instance
 */
export interface RuntimeOptions {
  model: ModelProvider;
  memory: MemoryProvider;
  plugins: Plugin[];
}

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

interface ConversationMessage {
  role: string;
  content: string;
  timestamp: number;
}

/**
 * Context passed to the LLM for pipeline generation
 */
export interface PipelineGenerationContext {
  contextChain: BaseContextItem[];
  availablePlugins: AvailablePlugin[];
  currentContext: {
    platform: string;
    message: string;
    conversationHistory: ConversationMessage[];
  };
}

/**
 * Represents an error that occurred during pipeline execution
 */
export interface ErrorContextItem extends BaseContextItem {
  type: "error";
  error: string;
  failedStep?: {
    pluginId: string;
    action: string;
  };
}

/**
 * Context passed to the LLM for pipeline modification evaluation
 */
export interface PipelineEvaluationContext {
  contextChain: BaseContextItem[];
  currentStep: PipelineStep;
  availablePlugins: AvailablePlugin[];
  pipeline: PipelineStep[];
}

/**
 * Schema for pipeline modification results from LLM
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
      .optional()
      .describe("The new steps to use if modification is needed")
  })
  .describe("Result of pipeline modification evaluation");

export type PipelineModification = z.infer<typeof PipelineModificationSchema>;
