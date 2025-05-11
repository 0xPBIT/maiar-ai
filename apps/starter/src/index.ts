import "dotenv/config";

import { config } from "dotenv";
import { readFileSync } from "fs";
import { join, resolve } from "path";
import { z } from "zod";

import {
  CapabilityAliasGroup,
  MemoryProvider,
  ModelProvider,
  Plugin,
  Runtime
} from "@maiar-ai/core";
import { stdout, websocket } from "@maiar-ai/core/dist/logger";

import {
  OpenAIModelProvider,
  OpenAIMultiModalImageGenerationModel,
  OpenAIMultiModalTextGenerationModel
} from "@maiar-ai/model-openai";
import { multiModalImageGenerationCapability as openaiImageGenMM } from "@maiar-ai/model-openai";

import { SQLiteMemoryProvider } from "@maiar-ai/memory-sqlite";

import {
  DiscordPlugin,
  postListenerTrigger,
  replyMessageExecutor,
  sendMessageExecutor
} from "@maiar-ai/plugin-discord";
import {
  ImageGenerationPlugin,
  multiModalImageGenerationCapability as pluginImageGenMM
} from "@maiar-ai/plugin-image";
import { SearchPlugin } from "@maiar-ai/plugin-search";
import { TelegramPlugin } from "@maiar-ai/plugin-telegram";
import { TextGenerationPlugin } from "@maiar-ai/plugin-text";
import { TimePlugin } from "@maiar-ai/plugin-time";

import { CharacterPlugin } from "../../../packages/plugin-character/dist";

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
        OpenAIMultiModalTextGenerationModel.GPT_41,
        OpenAIMultiModalImageGenerationModel.GPT_IMAGE_1
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
    //new SearchPermissionPlugin(["0xPBIT"]),
    new SearchPlugin({
      apiKey: process.env.PERPLEXITY_API_KEY as string
    }),
    new ImageGenerationPlugin(),
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

  const capabilityAliases: CapabilityAliasGroup[] = [
    {
      ids: [openaiImageGenMM.id, pluginImageGenMM.id],
      transforms: [
        {
          config: {
            plugin: pluginImageGenMM.config!,
            provider: openaiImageGenMM.config!,
            transform: (
              d
            ): z.infer<NonNullable<typeof openaiImageGenMM.config>> => {
              const config = d as z.infer<
                NonNullable<typeof pluginImageGenMM.config>
              >;
              return {
                ...config,
                n: config.number
              };
            }
          },
          input: {
            plugin: pluginImageGenMM.input,
            provider: openaiImageGenMM.input,
            transform: (
              d
            ): z.infer<NonNullable<typeof openaiImageGenMM.input>> => {
              const input = d as z.infer<
                NonNullable<typeof pluginImageGenMM.input>
              >;
              return {
                ...input,
                images: input.urls
              };
            }
          }
        }
      ]
    }
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
      await main();
    } catch (error) {
      console.error("Failed to start agent");
      console.error(error);
      process.exit(1);
    }
  })();
}
