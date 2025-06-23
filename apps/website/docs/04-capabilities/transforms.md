---
title: Transforms
---

Sometimes two different libraries expose the _same_ logical ability but with slightly different shapes. **Capability aliases** let you tell the runtime that they are equivalent, while **transforms** adapt the data between the plugin-side shape and the provider-side shape.

You register aliases at bootstrap time:

```ts
const capabilityAliases = [
  {
    ids: [openaiMM.id, pluginMM.id], // two IDs that mean the same thing
    transforms: [
      /* see below */
    ]
  }
];
```

Each entry in `transforms` is a `CapabilityTransformEntry` where you can provide:

- `input.transform` – adapt plugin → provider input.
- `output.transform` – adapt provider → plugin output.
- `config.transform` – adapt plugin → provider config.

## 5 Advanced example: plugin-image × OpenAI multi-modal

Below is the real transform that lets `@maiar-ai/plugin-image` consume OpenAI's multi-modal image generation model. Focus on the **config** and **input** transforms – the provider expects `{ n }` and `{ prompt, images }` while the plugin prefers `{ number }` and `{ prompt, urls }`.

```typescript
const capabilityAliases: CapabilityAliasGroup[] = [
  {
    ids: [openaiImageGenMM.id, pluginImageGenMM.id],
    transforms: [
      {
        config: {
          plugin: pluginImageGenMM.config!,
          provider: openaiImageGenMM.config!,
          transform: (
            cfg: unknown
          ):
            | z.infer<NonNullable<typeof openaiImageGenMM.config>>
            | undefined => {
            if (!cfg) return undefined;

            const config = cfg as z.infer<
              NonNullable<typeof pluginImageGenMM.config>
            >;
            return {
              n: config.number || 1
            };
          }
        },
        input: {
          plugin: pluginImageGenMM.input,
          provider: openaiImageGenMM.input,
          transform: (
            i: unknown
          ): z.infer<NonNullable<typeof openaiImageGenMM.input>> => {
            const input = i as z.infer<
              NonNullable<typeof pluginImageGenMM.input>
            >;
            return {
              prompt: input.prompt,
              images: input.urls
            };
          }
        }
      }
    ]
  }
];
```

With that alias in place the plugin can simply call:

```ts
await runtime.executeCapability("multi-modal-image-generation", {
  prompt: "a cute corgi",
  urls: [ ... ]
});
```

and the runtime will route the request to the OpenAI provider, transforming the data on the fly.

:::tip Advanced Transforms
Transforms are a powerful way to adapt data between different capabilities, model providers, plugins, and separate developement projects. To learn more about transforms, check out the code in the core repository [here](https://github.com/UraniumCorporation/maiar-ai/blob/main/packages/core/src/runtime/managers/model/index.ts).
