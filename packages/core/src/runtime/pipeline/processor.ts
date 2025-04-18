import { Logger } from "winston";
// Required imports for Operations placeholder
import { z } from "zod";

import { MemoryManager } from "../managers/memory";
import { ICapabilities } from "../managers/model/capability/types";
import { PluginRegistry } from "../managers/plugin";
import { Plugin } from "../providers/plugin";
import {
  AgentContext,
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

  private eventQueue: AgentContext[];
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

  private pushToQueue(context: Omit<AgentContext, "eventQueue">): void {
    const completeContext: AgentContext = {
      ...context
    };

    this.eventQueue.push(completeContext);
    this.logger.debug("Pushed context to queue", {
      type: "processor.queue.push",
      queueLength: this.eventQueue.length
    });

    // Trigger processing
    this.triggerProcessing();
  }

  private shiftFromQueue(): AgentContext | null {
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
    let context = this.shiftFromQueue();
    while (context) {
      try {
        await this.processContext(context);
      } catch (error) {
        this.logger.error("Error processing context", {
          type: "processor.queue.processing.error",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }

      context = this.shiftFromQueue();
    }

    // Queue is now empty
  }

  private async processContext(context: AgentContext): Promise<void> {
    this.logger.debug("Processing context", {
      type: "processor.context.processing",
      context
    });

    const pipeline = await this.evaluatePipeline(context);

    this.executePipeline(pipeline, context);

    const userInput = getUserInput(context);

    if (userInput) {
      const lastContext = context.contextChain[
        context.contextChain.length - 1
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
        context.contextChain
      );
    }

    this.logger.info("pipeline execution complete", {
      type: "runtime.pipeline.execution.complete"
    });

    this.updateMonitoringState(context);
  }

  public async createEvent(
    initialContext: UserInputContext,
    platformContext?: AgentContext["platformContext"]
  ): Promise<void> {
    // Get conversationId from memory manager
    const conversationId = await this.memoryManager.getOrCreateConversation(
      initialContext.user,
      initialContext.pluginId
    );

    // Add conversationId to platform context metadata
    const context: AgentContext = {
      contextChain: [initialContext],
      conversationId,
      platformContext
    };
    try {
      await this.pushToQueue(context);
    } catch (error) {
      this.logger.error("error pushing event to queue", {
        type: "runtime.event.queue.push.failed",
        error: error instanceof Error ? error.message : String(error),
        context: {
          platform: initialContext.pluginId,
          message: initialContext.rawMessage,
          user: initialContext.user
        }
      });
      throw error; // Re-throw to allow caller to handle
    }
  }

  private async evaluatePipeline(context: AgentContext): Promise<Pipeline> {
    // Store the context in history if it's user input
    const userInput = getUserInput(context);

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
      contextChain: context.contextChain,
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
        contextChain: context.contextChain
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
        contextChain: context.contextChain,
        generationContext: pipelineContext,
        template: generatePipelineTemplate(pipelineContext)
      });
      return []; // Return empty pipeline on error
    }
  }

  private async evaluatePipelineModification(
    context: PipelineModificationContext
  ): Promise<PipelineModification> {
    const template = generatePipelineModificationTemplate(context);
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

      return modification;
    } catch (error) {
      this.logger.error("pipeline modification evaluation failed", {
        type: "runtime.pipeline.modification.error",
        error: error instanceof Error ? error : new Error(String(error))
      });
      return {
        shouldModify: false,
        explanation: "Error evaluating pipeline modification",
        modifiedSteps: null
      };
    }
  }

  private async executePipeline(
    pipeline: PipelineStep[],
    context: AgentContext
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
        contextChain: context.contextChain
      });

      while (currentStepIndex < currentPipeline.length) {
        const currentStep = currentPipeline[currentStepIndex];
        if (!currentStep) {
          // Add error to context chain for invalid step
          const errorContext: ErrorContextItem = {
            id: `error-${Date.now()}`,
            pluginId: "runtime",
            type: "error",
            action: "invalid_step",
            content: "Invalid step encountered in pipeline",
            timestamp: Date.now(),
            error: "Invalid step encountered in pipeline"
          };
          context.contextChain.push(errorContext);
          currentStepIndex++;
          continue;
        }

        const plugin = this.pluginRegistry.plugins.find(
          (p) => p.id === currentStep.pluginId
        );

        if (!plugin) {
          // Add error to context chain for missing plugin
          const errorContext: ErrorContextItem = {
            id: `error-${Date.now()}`,
            pluginId: currentStep.pluginId,
            type: "error",
            action: "plugin_not_found",
            content: `Plugin ${currentStep.pluginId} not found`,
            timestamp: Date.now(),
            error: `Plugin ${currentStep.pluginId} not found`,
            failedStep: currentStep
          };
          context.contextChain.push(errorContext);
          currentStepIndex++;
          continue;
        }

        try {
          const executor = await plugin.executors.find(
            (e) => e.name === currentStep.action
          );

          if (!executor) {
            // Add error to context chain for missing executor
            const errorContext: ErrorContextItem = {
              id: `error-${Date.now()}`,
              pluginId: currentStep.pluginId,
              type: "error",
              action: "executor_not_found",
              content: `Executor ${currentStep.action} not found`,
              timestamp: Date.now(),
              error: `Executor ${currentStep.action} not found`,
              failedStep: currentStep
            };
            context.contextChain.push(errorContext);
            currentStepIndex++;
            continue;
          }

          const result = await executor.fn(context);

          // Log step execution
          this.logger.debug("step execution completed", {
            type: "runtime.pipeline.step.executed",
            pipeline: currentPipeline,
            currentStep,
            pipelineLength: currentPipeline.length,
            executedStep: {
              step: currentStep,
              result
            },
            contextChain: context.contextChain
          });

          if (!result.success) {
            // Add error to context chain for failed execution
            const errorContext: ErrorContextItem = {
              id: `error-${Date.now()}`,
              pluginId: currentStep.pluginId,
              type: "error",
              action: currentStep.action,
              content: result.error || "Unknown error",
              timestamp: Date.now(),
              error: result.error || "Unknown error",
              failedStep: currentStep
            };
            context.contextChain.push(errorContext);

            // Update monitoring state after error context changes
            await this.updateMonitoringState(context);
          } else if (result.data) {
            // Add successful result to context chain
            context.contextChain.push({
              id: `${currentStep.pluginId}-${Date.now()}`,
              pluginId: currentStep.pluginId,
              type: currentStep.action,
              action: currentStep.action,
              content: JSON.stringify(result.data),
              timestamp: Date.now(),
              ...result.data
            });

            // Update monitoring state after context changes
            await this.updateMonitoringState(context);
          }

          // Evaluate pipeline modification with updated context
          const modification = await this.evaluatePipelineModification({
            contextChain: context.contextChain,
            currentStep,
            pipeline: currentPipeline,
            availablePlugins: this.pluginRegistry.plugins.map((plugin) => ({
              id: plugin.id,
              name: plugin.name,
              description: plugin.description,
              executors: plugin.executors.map((e) => ({
                name: e.name,
                description: e.description
              }))
            }))
          });

          if (modification.shouldModify && modification.modifiedSteps) {
            // Apply the modification
            currentPipeline = [
              ...currentPipeline.slice(0, currentStepIndex + 1),
              ...modification.modifiedSteps
            ];

            // Log modification
            this.logger.debug("pipeline modification applied", {
              type: "runtime.pipeline.modification.applied",
              currentPipeline,
              currentStepIndex,
              pipelineLength: currentPipeline.length,
              modification,
              contextChain: context.contextChain
            });

            // Emit pipeline modification event
            this.logger.debug("pipeline modification applied", {
              type: "runtime.pipeline.modification.applied",
              currentStep,
              modifiedSteps: modification.modifiedSteps,
              pipeline: currentPipeline
            });
          }
        } catch (error) {
          // Add error to context chain for unexpected errors
          const errorContext: ErrorContextItem = {
            id: `error-${Date.now()}`,
            pluginId: currentStep.pluginId,
            type: "error",
            action: currentStep.action,
            content: error instanceof Error ? error.message : String(error),
            timestamp: Date.now(),
            error: error instanceof Error ? error.message : String(error),
            failedStep: currentStep
          };
          context.contextChain.push(errorContext);

          // Update monitoring state after error context changes
          await this.updateMonitoringState(context);

          // Log failed step
          this.logger.error("step execution failed", {
            type: "runtime.pipeline.step.failed",
            currentPipeline,
            currentStepIndex,
            pipelineLength: currentPipeline.length,
            executedStep: {
              step: currentStep,
              result: {
                success: false,
                error: error instanceof Error ? error.message : String(error)
              }
            },
            contextChain: context.contextChain
          });
        }

        currentStepIndex++;
      }
    } finally {
      await this.updateMonitoringState(context);
    }
  }

  private async updateMonitoringState(context: AgentContext) {
    this.logger.debug("agent state update", {
      type: "runtime.state.update",
      state: {
        currentContext: context,
        queueLength: this.eventQueue.length,
        isProcessing: this.isProcessing,
        lastUpdate: Date.now()
      }
    });
  }
}
