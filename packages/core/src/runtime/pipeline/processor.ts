import { Logger } from "winston";

import { MemoryManager, PluginRegistry, Runtime } from "../..";
import { PluginResult } from "../providers";
import { Plugin } from "../providers/plugin";
import { BaseContextItem, getUserInput } from "./agent";
import { AgentTask } from "./agent";
import {
  generatePipelineModificationTemplate,
  generatePipelineTemplate
} from "./templates";
import {
  ErrorContextItem,
  Pipeline,
  PipelineGenerationContext,
  PipelineModification,
  PipelineModificationContext,
  PipelineModificationSchema,
  PipelineSchema,
  PipelineStep
} from "./types";

export class Processor {
  private readonly runtime: Runtime;
  private readonly memoryManager: MemoryManager;
  private readonly pluginRegistry: PluginRegistry;

  public get logger(): Logger {
    return this.runtime.logger.child({ scope: "processor" });
  }

  constructor(
    runtime: Runtime,
    memoryManager: MemoryManager,
    pluginRegistry: PluginRegistry
  ) {
    this.runtime = runtime;
    this.memoryManager = memoryManager;
    this.pluginRegistry = pluginRegistry;
  }

  /**
   * Spawns the pipeline workflow, which creates a pipeline, executes pipeline steps, and modifies the pipeline as needed durin execution
   * @param task - the task to execute, internally contains the context chain which is modified as the pipeline is executed
   * @returns the context chain after the pipeline has been executed
   */
  public async spawn(task: AgentTask): Promise<BaseContextItem[]> {
    const pipeline = await this.createPipeline(task);
    await this.executePipeline(pipeline, task);
    return task.contextChain;
  }

