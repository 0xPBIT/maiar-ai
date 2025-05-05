import { z } from "zod";

import { CapabilityMap, defineCapability } from "@maiar-ai/core";

export const textGenerationCapability = defineCapability({
  id: "text-generation",
  name: "Text generation",
  description: "Generate text completions from prompts",
  input: z.string(),
  output: z.string()
});

export const imageGenerationCapability = defineCapability({
  id: "image-generation",
  name: "Image generation",
  description: "Generate images from text prompts",
  input: z.string(),
  output: z.array(z.string())
});

export const multiModalImageGenerationCapability = defineCapability({
  id: "multi-modal-image-generation",
  name: "Multi-modal image generation",
  description: "Generate images from text prompts and other images",
  input: z.string(),
  output: z.array(z.string())
});

// Group all capabilities for this provider into a readonly tuple so we can derive
// a CapabilityMap type and reuse it in the module augmentation below.
export const OPENAI_CAPABILITIES = [
  textGenerationCapability,
  imageGenerationCapability,
  multiModalImageGenerationCapability
] as const;

// Use the CapabilityMap helper to augment ICapabilities with all OpenAI capabilities.
declare module "@maiar-ai/core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ICapabilities extends CapabilityMap<typeof OPENAI_CAPABILITIES> {}
}
