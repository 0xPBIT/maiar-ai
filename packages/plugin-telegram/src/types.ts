import { z } from "zod";

/**
 * Configuration for the Telegram plugin
 */
export interface TelegramPluginConfig {
  token: string; // Telegram bot token
  pollingTimeout?: number; // Polling timeout in seconds
  dropPendingUpdates?: boolean; // Whether to drop pending updates on start
}

export const TelegramResponseSchema = z.object({
  message: z.string()
});
