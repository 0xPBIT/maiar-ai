# Configuration

Configure your Maiar runtime with comprehensive options for model providers, memory storage, plugins, logging, and server settings.

This section covers all aspects of configuring your Maiar agent runtime environment, from basic setup to advanced customization options.

## Quick Start

The most basic runtime configuration requires a model provider, memory provider, and at least one plugin:

```typescript
import { Runtime } from '@maiar/core';
import { OpenAIModelProvider } from '@maiar/model-openai';
import { SQLiteMemoryProvider } from '@maiar/memory-sqlite';
import { ChatPlugin } from '@maiar/plugin-chat';

const runtime = await Runtime.init({
  modelProviders: [
    new OpenAIModelProvider({
      apiKey: process.env.OPENAI_API_KEY
    })
  ],
  memoryProvider: new SQLiteMemoryProvider({
    dataDir: './data'
  }),
  plugins: [
    new ChatPlugin()
  ]
});

await runtime.start();
```

## Configuration Sections

- **[Runtime Initialization](./runtime-init)** - Complete guide to `Runtime.init()` configuration
- **Model Providers** - Configure AI model providers like OpenAI, Ollama
- **Memory Providers** - Set up persistent storage with SQLite or PostgreSQL  
- **Plugin Configuration** - Configure and customize plugin behavior
- **Server Options** - HTTP server, CORS, and API endpoint configuration
- **Logging Configuration** - Structured logging, transports, and monitoring

## Environment Variables

Many configuration options can be set through environment variables for easier deployment:

```bash
# Model Provider Configuration
OPENAI_API_KEY=your_api_key_here
OLLAMA_BASE_URL=http://localhost:11434

# Memory Provider Configuration  
SQLITE_DATA_DIR=./data
POSTGRES_CONNECTION_STRING=postgresql://user:pass@localhost:5432/db

# Server Configuration
SERVER_PORT=3000
CORS_ORIGIN=http://localhost:3000

# Logging Configuration
LOG_LEVEL=info
```

## Best Practices

1. **Security**: Never commit API keys or credentials to version control
2. **Performance**: Configure appropriate memory and model provider settings for your use case
3. **Monitoring**: Set up proper logging and monitoring for production deployments
4. **Validation**: The runtime automatically validates configuration and provides helpful error messages