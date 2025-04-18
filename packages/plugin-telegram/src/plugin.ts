import { Telegraf } from "telegraf";

import { AgentTask, Plugin, PluginResult } from "@maiar-ai/core";

import { generateResponseTemplate } from "./templates";
import {
  TelegramContext,
  TelegramPluginConfig,
  TelegramResponseSchema
} from "./types";

export class TelegramPlugin extends Plugin {
  private bot: Telegraf<TelegramContext>;

  constructor(private config: TelegramPluginConfig) {
    super({
      id: "plugin-telegram",
      name: "Telegram",
      description: "Handles Telegram bot interactions using long polling",
      requiredCapabilities: []
    });

    if (!config.token) {
      throw new Error("Telegram token is required");
    }

    this.bot = new Telegraf<TelegramContext>(config.token);

    this.executors = [
      {
        name: "send_response",
        description: "Send a response to a Telegram chat",
        fn: this.handleSendMessage.bind(this)
      }
    ];
  }

  private async handleSendMessage(task: AgentTask): Promise<PluginResult> {
    if (!task.platformContext?.responseHandler) {
      return {
        success: false,
        error: "No response handler found in platform context"
      };
    }

    try {
      // Format the response based on the context chain
      const formattedResponse = await this.runtime.operations.getObject(
        TelegramResponseSchema,
        generateResponseTemplate(task.contextChain),
        { temperature: 0.2 }
      );

      task.platformContext.responseHandler(formattedResponse.message);
      return {
        success: true,
        data: {
          message: formattedResponse.message
        }
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        success: false,
        error: `Failed to send message: ${errorMessage}`
      };
    }
  }

  public async init(): Promise<void> {
    this.bot.use(async (ctx, next) => {
      ctx.plugin = this;
      return await next();
    });

    this.bot.use(this.config.composer);

    // Log all bot errors
    this.bot.catch((error) => {
      this.logger.error("telegram bot error", {
        type: "telegram.bot.error",
        error: error instanceof Error ? error.message : String(error)
      });
    });

    // Start the bot with polling in the background
    const pollingOptions = {
      timeout: this.config.pollingTimeout || 30,
      dropPendingUpdates: this.config.dropPendingUpdates
    };

    // Launch bot without awaiting to prevent blocking
    this.bot.launch(pollingOptions).catch((error) => {
      this.logger.error("failed to start bot", {
        type: "telegram.bot.launch.error",
        error: error instanceof Error ? error.message : String(error),
        pollingOptions
      });
    });

    this.logger.info("bot started with polling", {
      type: "telegram.bot.start",
      options: pollingOptions
    });
  }

  public async shutdown(): Promise<void> {
    this.bot.stop();
  }
}
