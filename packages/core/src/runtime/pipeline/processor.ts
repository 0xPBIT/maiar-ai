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
  EventQueue,
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
  public readonly queueInterface: EventQueue;
  private currentContext: AgentContext | undefined;
  private isRunning: boolean;

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
    this.queueInterface = {
      push: async (context: Omit<AgentContext, "eventQueue">) => {
        this.eventQueue.push({ ...context, eventQueue: this.queueInterface });
        this.logger.debug("Raw push to queue", {
          type: "processor.queue.raw_push",
          queueLength: this.eventQueue.length
        });
      },
      shift: async () => {
        const context = this.eventQueue.shift();
        this.logger.debug("Shifted from queue", {
          type: "processor.queue.shift",
          queueLength: this.eventQueue.length,
          contextExists: !!context
        });
        return context;
      }
    };
    this.currentContext = undefined;
    this.isRunning = false;
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("PipelineProcessor already running.");
      return;
    }
    this.isRunning = true;
    this.logger.info("Starting evaluation loop", {
      type: "processor.evaluation.loop.starting"
    });
    setImmediate(() => {
      this.runEvaluationLoop().catch((error) => {
        this.logger.error("Unhandled error in evaluation loop", {
          type: "processor.evaluation.loop.unhandled_error",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        this.isRunning = false;
      });
    });
  }

  public stop(): void {
    if (!this.isRunning) {
      this.logger.warn("PipelineProcessor is not running.");
      return;
    }
    this.isRunning = false;
    this.logger.info("Stopping evaluation loop", {
      type: "processor.evaluation.loop.stopping"
    });
  }

  /**
   * Push a new context to the event queue
   */
  public pushContext(context: AgentContext): void {
    this.eventQueue.push(context);
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
      platformContext,
      eventQueue: this.queueInterface
    };
    try {
      await this.queueInterface.push(context);
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

  private async runEvaluationLoop(): Promise<void> {
    this.logger.info("starting evaluation loop", {
      type: "runtime.evaluation.loop.starting"
    });

    while (this.isRunning) {
      const context = await this.eventQueue.shift();
      if (!context) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Sleep to prevent busy loop
        continue;
      }

      const userInput = getUserInput(context);
      this.logger.debug("processing context from queue", {
        type: "runtime.context.processing",
        context: {
          platform: userInput?.pluginId,
          message: userInput?.rawMessage,
          queueLength: this.eventQueue.length
        }
      });

      try {
        // Set current context before pipeline
        this.currentContext = context;

        this.logger.debug("evaluating pipeline for context", {
          type: "runtime.pipeline.evaluating",
          context: {
            platform: userInput?.pluginId,
            message: userInput?.rawMessage,
            queueLength: this.eventQueue.length
          }
        });

        const pipeline = await this.evaluatePipeline(context);
        this.logger.info("generated pipeline", {
          type: "runtime.pipeline.generated",
          pipeline
        });

        this.logger.debug("executing pipeline", {
          type: "runtime.pipeline.executing",
          pipeline
        });

        await this.executePipeline(pipeline, context);

        // Post-event logging
        this.logger.info("post-event context chain state", {
          type: "runtime.context.post_event",
          phase: "post-event",
          platform: userInput?.pluginId,
          user: userInput?.user,
          contextChain: context.contextChain
        });

        // Store agent message and context in memory with complete context chain
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
      } catch (error) {
        this.logger.error("error in evaluation loop", {
          type: "runtime.evaluation.loop.error",
          error: error instanceof Error ? error : new Error(String(error)),
          context: {
            message: userInput?.rawMessage,
            platform: userInput?.pluginId,
            user: userInput?.user
          }
        });

        // Log the error
        this.logger.error("runtime error occurred", {
          type: "runtime_error",
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      } finally {
        // Clear current context after execution
        this.currentContext = undefined;
        await this.updateMonitoringState();
      }
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
    this.currentContext = context;

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
            await this.updateMonitoringState();
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
            await this.updateMonitoringState();
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
          await this.updateMonitoringState();

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
      this.currentContext = undefined;
      await this.updateMonitoringState();
    }
  }

  private async updateMonitoringState() {
    this.logger.debug("agent state update", {
      type: "runtime.state.update",
      state: {
        currentContext: this.currentContext,
        queueLength: this.eventQueue.length,
        isRunning: this.isRunning,
        lastUpdate: Date.now()
      }
    });
  }
}
