import { z } from "zod";

import { CapabilityMap, defineCapability } from "@maiar-ai/core";

export const textGenerationCapability = defineCapability({
  id: "text-generation",
  input: z.string(),
  output: z.string()
});

export const multiModalTextGenerationCapability = defineCapability({
  id: "multi-modal-text-generation",
  input: z.object({
    prompt: z.string(),
    images: z.array(z.string()).optional()
  }),
  output: z.string()
});

export const imageGenerationCapability = defineCapability({
  id: "image-generation",
  input: z.string(),
  output: z.array(z.string())
});

export const multiModalImageGenerationCapability = defineCapability({
  id: "multi-modal-image-generation",
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
