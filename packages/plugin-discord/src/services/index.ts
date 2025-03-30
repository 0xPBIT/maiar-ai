import {
  BaseGuildTextChannel,
  Client,
  GatewayIntentBits,
  OAuth2Scopes,
  PermissionsBitField
} from "discord.js";

import { MonitorService, Runtime } from "@maiar-ai/core";

export class DiscordService {
  private _client: Client;
  private _clientId: string;
  private runtime: Runtime;
  private _pluginId: string;
  private _guildId: string | undefined;
  private _commandPrefix: string | undefined;
  private _isProcessing: boolean = false;
  private typingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private token: string;

  // Accessors
  get client(): Client {
    return this._client;
  }

  get clientId(): string {
    return this._clientId;
  }

  get pluginId(): string {
    return this._pluginId;
  }

  get guildId(): string | undefined {
    return this._guildId;
  }

  get commandPrefix(): string | undefined {
    return this._commandPrefix;
  }

  get isProcessing(): boolean {
    return this._isProcessing;
  }

  set isProcessing(value: boolean) {
    this._isProcessing = value;
  }

  constructor({
    token,
    clientId,
    guildId,
    runtime,
    pluginId,
    commandPrefix
  }: {
    token: string;
    clientId: string;
    guildId?: string;
    runtime: Runtime;
    pluginId: string;
    commandPrefix?: string;
  }) {
    this.runtime = runtime;
    this._clientId = clientId;
    this._pluginId = pluginId;
    this._commandPrefix = commandPrefix;
    this._guildId = guildId;
    this.token = token;
    const intents = [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers
    ];

    this._client = new Client({
      intents
    });

    this._client.login(this.token);
  }

  public async generateInviteUrl(): Promise<string> {
    const scopes = [OAuth2Scopes.Bot];
    const permissions = [
      PermissionsBitField.Flags.SendMessages,
      PermissionsBitField.Flags.EmbedLinks,
      PermissionsBitField.Flags.ReadMessageHistory,
      PermissionsBitField.Flags.ViewChannel
    ];

    return this._client.generateInvite({
      scopes,
      permissions
    });
  }

  public startTypingIndicator(channel: BaseGuildTextChannel) {
    // Clear any existing interval for this channel
    this.stopTypingIndicator(channel.id);

    // Start a new typing indicator that repeats every 7 seconds
    // (Discord's typing indicator lasts 10 seconds, so we refresh before it expires)
    const interval = setInterval(() => {
      channel.sendTyping().catch((error) => {
        MonitorService.publishEvent({
          type: "discord.typing.error",
          message: "Error sending typing indicator",
          logLevel: "error",
          metadata: {
            error,
            channelId: channel.id
          }
        });
      });
    }, 7000);

    // Store the interval
    this.typingIntervals.set(channel.id, interval);

    // Send initial typing indicator
    channel.sendTyping().catch((error) => {
      MonitorService.publishEvent({
        type: "discord.typing.error",
        message: "Error sending typing indicator",
        logLevel: "error",
        metadata: {
          error,
          channelId: channel.id
        }
      });
    });
  }

  public stopTypingIndicator(channelId: string) {
    const interval = this.typingIntervals.get(channelId);
    if (interval) {
      clearInterval(interval);
      this.typingIntervals.delete(channelId);
    }
  }
}
