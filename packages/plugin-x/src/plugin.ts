import { PluginBase } from "@maiar-ai/core";
import { XPluginConfig } from "./types";
import { XService, TokenStorage } from "./services";
import { runAuthFlow } from "./scripts/auth-flow";
import * as path from "path";

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
  }

  /**
   * Initialize the plugin and ensure authentication
   */
  async init(): Promise<void> {
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
            "❌ Authentication failed. Please try again by running:"
          );
          console.error("pnpm --filter @maiar-ai/plugin-x x-login");

          // Throw error instead of just warning
          throw new Error(
            "X Plugin initialization failed: Authentication was unsuccessful. Please run the authentication flow manually and restart the application."
          );
        }
      } catch (error) {
        console.error("❌ Authentication error:", error);

        // Rethrow the error to halt execution
        throw new Error(
          "X Plugin initialization failed: Authentication error occurred. Please check your credentials and try again."
        );
      }
    } else {
      console.log("✅ X Plugin authenticated successfully");
    }
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
      // Run the auth flow with plugin config
      await runAuthFlow({
        client_id: this.config.client_id,
        client_secret: this.config.client_secret,
        callback_url: this.config.callback_url
      });

      // Attempt to authenticate after flow completes
      this.isAuthenticated = await this.xService.authenticate();

      if (!this.isAuthenticated) {
        throw new Error(
          "Authentication process completed but unable to authenticate with the received tokens"
        );
      }

      return this.isAuthenticated;
    } catch (error) {
      console.error("❌ Authentication flow failed:", error);
      // Rethrow the error instead of silently returning false
      throw new Error(
        `X Plugin authentication failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
