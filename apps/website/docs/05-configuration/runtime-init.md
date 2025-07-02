# Runtime Initialization

The `Runtime.init()` method is the primary entry point for configuring and initializing your Maiar agent runtime. This comprehensive guide covers all configuration options, examples, and best practices.

## Basic Usage

```typescript
import { Runtime } from '@maiar/core';

const runtime = await Runtime.init({
  modelProviders: [/* model providers */],
  memoryProvider: /* memory provider */,
  plugins: [/* plugins */],
  capabilityAliases: [/* optional aliases */],
  options: {
    logger: {/* logger config */},
    server: {/* server config */}
  }
});
```

## Configuration Parameters

### modelProviders (required)

Array of model providers that supply AI capabilities to your runtime. At least one provider must be configured with the required capabilities.

```typescript
import { OpenAIModelProvider } from '@maiar/model-openai';
import { OllamaModelProvider } from '@maiar/model-ollama';

const runtime = await Runtime.init({
  modelProviders: [
    new OpenAIModelProvider({
      apiKey: process.env.OPENAI_API_KEY,
      models: ['gpt-4', 'gpt-3.5-turbo'],
      baseURL: 'https://api.openai.com/v1' // optional
    }),
    new OllamaModelProvider({
      baseUrl: 'http://localhost:11434',
      models: ['llama2', 'codellama']
    })
  ],
  // ... other config
});
```

**Requirements:**
- Must include at least one provider with `text-generation` capability
- Additional capabilities may be required based on loaded plugins
- Providers are automatically validated during initialization

### memoryProvider (required)

Memory provider for persistent storage of conversations, context, and agent state.

```typescript
import { SQLiteMemoryProvider } from '@maiar/memory-sqlite';
import { PostgresMemoryProvider } from '@maiar/memory-postgres';

// SQLite Provider (recommended for development)
const sqliteProvider = new SQLiteMemoryProvider({
  dataDir: './data',
  tableName: 'memories' // optional
});

// PostgreSQL Provider (recommended for production)
const postgresProvider = new PostgresMemoryProvider({
  connectionString: process.env.DATABASE_URL,
  // or individual connection params:
  host: 'localhost',
  port: 5432,
  database: 'maiar',
  user: 'username',
  password: 'password'
});

const runtime = await Runtime.init({
  memoryProvider: sqliteProvider,
  // ... other config
});
```

### plugins (required)

Array of plugins that extend runtime functionality with triggers, executors, and custom capabilities.

```typescript
import { ChatPlugin } from '@maiar/plugin-chat';
import { DiscordPlugin } from '@maiar/plugin-discord';
import { XPlugin } from '@maiar/plugin-x';
import { TerminalPlugin } from '@maiar/plugin-terminal';

const runtime = await Runtime.init({
  plugins: [
    new ChatPlugin({
      // plugin-specific configuration
    }),
    new DiscordPlugin({
      token: process.env.DISCORD_BOT_TOKEN,
      clientId: process.env.DISCORD_CLIENT_ID
    }),
    new XPlugin({
      username: process.env.X_USERNAME,
      password: process.env.X_PASSWORD
    }),
    new TerminalPlugin({
      allowedCommands: ['ls', 'cat', 'pwd'],
      workingDirectory: './workspace'
    })
  ],
  // ... other config
});
```

**Plugin Validation:**
- Each plugin's required capabilities are validated against available model providers
- Plugins with missing capabilities will cause initialization to fail with descriptive errors
- Plugin prompt directories are automatically registered if provided

### capabilityAliases (optional)

Define aliases for capabilities to standardize capability names across different model providers.

```typescript
const runtime = await Runtime.init({
  capabilityAliases: [
    {
      ids: ['text-generation', 'chat-completion', 'completion'],
      transforms: [] // optional transforms
    },
    {
      ids: ['image-generation', 'image-create'],
      transforms: [
        {
          input: (input) => ({ ...input, model: 'dall-e-3' }),
          output: (output) => output
        }
      ]
    }
  ],
  // ... other config
});
```

**Benefits:**
- Allows plugins to use standardized capability names
- Enables switching between model providers without changing plugin code
- Supports input/output transformations for capability compatibility

## Options Configuration

### Logger Options

Configure structured logging with multiple transports and log levels.

```typescript
const runtime = await Runtime.init({
  options: {
    logger: {
      level: 'info', // trace, debug, info, warn, error
      transports: [
        {
          type: 'console',
          options: {
            colorize: true,
            timestamp: true
          }
        },
        {
          type: 'file',
          options: {
            filename: 'logs/maiar.log',
            maxFileSize: '10MB',
            maxFiles: 5
          }
        },
        {
          type: 'websocket',
          options: {
            port: 3001,
            path: '/logs'
          }
        }
      ]
    }
  },
  // ... other config
});
```

**Log Levels:**
- `trace`: Most verbose, includes all debug information
- `debug`: Development debugging information
- `info`: General operational information (default)
- `warn`: Warning messages for potential issues
- `error`: Error messages only

