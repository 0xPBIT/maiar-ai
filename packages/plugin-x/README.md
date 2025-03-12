# @maiar-ai/plugin-x

This package is part of the [Maiar](https://maiar.dev) ecosystem, designed to work seamlessly with `@maiar-ai/core`.

## Documentation

For detailed documentation, examples, and API reference, visit:
https://maiar.dev/docs

## Configuration

The X plugin requires the following configuration:

```typescript
interface XPluginConfig {
  // OAuth2 Authentication
  client_id: string;
  client_secret?: string; // Only required for confidential clients
  callback_url: string;
  bearer_token?: string; // For app-only authentication
}
```

### Required Configuration

- `client_id`: Your X API OAuth 2.0 client ID (from X Developer Portal)
- `callback_url`: Your OAuth callback URL (e.g., http://localhost:3000/callback)
- `client_secret`: Your X API client secret (required for confidential clients)

> **Important**: The plugin now strictly requires these configuration parameters to be present. If they are missing, the plugin will throw an error and halt application execution. Make sure to properly configure these values before using the plugin.

## Plugin Information

### Actions

- `post_tweet`: Post a new tweet (not a reply). Used when you want to post a new tweet that is not in response to another tweet.

### Triggers

- `mentions`: Monitors and processes mentions of the configured X account. Automatically checks for new mentions at configured intervals and handles user interactions.

For more detailed examples and advanced usage, visit our [documentation](https://maiar.dev/docs).

# Maiar X Plugin

A plugin for the Maiar AI agent framework to interact with the X (Twitter) API.

## Authentication with X API

This plugin provides an interactive authentication flow to connect with the X API. The process uses OAuth 2.0 to securely authenticate and authorize your application.

### Prerequisites

1. Create a project/app in the [X Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Configure your app with:
   - OAuth 2.0 authentication
   - A localhost callback URL (e.g., `http://localhost:3000/callback`)
   - Read/Write permissions

### Setup

Edit your `.env` file with your X API credentials from the developer portal.

### Authentication Process

The plugin handles authentication automatically during initialization:

1. When the plugin initializes, it checks for existing stored credentials
2. If no valid token is found, it **automatically starts** the authentication flow
3. You'll be guided through the X API authentication process interactively
4. After authentication is complete, the plugin will continue initialization

If authentication fails at any point:

1. The plugin will throw an error with a detailed message
2. Your application will halt execution, preventing it from running with invalid credentials
3. You'll need to restart your application after fixing the configuration or running manual authentication

You can also manually trigger authentication at any time:

```bash
pnpm maiar-x-login
```

This allows you to update the token if needed or redo the authentication with different credentials.

The authentication flow will:

1. Generate an authorization URL for you to open in your browser
2. Guide you through the authentication process with X
3. Allow you to paste the callback URL after authorization
4. Exchange the code for an access token and store it securely
5. Test the connection to ensure everything works

### Token Persistence

Authentication tokens are stored securely in the `./data/x-oauth-token` file in your project directory. Tokens will be reused between application restarts, and the plugin automatically handles token refreshing when needed.

### Troubleshooting

- **Application stops with "Missing required configuration" error**: The plugin now strictly requires the `client_id`, `client_secret`, and `callback_url` parameters. Make sure to set these in your configuration or environment variables before starting the application.
- **Authentication failed**: Make sure your callback URL exactly matches what's configured in your X Developer Portal.
- **Code expired**: Authorization codes expire quickly. Complete the process within a few minutes.

## Posting to X

After authenticating, you can use the service to post tweets.
