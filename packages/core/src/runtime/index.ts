import cors from "cors";
import { Server } from "http";
import fsPromises from "node:fs/promises";
import path from "path";
import { Logger, LoggerOptions } from "winston";
import Transport from "winston-transport";
import { z } from "zod";

import logger from "../lib/logger";
import { WebSocketTransport } from "../lib/winston/transports/websocket";
import { MemoryManager } from "./managers/memory";
import { ModelManager } from "./managers/model";
import { TEXT_GENERATION_CAPABILITY } from "./managers/model/capability/constants";
import { CapabilityAliasGroup } from "./managers/model/capability/transform";
import { ICapabilities } from "./managers/model/capability/types";
import { PluginRegistry } from "./managers/plugin";
import { PromptRegistry } from "./managers/prompt";
import { ServerManager } from "./managers/server";
import { AgentTask, Scheduler } from "./pipeline";
import { formatZodSchema } from "./pipeline/operations";
import { GetObjectConfig } from "./pipeline/types";
import { MemoryProvider } from "./providers/memory";
import { ModelProvider } from "./providers/model";
import { Plugin } from "./providers/plugin";

const REQUIRED_CAPABILITIES = [TEXT_GENERATION_CAPABILITY];

/**
 * Runtime class that manages the execution of plugins and agent state
 */
export class Runtime {
  private serverManager: ServerManager;
  private modelManager: ModelManager;
  private memoryManager: MemoryManager;
  private pluginRegistry: PluginRegistry;
  private promptRegistry: PromptRegistry;

