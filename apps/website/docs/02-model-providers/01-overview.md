---
title: Model Providers
description: Integrate any LLM or generative model with MAIAR
sidebar_position: 1
---

# Models in MAIAR

MAIAR contains a **pluggable model layer**. A _model provider_ wraps one or many concrete models (OpenAI, Ollama, etc.) and exposes the **capabilities** they support—text generation, image generation, multimodal reasoning, and so on.  
Plugins and the runtime consume these capabilities without needing to know which physical model they come from.

---

## The Model Provider Base-Class

Every provider **extends** the abstract [`ModelProvider`](/api/classes/ModelProvider) class that lives in `@maiar-ai/core`.  
The class already implements logging, capability bookkeeping and type-safe execution—your job is to

1. call `super()` with metadata (id, description),
2. register at least one capability, and
3. implement the lifecycle hooks: `init`, `checkHealth`, and `shutdown`.

---

## Model Capabilities

A [**capability**](/docs/capabilities/capabilities/) is an atomic skill that a model can perform. Typical examples include:

- `text-generation` – Generate plain text from a prompt.
- `image-generation` – Create an image from a text prompt.
- `multi-modal-text-generation` – Combine text & images as inputs.

The runtime guarantees that only validated data reaches your implementation and that plugins only call models that actually possess the requested capability.

For an in-depth guide see the [Capabilities documentation](../04-capabilities/capabilities.md).

---

## Official Providers

MAIAR ships with providers for the some common back-ends.  
Each provider can expose _multiple_ capabilities depending on which model(s) you include in the `models` array.

### OpenAI

```typescript
import { OpenAIModelProvider } from "@maiar-ai/model-openai";

const agent = Runtime.init({
  // ... other configurations
  models: [
    new OpenAIModelProvider({
      apiKey: process.env.OPENAI_API_KEY!,
      models: ["gpt-4o"] // you can list several models!
    })
  ]
});
```

### Ollama

```typescript
import { OllamaModelProvider } from "@maiar-ai/model-ollama";

const agent = Runtime.init({
  // ... other configurations
  models: [
    new OllamaModelProvider({
      baseUrl: "http://localhost:11434",
      model: "llama2" // also works with deepseek reasoning models
    })
  ]
});
```

Feel free to copy any of these providers as a starting point for your own models. Because everything revolves around _capabilities_, your plugins will continue to work as long as the required capability id is present – regardless of where the underlying intelligence comes from.
