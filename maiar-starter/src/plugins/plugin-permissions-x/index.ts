import {
  PluginBase,
  AgentContext,
  PluginResult,
  getUserInput
} from "@maiar-ai/core";

interface PermissionsXConfig {
  // List of whitelisted users that can use post/send tweet actions
  whitelistedUsers: string[];
}

/**
 * Example plugin that demonstrates how to use dynamic pipeline modification
 * to implement a permissions layer for the X plugin.
 */
export class PluginPermissionsX extends PluginBase {
  constructor(private config: PermissionsXConfig) {
    super({
      id: "plugin-permissions-x",
      name: "X Permissions",
      description:
        "Handles permissions for X plugin actions. This plugin is used to check if the current user has permission to use X plugin 'post_tweet' action. Should be run anytime before the X plugin is used."
    });

    this.addExecutor({
      name: "check_post_tweet_permission",
      description:
        "Check if the current user has permission to use X plugin 'post_tweet' action.",
      execute: async (context: AgentContext): Promise<PluginResult> => {
        const userInput = getUserInput(context);
        if (!userInput) {
          return {
            success: false,
            error: "No user input found in context chain"
          };
        }

        const isWhitelisted = this.config.whitelistedUsers.includes(
          userInput.user
        );

        return {
          success: true,
          data: {
            isWhitelisted,
            user: userInput.user,
            permissionStatus: isWhitelisted ? "granted" : "denied",
            helpfulInstruction: isWhitelisted
              ? `The user ${userInput.user} is whitelisted for X plugin actions. This information should be used when deciding whether to allow X plugin actions in the pipeline.`
              : `The user ${userInput.user} is not whitelisted for X plugin actions. The pipeline should be modified to remove X plugin actions and inform the user about the permission requirement.`
          }
        };
      }
    });
  }
}
