import "dotenv/config";

import { config } from "dotenv";
import { readFileSync } from "fs";
// import { readFileSync } from "fs";
import { join, resolve } from "path";

import { MemoryProvider, ModelProvider, Plugin, Runtime } from "@maiar-ai/core";
import { stdout, websocket } from "@maiar-ai/core/dist/logger";

import {
  OpenAIImageGenerationModel,
  OpenAIModelProvider,
  OpenAITextGenerationModel
} from "@maiar-ai/model-openai";

import { SQLiteMemoryProvider } from "@maiar-ai/memory-sqlite";

import { CharacterPlugin } from "@maiar-ai/plugin-character";
// import { PostgresMemoryProvider } from "@maiar-ai/memory-postgres";

import {
  DiscordPlugin,
  postListenerTrigger,
  replyMessageExecutor,
  sendMessageExecutor
} from "@maiar-ai/plugin-discord";
import { SearchPlugin } from "@maiar-ai/plugin-search";
import { TelegramPlugin } from "@maiar-ai/plugin-telegram";
import { TextGenerationPlugin } from "@maiar-ai/plugin-text";
import { TimePlugin } from "@maiar-ai/plugin-time";

import { SearchPermissionPlugin } from "./lib/plugins/plugin-permissions-search";

// Suppress deprecation warnings
process.removeAllListeners("warning");

// Load environment variables from root .env
config({
  path: resolve(__dirname, "../../..", ".env")
});

async function main() {
  const modelProviders: ModelProvider[] = [
    new OpenAIModelProvider({
      models: [
        OpenAITextGenerationModel.GPT_41,
        OpenAIImageGenerationModel.GPT_IMAGE_1
      ],
      apiKey: process.env.OPENAI_API_KEY as string
    })
  ];

  // SQLite memory provider
  const memoryProvider: MemoryProvider = new SQLiteMemoryProvider({
    dbPath: join(process.cwd(), "data", "conversations.db")
  });

  // Postgres memory provider
  // const memoryProvider: MemoryProvider = new PostgresMemoryProvider({
  //   connectionString: process.env.DATABASE_URL as string
  // });

  const plugins: Plugin[] = [
    new TextGenerationPlugin(),
    new TimePlugin(),
    new SearchPermissionPlugin(["0xPBIT"]),
    new SearchPlugin({
      apiKey: process.env.PERPLEXITY_API_KEY as string
    }),
    new DiscordPlugin({
      token: process.env.DISCORD_BOT_TOKEN as string,
      clientId: process.env.DISCORD_CLIENT_ID as string,
      commandPrefix: "!",
      executorFactories: [sendMessageExecutor, replyMessageExecutor],
      triggerFactories: [postListenerTrigger]
    }),
    new TelegramPlugin({
      token: process.env.TELEGRAM_BOT_TOKEN as string,
      pollingTimeout: 10000,
      dropPendingUpdates: true
    }),
    new CharacterPlugin({
      character: readFileSync(join(process.cwd(), "character.xml"), "utf-8")
    })
  ];

  const capabilityAliases: string[][] = [
    ["image-generation", "generate_image"],
    ["text-generation", "text-creation"]
  ];

  const agent = await Runtime.init({
    modelProviders,
    memoryProvider,
    plugins,
    capabilityAliases,
    options: {
      logger: {
        level: "debug",
        transports: [stdout, websocket({ path: "/monitor" })]
      },
      server: {
        port: 3000
      }
    }
  });

  await agent.start();
}

// Start the runtime if this file is run directly
if (require.main === module) {
  (async () => {
    try {
      console.log("Starting agent...");
      await main();
    } catch (error) {
      console.error("Failed to start agent");
      console.error(error);
      process.exit(1);
    }
  })();
}
