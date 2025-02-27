import { Plugin } from "../plugin";
import { PluginRegistry } from "../registry";
import {
  AgentContext,
  EventQueue,
  UserInputContext,
  BaseContextItem,
  getUserInput
} from "../types/agent";
import {
  PipelineSchema,
  PipelineStep,
  Pipeline,
  PipelineGenerationContext,
  PipelineEvaluationContext,
  PipelineModification,
  PipelineModificationSchema,
  RuntimeConfig,
  RuntimeOptions,
  ErrorContextItem
} from "./types";
import {
  generatePipelineTemplate,
  generatePipelineModificationTemplate
} from "./templates";
import { getObject } from "../operations/getObject";
import { getText } from "../operations/getText";
import { getBoolean } from "../operations/getBoolean";
import { type GetObjectConfig } from "../operations/getObject";
import { LLMService } from "../models/service";
import { createLogger, logPipelineState } from "../utils/logger";
import { z } from "zod";
import { OperationConfig } from "../operations/base";
import { MemoryService } from "../memory/service";
import { MonitorService } from "../monitor/service";

const log = createLogger("runtime");

type ContextItemWithHistory = BaseContextItem & {
  messageHistory: { role: string; content: string; timestamp: number }[];
};

export function createRuntime(options: RuntimeOptions): Runtime {
  // Initialize LLM service with the provided model
  const llmService = new LLMService(options.model);

  if (options.model.init) {
    // Initialize it
    options.model
      .init()
      .then(() => {
        log.debug("LLM Model initialized successfully!");
      })
      .catch((err) => {
        log.error("LLM Model failed to initialize", err);
        throw new Error(err.message);
      });
  }

  // Do check if the healthcheck is good before bootstrapping.
  options.model
    .checkHealth()
    .then(() => {
      log.debug("LLM Model healthcheck passed!");
    })
    .catch((err) => {
      log.error("LLM Model healthcheck failed", err);
      throw new Error(err.message);
    });

  // Initialize memory service with the provided provider
  const memoryService = new MemoryService(options.memory);

  // Initialize monitor service if provider is available
  const monitorService = new MonitorService(options.monitor);

  return new Runtime({
    plugins: options.plugins,
    llmService,
    memoryService,
    monitorService
  });
}

/**
 * Runtime class that manages the execution of plugins and agent state
 */
export class Runtime {
  private registry: PluginRegistry;
  private plugins: Plugin[] = [];
  private eventQueue: AgentContext[] = [];
  private isRunning: boolean = false;
  private llmService: LLMService;
  private memoryService: MemoryService;
  private monitorService: MonitorService;
  private currentContext: AgentContext | undefined;
  private contextObservers: Set<(context: AgentContext) => void> = new Set();

  /**
   * Operations that can be used by plugins
   */
  public readonly operations = {
    getObject: <T extends z.ZodType<unknown>>(
      schema: T,
      prompt: string,
      config?: OperationConfig
    ) => getObject(this.llmService, schema, prompt, config),
    getText: (prompt: string, config?: GetObjectConfig) =>
      getText(this.llmService, prompt, config),
    getBoolean: (prompt: string, config?: GetObjectConfig) =>
      getBoolean(this.llmService, prompt, config)
  };

  /**
   * Access to the LLM service for plugins
   */
  public get llm(): LLMService {
    return this.llmService;
  }

  /**
   * Access to the memory service for plugins
   */
  public get memory(): MemoryService {
    return this.memoryService;
  }

  /**
   * Access to the current context
   */
  public get context(): AgentContext | undefined {
    return this.currentContext;
  }

