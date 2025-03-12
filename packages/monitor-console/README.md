# @maiar-ai/monitor-console

This package is part of the [Maiar](https://maiar.dev) ecosystem, designed to work seamlessly with `@maiar-ai/core`.

## Information

The Console Monitor:

1. Implements the `MonitorProvider` interface from `@maiar-ai/core`
2. Uses ANSI color codes for neon green text highlighting
3. Formats events with timestamps and metadata
4. Requires no configuration or external dependencies

### Console Output

When your agent is running, you'll see events in your terminal:

```
[Monitor] Console monitor initialized
[Monitor] Event: runtime_start | Agent runtime started | 2023-03-15T12:34:56.789Z
[Monitor] Event: model_request | Sending prompt to model | 2023-03-15T12:35:01.123Z
[Monitor] Event Metadata: { tokens: 156, model: "gpt-4o" }
[Monitor] Event: model_response | Received response from model | 2023-03-15T12:35:03.456Z
[Monitor] Event Metadata: { tokens: 89, duration_ms: 2333 }
```

## More Documentation

For detailed documentation, examples, and API reference, visit:
https://maiar.dev/docs/monitor-providers/console-monitor
