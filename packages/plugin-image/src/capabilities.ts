import { z } from "zod";

import { CapabilityMap, defineCapability } from "@maiar-ai/core";

export const imageGenerationCapability = defineCapability({
  id: "image-generation",
  input: z.string(),
  output: z.array(z.string())
});

// Group all capabilities for this provider into a readonly tuple so we can derive
// a CapabilityMap type and reuse it in the module augmentation below.
export const IMAGE_GENERATION_CAPABILITIES = [
  imageGenerationCapability
] as const;

// Use the CapabilityMap helper to augment ICapabilities with all OpenAI capabilities.
declare module "@maiar-ai/core" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface ICapabilities
    extends CapabilityMap<typeof IMAGE_GENERATION_CAPABILITIES> {}
}
