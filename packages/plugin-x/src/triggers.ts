import { Context, Runtime, Space, Trigger, type Request, type Response } from "@maiar-ai/core";
import * as maiarLogger from "@maiar-ai/core/dist/logger";

import { XService } from "./services";
import { TriggerConfig, XTriggerFactory } from "./types";

const logger = maiarLogger.default.child({
  scope: "plugin-x"
});

/**
 * Custom triggers for the X plugin
 * These can be imported and used selectively when configuring PluginX
 */

/**
 * Route trigger for OAuth token storage
 * Handles OAuth callbacks and stores tokens for multiple users in the database
 */
export const oauthTokenStorageTrigger: XTriggerFactory = (
  xService: XService,
  getRuntime: () => Runtime
): Trigger => {
  return {
    name: "x_oauth_token_storage",
    route: {
      path: "/x/oauth/callback",
      handler: async (req: Request, res: Response) => {
        try {
          const { code, state, user_id } = req.body;
          
          logger.info("received OAuth callback", {
            type: "plugin-x.oauth.callback",
            hasCode: !!code,
            hasState: !!state,
            userId: user_id
          });

          if (!code) {
            return res.status(400).json({ 
              success: false, 
              error: "Authorization code is required" 
            });
          }

          if (!user_id) {
            return res.status(400).json({ 
              success: false, 
              error: "User ID is required" 
            });
          }

          const runtime = getRuntime();

          // Ensure OAuth tokens table exists
          const tableExists = await runtime.tableExists("x_oauth_tokens");
          if (!tableExists) {
            await setupOAuthTokensTable(runtime);
          }

          // Exchange code for tokens (this would be implemented in XService)
          const tokenData = await exchangeCodeForTokens(code);
          
          if (!tokenData) {
            return res.status(500).json({ 
              success: false, 
              error: "Failed to exchange code for tokens" 
            });
          }

          // Check if user already has tokens
          const existingTokens = await runtime.queryTable("x_oauth_tokens", {
            where: {
              user_id: user_id
            },
            limit: 1
          });

          let tokenId: string;

          if (existingTokens.length > 0) {
            // Update existing token
            tokenId = existingTokens[0].id as string;
            await runtime.updateTableRecord("x_oauth_tokens", tokenId, {
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: tokenData.expires_at,
              scope: tokenData.scope,
              updated_at: Date.now()
            });
            
            logger.info("updated existing OAuth token", {
              type: "plugin-x.oauth.token.updated",
              userId: user_id,
              tokenId
            });
          } else {
            // Insert new token
            tokenId = await runtime.insertIntoTable("x_oauth_tokens", {
              user_id: user_id,
              provider: "x",
              access_token: tokenData.access_token,
              refresh_token: tokenData.refresh_token,
              expires_at: tokenData.expires_at,
              scope: tokenData.scope,
              token_data: {
                state: state,
                granted_scopes: tokenData.scope?.split(' ') || []
              },
              created_at: Date.now(),
              updated_at: Date.now()
            });
            
            logger.info("stored new OAuth token", {
              type: "plugin-x.oauth.token.stored",
              userId: user_id,
              tokenId
            });
          }

          res.json({ 
            success: true, 
            message: "OAuth token stored successfully",
            tokenId 
          });

        } catch (error) {
          logger.error("OAuth callback error", {
            type: "plugin-x.oauth.callback.error",
            error: error instanceof Error ? error.message : String(error)
          });

          res.status(500).json({ 
            success: false, 
            error: "Internal server error during OAuth callback" 
          });
        }
      }
    }
  };
};

/**
 * Route trigger for OAuth token retrieval
 * Allows retrieving stored tokens for a specific user
 */
export const oauthTokenRetrievalTrigger: XTriggerFactory = (
  xService: XService,
  getRuntime: () => Runtime
): Trigger => {
  return {
    name: "x_oauth_token_retrieval",
    route: {
      path: "/x/oauth/token/:userId",
      handler: async (req, res) => {
        try {
          const { userId } = req.params;
          
          if (!userId) {
            return res.status(400).json({ 
              success: false, 
              error: "User ID is required" 
            });
          }

          const runtime = getRuntime();

          // Check if tokens table exists
          const tableExists = await runtime.tableExists("x_oauth_tokens");
          if (!tableExists) {
            return res.status(404).json({ 
              success: false, 
              error: "No OAuth tokens table found" 
            });
          }

          // Retrieve user's token
          const tokens = await runtime.queryTable("x_oauth_tokens", {
            where: {
              user_id: userId
            },
            limit: 1,
            orderBy: [{ column: "updated_at", direction: "desc" }]
          });

          if (tokens.length === 0) {
            return res.status(404).json({ 
              success: false, 
              error: "No tokens found for this user" 
            });
          }

          const token = tokens[0];
          
          // Check if token is expired
          const isExpired = token.expires_at && (token.expires_at as number) < Date.now();
          
          logger.info("retrieved OAuth token", {
            type: "plugin-x.oauth.token.retrieved",
            userId,
            tokenId: token.id,
            isExpired
          });

          // Return token data (excluding sensitive information in logs)
          res.json({ 
            success: true, 
            token: {
              id: token.id,
              user_id: token.user_id,
              provider: token.provider,
              scope: token.scope,
              expires_at: token.expires_at,
              created_at: token.created_at,
              updated_at: token.updated_at,
              is_expired: isExpired
            }
          });

        } catch (error) {
          logger.error("OAuth token retrieval error", {
            type: "plugin-x.oauth.token.retrieval.error",
            error: error instanceof Error ? error.message : String(error)
          });

          res.status(500).json({ 
            success: false, 
            error: "Internal server error during token retrieval" 
          });
        }
      }
    }
  };
};

