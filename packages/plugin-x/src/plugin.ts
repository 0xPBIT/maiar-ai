import * as path from "path";

import { Plugin } from "@maiar-ai/core";

import { runAuthFlow } from "./scripts/auth-flow";
import { TokenStorage, XService } from "./services";
import { oauthTokenStorageTrigger, oauthTokenRetrievalTrigger } from "./triggers";
import { XExecutorFactory, XPluginConfig, XTriggerFactory } from "./types";

export class XPlugin extends Plugin {
  private xService: XService;
  private tokenStorage: TokenStorage;
  private isAuthenticated = false;
  private executorFactories: XExecutorFactory[];
  private triggerFactories: XTriggerFactory[];

  constructor(private config: XPluginConfig) {
    super({
      id: "plugin-x",
      description: async () =>
        (
          await this.runtime.templates.render(`${this.id}/plugin_description`)
        ).trim(),
      requiredCapabilities: [],
      promptsDir: path.resolve(__dirname, "prompts")
    });

    // Initialize token storage in the data directory
    const dataFolder = path.resolve(process.cwd(), "data");
    this.tokenStorage = new TokenStorage(dataFolder);

    this.executorFactories = config.executorFactories || [];
    
    // Include OAuth token storage triggers by default
    this.triggerFactories = [
      oauthTokenStorageTrigger,
      oauthTokenRetrievalTrigger,
      ...(config.triggerFactories || [])
    ];

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
   * Override parent init to set the runtime and perform plugin initialization
   * This is called by the runtime during system startup
   */
  public async init(): Promise<void> {
    // This log confirms that we're being initialized with a valid runtime
    this.logger.info("plugin x initializing...", { type: "plugin-x" });

    // Set up OAuth tokens table for multi-user support
    await this.setupOAuthTokensTable();

    // Try to authenticate with stored tokens first
    this.isAuthenticated = await this.xService.authenticate();

    // Verify the authentication actually works with a health check
    if (this.isAuthenticated) {
      this.isAuthenticated = await this.xService.checkHealth();
      // If health check fails, force reauthorization
      if (!this.isAuthenticated) {
        this.logger.warn(
          "⚠️ stored authentication token found but failed health check. token may be invalid or expired.",
          {
            type: "plugin-x"
          }
        );
        // Remove the invalid token
        await this.tokenStorage.removeToken();
      }
    }

    if (!this.isAuthenticated) {
      this.logger.warn("🔐 x api authentication required", {
        type: "plugin-x"
      });

      this.logger.warn(
        "no valid authentication token found. starting authentication flow...",
        {
          type: "plugin-x"
        }
      );

      // Automatically run the authentication flow
      this.logger.warn(
        "you can also manually run authentication at any time with: pnpm maiar-x-login",
        {
          type: "plugin-x"
        }
      );

      try {
        // Run the auth flow with plugin config
        const success = await this.runAuthentication();

        if (success) {
          this.logger.info("x plugin authenticated successfully", {
            type: "plugin-x"
          });
        } else {
          this.logger.error(
            "❌ x plugin authentication failed. plugin functionality will be limited.",
            {
              type: "plugin-x"
            }
          );
        }
      } catch (error) {
        this.logger.error(
          `❌ x plugin authentication error: ${error}. you can attempt manual authentication with: pnpm maiar-x-login`,
          {
            type: "plugin-x"
          }
        );
        throw error;
      }
    } else {
      this.logger.info("x plugin authenticated successfully", {
        type: "plugin-x"
      });
    }

    // Register executors and triggers
    this.registerExecutors();
    this.registerTriggers();

    this.logger.info("x plugin initialized.", {
      type: "plugin-x"
    });
  }

  public async shutdown(): Promise<void> {}

  /**
   * Set up the OAuth tokens table for multi-user support
   */
  private async setupOAuthTokensTable(): Promise<void> {
    try {
      const tableExists = await this.runtime.tableExists("x_oauth_tokens");
      if (!tableExists) {
        const schema = {
          name: "x_oauth_tokens",
          columns: [
            {
              name: "id",
              type: "text" as const,
              constraints: ["primary_key" as const]
            },
            {
              name: "user_id",
              type: "text" as const,
              constraints: ["not_null" as const]
            },
            {
              name: "provider",
              type: "text" as const,
              constraints: ["not_null" as const]
            },
            {
              name: "access_token",
              type: "text" as const,
              constraints: ["not_null" as const]
            },
            {
              name: "refresh_token",
              type: "text" as const
            },
            {
              name: "expires_at",
              type: "bigint" as const
            },
            {
              name: "scope",
              type: "text" as const
            },
            {
              name: "token_data",
              type: "json" as const
            },
            {
              name: "created_at",
              type: "bigint" as const,
              constraints: ["not_null" as const]
            },
            {
              name: "updated_at",
              type: "bigint" as const
            }
          ],
          indexes: [
            {
              name: "idx_user_provider",
              columns: ["user_id", "provider"],
              unique: true
            },
            {
              name: "idx_expires_at",
              columns: ["expires_at"]
            }
          ]
        };

        await this.runtime.createTable(schema);
        
        this.logger.info("created OAuth tokens table for multi-user support", {
          type: "plugin-x.oauth.table.created",
          tableName: "x_oauth_tokens"
        });
      } else {
        this.logger.info("OAuth tokens table already exists", {
          type: "plugin-x.oauth.table.exists"
        });
      }
    } catch (error) {
      this.logger.error("failed to set up OAuth tokens table", {
        type: "plugin-x.oauth.table.setup.failed",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get OAuth token for a specific user
   */
  public async getUserOAuthToken(userId: string): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_at?: number;
    scope?: string;
  } | null> {
    try {
      const tokens = await this.runtime.queryTable("x_oauth_tokens", {
        where: {
          user_id: userId,
          provider: "x"
        },
        limit: 1,
        orderBy: [{ column: "updated_at", direction: "desc" }]
      });

      if (tokens.length === 0) {
        return null;
      }

      const token = tokens[0];
      
      // Check if token is expired
      const isExpired = token.expires_at && (token.expires_at as number) < Date.now();
      
      if (isExpired) {
        this.logger.warn("user OAuth token is expired", {
          type: "plugin-x.oauth.token.expired",
          userId,
          expiresAt: token.expires_at
        });
        return null;
      }

      return {
        access_token: token.access_token as string,
        refresh_token: token.refresh_token as string | undefined,
        expires_at: token.expires_at as number | undefined,
        scope: token.scope as string | undefined
      };
    } catch (error) {
      this.logger.error("failed to get user OAuth token", {
        type: "plugin-x.oauth.token.get.failed",
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Store OAuth token for a specific user
   */
  public async storeUserOAuthToken(
    userId: string,
    tokenData: {
      access_token: string;
      refresh_token?: string;
      expires_at?: number;
      scope?: string;
    }
  ): Promise<string | null> {
    try {
      // Check if user already has tokens
      const existingTokens = await this.runtime.queryTable("x_oauth_tokens", {
        where: {
          user_id: userId,
          provider: "x"
        },
        limit: 1
      });

      let tokenId: string;

      if (existingTokens.length > 0) {
        // Update existing token
        tokenId = existingTokens[0].id as string;
        await this.runtime.updateTableRecord("x_oauth_tokens", tokenId, {
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          scope: tokenData.scope,
          updated_at: Date.now()
        });
        
        this.logger.info("updated user OAuth token", {
          type: "plugin-x.oauth.token.updated",
          userId,
          tokenId
        });
      } else {
        // Insert new token
        tokenId = await this.runtime.insertIntoTable("x_oauth_tokens", {
          user_id: userId,
          provider: "x",
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expires_at: tokenData.expires_at,
          scope: tokenData.scope,
          token_data: {
            granted_scopes: tokenData.scope?.split(' ') || []
          },
          created_at: Date.now(),
          updated_at: Date.now()
        });
        
        this.logger.info("stored new user OAuth token", {
          type: "plugin-x.oauth.token.stored",
          userId,
          tokenId
        });
      }

      return tokenId;
    } catch (error) {
      this.logger.error("failed to store user OAuth token", {
        type: "plugin-x.oauth.token.store.failed",
        userId,
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  private registerExecutors(): void {
    for (const executorFactory of this.executorFactories) {
      this.executors.push(executorFactory(this.xService, () => this.runtime));
    }
  }

  private registerTriggers(): void {
    for (const triggerFactory of this.triggerFactories) {
      this.triggers.push(triggerFactory(this.xService, () => this.runtime));
    }
  }

  /**
   * Check if the plugin is authenticated
   */
  public isAuthenticatedWithX(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Run the authentication flow using the plugin's configuration
   * This can be called directly to authenticate without using environment variables
   */
  public async runAuthentication(): Promise<boolean> {
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
      this.logger.error("authentication error:", {
        type: "plugin-x",
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}
