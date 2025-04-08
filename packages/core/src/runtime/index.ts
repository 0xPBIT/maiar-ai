import { Server } from "http";
import { Logger, LoggerOptions } from "winston";
import Transport from "winston-transport";
import { z } from "zod";

import logger from "../lib/logger";
import { WebSocketTransport } from "../lib/winston/transports/websocket";
import { MemoryManager } from "./managers/memory";
import { ModelManager } from "./managers/model";
import { TEXT_GENERATION_CAPABILITY } from "./managers/model/capability/constants";
import { ICapabilities } from "./managers/model/capability/types";
import { PluginRegistry } from "./managers/plugin";
import { ServerManager } from "./managers/server";
import {
  AgentContext,
  BaseContextItem,
  EventQueue,
  getUserInput,
  UserInputContext
} from "./pipeline/agent";
import { formatZodSchema, OperationConfig } from "./pipeline/operations";
import {
  cleanJsonString,
  extractJson,
  generateObjectTemplate,
  generatePipelineModificationTemplate,
  generatePipelineTemplate,
  generateRetryTemplate
} from "./pipeline/templates";
import {
  ContextItemWithHistory,
  ErrorContextItem,
  GetObjectConfig,
  Pipeline,
  PipelineGenerationContext,
  PipelineModification,
  PipelineModificationContext,
  PipelineModificationSchema,
  PipelineSchema,
  PipelineStep
} from "./pipeline/types";
import { MemoryProvider } from "./providers/memory";
import { ModelProvider, ModelRequestConfig } from "./providers/model";
import { Plugin } from "./providers/plugin";

const REQUIRED_CAPABILITIES = [TEXT_GENERATION_CAPABILITY];

export async function getObject<T extends z.ZodType>(
  modelManager: ModelManager,
  schema: T,
  prompt: string,
  config?: GetObjectConfig
): Promise<z.infer<T>> {
  const maxRetries = config?.maxRetries ?? 3;
  let lastError: Error | null = null;
  let lastResponse: string | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Generate prompt using template
      const fullPrompt: string =
        attempt === 0
          ? generateObjectTemplate({
              schema: formatZodSchema(schema),
              prompt
            })
          : generateRetryTemplate({
              schema: formatZodSchema(schema),
              prompt,
              lastResponse: lastResponse!,
              error: lastError!.message
            });
      const response = await modelManager.executeCapability(
        "text-generation",
        fullPrompt,
        config
      );
      lastResponse = response;

      // Extract JSON from the response, handling code blocks and extra text
      const jsonString = cleanJsonString(extractJson(response));

      try {
        const parsed = JSON.parse(jsonString);
        const result = schema.parse(parsed);
        if (attempt > 0) {
          logger.info("successfully parsed JSON after retries", {
            type: "runtime.getObject.success.retry",
            attempts: attempt + 1
          });
        }
        return result;
      } catch (parseError) {
        lastError = parseError as Error;
        logger.warn(`attempt ${attempt + 1}/${maxRetries} failed`, {
          type: "runtime.getObject.parse.failed",
          error: parseError,
          response: jsonString
        });
        if (attempt === maxRetries - 1) throw parseError;
      }
    } catch (error) {
      lastError = error as Error;
      logger.error(`attempt ${attempt + 1}/${maxRetries} failed`, {
        type: "runtime.getObject.execution.failed",
        error,
        prompt,
        schema: schema.description,
        config,
        lastResponse
      });
      if (attempt === maxRetries - 1) throw error;
    }
  }

  // This should never happen due to the throw in the loop
  throw new Error("Failed to get valid response after retries");
}

/**
 * Runtime class that manages the execution of plugins and agent state
 */
export class Runtime {
  public readonly operations; // operations that can be used by plugins

  private serverManager: ServerManager;
  private modelManager: ModelManager;
  private memoryManager: MemoryManager;
  private pluginRegistry: PluginRegistry;

  private isRunning: boolean;
  private eventQueue: AgentContext[];
  private queueInterface: EventQueue;
  private currentContext: AgentContext | undefined;

  /**
   * Returns a logger instance for the runtime scoped to the initialization
   */
  private static get logger(): Logger {
    return logger.child({ scope: "runtime.init" });
  }

  /**
   * Returns the logger instance for the runtime scoped to the runtime
   */
  public get logger(): Logger {
    return logger.child({ scope: "runtime" });
  }

  private static setupTransports(transports: Transport[], server: Server) {
    for (const transport of transports) {
      this.logger.info("setting up transport", {
        type: "runtime.setup.transports.setup",
        transport: transport.constructor.name
      });
      if (transport.constructor.name === "WebSocketTransport") {
        this.logger.info("attaching transport to server", {
          type: "runtime.setup.transports.attach",
          transport: transport.constructor.name,
          server: server.address()
        });
        (transport as WebSocketTransport).attachToServer(server);
      }
    }
  }

