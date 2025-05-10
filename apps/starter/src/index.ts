import "dotenv/config";

import { config } from "dotenv";
import { join, resolve } from "path";
import { z } from "zod";

import { MemoryProvider, ModelProvider, Plugin, Runtime } from "@maiar-ai/core";
import { stdout, websocket } from "@maiar-ai/core/dist/logger";

import {
  OpenAIModelProvider,
  OpenAIMultiModalImageGenerationModel,
  OpenAIMultiModalTextGenerationModel
} from "@maiar-ai/model-openai";
import { multiModalImageGenerationCapability as openaiMM } from "@maiar-ai/model-openai";

import { SQLiteMemoryProvider } from "@maiar-ai/memory-sqlite";

// import { PostgresMemoryProvider } from "@maiar-ai/memory-postgres";

import {
  DiscordPlugin,
  postListenerTrigger,
  replyMessageExecutor,
  sendMessageExecutor
} from "@maiar-ai/plugin-discord";
import {
  multiModalImageGenerationCapability as comicImageMM,
  ImageGenerationPlugin
} from "@maiar-ai/plugin-image";
import { MCPPlugin } from "@maiar-ai/plugin-mcp";
import { SearchPlugin } from "@maiar-ai/plugin-search";
import { TelegramPlugin } from "@maiar-ai/plugin-telegram";
import { TextGenerationPlugin } from "@maiar-ai/plugin-text";
import { TimePlugin } from "@maiar-ai/plugin-time";

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
    new MCPPlugin({
      name: "solcopilot",
      url: "https://solcopilot.com/api/mcp/f93d71fc23b61cc95172ef1842fd7d78ae3357b26a4733b41bc6a913c5a78285"
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
    })
    // new CharacterPlugin({
    //   character: readFileSync(join(process.cwd(), "character.xml"), "utf-8")
    // })
  ];

  const capabilityAliases = [
    {
      ids: [openaiMM.id, comicImageMM.id],
      transforms: [
        {
          input: {
            plugin: comicImageMM.input,
            provider: openaiMM.input,
            transform: (data: unknown) => {
              return {
                ...(data as z.infer<typeof comicImageMM.input>),
                images: (data as { urls: string[] }).urls
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
        level: "warn",
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