  private queueInterface: EventQueue = {
    push: async (context: Omit<AgentContext, "eventQueue">) => {
      const userInput = getUserInput(context);

      // Pre-event logging and store user message
      log.info({
        msg: "Pre-event context chain state",
        phase: "pre-event",
        user: userInput?.user,
        message: userInput?.rawMessage,
        contextChain: context.contextChain
      });

      // Get conversation history if user input exists
      let conversationHistory: {
        role: string;
        content: string;
        timestamp: number;
      }[] = [];
      if (userInput) {
        conversationHistory =
          await this.memoryService.getRecentConversationHistory(
            userInput.user,
            userInput.pluginId
          );
      }

      // Add conversation history to the initial context item
      if (context.contextChain.length > 0) {
        context.contextChain[0] = {
          ...context.contextChain[0],
          messageHistory: conversationHistory
        } as ContextItemWithHistory;
      }

      // Add event to queue with wrapped response handler
      const fullContext: AgentContext = {
        ...context,
        eventQueue: this.queueInterface
      };

      try {
        // Store user message in memory
        if (userInput) {
          log.info({
            msg: "Storing user message in memory",
            user: userInput.user,
            platform: userInput.pluginId,
            message: userInput.rawMessage,
            messageId: userInput.id
          });
          await this.memoryService.storeUserInteraction(
            userInput.user,
            userInput.pluginId,
            userInput.rawMessage,
            userInput.timestamp,
            userInput.id
          );
        }

        // Wrap response handler if it exists
        if (fullContext.platformContext?.responseHandler) {
          const originalHandler = fullContext.platformContext.responseHandler;
          fullContext.platformContext.responseHandler = async (response) => {
            try {
              // Pre-response logging
              log.info({
                msg: "Pre-response context chain state",
                phase: "pre-response",
                platform: userInput?.pluginId,
                user: userInput?.user,
                contextChain: this.context?.contextChain,
                response
              });

              // Original response handler
              await originalHandler(response);

              // Post-response logging
              log.info({
                msg: "Post-response context chain state",
                phase: "post-response",
                platform: userInput?.pluginId,
                user: userInput?.user,
                contextChain: this.context?.contextChain,
                response
              });
            } catch (error) {
              log.error({
                msg: "Error storing assistant response",
                error: error instanceof Error ? error.message : String(error),
                user: userInput?.user,
                platform: userInput?.pluginId
              });
              throw error;
            }
          };
        }

        this.eventQueue.push(fullContext);
        log.debug({
          msg: "Queue updated",
          queueLength: this.eventQueue.length
        });
      } catch (error) {
        log.error({
          msg: "Error storing user message",
          error: error instanceof Error ? error.message : String(error),
          user: userInput?.user,
          platform: userInput?.pluginId
        });
        throw error;
      }
    },
    shift: async () => {
      return this.eventQueue.shift();
    }
  };

  constructor(config: RuntimeConfig) {
    this.registry = new PluginRegistry();
    this.llmService = config.llmService;
    this.plugins = config.plugins || [];
    this.memoryService = config.memoryService;
    this.monitorService = config.monitorService;

    // Initialize monitoring
    this.monitorService.logEvent({
      type: "runtime.init",
      message: "Runtime initialized",
      metadata: {
        plugins: this.plugins.map((p) => p.id)
      }
    });
  }

  /**
   * Register a plugin with the runtime
   */
  public async registerPlugin(plugin: Plugin): Promise<void> {
    this.registry.register(plugin);

    if (plugin.init) {
      await plugin.init(this);
    }

    for (const trigger of plugin.triggers) {
      const initContext: UserInputContext = {
        id: `${plugin.id}-trigger-${Date.now()}`,
        pluginId: plugin.id,
        action: "trigger_init",
        type: "user_input",
        content: "", // Empty content for system trigger
        timestamp: Date.now(),
        rawMessage: "",
        user: "system"
      };

      trigger.start({
        eventQueue: this.queueInterface,
        contextChain: [initContext]
      });
    }
  }

  /**
   * Start the runtime
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    // Initialize plugins
    for (const plugin of this.plugins) {
      await this.registerPlugin(plugin);
    }

    // Print registered plugins after they're all registered
    log.info({
      msg: "Initialized runtime with plugins",
      plugins: this.registry.getAllPlugins().map((p) => p.id)
    });

    this.isRunning = true;

    // Log start event
    if (this.monitorService) {
      await this.monitorService.logEvent({
        type: "runtime.start",
        message: "Runtime started",
        metadata: {
          plugins: this.registry.getAllPlugins().map((p) => p.id)
        }
      });
    }

    this.runEvaluationLoop().catch((error) => {
      console.error("Error in evaluation loop:", error);
      this.isRunning = false;
    });
  }

  /**
   * Stop the runtime
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      throw new Error("Runtime is not running");
    }

    this.isRunning = false;

    // Log stop event
    if (this.monitorService) {
      await this.monitorService.logEvent({
        type: "runtime.stop",
        message: "Runtime stopped"
      });
    }
  }

  /**
   * Get all registered plugins
   */
  public getPlugins(): Plugin[] {
    return this.registry.getAllPlugins();
  }

