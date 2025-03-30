import {
  BaseGuildTextChannel,
  Client,
  Events,
  GatewayIntentBits,
  Message,
  OAuth2Scopes,
  PermissionsBitField
} from "discord.js";

import { MonitorService, Runtime, UserInputContext } from "@maiar-ai/core";

import { generateMessageIntentTemplate } from "../templates";
import { DiscordPlatformContext, MessageIntentSchema } from "../types";

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

    if (!this._client.listenerCount(Events.MessageCreate)) {
      this._client.on(Events.MessageCreate, this.handleMessage.bind(this));
    }
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

  private async handleMessage(message: Message): Promise<void> {
    // Skip bot messages
    if (message.author.bot) return;

    // Skip messages from other guilds if guildId is specified
    if (this._guildId && message.guildId !== this._guildId) return;

    // Skip messages not in text channels
    if (
      !message.channel.isTextBased() ||
      !(message.channel instanceof BaseGuildTextChannel)
    )
      return;

    try {
      // If we're already processing a message, skip intent check
      if (this._isProcessing) {
        // Store message in DB since it won't be processed by the event system
        await this.runtime.memory.storeUserInteraction(
          message.author.id,
          this._pluginId,
          message.content,
          Date.now(),
          message.id
        );

        MonitorService.publishEvent({
          type: "discord.message.skipped",
          message: "Skipping message - not intended for agent",
          metadata: {
            content: message.content,
            channelId: message.channelId,
            messageId: message.id,
            userId: message.author.id,
            plugin: this._pluginId
          }
        });

        return;
      }

      const isMentioned = message.content.includes(`<@${this._clientId}>`);

      MonitorService.publishEvent({
        type: "discord.message.processing",
        message: "Processing message",
        metadata: {
          content: message.content,
          author: message.author.username,
          channelId: message.channelId,
          isMention: isMentioned,
          isReply: !!message.reference?.messageId
        }
      });

      // Get recent conversation history
      const recentHistory =
        await this.runtime.memory.getRecentConversationHistory(
          message.author.id,
          this._pluginId,
          10 // Limit to last 10 messages
        );

      MonitorService.publishEvent({
        type: "discord.message.history",
        message: "Retrieved conversation history",
        metadata: {
          historyCount: recentHistory.length,
          history: recentHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp).toISOString()
          }))
        }
      });

      const intentTemplate = generateMessageIntentTemplate(
        message.content,
        isMentioned,
        !!message.reference?.messageId,
        this._clientId,
        this._commandPrefix,
        recentHistory
      );

      const intent = await this.runtime.operations.getObject(
        MessageIntentSchema,
        intentTemplate
      );

      MonitorService.publishEvent({
        type: "discord.message.intent",
        message: "Intent analysis result",
        metadata: {
          isIntendedForAgent: intent.isIntendedForAgent,
          reason: intent.reason,
          message: message.content
        }
      });

      if (intent.isIntendedForAgent) {
        // Set processing lock
        this._isProcessing = true;

        MonitorService.publishEvent({
          type: "discord.message.processing",
          message: "Message processing started - agent locked",
          metadata: {
            content: message.content,
            author: message.author.username
          }
        });

        // Start typing indicator
        if (message.channel instanceof BaseGuildTextChannel) {
          this.startTypingIndicator(message.channel);
        }

        const userContext: UserInputContext = {
          id: `${this._pluginId}-${message.id}`,
          pluginId: this._pluginId,
          type: "user_input",
          action: "receiveMessage",
          content: message.content,
          timestamp: Date.now(),
          rawMessage: message.content,
          user: message.author.username,
          messageHistory: [
            {
              role: "user",
              content: message.content,
              timestamp: Date.now()
            }
          ],
          helpfulInstruction: `Message from Discord user ${message.author.username} (${intent.reason})`
        };

        const platformContext: DiscordPlatformContext = {
          platform: this._pluginId,
          responseHandler: async () => {
            // Empty response handler - logic moved to reply executor
          },
          metadata: {
            channelId: message.channelId,
            messageId: message.id,
            userId: message.author.id
          }
        };

        await this.runtime.createEvent(userContext, platformContext);
      } else {
        // Only store the message if we're not going to process it
        // (if we process it, the event system will handle storage)
        await this.runtime.memory.storeUserInteraction(
          message.author.id,
          this._pluginId,
          message.content,
          Date.now(),
          message.id
        );

        // Add detailed info logging for skipped messages
        MonitorService.publishEvent({
          type: "discord.message.skipped",
          message: "Skipping message - not intended for agent",
          metadata: {
            content: message.content,
            author: message.author.username,
            reason: intent.reason,
            isMention: isMentioned,
            isReply: !!message.reference?.messageId,
            hasPrefix: message.content.startsWith(this._commandPrefix || "!")
          }
        });
      }
    } catch (error) {
      // Make sure we unlock if there's an error
      this._isProcessing = false;
      MonitorService.publishEvent({
        type: "discord.message.intent.error",
        message: "Error processing message intent",
        logLevel: "error",
        metadata: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          messageContent: message.content,
          author: message.author.username
        }
      });
    }
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
