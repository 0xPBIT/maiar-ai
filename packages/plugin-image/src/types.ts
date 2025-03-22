import { z } from "zod";

export const imageGenerationSchema = {
  input: z.string(),
  output: z.array(z.string())
};

type ImageGenerationCapability = {
  input: string;
  output: string[];
};

declare module "@maiar-ai/core" {
  export interface ICapabilities {
    "image-generation": ImageGenerationCapability;
  }
}

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
