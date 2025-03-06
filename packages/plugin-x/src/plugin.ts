import {
  PluginBase,
  ExecutorImplementation,
  Trigger,
  Runtime
} from "@maiar-ai/core";
import {
  XPluginConfig,
  XExecutorFactory,
  TriggerConfig,
  XTriggerFactory
} from "./types";
import { XService, TokenStorage } from "./services";
import { runAuthFlow } from "./scripts/auth-flow";
import * as path from "path";
import { createAllCustomExecutors } from "./executors";
import { createAllCustomTriggers } from "./triggers";
import { createLogger } from "@maiar-ai/core";

const log = createLogger("plugin-x");

export class PluginX extends PluginBase {
  private xService: XService;
  private tokenStorage: TokenStorage;
  private isAuthenticated = false;

  constructor(private config: XPluginConfig) {
    super({
      id: "plugin-x",
      name: "X",
      description: "Handles X (Twitter) requests for the Maiar agent"
    });

    // Initialize token storage in the data directory
    const dataFolder = path.resolve(process.cwd(), "data");
    this.tokenStorage = new TokenStorage("maiar-plugin-x", dataFolder);

    // Initialize X service
    this.xService = new XService({
      client_id: this.config.client_id,
      client_secret: this.config.client_secret,
      callback_url: this.config.callback_url,
      bearer_token: this.config.bearer_token,
      getStoredToken: async () => this.tokenStorage.getToken(),
      storeToken: async (token) => this.tokenStorage.storeToken(token)
    });

    // Executors and triggers will be registered in the init method, after runtime is available
  }

  /**
   * Override parent init to set the runtime and perform plugin initialization
   * This is called by the runtime during system startup
   */
  async init(runtime: Runtime): Promise<void> {
    // Call parent init to assign the runtime property
    await super.init(runtime);

    // This log confirms that we're being initialized with a valid runtime
    log.info("Initializing X plugin with runtime");

    // Validate required configuration
    if (!this.config.client_id || !this.config.callback_url) {
      console.error("❌ X Plugin Error: Missing required configuration");
      console.error("The X plugin requires at minimum:");
      console.error("- client_id: Your X API OAuth 2.0 client ID");
      console.error("- callback_url: Your OAuth callback URL");

      // Throw a fatal error instead of just warning
      throw new Error(
        "X Plugin initialization failed: Missing required configuration. Please set the required environment variables and restart the application."
      );
    }

    // Try to authenticate with stored tokens first
    this.isAuthenticated = await this.xService.authenticate();

    // Verify the authentication actually works with a health check
    if (this.isAuthenticated) {
      this.isAuthenticated = await this.xService.checkHealth();
      // If health check fails, force reauthorization
      if (!this.isAuthenticated) {
        console.warn(
          "⚠️ Stored authentication token found but failed health check. Token may be invalid or expired."
        );
        // Remove the invalid token
        await this.tokenStorage.removeToken();
      }
    }

    if (!this.isAuthenticated) {
      console.log("\n🔐 X API Authentication Required");
      console.log("===============================\n");
      console.log(
        "No valid authentication token found. Starting authentication flow...\n"
      );

      // Automatically run the authentication flow
      console.log("You can also manually run authentication at any time with:");
      console.log("pnpm --filter @maiar-ai/plugin-x x-login\n");

      try {
        // Run the auth flow with plugin config
        const success = await this.runAuthentication();

        if (success) {
          console.log("✅ X Plugin authenticated successfully");
        } else {
          console.error(
            "❌ X Plugin authentication failed. Plugin functionality will be limited."
          );
        }
      } catch (error) {
        console.error("❌ X Plugin authentication error:", error);
        console.error(
          "X Plugin functionality will be limited. You can attempt manual authentication with:"
        );
        console.error("pnpm --filter @maiar-ai/plugin-x x-login\n");
      }
    } else {
      console.log("✅ X Plugin authenticated successfully");
    }

    // Register executors and triggers now that we have a runtime
    this.registerExecutorsAndTriggers();

    log.info("X plugin initialization complete");
  }

  /**
   * Register both executors and triggers
   * This is separated from init for clarity and is only called after runtime is available
   */
  private registerExecutorsAndTriggers(): void {
    log.info("Registering X plugin executors and triggers");

    // Register executors
    if (this.config.customExecutors) {
      // If customExecutors are provided as factories, instantiate them with xService
      const customExecutors = this.config.customExecutors as (
        | ExecutorImplementation
        | XExecutorFactory
      )[];

      for (const executorOrFactory of customExecutors) {
        if (typeof executorOrFactory === "function") {
          // It's a factory function, call it with xService and runtime
          this.addExecutor(executorOrFactory(this.xService, this.runtime));
        } else {
          // It's a plain ExecutorImplementation, add it directly
          this.addExecutor(executorOrFactory);
        }
      }
    } else {
      // Register all default custom executors with xService injected
      for (const executor of createAllCustomExecutors(
        this.xService,
        this.runtime
      )) {
        this.addExecutor(executor);
      }
    }

    // Register triggers
    if (this.config.customTriggers) {
      // If customTriggers are provided as factories, instantiate them with xService
      const customTriggers = this.config.customTriggers as (
        | Trigger
        | XTriggerFactory
      )[];

      for (const triggerOrFactory of customTriggers) {
        if (typeof triggerOrFactory === "function") {
          // It's a factory function, call it with xService and runtime
          const triggerConfig: TriggerConfig = {
            intervalMinutes: this.config.intervalMinutes,
            intervalRandomizationMinutes:
              this.config.intervalRandomizationMinutes,
            postTemplate: this.config.postTemplate
          };
          this.addTrigger(
            triggerOrFactory(this.xService, this.runtime, triggerConfig)
          );
        } else {
          // It's a plain Trigger, add it directly
          this.addTrigger(triggerOrFactory);
        }
      }
    } else {
      // Register all default custom triggers with xService injected
      const triggerConfig: TriggerConfig = {
        intervalMinutes: this.config.intervalMinutes,
        intervalRandomizationMinutes: this.config.intervalRandomizationMinutes,
        postTemplate: this.config.postTemplate
      };
      for (const trigger of createAllCustomTriggers(
        this.xService,
        this.runtime,
        triggerConfig
      )) {
        this.addTrigger(trigger);
      }
    }

    log.info(
      `Registered ${this.executors.length} executors and ${this.triggers.length} triggers`
    );
  }

  /**
   * Check if the plugin is authenticated
   */
  isAuthenticatedWithX(): boolean {
    return this.isAuthenticated;
  }

  async stop(): Promise<void> {
    // Cleanup logic will be implemented later
  }

  /**
   * Run the authentication flow using the plugin's configuration
   * This can be called directly to authenticate without using environment variables
   */
  async runAuthentication(): Promise<boolean> {
    try {
      // Run auth flow with client credentials
      await runAuthFlow({
        client_id: this.config.client_id,
        client_secret: this.config.client_secret,
        callback_url: this.config.callback_url
      });

      // After runAuthFlow completes, check if we can authenticate
      this.isAuthenticated = await this.xService.authenticate();

      return this.isAuthenticated;
    } catch (error) {
      console.error("Authentication error:", error);
      return false;
    }
  }
}
