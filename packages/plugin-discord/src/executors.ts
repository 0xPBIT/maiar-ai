import { BaseGuildTextChannel } from "discord.js";

import { AgentTask, Executor, PluginResult, Runtime } from "@maiar-ai/core";
import * as maiarLogger from "@maiar-ai/core/dist/logger";

import { DiscordService } from "./services";
import {
  generateChannelSelectionTemplate,
  generateResponseTemplate
} from "./templates";
import {
  ChannelInfo,
  DiscordChannelSelectionSchema,
  DiscordExecutorFactory,
  DiscordPlatformContext,
  DiscordReplySchema,
  DiscordSendSchema
} from "./types";

/**
 * Helper to create a simple executor with name, description, and execute function
 * The execute function will receive context, xService, and runtime
 */
export function discordExecutorFactory(
  name: string,
  description: string,
  execute: (
    task: AgentTask,
    service: DiscordService,
    runtime: Runtime,
    logger: maiarLogger.Logger
  ) => Promise<PluginResult>
): DiscordExecutorFactory {
  const logger = maiarLogger.default.child({
    scope: `plugin-discord`
  });

  return (service: DiscordService, getRuntime: () => Runtime): Executor => ({
    name,
    description,
    fn: (task: AgentTask) => {
      const runtime = getRuntime();
      return execute(task, service, runtime, logger);
    }
  });
}

/**
 * Default executor for sending a message to a Discord channel
 */
export const sendMessageExecutor = discordExecutorFactory(
  "send_message",
  "Send a message to a Discord channel",
  async (
    task: AgentTask,
    service: DiscordService,
    runtime: Runtime,
    logger: maiarLogger.Logger
  ): Promise<PluginResult> => {
    try {
      const response = await runtime.getObject(
        DiscordSendSchema,
        generateResponseTemplate(task.contextChain)
      );

      // Get all available text channels
      const guild = service.guildId
        ? await service.client.guilds.fetch(service.guildId)
        : service.client.guilds.cache.first();

      logger.info("fetched guild", {
        type: "discord.guild.fetch",
        guildId: guild?.id,
        guildName: guild?.name
      });

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

      logger.info("text channels fetched", {
        type: "discord.message.sending",
        size: textChannels.size,
        channels: Array.from(textChannels.values()).map((channel) => ({
          id: channel.id,
          name: channel.name,
          type: "text",
          description:
            channel.topic || `${channel.parent?.name || ""} / ${channel.name}`
        }))
      });

      // Convert channels to array for AI selection
      const channelInfo = Array.from(textChannels.values()).map((channel) => ({
        id: channel.id,
        name: channel.name,
        type: "text",
        description:
          channel.topic || `${channel.parent?.name || ""} / ${channel.name}`
      })) as ChannelInfo[];

      // Log channel info
      logger.info("channel info fetched", {
        type: "discord.channel.info",
        channels: channelInfo
      });

      // Let the AI pick the most appropriate channel
      const channelSelection = await runtime.getObject(
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

      logger.info("channel selected", {
        type: "discord.channel.selection",
        channelId: selectedChannel.id,
        channelName: selectedChannel.name
      });

      await selectedChannel.send(response.message);

      const user = (task.platformContext as DiscordPlatformContext).metadata
        ?.userId;

      if (user) {
        await runtime.memory.storeAssistantInteraction(
          user,
          service.pluginId,
          response.message,
          task.contextChain
        );
      }

      return {
        success: true,
        data: {
          helpfulInstruction: `Message sent to Discord channel ${selectedChannel.name} successfully. Attached is some metadata about the message and the channel.`,
          message: response.message,
          channelId: selectedChannel.id,
          channelName: selectedChannel.name
        }
      };
    } catch (error) {
      logger.error("error sending discord message", {
        type: "discord.message.send.error",
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
);

/**
 * Default executor for replying to a message in a Discord channel
 */
export const replyMessageExecutor = discordExecutorFactory(
  "reply_message",
  "Reply to a message in a Discord channel",
  async (
    task: AgentTask,
    service: DiscordService,
    runtime: Runtime,
    logger: maiarLogger.Logger
  ): Promise<PluginResult> => {
    if (
      !task.platformContext?.metadata?.channelId ||
      !task.platformContext?.metadata?.messageId
    ) {
      return {
        success: false,
        error: "Missing channelId or messageId in platform context"
      };
    }

    const messageId = task.platformContext.metadata.messageId as string;
    const channelId = task.platformContext.metadata.channelId as string;

    try {
      const response = await runtime.getObject(
        DiscordReplySchema,
        generateResponseTemplate(task.contextChain)
      );

      const channel = await service.client.channels.fetch(channelId);
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

      // Stop typing indicator after reply is sent
      service.stopTypingIndicator(channelId);

      // Release processing lock after reply is sent
      service.isProcessing = false;
      logger.info("message processing complete - agent unlocked", {
        type: "discord.message.processing.complete",
        messageId,
        channelId
      });

      const user = (task.platformContext as DiscordPlatformContext).metadata
        ?.userId;

      if (user) {
        await runtime.memory.storeAssistantInteraction(
          user,
          service.pluginId,
          response.message,
          task.contextChain
        );
      }

      return { success: true, data: { message: response.message } };
    } catch (error) {
      // Make sure we unlock and stop typing if there's an error
      service.isProcessing = false;
      service.stopTypingIndicator(channelId);

      logger.error("error sending discord reply", {
        type: "discord.message.reply.error",
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
);
