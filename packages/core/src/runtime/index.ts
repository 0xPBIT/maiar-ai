import cors from "cors";
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
import { AgentTask, Processor, UserInputContext } from "./pipeline";
import { formatZodSchema, OperationConfig } from "./pipeline/operations";
import {
  cleanJsonString,
  extractJson,
  generateObjectTemplate,
  generateRetryTemplate
} from "./pipeline/templates";
import { GetObjectConfig } from "./pipeline/types";
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

  private pipelineProcessor: Processor;

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

    this.pipelineProcessor = new Processor(
      this.operations,
      this.pluginRegistry,
      this.memoryManager,
      this.logger
    );
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
      server?: {
        port?: number;
        cors?: cors.CorsOptions;
      };
    };
  }): Promise<Runtime> {
    if (options && options.logger) {
      logger.configure(options.logger);
    }
    Runtime.banner();
    this.logger.info("runtime initializing...");

    const serverManager = new ServerManager({
      port: options?.server?.port || 3000,
      cors: options?.server?.cors || {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"]
      }
    });
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

    process.on("SIGTERM", async () => {
      console.log();
      runtime.logger.info("runtime received SIGTERM signal", {
        type: "runtime.sigterm"
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
  public get server(): Server {
    return this.serverManager.server;
  }

  /**
   * Start the runtime
   */
  public async start(): Promise<void> {
    this.logger.info("ai agent (powered by $MAIAR) runtime started", {
      type: "runtime.started"
    });

    // TODO: this is a bunch of runtime setup code that probably should be moved to the pipeline processor
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

        if (trigger.route) {
          this.serverManager.registerRoute(
            trigger.route.path,
            trigger.route.handler,
            trigger.route.middleware
          );
        }

        if (trigger.start) trigger.start();
      }
    }
  }

  /**
   * Stop the runtime
   */
  public async stop(): Promise<void> {
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
   * Create an event that will be processed by the pipeline processor
   */
  public async createEvent(
    initialContext: UserInputContext,
    platformContext?: AgentTask["platformContext"]
  ): Promise<void> {
    return this.pipelineProcessor.createEvent(initialContext, platformContext);
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

  private static banner() {
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