  private constructor(
    modelManager: ModelManager,
    memoryManager: MemoryManager,
    pluginRegistry: PluginRegistry,
    serverManager: ServerManager
  ) {
    this.operations = {
      getObject: <T extends z.ZodType<unknown>>(
        schema: T,
        prompt: string,
        config?: OperationConfig
      ) => getObject(modelManager, schema, prompt, config),
      executeCapability: <K extends keyof ICapabilities>(
        capabilityId: K,
        input: ICapabilities[K]["input"],
        config?: OperationConfig,
        modelId?: string
      ) => modelManager.executeCapability(capabilityId, input, config, modelId)
    };

    this.modelManager = modelManager;
    this.memoryManager = memoryManager;
    this.pluginRegistry = pluginRegistry;
    this.serverManager = serverManager;
    this.isRunning = false;
    this.eventQueue = [];
    this.queueInterface = {
      push: async (context: Omit<AgentContext, "eventQueue">) => {
        const userInput = getUserInput(context);

        // Pre-event logging and store user message
        this.logger.info("pre-event context chain state", {
          type: "context.pre-event",
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
            await this.memoryManager.getRecentConversationHistory(
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
            this.logger.info("storing user message in memory", {
              type: "runtime.memory.user_message.storing",
              user: userInput.user,
              platform: userInput.pluginId,
              message: userInput.rawMessage,
              messageId: userInput.id
            });
            await this.memoryManager.storeUserInteraction(
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
                this.logger.info("pre-response context chain state", {
                  type: "runtime.context.pre_response",
                  phase: "pre-response",
                  platform: userInput?.pluginId,
                  user: userInput?.user,
                  contextChain: this.context?.contextChain,
                  response
                });

                // Original response handler
                await originalHandler(response);

                // Post-response logging
                this.logger.info("post-response context chain state", {
                  type: "runtime.context.post_response",
                  phase: "post-response",
                  platform: userInput?.pluginId,
                  user: userInput?.user,
                  contextChain: this.context?.contextChain,
                  response
                });
              } catch (error) {
                this.logger.error("error storing assistant response", {
                  type: "runtime.response.storing.failed",
                  error: error instanceof Error ? error.message : String(error),
                  user: userInput?.user,
                  platform: userInput?.pluginId
                });
                throw error;
              }
            };
          }

          this.eventQueue.push(fullContext);
          this.logger.debug("queue updated", {
            type: "runtime.queue.updated",
            queueLength: this.eventQueue.length
          });
        } catch (error) {
          this.logger.error("error storing user message", {
            type: "runtime.message.storing.failed",
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
    this.currentContext = undefined;
  }

  public static async init({
    modelProviders,
    memoryProvider,
    plugins,
    capabilityAliases,
    options
  }: {
    modelProviders: ModelProvider[];
    memoryProvider: MemoryProvider;
    plugins: Plugin[];
    capabilityAliases: string[][];
    options?: {
      logger?: LoggerOptions;
    };
  }): Promise<Runtime> {
    if (options && options.logger) {
      logger.configure(options.logger);
    }
    Runtime.logTitleHeader();
    this.logger.info("runtime initializing...");

    const serverManager = new ServerManager();
    await serverManager.start();

    if (options?.logger?.transports) {
      this.logger.info("setting up transports", {
        type: "runtime.setup.transports"
      });
      Runtime.setupTransports(
        options.logger.transports as Transport[],
        serverManager.server
      );
    }

    const modelManager = new ModelManager();
    for (const modelProvider of modelProviders) {
      await modelManager.registerModel(modelProvider);
    }

    const memoryManager = new MemoryManager();
    await memoryManager.registerMemoryProvider(memoryProvider);

    const pluginRegistry = new PluginRegistry();
    await pluginRegistry.registerPlugin(memoryProvider.getPlugin());
    for (const plugin of plugins) {
      await pluginRegistry.registerPlugin(plugin);
    }

    // Add capability aliases to the model manager
    for (const aliasGroup of capabilityAliases) {
      const canonicalId =
        aliasGroup.find((id) => modelManager.hasCapability(id)) ??
        (aliasGroup[0] as string);

      // Register all other IDs in the group as aliases to the canonical ID
      for (const alias of aliasGroup) {
        if (alias !== canonicalId) {
          modelManager.registerCapabilityAlias(alias, canonicalId);
        }
      }
    }

    // Check if model manager has at least 1 model provider with the required capabilities needed for the runtime
    for (const capability of REQUIRED_CAPABILITIES) {
      if (!modelManager.hasCapability(capability)) {
        this.logger.error(
          `${capability} capability by a model provider is required for core runtime operations`,
          {
            type: "runtime.required.capabilities.check.failed"
          }
        );
        throw new Error(
          `${capability} capability by a model provider is required for core runtime operations`
        );
      }
    }

    this.logger.info(
      "runtime's required capabilities by at least 1 model provider check passed successfully",
      {
        type: "runtime.required.capabilities.check.success"
      }
    );

    // Validate all plugins have required capabilities implemented in the model manager
    for (const plugin of pluginRegistry.plugins) {
      for (const capability of plugin.requiredCapabilities) {
        if (!modelManager.hasCapability(capability)) {
          this.logger.error(
            `plugin ${plugin.id} specified a required capability ${capability} that is not available`,
            {
              type: "runtime.plugin.capability.missing"
            }
          );
          throw new Error(
            `Plugin ${plugin.id} requires capability ${capability} but it is not available`
          );
        }
      }
    }

    this.logger.info(
      "runtime has all model providers with required capabilities by plugins",
      {
        type: "plugins.required.capabilities.check.success"
      }
    );

    this.logger.info("runtime initialized succesfully", {
      type: "runtime.init",
      modelProviders: modelProviders.map((p) => p.id),
      capabilities: modelManager.getAvailableCapabilities(),
      memoryProvider: memoryProvider.id,
      plugins: plugins.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        requiredCapabilities: p.requiredCapabilities,
        triggers: p.triggers.map((t) => ({
          id: t.name
        })),
        execuctors: p.executors.map((e) => ({
          name: e.name,
          description: e.description
        }))
      }))
    });

    const runtime = new Runtime(
      modelManager,
      memoryManager,
      pluginRegistry,
      serverManager
    );

    process.on("SIGINT", async () => {
      console.log();
      runtime.logger.info("runtime received SIGINT signal", {
        type: "runtime.sigint"
      });
      await runtime.stop();
      process.exit(0);
    });

    process.on("SIGTSTP", async () => {
      console.log();
      runtime.logger.info("runtime received SIGTSTP signal", {
        type: "runtime.sigtstp"
      });
      await runtime.stop();
      process.exit(0);
    });

    return runtime;
  }

  /**
   * Access to the memory manager for plugins
   */
  public get memory(): MemoryManager {
    return this.memoryManager;
  }

  /**
   * Access to the server manager for plugins
   */
  public get server(): ServerManager {
    return this.serverManager;
  }

  /**
   * Access to the current context
   */
  public get context(): AgentContext | undefined {
    return this.currentContext;
  }

  /**
   * Start the runtime
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("runtime already running!");
      return;
    }

    this.isRunning = true;

    this.logger.info("ai agent (powered by $MAIAR) runtime started", {
      type: "runtime.started"
    });

    for (const plugin of this.pluginRegistry.plugins) {
      plugin.__setRuntime(this);

      for (const trigger of plugin.triggers) {
        this.logger.info(
          `plugin id "${plugin.id}" trigger "${trigger.name}" starting...`,
          {
            type: "plugin.trigger.start",
            trigger: trigger.name,
            plugin: plugin.id
          }
        );

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

        if (trigger.type === "route") {
          this.server.registerRoute(
            plugin.id,
            trigger.route.method,
            trigger.route.path,
            trigger.route.handler
          );
        } else {
          // Handle process-type triggers
          trigger.start({
            eventQueue: this.queueInterface,
            contextChain: [initContext]
          });
        }
      }
    }

    try {
      await this.runEvaluationLoop();
    } catch (err: unknown) {
      this.isRunning = false;
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error("error in evaluation loop:", { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the runtime
   */
  public async stop(): Promise<void> {
    this.isRunning = false;
    this.logger.info(
      "ai agent (powered by $MAIAR) runtime shutting down gracefully...",
      {
        type: "runtime.stop"
      }
    );

    await this.serverManager.stop();

    for (const plugin of this.pluginRegistry.plugins) {
      await this.pluginRegistry.unregisterPlugin(plugin);
    }

    await this.memoryManager.unregisterMemoryProvider();

    for (const modelProvider of this.modelManager.modelProviders) {
      await this.modelManager.unregisterModel(modelProvider);
    }
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

  /**
   * Execute a capability on the model manager
   */
  public async executeCapability<K extends keyof ICapabilities>(
    capabilityId: K,
    input: ICapabilities[K]["input"],
    config?: ModelRequestConfig
  ): Promise<ICapabilities[K]["output"]> {
    return this.modelManager.executeCapability(capabilityId, input, config);
  }

  private static logTitleHeader() {
    this.logger.info(`
      ___           ___                       ___           ___     
     /__/\\         /  /\\        ___          /  /\\         /  /\\    
    |  |::\\       /  /::\\      /  /\\        /  /::\\       /  /::\\   
    |  |:|:\\     /  /:/\\:\\    /  /:/       /  /:/\\:\\     /  /:/\\:\\  
  __|__|:|\\:\\   /  /:/~/::\\  /__/::\\      /  /:/~/::\\   /  /:/~/:/  
 /__/::::| \\:\\ /__/:/ /:/\\:\\ \\__\\/\\:\\__  /__/:/ /:/\\:\\ /__/:/ /:/___
 \\  \\:\\~~\\__\\/ \\  \\:\\/:/__\\/    \\  \\:\\/\\ \\  \\:\\/:/__\\/ \\  \\:\\/:::::/
  \\  \\:\\        \\  \\::/          \\__\\::/  \\  \\::/       \\  \\::/~~~~ 
   \\  \\:\\        \\  \\:\\          /__/:/    \\  \\:\\        \\  \\:\\     
    \\  \\:\\        \\  \\:\\         \\__\\/      \\  \\:\\        \\  \\:\\    
     \\__\\/         \\__\\/                     \\__\\/         \\__\\/    
     
      by Uranium Corporation`);
  }
}
