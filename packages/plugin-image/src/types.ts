import { z } from "zod";

export interface GenerateImageParams {
  prompt: string;
  negative_prompt: string;
  width?: number;
  height?: number;
  steps?: number;
  seed?: number;
  output_format?: string;
  response_format?: string;
}

export interface GenerateImageResponse {
  url: string;
  seed: number;
  cost: number;
}

export const PromptResponseSchema = z.object({
  prompt: z.string().describe("The prompt for the image generation model")
});

export const MultimodalPromptResponseSchema = z.object({
  prompt: z.string().describe("The prompt for the image generation model"),
  images: z
    .array(z.string())
    .describe(
      "The URLs of the images that are related to the image you are generating"
    )
});