  /**
   * Push a new context to the event queue
   */
  public pushContext(context: AgentContext): void {
    this.eventQueue.push(context);
  }

  /**
   * Context management methods for plugins
   */
  public pushToContextChain(item: BaseContextItem): void {
    if (this.context) {
      // If there's an existing context item for this plugin+action, update it
      const existingIndex = this.context.contextChain.findIndex(
        (existing) =>
          existing.pluginId === item.pluginId && existing.action === item.action
      );

      if (existingIndex !== -1) {
        // Merge the new item with the existing one
        this.context.contextChain[existingIndex] = {
          ...this.context.contextChain[existingIndex],
          ...item
        };
      } else {
        // Add as new item if no existing one found
        this.context.contextChain.push(item);
      }
    }
  }

  public async createEvent(
    initialContext: UserInputContext,
    platformContext?: AgentContext["platformContext"]
  ): Promise<void> {
    const context: AgentContext = {
      contextChain: [initialContext],
      platformContext,
      eventQueue: this.queueInterface
    };
    try {
      await this.queueInterface.push(context);
    } catch (error) {
      log.error({
        msg: "Error pushing event to queue",
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
    log.info("Starting evaluation loop");
    while (this.isRunning) {
      const context = await this.eventQueue.shift();
      if (!context) {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Sleep to prevent busy loop
        continue;
      }

      const userInput = getUserInput(context);
      log.debug({
        msg: "Processing context from queue",
        context: {
          platform: userInput?.pluginId,
          message: userInput?.rawMessage,
          queueLength: this.eventQueue.length
        }
      });

      try {
        // Set current context before pipeline
        this.currentContext = context;

        log.debug("Evaluating pipeline for context");
        const pipeline = await this.evaluatePipeline(context);
        log.info("Generated pipeline", { pipeline });

        log.debug("Executing pipeline");
        await this.executePipeline(pipeline, context);

        // Post-event logging
        log.info({
          msg: "Post-event context chain state",
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
          log.info({
            msg: "Storing assistant response in memory",
            user: userInput.user,
            platform: userInput.pluginId,
            response: lastContext.message
          });
          await this.memoryService.storeAssistantInteraction(
            userInput.user,
            userInput.pluginId,
            lastContext.message,
            context.contextChain
          );
        }

        log.info("Pipeline execution complete");
      } catch (error) {
        log.error({
          msg: "Error in evaluation loop",
          error: error instanceof Error ? error : new Error(String(error)),
          context: {
            message: userInput?.rawMessage,
            platform: userInput?.pluginId,
            user: userInput?.user
          }
        });
        throw error;
      } finally {
        // Clear current context after execution
        this.currentContext = undefined;
      }
    }
  }

  private async evaluatePipeline(context: AgentContext): Promise<Pipeline> {
    // Store the context in history if it's user input
    const userInput = getUserInput(context);

    // Get all available executors from plugins
    const availablePlugins = this.registry
      .getAllPlugins()
      .map((plugin: Plugin) => ({
        id: plugin.id,
        name: plugin.name,
        description: plugin.description,
        executors: plugin.executors.map((e) => ({
          name: e.name,
          description: e.description
        }))
      }));

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
        await this.memoryService.getRecentConversationHistory(
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
      // Generate the pipeline using LLM
      const template = generatePipelineTemplate(pipelineContext);

      // Log pipeline generation start
      await this.monitorService.logEvent({
        type: "pipeline.generation.start",
        message: "Starting pipeline generation",
        metadata: {
          platform,
          message,
          template
        }
      });

      log.debug({
        msg: "Generating pipeline",
        context: pipelineContext,
        template,
        contextChain: context.contextChain
      });

      const pipeline = await getObject(
        this.llmService,
        PipelineSchema,
        template,
        {
          temperature: 0.2 // Lower temperature for more predictable outputs
        }
      );

      // Add concise pipeline steps log
      const steps = pipeline.map((step) => `${step.pluginId}:${step.action}`);
      log.info("Pipeline steps:", steps);

      // Log successful pipeline generation
      await this.monitorService.logEvent({
        type: "pipeline.generation.complete",
        message: "Pipeline generation completed successfully",
        metadata: {
          platform,
          message,
          template,
          pipeline,
          steps
        }
      });

      log.info({
        msg: "Generated pipeline",
        pipeline
      });
      return pipeline;
    } catch (error) {
      // Log pipeline generation error
      await this.monitorService.logEvent({
        type: "pipeline.generation.error",
        message: "Pipeline generation failed",
        metadata: {
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
        }
      });

      log.error({
        msg: "Error generating pipeline",
        error:
          error instanceof Error
            ? {
                name: error.name,
                message: error.message,
                stack: error.stack
              }
            : error,
        context: {
          platform: userInput?.pluginId || "unknown",
          message: userInput?.rawMessage || "",
          contextChain: context.contextChain,
          generationContext: pipelineContext,
          template: generatePipelineTemplate(pipelineContext)
        }
      });
      return []; // Return empty pipeline on error
    }
  }

  private async evaluatePipelineModification(
    context: PipelineEvaluationContext
  ): Promise<PipelineModification> {
    const template = generatePipelineModificationTemplate(context);
    log.debug({
      msg: "Evaluating pipeline modification",
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

      log.info({
        msg: "Pipeline modification evaluation result",
        shouldModify: modification.shouldModify,
        explanation: modification.explanation,
        modifiedSteps: modification.modifiedSteps
      });

      return modification;
    } catch (error) {
      log.error({
        msg: "Error evaluating pipeline modification",
        error: error instanceof Error ? error : new Error(String(error))
      });
      return {
        shouldModify: false,
        explanation: "Error evaluating pipeline modification"
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
      logPipelineState({
        type: "pipeline_state",
        timestamp: Date.now(),
        data: {
          currentPipeline,
          currentStepIndex,
          pipelineLength: currentPipeline.length,
          contextChain: context.contextChain
        }
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

        const plugin = this.registry.getPlugin(currentStep.pluginId);
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
          const result = await plugin.execute(currentStep.action, context);

          // Log step execution
          logPipelineState({
            type: "step_execution",
            timestamp: Date.now(),
            data: {
              currentPipeline,
              currentStepIndex,
              pipelineLength: currentPipeline.length,
              executedStep: {
                step: currentStep,
                result
              },
              contextChain: context.contextChain
            }
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
          }

          // Evaluate pipeline modification with updated context
          const modification = await this.evaluatePipelineModification({
            contextChain: context.contextChain,
            currentStep,
            pipeline: currentPipeline,
            availablePlugins: this.registry.getAllPlugins().map((plugin) => ({
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
            logPipelineState({
              type: "modification_evaluation",
              timestamp: Date.now(),
              data: {
                currentPipeline,
                currentStepIndex,
                pipelineLength: currentPipeline.length,
                modification,
                contextChain: context.contextChain
              }
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

          // Log failed step
          logPipelineState({
            type: "step_execution",
            timestamp: Date.now(),
            data: {
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
            }
          });
        }

        currentStepIndex++;
      }
    } finally {
      this.currentContext = undefined;
    }
  }

  /**
   * Subscribe to context changes
   * Returns an unsubscribe function
   */
  subscribeToContext(callback: (context: AgentContext) => void): () => void {
    this.contextObservers.add(callback);
    return () => this.contextObservers.delete(callback);
  }

  /**
   * Notify observers of context changes
   */
  private notifyContextChange(context: AgentContext) {
    for (const observer of this.contextObservers) {
      observer(context);
    }
  }

  private async updateMonitoringState() {
    if (this.monitorService) {
      await this.monitorService.updateState({
        currentContext: this.currentContext,
        queueLength: this.eventQueue.length,
        isRunning: this.isRunning,
        lastUpdate: Date.now()
      });
    }
  }

  // Update monitoring state when context changes
  private async setCurrentContext(context: AgentContext | undefined) {
    this.currentContext = context;
    this.contextObservers.forEach((observer) => observer(context!));
    await this.updateMonitoringState();
  }
}

export * from "./types";
