import { MonitorService, PluginBase, Runtime } from "@maiar-ai/core";

import { DiscordService } from "./services";
import { DiscordPluginConfig } from "./types";

export class PluginDiscord extends PluginBase {
  private discordService: DiscordService;
  private token: string;
  private clientId: string;
  private guildId: string | undefined;
  private typingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private config: DiscordPluginConfig) {
    super({
      id: "plugin-discord",
      name: "Discord",
      description:
        "Enables agent to send and recieve messages from Discord. Send messages in specific channels and interact using the Discord platform. When asked to send a message, the agent will select the most appropriate channel based on the channel description."
    });

    if (!config.token || !config.clientId) {
      throw new Error("Discord token and clientId are required");
    }

    this.token = config.token;
    this.clientId = config.clientId;
    this.guildId = config.guildId;

    // initialize the discord service
    this.discordService = new DiscordService({
      token: this.token,
      clientId: this.clientId,
      guildId: this.guildId,
      pluginId: this.id
    });
  }

  async init(runtime: Runtime): Promise<void> {
    await super.init(runtime);

    setTimeout(async () => {
      MonitorService.publishEvent({
        type: "plugin-discord",
        message: "Discord plugin initialized",
        metadata: { inviteUrl: await this.discordService.generateInviteUrl() }
      });
    }, 3000);

    // register the executors and triggers now that the runtime is initialized
    this.registerExecutors();
    this.registerTriggers();
  }

  async cleanup(): Promise<void> {
    // Clear all typing intervals
    for (const [channelId, interval] of this.typingIntervals) {
      clearInterval(interval);
      this.typingIntervals.delete(channelId);
    }

    await this.discordService.client.destroy();
  }

  private registerExecutors(): void {
    if (this.config.customExecutors) {
      for (const executorFactory of this.config.customExecutors) {
        this.addExecutor(executorFactory(this.discordService, this.runtime));
      }
    }
  }

  private registerTriggers(): void {
    if (this.config.customTriggers) {
      for (const triggerFactory of this.config.customTriggers) {
        this.addTrigger(triggerFactory(this.discordService, this.runtime));
      }
    }
  }
}