/**
 * Helper function to set up the OAuth tokens table
 */
async function setupOAuthTokensTable(runtime: Runtime): Promise<void> {
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

  await runtime.createTable(schema);
  
  logger.info("created OAuth tokens table", {
    type: "plugin-x.oauth.table.created",
    tableName: "x_oauth_tokens"
  });
}

/**
 * Helper function to exchange authorization code for tokens
 * This is a placeholder - would need to be implemented with actual X API calls
 */
async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
} | null> {
  // TODO: Implement actual token exchange with X API
  // For now, return mock data for development
  logger.warn("using mock token exchange - implement actual X API integration", {
    type: "plugin-x.oauth.mock.exchange"
  });
  
  return {
    access_token: `mock_access_${code}_${Date.now()}`,
    refresh_token: `mock_refresh_${code}_${Date.now()}`,
    expires_at: Date.now() + (3600 * 1000), // 1 hour from now
    scope: "tweet.read tweet.write users.read"
  };
}

/**
 * Trigger that periodically invokes the agent to create and post to X
 * This trigger creates a new context chain with instructions for the agent to create a post
 */
export const periodicPostTrigger: XTriggerFactory = (
  xService: XService,
  getRuntime: () => Runtime,
  config?: TriggerConfig
): Trigger => {
  const baseIntervalMinutes = 360; // 6 hours
  const randomizationMinutes = 180; // 3 hours

  return {
    name: "x_periodic_post",
    start: async (): Promise<void> => {
      try {
        const runtime = getRuntime();
        const postTemplate =
          config?.postTemplate ||
          (await runtime.templates.render("plugin-x/post_template"));

        logger.info(`starting x periodic post trigger`, {
          type: "plugin-x.trigger.start",
          interval: `${baseIntervalMinutes} mins`,
          randomization: `${randomizationMinutes} mins`
        });
        logger.info("using post template", {
          type: "plugin-x.trigger.template",
          template: `${postTemplate.substring(0, 50)}... (truncated)`
        });

        const scheduleNextPost = async () => {
          try {
            // Calculate random interval
            const randomIntervalMinutes =
              baseIntervalMinutes + Math.random() * randomizationMinutes;
            const intervalMs = randomIntervalMinutes * 60 * 1000;

            // Create new context chain with a direction to make a post
            const initialContext: Context = {
              id: `x-post-${Date.now()}`,
              pluginId: "plugin-x",
              content: postTemplate,
              timestamp: Date.now()
            };

            const spacePrefix = `x-post`;
            const spaceId = `${spacePrefix}-${Date.now()}`;

            const space: Space = {
              id: spaceId,
              relatedSpaces: { prefix: spacePrefix }
            };

            logger.info("creating x post event to invoke agent", {
              type: "plugin-x.event.creating",
              contextId: initialContext.id,
              pluginId: initialContext.pluginId
            });

            logger.info("context content length", {
              type: "plugin-x.event.content",
              contextContentLength: initialContext.content.length
            });

            // Use the runtime to create a new event
            try {
              await runtime.createEvent(initialContext, space);
            } catch (eventError) {
              logger.error("failed to create event", {
                type: "plugin-x.event.creation_failed",
                error: eventError
              });
              throw eventError; // Re-throw to be caught by outer try/catch
            }

            // Schedule next post
            logger.info(
              `Scheduling next X post in ${Math.round(randomIntervalMinutes)} minutes (${Math.round((intervalMs / 1000 / 60 / 60) * 10) / 10} hours)`,
              {
                type: "plugin-x.post.scheduling",
                interval: `${Math.round(randomIntervalMinutes)} minutes`,
                hours: `${Math.round((intervalMs / 1000 / 60 / 60) * 10) / 10}`
              }
            );
            setTimeout(scheduleNextPost, intervalMs);
          } catch (error) {
            logger.error("error in periodic post scheduling", {
              type: "plugin-x.post.scheduling_error",
              error
            });

            // Log internal state details
            logger.info("checking X Service internal state", {
              type: "plugin-x.service.state_check"
            });
            try {
              // Log service health using public methods if available
              try {
                await xService.checkHealth();
                logger.info("x service health check passed", {
                  type: "plugin-x.service.health_check"
                });
              } catch (healthError) {
                logger.error("x service health check failed", {
                  type: "plugin-x.service.health_check_failed",
                  error: healthError
                });
              }
            } catch (authCheckError) {
              logger.error("failed to check service state", {
                type: "plugin-x.service.state_check_failed",
                error: authCheckError
              });
            }

            // If there's an error, still try to schedule the next post
            // but use a shorter interval (30-60 minutes)
            const recoveryMs = (30 + Math.random() * 30) * 60 * 1000;
            logger.warn(
              `scheduling recovery attempt in ${Math.round(recoveryMs / 1000 / 60)} minutes`,
              {
                type: "plugin-x.post.recovery_scheduling",
                interval: `${Math.round(recoveryMs / 1000 / 60)} minutes`
              }
            );
            setTimeout(scheduleNextPost, recoveryMs);
          }
        };

        // Start the first scheduling
        scheduleNextPost();
      } catch (err) {
        logger.error("x periodic post trigger error", {
          type: "plugin-x.trigger.error",
          error: err instanceof Error ? err.message : String(err)
        });
      }
    }
  };
};
