import { z } from "zod";

import { ModelRequestConfig } from "@maiar-ai/core";

export const TEXT_GENERATION_CAPABILITY_ID = "text-generation";
export const IMAGE_GENERATION_CAPABILITY_ID = "image-generation";

declare module "@maiar-ai/core" {
  interface ICapabilities {
    [TEXT_GENERATION_CAPABILITY_ID]: {
      input: z.infer<typeof textGenerationSchema.input>;
      output: z.infer<typeof textGenerationSchema.output>;
    };
    [IMAGE_GENERATION_CAPABILITY_ID]: {
      input: z.infer<typeof imageGenerationSchema.input>;
      output: z.infer<typeof imageGenerationSchema.output>;
    };
  }
}

export enum OpenAITextGenerationModel {
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",
  GPT_35_TURBO = "gpt-3.5-turbo",
  GPT_41 = "gpt-4.1",
  GPT_41_MINI = "gpt-4.1-mini",
  GPT_41_NANO = "gpt-4.1-nano"
}

export enum OpenAIImageGenerationModel {
  DALLE2 = "dall-e-2",
  DALLE3 = "dall-e-3"
}

export type OpenAIModel =
  | OpenAITextGenerationModel
  | OpenAIImageGenerationModel;

export interface OpenAIConfig {
  apiKey: string;
  models: OpenAIModel[];
}

export interface OpenAIModelRequestConfig extends ModelRequestConfig {
  n?: number;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
}

// Define capability schemas
export const textGenerationSchema = {
  input: z.string(),
  output: z.string()
};

export const imageGenerationSchema = {
  input: z.string(),
  output: z.array(z.string())
};
