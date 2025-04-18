import { Logger } from "winston";
// Required imports for Operations placeholder
import { z } from "zod";

import { MemoryManager } from "../managers/memory";
import { ICapabilities } from "../managers/model/capability/types";
import { PluginRegistry } from "../managers/plugin";
import { PluginResult } from "../providers";
import { Plugin } from "../providers/plugin";
import {
  AgentTask,
  BaseContextItem,
  getUserInput,
  UserInputContext
} from "./agent";
import { OperationConfig } from "./operations";
import {
  generatePipelineModificationTemplate,
  generatePipelineTemplate
} from "./templates";
import {
  ErrorContextItem,
  GetObjectConfig,
  Pipeline,
  PipelineGenerationContext,
  PipelineModification,
  PipelineModificationContext,
  PipelineModificationSchema,
  PipelineSchema,
  PipelineStep
} from "./types";

// Interface for the operations object passed to the processor
export interface Operations {
  getObject: <T extends z.ZodType<unknown>>(
    schema: T,
    prompt: string,
    config?: GetObjectConfig // Use GetObjectConfig from ./types
  ) => Promise<z.infer<T>>;
  executeCapability: <K extends keyof ICapabilities>(
    capabilityId: K,
    input: ICapabilities[K]["input"],
    config?: OperationConfig, // Use OperationConfig from ./operations
    modelId?: string
  ) => Promise<ICapabilities[K]["output"]>;
}

export class PipelineProcessor {
  private readonly operations: Operations;
  private readonly pluginRegistry: PluginRegistry;
  private readonly memoryManager: MemoryManager;
  private readonly logger: Logger;

  private eventQueue: AgentTask[];
  private isProcessing: boolean = false;

  constructor(
    operations: Operations,
    pluginRegistry: PluginRegistry,
    memoryManager: MemoryManager,
    parentLogger: Logger
  ) {
    this.operations = operations;
    this.pluginRegistry = pluginRegistry;
    this.memoryManager = memoryManager;
    this.logger = parentLogger.child({ scope: "pipelineProcessor" });

    this.eventQueue = [];
  }

  private enqueue(task: AgentTask): void {
    this.eventQueue.push(task);
    this.logger.debug("Pushed task to queue", {
      type: "processor.queue.push",
      queueLength: this.eventQueue.length
    });

    // Trigger processing
    this.triggerProcessing();
  }

  private dequeue(): AgentTask | null {
    return this.eventQueue.shift() || null;
  }

  private triggerProcessing(): void {
    // If processing is already running, do nothing
    if (this.isProcessing) {
      return;
    }

    // Set processing to true and start processing
    this.isProcessing = true;
    this.logger.debug("Starting queue processing", {
      type: "processor.queue.processing.start",
      queueLength: this.eventQueue.length
    });

    // Process async to not block caller
    setImmediate(() => {
      this.processQueue()
        .catch((error: unknown) => {
          this.logger.error("Unhandled error in queue processing", {
            type: "processor.queue.processing.unhandled_error",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        })
        .finally(() => {
          // Always reset processing state on completion
          this.isProcessing = false;
          this.logger.debug("Queue processing complete", {
            type: "processor.queue.processing.complete",
            queueLength: this.eventQueue.length
          });
        });
    });
  }

  private async processQueue(): Promise<void> {
    let task = this.dequeue();
    while (task) {
      try {
        await this.processTask(task);
      } catch (error) {
        this.logger.error("Error processing task", {
          type: "processor.queue.processing.error",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }

      task = this.dequeue();
    }

    // Queue is now empty
  }

  private async processTask(task: AgentTask): Promise<void> {
    this.logger.debug("Processing task", {
      type: "processor.task.processing",
      task
    });

    const pipeline = await this.createPipeline(task);

    this.executePipeline(pipeline, task);

    const userInput = getUserInput(task);

    if (userInput) {
      const lastContext = task.contextChain[
        task.contextChain.length - 1
      ] as BaseContextItem & { message: string };
      this.logger.info("storing assistant response in memory", {
        type: "runtime.assistant.response.storing",
        user: userInput.user,
        platform: userInput.pluginId,
        response: lastContext.message
      });

      await this.memoryManager.storeAssistantInteraction(
        userInput.user,
        userInput.pluginId,
        lastContext.message,
        task.contextChain
      );
    }

    this.logger.info("pipeline execution complete", {
      type: "runtime.pipeline.execution.complete"
    });

    this.updateMonitoringState(task);
  }

  public async createEvent(
    initialContext: UserInputContext,
    platformContext?: AgentTask["platformContext"]
  ): Promise<void> {
    // Get conversationId from memory manager
    const conversationId = await this.memoryManager.getOrCreateConversation(
      initialContext.user,
      initialContext.pluginId
    );

    // Add conversationId to platform context metadata
    const task: AgentTask = {
      contextChain: [initialContext],
      conversationId,
      platformContext
    };
    try {
      await this.enqueue(task);
    } catch (error) {
      this.logger.error("error pushing event to queue", {
        type: "runtime.event.queue.push.failed",
        error: error instanceof Error ? error.message : String(error),
        task
      });
      throw error; // Re-throw to allow caller to handle
    }
  }

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

      const pipeline = await this.operations.getObject(
        PipelineSchema,
        template,
        {
          temperature: 0.2 // Lower temperature for more predictable outputs
        }
      );

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
          await this.pushErrorToContextChain(result, currentStep, task);

          // Update monitoring state after error context changes
          await this.updateMonitoringState(task);
        } else if (result.data) {
          // Add successful result to context chain
          await this.pushResultToContextChain(result, currentStep, task);

          // Update monitoring state after context changes
          await this.updateMonitoringState(task);
        }

        // Evaluate pipeline modification with updated context
        const { pipeline: updatedPipeline, modification } =
          await this.modifyPipeline(
            {
              contextChain: task.contextChain,
              currentStep,
              pipeline: currentPipeline
            },
            currentStepIndex,
            currentPipeline
          );

        // Log modification result if needed
        if (modification.shouldModify) {
          this.logger.info("pipeline modified", {
            type: "runtime.pipeline.modified",
            explanation: modification.explanation
          });
        }

        currentPipeline = updatedPipeline;

        currentStepIndex++;
      }
    } finally {
      await this.updateMonitoringState(task);
    }
  }

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
      const modification = await this.operations.getObject(
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

    const executor = await plugin.executors.find((e) => e.name === step.action);

    if (!executor) {
      throw new Error(`Executor ${step.action} not found`);
    }

    const result = await executor.fn(task);

    return result;
  }

  private async pushResultToContextChain(
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

  private async pushErrorToContextChain(
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

  private async updateMonitoringState(task: AgentTask) {
    this.logger.debug("agent state update", {
      type: "runtime.state.update",
      state: {
        currentContext: task,
        queueLength: this.eventQueue.length,
        isProcessing: this.isProcessing,
        lastUpdate: Date.now()
      }
    });
  }
}
