# @maiar-ai/plugin-discord

This package is part of the [Maiar](https://maiar.dev) ecosystem, designed to work seamlessly with `@maiar-ai/core`.

## Documentation

For detailed documentation, examples, and API reference, visit:
https://maiar.dev/docs

## Important Notice

The Discord plugin is currently in beta and some features may be unstable. We are working hard to iron out any issues and make it more reliable.

Furthermore, this plugin allows text-based commands to invoke the agent to post given simple instructions. This will mean anyone that has the ability to invoke a trigger will be able to invoke the agent to post a message to a channel. We suggest you use this plugin as a reference implementation, or add some sort of authorization and permissions to the plugin itself, or as another plugin using our extensible plugin system.

## Configuration

The Discord plugin requires the following configuration:

```typescript
interface DiscordPluginConfig {
  token: string; // The token for the Discord bot
  clientId: string; // The client ID for the Discord bot
  guildId?: string; // The ID of the guild to send messages to. If not provided, the bot will send messages to the first guild it joins. This is useful if you want to restrict the bot to a specific guild. Guilds are Discord's internal naming convention for servers.
  commandPrefix?: string; // The prefix for the command. If not provided, the default prefix is "!".
  customExecutors?: DiscordExecutorFactory[]; // Optional: Custom executor factories for Discord actions
  customTriggers?: DiscordTriggerFactory[]; // Optional: Custom trigger factories for Discord events
}
```

## Plugin Information

### Prebuilt Executors

The Discord plugin comes with the following built-in executors that are exported and ready to use:

- **`sendMessageExecutor`**: **Action ID: `send_message`** - Send a message to a Discord channel. The agent will select the most appropriate channel based on the channel name and description.

- **`replyMessageExecutor`**: **Action ID: `reply_message`** - Reply to a message in a Discord channel. This is used when the agent needs to respond to a user's message in the Discord channel by using the reply functionality from the Discord API.

### Prebuilt Triggers

The Discord plugin includes the following built-in triggers that are exported and ready to use:

- **`postListenerTrigger`**: Automatically listens for messages that mention the bot and processes them for agent responses.

When a user @-mentions the bot in a Discord channel, the plugin will process the message and allow the agent to respond appropriately.

### Init

The Discord plugin will automatically connect to the Discord API when the agent is initialized and begin listening for messages.

## Advanced Features

### Typing Indicators

The Discord plugin shows typing indicators while the agent is processing a response, providing a more natural interaction experience.

### Channel Selection

When sending messages, the agent can intelligently select the most appropriate channel based on channel names and descriptions, or can be directed to use a specific channel.

### Memory Integration

The plugin integrates with the agent's memory system to store interaction history for improved context awareness in future conversations.

## Customization

The Discord plugin supports custom executors and triggers to extend its functionality:

### Custom Executors

You can create custom executors using the `createSimpleDiscordExecutor` helper function:

```typescript
import { createSimpleDiscordExecutor } from "@maiar-ai/plugin-discord";

const myCustomExecutor = createSimpleDiscordExecutor(
  "custom_action",
  "Description of what this action does",
  async (context, service, runtime) => {
    // Implementation logic
    return {
      success: true,
      data: {
        /* result data */
      }
    };
  }
);
```

### Custom Triggers

You can add custom triggers to respond to different Discord events:

```typescript
import { DiscordTriggerFactory } from "@maiar-ai/plugin-discord";

const myCustomTrigger: DiscordTriggerFactory = (discordService, runtime) => {
  // Return a trigger implementation
};
```

## Usage

You will first need to create a discord bot and get the token and client ID. We recommend creating the bot and setting it to private invites only so that only your server can invite it.

In the bot management, you will have to enable `Guild Installs` so that the bot can be added to your server. It will output the OAuth2 URL to invite the bot to your server.

After you have successfuly invited the bot to your server, you should make the bot private. Disable the `Guild Installs` preference, and disable the `Public Bot` toggle in the bot preferences panel.

@-ing the agent will trigger a reply from that agent. The agent can be instructed to send a message to a specific channel, or it will pick the most appropriate channel based on the channel name and description.

## Importing Default Executors and Triggers

All built-in executors and triggers are exported and can be imported directly:

```typescript
import {
  PluginDiscord,
  postListenerTrigger,
  replyMessageExecutor,
  sendMessageExecutor
} from "@maiar-ai/plugin-discord";

// You can use them directly or customize the plugin
const discordPlugin = new PluginDiscord({
  token: "your-discord-bot-token",
  clientId: "your-discord-client-id",
  customExecutors: [
    sendMessageExecutor, // This is already included by default
    yourCustomExecutor
  ],
  customTriggers: [
    postListenerTrigger, // This is already included by default
    yourCustomTrigger
  ]
});
```
