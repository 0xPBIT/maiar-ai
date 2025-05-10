import { z } from "zod";

import { CapabilityMap, defineCapability } from "@maiar-ai/core";

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
    urls: z.array(z.string()).optional()
  }),
  output: z.array(z.string()),
  config: z.object({
    number: z.number().int().positive().default(1)
  })
});

// Group all capabilities for this provider into a readonly tuple so we can derive
// a CapabilityMap type and reuse it in the module augmentation below.
export const IMAGE_GENERATION_CAPABILITIES = [
  imageGenerationCapability,
  multiModalImageGenerationCapability
] as const;

// Use the CapabilityMap helper to augment ICapabilities with all OpenAI capabilities.
declare module "@maiar-ai/core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ICapabilities
    extends CapabilityMap<typeof IMAGE_GENERATION_CAPABILITIES> {}
}