### Server Options

Configure the HTTP server for API endpoints and plugin routes.

```typescript
const runtime = await Runtime.init({
  options: {
    server: {
      port: 3000, // default: 3000
      cors: {
        origin: ['http://localhost:3000', 'https://yourdomain.com'],
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
      }
    }
  },
  // ... other config
});
```

**CORS Configuration:**
- `origin`: Array of allowed origins or '*' for all
- `methods`: HTTP methods to allow
- `allowedHeaders`: Headers that can be sent by the client
- `credentials`: Whether to include credentials in CORS requests

## Complete Example

Here's a complete example with all configuration options:

```typescript
import { Runtime } from '@maiar/core';
import { OpenAIModelProvider } from '@maiar/model-openai';
import { OllamaModelProvider } from '@maiar/model-ollama';
import { PostgresMemoryProvider } from '@maiar/memory-postgres';
import { ChatPlugin } from '@maiar/plugin-chat';
import { DiscordPlugin } from '@maiar/plugin-discord';

const runtime = await Runtime.init({
  modelProviders: [
    new OpenAIModelProvider({
      apiKey: process.env.OPENAI_API_KEY,
      models: ['gpt-4', 'gpt-3.5-turbo']
    }),
    new OllamaModelProvider({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      models: ['llama2', 'codellama']
    })
  ],
  
  memoryProvider: new PostgresMemoryProvider({
    connectionString: process.env.DATABASE_URL
  }),
  
  plugins: [
    new ChatPlugin(),
    new DiscordPlugin({
      token: process.env.DISCORD_BOT_TOKEN,
      clientId: process.env.DISCORD_CLIENT_ID
    })
  ],
  
  capabilityAliases: [
    {
      ids: ['text-generation', 'chat-completion'],
      transforms: []
    }
  ],
  
  options: {
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transports: [
        {
          type: 'console',
          options: { colorize: true }
        },
        {
          type: 'file',
          options: { filename: 'logs/maiar.log' }
        }
      ]
    },
    server: {
      port: parseInt(process.env.PORT || '3000'),
      cors: {
        origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }
    }
  }
});

// Start the runtime
await runtime.start();

console.log('🚀 Maiar runtime started successfully!');
```

## Initialization Process

The runtime initialization follows these steps:

1. **Logger Configuration**: Set up logging with specified level and transports
2. **Server Startup**: Initialize HTTP server with CORS and routing
3. **Prompt Registry**: Register core and plugin prompt templates
4. **Model Registration**: Register and validate all model providers
5. **Memory Setup**: Initialize memory provider and register memory plugin
6. **Plugin Registration**: Register plugins and validate capabilities
7. **Route Mounting**: Mount API routes for prompts and plugin endpoints
8. **Capability Aliases**: Configure capability aliases and transformations
9. **Validation**: Ensure all required capabilities are available
10. **Plugin Validation**: Verify all plugin requirements are satisfied
11. **Shutdown Handlers**: Set up graceful shutdown on process signals

## Error Handling

The runtime provides detailed error messages for common configuration issues:

```typescript
try {
  const runtime = await Runtime.init({
    // configuration
  });
} catch (error) {
  console.error('Runtime initialization failed:', error.message);
  
  // Common error types:
  // - Missing required capabilities
  // - Plugin requirement not satisfied
  // - Server initialization failure
  // - Memory provider connection failure
}
```

## Environment Variables

Use environment variables for sensitive configuration:

```bash
# .env file
OPENAI_API_KEY=sk-your-api-key
DISCORD_BOT_TOKEN=your-discord-token
DATABASE_URL=postgresql://user:pass@localhost:5432/maiar
PORT=3000
LOG_LEVEL=info
CORS_ORIGIN=http://localhost:3000,https://yourdomain.com
```

## Best Practices

1. **Security**: Store sensitive values in environment variables, not code
2. **Validation**: Let the runtime validate your configuration during initialization
3. **Monitoring**: Configure appropriate logging for your deployment environment
4. **Performance**: Choose memory providers based on your scale requirements
5. **Capabilities**: Only include model providers with capabilities your plugins need
6. **CORS**: Configure CORS restrictively for production deployments
7. **Graceful Shutdown**: The runtime handles SIGINT, SIGTERM, and SIGTSTP automatically

## Troubleshooting

### Common Issues

**Missing Capabilities Error**
```
Error: text-generation capability by a model provider is required for core runtime operations
```
*Solution*: Ensure at least one model provider supports the `text-generation` capability.

**Plugin Capability Missing**
```
Error: Plugin chat requires capability image-generation but it is not available
```
*Solution*: Add a model provider that supports the required capability or remove the plugin.

**Server Port Already in Use**
```
Error: Port 3000 is already in use
```
*Solution*: Change the port in configuration or stop the process using that port.

**Memory Provider Connection Failed**
```
Error: Failed to initialize PostgreSQL database
```
*Solution*: Verify database connection string and ensure the database is accessible.