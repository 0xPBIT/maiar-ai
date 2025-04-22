import "dotenv/config";

import { config } from "dotenv";
import { readFileSync } from "fs";
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
import { CodexPlugin } from "@maiar-ai/plugin-codex";
import {
  DiscordPlugin,
  postListenerTrigger,
  replyMessageExecutor,
  sendMessageExecutor
} from "@maiar-ai/plugin-discord";
import { ImageGenerationPlugin } from "@maiar-ai/plugin-image";
import { MCPPlugin } from "@maiar-ai/plugin-mcp";
import { SearchPlugin } from "@maiar-ai/plugin-search";
import { TerminalPlugin } from "@maiar-ai/plugin-terminal";
import { TextGenerationPlugin } from "@maiar-ai/plugin-text";
import { TimePlugin } from "@maiar-ai/plugin-time";
import {
  createPostExecutor,
  periodicPostTrigger,
  XPlugin
} from "@maiar-ai/plugin-x";

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
        OpenAIImageGenerationModel.DALLE3
      ],
      apiKey: process.env.OPENAI_API_KEY as string
    })
  ];

  const memoryProvider: MemoryProvider = new SQLiteMemoryProvider({
    dbPath: join(process.cwd(), "data", "conversations.db")
  });

  const plugins: Plugin[] = [
    new CodexPlugin({
      apiKey: process.env.OPENAI_API_KEY as string
    }),
    new ImageGenerationPlugin(),
    new TextGenerationPlugin(),
    new TimePlugin(),
    new SearchPermissionPlugin(["ligma"]),
    new SearchPlugin({
      apiKey: process.env.PERPLEXITY_API_KEY as string
    }),
    new TerminalPlugin({
      user: "ligma",
      agentName: "maiar-starter"
    }),
    new MCPPlugin([
      {
        // ----- server #1 (puppeteer) -----
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-puppeteer"],
        env: {
          PUPPETEER_LAUNCH_OPTIONS: JSON.stringify({ headless: false }),
          ALLOW_DANGEROUS: "true"
        },
        clientName: "puppeteer"
      },
      {
        // ----- server #2 (example tools) -----
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-everything"],
        clientName: "everything"
      }
    ]),
    new CharacterPlugin({
      character: readFileSync(join(process.cwd(), "character.xml"), "utf-8")
    }),
    new XPlugin({
      client_id: process.env.X_CLIENT_ID as string,
      client_secret: process.env.X_CLIENT_SECRET as string,
      callback_url: process.env.X_CALLBACK_URL as string,
      // You can customize which executors and triggers to use
      // If not specified, all default ones will be used automatically
      executorFactories: [createPostExecutor],
      triggerFactories: [periodicPostTrigger]
    }),
    new DiscordPlugin({
      token: process.env.DISCORD_BOT_TOKEN as string,
      clientId: process.env.DISCORD_CLIENT_ID as string,
      commandPrefix: "!",
      executorFactories: [sendMessageExecutor, replyMessageExecutor],
      triggerFactories: [postListenerTrigger]
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
