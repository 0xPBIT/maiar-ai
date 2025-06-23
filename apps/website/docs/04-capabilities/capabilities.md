---
title: Capabilities
---

MAIAR treats every model feature—text generation, image editing, speech recognition, or whatever comes next—as a _capability_. Model providers _declare_ the capabilities they support, plugins _require_ the ones they depend on, and the runtime wires the two together while validating data with strongly-typed Zod schemas.

This contract-first approach keeps the framework future-proof. When a new foundation model ships with a novel modality, you simply register a provider that describes the new capability—no breaking changes and no plugin rewrites. Likewise, plugin authors build against an abstract interface rather than a specific model, confident their code will keep working as providers evolve.

The payoff is **native multimodality**: GPT-4o, GPT-Image-1 and tomorrow's text-audio-video giants all slot in via the same mechanism, while plugins continue to talk in their own preferred shapes thanks to the [transform system](/docs/capabilities/transforms).

## 1 Defining a capability

A capability is a **named contract** with three parts:

1. `input` – a Zod schema describing the data that the provider expects.
2. `output` – a Zod schema describing the data it will return.
3. _(optional)_ `config` – provider-specific options.

Use the helper `defineCapability` so that TypeScript keeps the literal `id`, and your IDE can autocomplete the schemas later:

```ts
import { z } from "zod";

import { defineCapability } from "@maiar-ai/core";

export const textGenerationCapability = defineCapability({
  id: "text-generation",
  name: "text-generation",
  description: "Generate text completions from prompts",
  input: z.string(),
  output: z.string()
});
```

## 2 Providing capabilities in a ModelProvider

Model providers expose one or more capabilities. You typically gather them in a dedicated `capabilities.ts` and re-export them as a tuple so the compiler can infer everything for you:

```typescript
export const textGenerationCapability = defineCapability({
  id: "text-generation",
  name: "text-generation",
  description: "Generate text completions from prompts",
  input: z.string(),
  output: z.string()
});

export const multiModalTextGenerationCapability = defineCapability({
  id: "multi-modal-text-generation",
  name: "multi-modal-text-generation",
  description: "Generate text completions from prompts and other text",
  input: z.object({
    prompt: z.string(),
    images: z.array(z.string()).optional()
  }),
  output: z.string()
});

export const imageGenerationCapability = defineCapability({
  id: "image-generation",
  name: "image-generation",
  description: "Generate images from text prompts",
  input: z.string(),
  output: z.array(z.string())
});

export const multiModalImageGenerationCapability = defineCapability({
  id: "multi-modal-image-generation",
  name: "multi-modal-image-generation",
  description: "Generate images from text prompts and other images",
  input: z.object({
    prompt: z.string(),
    images: z.array(z.string()).optional()
  }),
  output: z.array(z.string()),
  config: z.object({
    n: z.number().int().positive().default(1)
  })
});

// Group all capabilities for this provider into a readonly tuple so we can derive
// a CapabilityMap type and reuse it in the module augmentation below.
export const CAPABILITIES = [
  textGenerationCapability,
  imageGenerationCapability,
  multiModalImageGenerationCapability,
  multiModalTextGenerationCapability
] as const;

// Use the CapabilityMap helper to augment ICapabilities with all OpenAI capabilities.
declare module "@maiar-ai/core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ICapabilities extends CapabilityMap<typeof CAPABILITIES> {}
}
```

At runtime, every capability that is registered with the model provider is passed to `Runtime.init()`.

## 3 Consuming capabilities in a Plugin

Plugins **declare** what they need through the `requiredCapabilities` array. The runtime will refuse to start if no registered model supports a required capability, keeping contract violations impossible at runtime.

```typescript
export class TextGenerationPlugin extends Plugin {
  constructor() {
    super({
      id: "plugin-text",
      name: "Text Generation",
      description: async () =>
        (
          await this.runtime.templates.render(`${this.id}/plugin_description`)
        ).trim(),
      requiredCapabilities: [
        textGenerationCapability.id,
        multiModalTextGenerationCapability.id
      ],
      promptsDir: path.resolve(__dirname, "prompts")
    });
    ...
```

Inside your plugin (or anywhere you have access to the `Runtime` instance) you invoke a capability with:

```ts
const urls = await runtime.executeCapability("text-generation", prompt);
```

`executeCapability` validates the input/output against the Zod schemas you defined earlier.

:::tip Learn More About Transforms
What if we have a capability that requires a different input or output type than the one the model provider supports, but it's effectively the same operation? What if it's exactly the same operation and shape, but the developer has named it differently? We can use transforms to convert the data to the required type. Learn more about transforms [here](/docs/capabilities/transforms).
:::