  private scheduler: Scheduler;

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
    serverManager: ServerManager,
    promptRegistry: PromptRegistry
  ) {
    this.modelManager = modelManager;
    this.memoryManager = memoryManager;
    this.pluginRegistry = pluginRegistry;
    this.serverManager = serverManager;
    this.promptRegistry = promptRegistry;

    this.scheduler = new Scheduler(this, memoryManager, pluginRegistry);
  }

  /**
   * Initializes and configures a new Runtime instance with all necessary providers and plugins.
   * 
   * This is the primary entry point for creating a fully-configured runtime environment.
   * The initialization process includes setting up model providers, memory storage, plugins,
   * server configuration, logging, and capability validation.
   * 
   * @example
   * ```typescript
   * import { Runtime } from '@maiar/core';
   * import { OpenAIModelProvider } from '@maiar/model-openai';
   * import { SQLiteMemoryProvider } from '@maiar/memory-sqlite';
   * import { ChatPlugin } from '@maiar/plugin-chat';
   * 
   * const runtime = await Runtime.init({
   *   modelProviders: [
   *     new OpenAIModelProvider({
   *       apiKey: process.env.OPENAI_API_KEY,
   *       models: ['gpt-4', 'gpt-3.5-turbo']
   *     })
   *   ],
   *   memoryProvider: new SQLiteMemoryProvider({
   *     dataDir: './data'
   *   }),
   *   plugins: [
   *     new ChatPlugin()
   *   ],
   *   capabilityAliases: [
   *     {
   *       ids: ['text-generation', 'chat-completion'],
   *       transforms: []
   *     }
   *   ],
   *   options: {
   *     logger: {
   *       level: 'info',
   *       transports: []
   *     },
   *     server: {
   *       port: 3000,
   *       cors: {
   *         origin: ['http://localhost:3000'],
   *         methods: ['GET', 'POST']
   *       }
   *     }
   *   }
   * });
   * 
   * await runtime.start();
   * ```
   * 
   * @param config - The runtime configuration object
   * @param config.modelProviders - Array of model providers that supply AI capabilities (e.g., OpenAI, Ollama). At least one provider with required capabilities must be included.
   * @param config.memoryProvider - Memory provider for persistent storage of conversations, context, and agent state. Supports SQLite, PostgreSQL, and custom implementations.
   * @param config.plugins - Array of plugins that extend runtime functionality with triggers, executors, and custom capabilities. Plugins are automatically validated for required capabilities.
   * @param config.capabilityAliases - Optional capability aliases that allow mapping between different capability names. Useful for standardizing capability names across different model providers.
   * @param config.options - Optional configuration for logging, server settings, and other runtime behavior
   * @param config.options.logger - Logger configuration including level, transports, and formatting options
   * @param config.options.logger.level - Log level (trace, debug, info, warn, error)
   * @param config.options.logger.transports - Array of transport configurations for log output (console, file, websocket)
   * @param config.options.server - HTTP server configuration for API endpoints and plugin routes
   * @param config.options.server.port - Port number for the HTTP server (default: 3000)
   * @param config.options.server.cors - CORS configuration for cross-origin requests
   * 
   * @returns Promise that resolves to a configured Runtime instance ready to be started
   * 
   * @throws {Error} When required capabilities are missing from model providers
   * @throws {Error} When plugin requirements cannot be satisfied by available model providers
   * @throws {Error} When server initialization fails
   * @throws {Error} When memory provider initialization fails
   * 
   * @remarks
   * The initialization process performs the following steps:
   * 1. Configure logging and display startup banner
   * 2. Initialize and start HTTP server
   * 3. Set up prompt registry with core templates
   * 4. Register all model providers and validate capabilities
   * 5. Initialize memory provider and register memory plugin
   * 6. Register all plugins and their prompt directories
   * 7. Mount API routes for prompts and plugin endpoints
   * 8. Configure capability aliases for model provider abstraction
   * 9. Validate that all required capabilities are available
   * 10. Validate that all plugin requirements are satisfied
   * 11. Set up graceful shutdown handlers
   * 
   * The runtime requires certain core capabilities to be available from model providers:
   * - text-generation: For basic language model operations
   * - Additional capabilities may be required based on loaded plugins
   * 
   * @since 1.0.0
   */
  public static async init({
    modelProviders,
    memoryProvider,
    plugins,
    capabilityAliases = [],
    options
  }: {
    modelProviders: ModelProvider[];
    memoryProvider: MemoryProvider;
    plugins: Plugin[];
    capabilityAliases?: CapabilityAliasGroup[];
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

    const promptRegistry = new PromptRegistry();

    // Register core prompt directory under namespace 'core'
    const corePromptsDir = path.resolve(__dirname, "prompts");
    promptRegistry.registerDirectory("core", corePromptsDir);

    const modelManager = new ModelManager();
    for (const modelProvider of modelProviders) {
      await modelManager.registerModel(modelProvider);
    }

    const memoryManager = new MemoryManager();
    await memoryManager.registerMemoryProvider(memoryProvider);

    const pluginRegistry = new PluginRegistry();

    // Register the core memory plugin only once
    const memoryPlugin = memoryProvider.getPlugin();
    await pluginRegistry.registerPlugin(memoryPlugin);

    // Register any prompts provided by the internal memory plugin
    if (memoryPlugin.promptsDir) {
      promptRegistry.registerDirectory(
        memoryPlugin.id,
        memoryPlugin.promptsDir
      );
    }

    for (const plugin of plugins) {
      await pluginRegistry.registerPlugin(plugin);

      // Auto-register prompt directories if supplied by the plugin
      const dir = plugin.promptsDir;
      if (dir) promptRegistry.registerDirectory(plugin.id, dir);
    }

    // mount the prompts routes
    serverManager.registerRoute("get", "/prompts", async (_req, res) => {
      try {
        const all = await Promise.all(
          promptRegistry.list().map(async ({ id, path }) => ({
            id,
            path,
            template: (await fsPromises.readFile(path, "utf8")).trim()
          }))
        );
        res.json(all);
      } catch {
        res.status(500).json({ error: "Failed to load prompts" });
      }
    });

    // Add capability aliases to the model manager
    for (const group of capabilityAliases) {
      // canonical capability ID is the first one that exists on a registered model, or the first ID in the list
      const canonical =
        group.ids.find((id) => modelManager.hasCapability(id)) || group.ids[0];

      if (!canonical) continue;

      // register transforms (if any) on the canonical id itself
      if (group.transforms?.length) {
        modelManager.registerCapabilityAlias(
          canonical,
          canonical,
          group.transforms
        );
      }

      // register each non-canonical id as an alias of the canonical id
      for (const id of group.ids) {
        if (id === canonical) continue;
        modelManager.registerCapabilityAlias(id, canonical, group.transforms);
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

    // Validate all the model manager has all the capabilities required by the plugins
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
      plugins: plugins.map((p) => ({
        id: p.id,
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
      serverManager,
      promptRegistry
    );

    // Expose template registry on runtime instance
    runtime.promptRegistry = promptRegistry;

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
   * Access to the prompt registry for plugins
   */
  public get templates(): PromptRegistry {
    return this.promptRegistry;
  }

  /**
   * Start the runtime
   */
  public async start(): Promise<void> {
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

        if (trigger.route) {
          try {
            this.serverManager.registerRoute(
              "post",
              trigger.route.path,
              trigger.route.handler,
              trigger.route.middleware
            );
          } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.logger.error(
              `failed to register trigger route for plugin id "${plugin.id}" trigger "${trigger.name}"`,
              {
                type: "plugin.trigger.route.registration.failed",
                method: "POST",
                path: trigger.route.path,
                plugin: plugin.id,
                trigger: trigger.name,
                error: error.message
              }
            );

            await this.stop();
            process.exit(1);
          }
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

    /**
     * Create a shallow copy of the plugin and model provider arrays so that we
     * can safely iterate over them while they are being mutated (each
     * unregister call removes the element from the original collection).
     */
    const plugins = [...this.pluginRegistry.plugins];
    const modelProviders = [...this.modelManager.modelProviders];

    // shut down the websocket transport
    for (const transport of (logger as unknown as { transports: Transport[] })
      .transports) {
      if (transport instanceof WebSocketTransport) {
        this.logger.info("closing WebSocket transport...");
        try {
          transport.close();
          this.logger.info("closed WebSocket transport");
        } catch (err) {
          this.logger.warn("error while closing WebSocket transport", { err });
        }
      }
    }

    // shut down the server manager
    this.logger.info("stopping server manager...");
    try {
      // Prevent indefinite hang if some connection refuses to close.
      await Promise.race([
        this.serverManager.stop(),
        new Promise((_resolve, reject) =>
          setTimeout(() => reject(new Error("server.stop timeout")), 5_000)
        )
      ]);
      this.logger.info("server manager stopped");
    } catch (error) {
      this.logger.error("failed to stop server manager", { error });
    }

    // shut down the plugins in parallel
    await Promise.all(
      plugins.map(async (plugin) => {
        this.logger.info(`shutting down plugin "${plugin.id}"...`);
        try {
          /**
           * Each plugin shutdown is raced with a timeout so that a single hanging
           * plugin cannot block the overall process shutdown.
           */
          await Promise.race([
            this.pluginRegistry.unregisterPlugin(plugin),
            new Promise((_resolve, reject) =>
              setTimeout(() => reject(new Error("shutdown timeout")), 5_000)
            )
          ]);
        } catch (error) {
          this.logger.error(
            `plugin "${plugin.id}" shutdown failed – continuing`,
            {
              error
            }
          );
        }
      })
    );

    // shut down the memory provider
    this.logger.info("unregistering memory provider...");
    try {
      await this.memoryManager.unregisterMemoryProvider();
    } catch (error) {
      this.logger.error("failed to unregister memory provider", { error });
    }

    // shut down the model providers
    for (const provider of modelProviders) {
      this.logger.info(`unregistering model provider "${provider.id}"...`);
      try {
        await this.modelManager.unregisterModel(provider);
      } catch (error) {
        this.logger.error(
          `model provider "${provider.id}" unregister failed – continuing`,
          { error }
        );
      }
    }

    this.logger.info("runtime stop complete. closing transports...");

    // shut down the transports
    for (const transport of logger.transports) {
      if (typeof transport.close === "function") {
        try {
          (transport as unknown as { close?: () => void }).close?.();
        } catch {
          /* ignore */
        }
      }
    }

    console.log("✅ shutdown complete");
  }

  /**
   * Create an event that will be processed by the pipeline processor
   */
  public async createEvent(
    trigger: AgentTask["trigger"],
    space: AgentTask["space"]
  ): Promise<void> {
    return this.scheduler.queueTask(trigger, space);
  }

  /**
   * Execute a capability through the model-manager.
   *
   * @typeParam K – Capability identifier literal (key of the `ICapabilities` interface).
   * @param capabilityId – The capability ID or alias.
   * @param input – Data validated against the capability's `input` Zod schema.
   * @param config – Optional configuration object.
   *
   * The type of `config` is computed with the conditional type
   * `ICapabilities[K] extends { config: infer C } ? C : unknown`:
   *   • If a given capability **defines** a `config` schema, the parameter is
   *     strongly typed as that schema (`C`).
   *   • Otherwise the parameter collapses to `unknown`, making it truly
   *     optional and preventing "config" from being accessed on capabilities
   *     that don't declare one.
   */
  public async executeCapability<K extends keyof ICapabilities>(
    capabilityId: K,
    input: ICapabilities[K]["input"],
    config?: ICapabilities[K] extends { config: infer C } ? C : unknown
  ): Promise<ICapabilities[K]["output"]> {
    return this.modelManager.executeCapability(capabilityId, input, config);
  }

  /**
   * Prompt the LLM to generate a JSON object from a prompt
   * @param schema - The schema of the object to generate in zod format
   * @param prompt - The prompt to generate the object from
   * @param config - The configuration for the model request
   * @returns The generated object
   */
  public async getObject<T extends z.ZodType>(
    schema: T,
    prompt: string,
    config?: GetObjectConfig
  ): Promise<z.infer<T>> {
    const maxRetries = config?.maxRetries ?? 3;
    let lastError: Error | null = null;
    let lastResponse: string | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Generate prompt using Liquid templates via the registry
        const templateId =
          attempt === 0 ? "core/object_template" : "core/retry_template";

        const ctx =
          attempt === 0
            ? {
                schema: formatZodSchema(schema),
                prompt
              }
            : {
                schema: formatZodSchema(schema),
                prompt,
                lastResponse: lastResponse!,
                error: (lastError as Error).message
              };

        const fullPrompt: string = await this.templates.render(templateId, ctx);
        const response = await this.modelManager.executeCapability(
          "text-generation",
          fullPrompt
        );
        lastResponse = response;

        // Extract JSON from the response, handling code blocks and extra text
        const jsonString = Runtime.extractJson(response);

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

  private static extractJson(str: string): string {
    // Remove markdown code blocks
    str = str.replace(/```(?:\w*\s*)\n?/g, "").replace(/```/g, "");

    const matches = str.match(/\{[\s\S]*\}|\[[\s\S]*\]/g);
    if (!matches) throw new Error("No JSON-like structure found in response");
    return (matches[matches.length - 1] ?? "").trim();
  }
}
