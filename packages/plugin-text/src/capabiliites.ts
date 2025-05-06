import { z } from "zod";

import { CapabilityMap, defineCapability } from "@maiar-ai/core";

export const textGenerationCapability = defineCapability({
  id: "text-generation",
  name: "text-generation",
  description: "Generate text from text prompts",
  input: z.string(),
  output: z.array(z.string())
});

export const multiModalTextGenerationCapability = defineCapability({
  id: "multi-modal-text-generation",
  name: "multi-modal-text-generation",
  description: "Generate text from text prompts and other text",
  input: z.object({
    prompt: z.string(),
    images: z.array(z.string()).optional()
  }),
  output: z.array(z.string())
});

// Group all capabilities for this provider into a readonly tuple so we can derive
// a CapabilityMap type and reuse it in the module augmentation below.
export const TEXT_GENERATION_CAPABILITIES = [
  textGenerationCapability,
  multiModalTextGenerationCapability
] as const;

// Use the CapabilityMap helper to augment ICapabilities with all OpenAI capabilities.
declare module "@maiar-ai/core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ICapabilities
    extends CapabilityMap<typeof TEXT_GENERATION_CAPABILITIES> {}
}
