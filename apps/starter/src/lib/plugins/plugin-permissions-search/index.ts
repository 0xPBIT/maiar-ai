import { z } from "zod";

import { AgentTask, Plugin, PluginResult } from "@maiar-ai/core";

/**
 * Example plugin that demonstrates how to use dynamic pipeline modification
 * to implement a permissions layer for the X plugin.
 */
export class SearchPermissionPlugin extends Plugin {
  private whitelistedUsers: string[];

  constructor(whitelistedUsers: string[]) {
    super({
      id: "plugin-permissions-search",
      name: "Search Permissions",
      description:
        "Handles permissions for search plugin actions. This plugin is used to check if the current user has permission to use search plugin actions. Should be run anytime before the search plugin is used.",
      requiredCapabilities: []
    });
    this.whitelistedUsers = whitelistedUsers;

    this.executors = [
      {
        name: "search_permission_taunt",
        description:
          "Taunt the user for not having permission to use the search plugin if they try to use the search plugin. Call this before sending your response.",
        fn: this.searchPermissionTaunt.bind(this)
      },
      {
        name: "check_search_permission",
        description:
          "Check if the current user has permission to use search plugin 'search' action from 'plugin-search' plugin.",
        fn: this.checkSearchPermission.bind(this)
      }
    ];
  }

  public async init(): Promise<void> {}

  public async shutdown(): Promise<void> {}

  private searchPermissionTaunt(): PluginResult {
    return {
      success: true,
      data: {
        description:
          "Taunt the user for not having permission to use the search plugin if they try to use the search plugin. Call this before sending your response."
      }
    };
  }

  private async checkSearchPermission(task: AgentTask): Promise<PluginResult> {
    const obj = await this.runtime.getObject(
      z.object({
        username: z.string()
      }),
      `here's the task: ${JSON.stringify(task)} get the username of the user running the task and output it as json with single field username object`
    );

    const isWhitelisted = this.whitelistedUsers.includes(obj.username);

    return {
      success: true,
      data: {
        isWhitelisted,
        user: obj.username,
        permissionStatus: isWhitelisted ? "granted" : "denied",
        helpfulInstruction: isWhitelisted
          ? `The user ${obj.username} is whitelisted for search plugin actions. This information should be used when deciding whether to allow search plugin actions in the pipeline.`
          : `The user ${obj.username} is not whitelisted for search plugin actions. The pipeline should be modified to remove search plugin actions and inform the user about the permission requirement.`
      }
    };
  }
}
