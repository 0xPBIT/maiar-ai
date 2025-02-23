import "dotenv/config";

// Suppress deprecation warnings
process.removeAllListeners("warning");

import { config } from "dotenv";
import fs from "fs";
import path from "path";

// Load environment variables from root .env
config({
  path: path.resolve(__dirname, "../../..", ".env")
});

import { createRuntime } from "@maiar-ai/core";

// Import providers
import { PostgresProvider } from "@maiar-ai/memory-postgres";
import {
  OpenAIImageGenerationModel,
  OpenAIProvider,
  OpenAITextGenerationModel
} from "@maiar-ai/model-openai";
import { WebSocketMonitorProvider } from "@maiar-ai/monitor-websocket";
import { ConsoleMonitorProvider } from "@maiar-ai/monitor-console";
// Import all plugins
import { PluginCharacter } from "@maiar-ai/plugin-character";
import { PluginSearch } from "@maiar-ai/plugin-search";
import { PluginTerminal } from "@maiar-ai/plugin-terminal";
import { PluginTextGeneration } from "@maiar-ai/plugin-text";
import { PluginTime } from "@maiar-ai/plugin-time";
import { PluginPermissionsSearch } from "./plugins/plugin-permissions-search";
import { PluginExpress } from "@maiar-ai/plugin-express";
import {
  createPostExecutor,
  periodicPostTrigger,
  PluginX
} from "@maiar-ai/plugin-x";
import { PluginImageGeneration } from "@maiar-ai/plugin-image";
import { router } from "./express-app";
import { PluginDiscord } from "@maiar-ai/plugin-discord";

// Create and start the agent
const runtime = createRuntime({
  models: [
    new OpenAIProvider({
      models: [
        OpenAITextGenerationModel.GPT4O,
        OpenAIImageGenerationModel.DALLE3
      ],
      apiKey: process.env.OPENAI_API_KEY as string
    })
  ],
  memory: new PostgresProvider({
    connectionString: process.env.DATABASE_URL as string
  }),
  monitor: [
    new ConsoleMonitorProvider(),
    new WebSocketMonitorProvider({
      port: 3001,
      path: "/monitor"
    })
  ],
  plugins: [
    new PluginImageGeneration(),
    new PluginExpress({
      port: 3002,
      router
    }),
    new PluginTextGeneration(),
    new PluginTime(),
    new PluginCharacter({
      character: fs.readFileSync(
        path.join(process.cwd(), "character.xml"),
        "utf-8"
      )
    }),
    new PluginSearch({
      apiKey: process.env.PERPLEXITY_API_KEY as string
    }),
    new PluginPermissionsSearch({
      whitelistedUsers: ["test"]
    }),
    new PluginTerminal({
      user: "ligma",
      agentName: "maiar-starter"
    }),
    new PluginX({
      client_id: process.env.X_CLIENT_ID as string,
      client_secret: process.env.X_CLIENT_SECRET as string,
      callback_url: process.env.X_CALLBACK_URL as string,
      // You can customize which executors and triggers to use
      // If not specified, all default ones will be used automatically
      customExecutors: [createPostExecutor],
      customTriggers: [periodicPostTrigger]
    }),
    new PluginDiscord({
      token: process.env.DISCORD_BOT_TOKEN as string,
      clientId: process.env.DISCORD_CLIENT_ID as string,
      commandPrefix: "!"
    })
  ],
  capabilityAliases: [["image-generation", "generate_image"]]
});

// Start the runtime if this file is run directly
if (require.main === module) {
  console.log("Starting agent...");
  runtime.start().catch((error: Error) => {
    console.error("Failed to start agent:", error);
    process.exit(1);
  });

  // Handle shutdown gracefully
  process.on("SIGINT", async () => {
    console.log("Shutting down agent...");
    await runtime.stop();
    process.exit(0);
  });
}
