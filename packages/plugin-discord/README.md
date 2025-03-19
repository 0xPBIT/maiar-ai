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
}
```

## Plugin Information

### Actions

- `send_message`: Send a message to a Discord channel. The agent will select the most appropriate channel based on the channel name and description.

- `send_response`: Send a response to a Discord message. This is used when the agent needs to respond to a user's message in the Discord channel by using the reply functionality from the Discord API.

### Init

The Discord plugin will automatically connect to the Discord API when the agent is initialized and begin listening for messages.

## Usage

You will first need to create a discord bot and get the token and client ID. We recommend creating the bot and setting it to private invites only so that only your server can invite it.

In the bot management, you will have to enable `Guild Installs` so that the bot can be added to your server. It will output the OAuth2 URL to invite the bot to your server.

After you have successfuly invited the bot to your server, you should make the bot private. Disable the `Guild Installs` preference, and disable the `Public Bot` toggle in the bot preferences panel.

@-ing the agent will trigger a reply from that agent. The agent can be instructed to send a message to a specific channel, or it will pick the most appropriate channel based on the channel name and description.
