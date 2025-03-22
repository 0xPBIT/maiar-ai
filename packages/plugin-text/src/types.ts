import { z } from "zod";

export const TextGenerationSchema = z.object({
  text: z.string().describe("The generated text content")
});

export type TextGeneration = z.infer<typeof TextGenerationSchema>;

export const TEXT_GENERATION_CAPABILITY_ID = "text-generation";

declare module "@maiar-ai/core" {
  interface ICapabilities {
    [TEXT_GENERATION_CAPABILITY_ID]: {
      input: string;
      output: string;
    };
  }
}