  /**
   * Generates a tool-based workflow called a pipeline with the available action executors.
   * This pipeline is the main execution logic for the agent, forming the basis for how it
   * plans, executes, and adapts to the task at hand.
   *
   * @param task - tasks originate from plugin triggers and define different kinds of metadata, as well as storing the context chain
   * @returns
   */
  private async createPipeline(task: AgentTask): Promise<Pipeline> {
    // Store the context in history if it's user input
    const userInput = getUserInput(task);

    // Get all available executors from plugins
    const availablePlugins = this.pluginRegistry.plugins.map(
      (plugin: Plugin) => ({
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        executors: plugin.executors.map((e) => ({
          name: e.name,
          description: e.description
        }))
      })
    );

    // Get platform and message from user input or use defaults
    const platform = userInput?.pluginId || "unknown";
    const message = userInput?.rawMessage || "";

    // Get conversation history if user input exists
    let conversationHistory: {
      role: string;
      content: string;
      timestamp: number;
    }[] = [];
    if (userInput) {
      conversationHistory =
        await this.memoryManager.getRecentConversationHistory(
          userInput.user,
          platform
        );
    }

    // Create the generation context
    const pipelineContext: PipelineGenerationContext = {
      contextChain: task.contextChain,
      availablePlugins,
      currentContext: {
        platform,
        message,
        conversationHistory
      }
    };

    try {
      // Generate the pipeline using model
      const template = generatePipelineTemplate(pipelineContext);

      // Log pipeline generation start
      this.logger.info("pipeline generation start", {
        type: "pipeline.generation.start",
        platform,
        message,
        template
      });

      this.logger.debug("generating pipeline", {
        type: "runtime.pipeline.generating",
        context: pipelineContext,
        template,
        contextChain: task.contextChain
      });

      const pipeline = await this.runtime.getObject(PipelineSchema, template, {
        temperature: 0.2 // Lower temperature for more predictable outputs
      });

      // Add concise pipeline steps log
      const steps = pipeline.map((step) => `${step.pluginId}:${step.action}`);
      this.logger.info("pipeline steps", {
        type: "runtime.pipeline.steps",
        steps
      });

      // Log successful pipeline generation
      this.logger.info("pipeline generation complete", {
        type: "pipeline.generation.complete",
        platform,
        message,
        template,
        pipeline,
        steps
      });

      this.logger.info("generated pipeline", {
        type: "runtime.pipeline.generated",
        pipeline
      });

      return pipeline;
    } catch (error) {
      // Log pipeline generation error
      this.logger.error("pipeline generation failed", {
        type: "pipeline.generation.error",
        platform,
        message,
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack
              }
            : error,
        template: generatePipelineTemplate(pipelineContext)
      });

      this.logger.error("pipeline generation failed", {
        type: "runtime.pipeline.generation.error",
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack
              }
            : error,
        platform: userInput?.pluginId || "unknown",
        message: userInput?.rawMessage || "",
        contextChain: task.contextChain,
        generationContext: pipelineContext,
        template: generatePipelineTemplate(pipelineContext)
      });
      return []; // Return empty pipeline on error
    }
  }

  /**
   * Consumes a list of pipeline steps and begins orchestrating the workflow to execute and modify tasks
   * @param pipeline - the pipeline to execute, created by the createPipeline method
   * @param task - the task to execute, internally contains the context chain which is modified as the pipeline is executed
   */
  private async executePipeline(
    pipeline: PipelineStep[],
    task: AgentTask
  ): Promise<void> {
    try {
      let currentPipeline = [...pipeline];
      let currentStepIndex = 0;

      // Log initial pipeline state
      this.logger.debug("pipeline state updated", {
        type: "runtime.pipeline.state",
        currentPipeline,
        currentStepIndex,
        pipelineLength: currentPipeline.length,
        contextChain: task.contextChain
      });

      while (currentStepIndex < currentPipeline.length) {
        const currentStep = currentPipeline[currentStepIndex];
        if (!currentStep) {
          currentStepIndex++;
          continue;
        }

        const result = await this.executePipelineStep(currentStep, task);

        if (!result.success) {
          // Add error to context chain for failed execution
          this.pushErrorToContextChain(result, currentStep, task);

          // Update monitoring state after error context changes
          this.updateMonitoringState(task);
        } else if (result.data) {
          // Add successful result to context chain
          this.pushResultToContextChain(result, currentStep, task);

          // Update monitoring state after context changes
          this.updateMonitoringState(task);
        }

        // Evaluate pipeline modification with updated context
        const { pipeline: updatedPipeline } = await this.modifyPipeline(
          {
            contextChain: task.contextChain,
            currentStep,
            pipeline: currentPipeline
          },
          currentStepIndex,
          currentPipeline
        );

        currentPipeline = updatedPipeline;
        currentStepIndex++;
      }
    } finally {
      this.updateMonitoringState(task);
    }
  }

  /**
   * Evaluates the pipeline after each step and determines if a modification is necessary.
   * Program failures, errors, data that updates the context or changes the frame of reference for the agent will invoke a modification.
   * Modifications are done to change the future steps of the pipeline either by adding, removing, or reordering steps.
   * Modifications can not be done to the past steps of the pipeline.
   * @param context - the context of the pipeline modification
   * @param currentStepIndex - the index of the current step in the pipeline
   * @param currentPipeline - the current pipeline
   * @returns the modified pipeline and the modification result
   */
  private async modifyPipeline(
    context: PipelineModificationContext,
    currentStepIndex: number,
    currentPipeline: PipelineStep[]
  ): Promise<{
    pipeline: PipelineStep[];
    modification: PipelineModification;
  }> {
    const availablePlugins = this.pluginRegistry.plugins.map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      executors: plugin.executors.map((e) => ({
        name: e.name,
        description: e.description
      }))
    }));

    const availablePluginsString = JSON.stringify(availablePlugins);

    const template = generatePipelineModificationTemplate(
      context,
      availablePluginsString
    );
    this.logger.debug("evaluating pipeline modification", {
      type: "runtime.pipeline.modification.evaluating",
      context,
      template
    });

    try {
      const modification = await this.runtime.getObject(
        PipelineModificationSchema,
        template,
        {
          temperature: 0.2 // Lower temperature for more predictable outputs
        }
      );

      this.logger.info("pipeline modification evaluation result", {
        type: "runtime.pipeline.modification.result",
        shouldModify: modification.shouldModify,
        explanation: modification.explanation,
        modifiedSteps: modification.modifiedSteps
      });

      let updatedPipeline = [...currentPipeline];

      // Apply the modification if needed
      if (modification.shouldModify && modification.modifiedSteps) {
        // Log modification result if needed
        if (modification.shouldModify) {
          this.logger.info("pipeline modified", {
            type: "runtime.pipeline.modified",
            explanation: modification.explanation
          });
        }
        // Apply the modification
        updatedPipeline = [
          ...currentPipeline.slice(0, currentStepIndex + 1),
          ...modification.modifiedSteps
        ];

        // Log modification
        this.logger.debug("pipeline modification applied", {
          type: "runtime.pipeline.modification.applied",
          updatedPipeline,
          currentStepIndex,
          pipelineLength: updatedPipeline.length,
          modification,
          contextChain: context.contextChain
        });

        // Emit pipeline modification event
        this.logger.debug("pipeline modification applied", {
          type: "runtime.pipeline.modification.applied",
          currentStep: context.currentStep,
          modifiedSteps: modification.modifiedSteps,
          pipeline: updatedPipeline
        });
      }

      return {
        pipeline: updatedPipeline,
        modification
      };
    } catch (error) {
      this.logger.error("pipeline modification evaluation failed", {
        type: "runtime.pipeline.modification.error",
        error: error instanceof Error ? error : new Error(String(error))
      });
      return {
        pipeline: currentPipeline,
        modification: {
          shouldModify: false,
          explanation: "Error evaluating pipeline modification",
          modifiedSteps: null
        }
      };
    }
  }

  /**
   * Executes a single step of the pipeline
   * @param step - the step to execute
   * @param task - the current task, internally contains the context chain which is passed to plugins for use
   * @returns the result of the step
   */
  private async executePipelineStep(
    step: PipelineStep,
    task: AgentTask
  ): Promise<PluginResult> {
    const plugin = this.pluginRegistry.plugins.find(
      (p) => p.id === step.pluginId
    );

    if (!plugin) {
      throw new Error(`Plugin ${step.pluginId} not found`);
    }

    const executor = plugin.executors.find((e) => e.name === step.action);

    if (!executor) {
      throw new Error(`Executor ${step.action} not found`);
    }

    const result = await executor.fn(task);

    return result;
  }

  /**
   * Pushes the result of a plugin execution to the context chain
   * @param result - the result of the plugin execution
   * @param step - the step that was executed
   * @param task - the current task, internally contains the context chain which is modified as the pipeline is executed
   */
  private pushResultToContextChain(
    result: PluginResult,
    step: PipelineStep,
    task: AgentTask
  ) {
    task.contextChain.push({
      id: `${step.pluginId}-${Date.now()}`,
      pluginId: step.pluginId,
      type: step.action,
      action: step.action,
      content: JSON.stringify(result.data),
      timestamp: Date.now(),
      ...result.data
    });
  }

  /**
   * Pushes an error to the context chain
   * @param result - the result of the plugin execution
   * @param step - the step that was executed
   * @param task - the current task, internally contains the context chain which is modified as the pipeline is executed
   */
  private pushErrorToContextChain(
    result: PluginResult,
    step: PipelineStep,
    task: AgentTask
  ) {
    const errorContext: ErrorContextItem = {
      id: `error-${Date.now()}`,
      pluginId: step.pluginId,
      type: "error",
      action: step.action,
      content: result.error || "Unknown error",
      timestamp: Date.now(),
      error: result.error || "Unknown error",
      failedStep: step
    };
    task.contextChain.push(errorContext);
  }

  private updateMonitoringState(task: AgentTask) {
    this.logger.debug("agent state update", {
      type: "runtime.state.update",
      state: {
        currentContext: task,
        lastUpdate: Date.now()
      }
    });
  }
}
