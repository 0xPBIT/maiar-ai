import {
  AgentContext,
  createLogger,
  PluginBase,
  PluginResult,
  UserInputContext,
  Runtime
} from "@maiar-ai/core";
import {
  Client,
  Events,
  GatewayIntentBits,
  Message,
  BaseGuildTextChannel
} from "discord.js";
import {
  DiscordPlatformContext,
  DiscordPluginConfig,
  DiscordReplySchema,
  DiscordSendSchema,
  DiscordChannelSelectionSchema,
  ChannelInfo
} from "./types";
import {
  generateResponseTemplate,
  generateChannelSelectionTemplate
} from "./templates";

const log = createLogger("plugin:discord");

export class PluginDiscord extends PluginBase {
  private client: Client;
  private typingIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(private config: DiscordPluginConfig) {
    super({
      id: "plugin-discord",
      name: "Discord",
      description: "Handles Discord bot interactions and message processing"
    });

    if (!config.token || !config.clientId) {
      throw new Error("Discord token and clientId are required");
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
      ]
    });

    // Add send message executor for proactive messages
    this.addExecutor({
      name: "send_message",
      description:
        "Send a message to a Discord channel based on channel description",
      execute: async (context: AgentContext): Promise<PluginResult> => {
        try {
          const response = await this.runtime.operations.getObject(
            DiscordSendSchema,
            generateResponseTemplate(context.contextChain)
          );

          // Get all available text channels
          const guild = this.config.guildId
            ? await this.client.guilds.fetch(this.config.guildId)
            : this.client.guilds.cache.first();

          if (!guild) {
            return {
              success: false,
              error: "No guild available to send message to"
            };
          }

          const textChannels = (await guild.channels.fetch()).filter(
            (channel) => channel instanceof BaseGuildTextChannel
          ) as Map<string, BaseGuildTextChannel>;

          if (textChannels.size === 0) {
            return {
              success: false,
              error: "No text channels available to send message to"
            };
          }

          // Convert channels to array for AI selection
          const channelInfo = Array.from(textChannels.values()).map(
            (channel) => ({
              id: channel.id,
              name: channel.name,
              type: "text",
              description:
                channel.topic ||
                `${channel.parent?.name || ""} / ${channel.name}`
            })
          ) as ChannelInfo[];

          log.info("Channel info", { channelInfo });

          // Let the AI pick the most appropriate channel
          const channelSelection = await this.runtime.operations.getObject(
            DiscordChannelSelectionSchema,
            generateChannelSelectionTemplate(response.channelName, channelInfo)
          );

          const selectedChannel = textChannels.get(channelSelection.channelId);
          if (!selectedChannel) {
            return {
              success: false,
              error: "Selected channel not found"
            };
          }

          await selectedChannel.send(response.message);

          return {
            success: true,
            data: {
              message: response.message,
              channelId: selectedChannel.id,
              channelName: selectedChannel.name
            }
          };
        } catch (error) {
          log.error("Error sending Discord message", { err: error });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    });

    // Add reply executor for responding to messages
    this.addExecutor({
      name: "reply_message",
      description: "Reply to a Discord message in its channel",
      execute: async (context: AgentContext): Promise<PluginResult> => {
        if (
          !context.platformContext?.metadata?.channelId ||
          !context.platformContext?.metadata?.messageId
        ) {
          return {
            success: false,
            error: "Missing channelId or messageId in platform context"
          };
        }

        const messageId = context.platformContext.metadata.messageId as string;

        try {
          const response = await this.runtime.operations.getObject(
            DiscordReplySchema,
            generateResponseTemplate(context.contextChain)
          );

          const channelId = context.platformContext.metadata
            .channelId as string;

          const channel = await this.client.channels.fetch(channelId);
          if (
            !channel?.isTextBased() ||
            !(channel instanceof BaseGuildTextChannel)
          ) {
            return {
              success: false,
              error: "Channel not found or is not a text channel"
            };
          }

          const originalMessage = await channel.messages.fetch(messageId);
          await originalMessage.reply(response.message);

          // Clear typing indicator after reply is sent
          const typingInterval = this.typingIntervals.get(messageId);
          if (typingInterval) {
            clearInterval(typingInterval);
            this.typingIntervals.delete(messageId);
          }

          return { success: true, data: { message: response.message } };
        } catch (error) {
          // Clear typing indicator if there's an error
          const typingInterval = this.typingIntervals.get(messageId);
          if (typingInterval) {
            clearInterval(typingInterval);
            this.typingIntervals.delete(messageId);
          }

          log.error("Error sending Discord reply", { err: error });
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      }
    });
  }

  async init(runtime: Runtime): Promise<void> {
    await super.init(runtime);

    try {
      await this.client.login(this.config.token);
      log.info("Discord client connected successfully");

      // Use once instead of on to ensure we only add the listener once
      if (!this.client.listenerCount(Events.MessageCreate)) {
        this.client.on(Events.MessageCreate, this.handleMessage.bind(this));
      }
    } catch (error) {
      log.error("Failed to initialize Discord client", { err: error });
      throw error;
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    // Ignore bot messages and messages that don't mention us
    if (
      message.author.bot ||
      !message.mentions.users.has(this.client.user!.id)
    ) {
      return;
    }

    // Ignore messages from other guilds if guildId is specified
    if (this.config.guildId && message.guildId !== this.config.guildId) {
      return;
    }

    // Ignore messages not in text channels
    if (
      !message.channel.isTextBased() ||
      !(message.channel instanceof BaseGuildTextChannel)
    ) {
      return;
    }

    try {
      // Start typing indicator
      if (message.channel instanceof BaseGuildTextChannel) {
        await message.channel.sendTyping();

        // Keep typing indicator active during processing
        const typingInterval = setInterval(() => {
          if (message.channel instanceof BaseGuildTextChannel) {
            message.channel.sendTyping().catch((err: Error) => {
              log.error("Error maintaining typing indicator", { err });
            });
          }
        }, 5000);

        // Store the interval using messageId as key
        this.typingIntervals.set(message.id, typingInterval);
      }

      // Clean the message content by removing the mention
      const cleanContent = message.content
        .replace(new RegExp(`<@!?${this.client.user!.id}>`), "")
        .trim();

      const userContext: UserInputContext = {
        id: `${this.id}-${message.id}`,
        pluginId: this.id,
        type: "user_input",
        action: "receiveMessage",
        content: cleanContent,
        timestamp: Date.now(),
        rawMessage: message.content,
        user: message.author.username,
        messageHistory: [
          {
            role: "user",
            content: cleanContent,
            timestamp: Date.now()
          }
        ],
        helpfulInstruction: `Message from Discord user ${message.author.username}`
      };

      const platformContext: DiscordPlatformContext = {
        platform: this.id,
        responseHandler: async (response: unknown) => {
          log.info("Response from Discord", { response });
        },
        metadata: {
          channelId: message.channelId,
          messageId: message.id
        }
      };

      await this.runtime.createEvent(userContext, platformContext);
    } catch (error) {
      // Clear typing interval if there's an error
      const typingInterval = this.typingIntervals.get(message.id);
      if (typingInterval) {
        clearInterval(typingInterval);
        this.typingIntervals.delete(message.id);
      }

      log.error("Error processing Discord message", {
        err: error,
        messageId: message.id,
        channelId: message.channelId
      });
    }
  }

  async cleanup(): Promise<void> {
    await this.client.destroy();
  }
}
