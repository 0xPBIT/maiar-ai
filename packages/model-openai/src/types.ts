import { ModelRequestConfig } from "@maiar-ai/core";

export enum OpenAITextGenerationModel {
  GPT_4O = "gpt-4o",
  GPT_4O_MINI = "gpt-4o-mini",
  GPT_35_TURBO = "gpt-3.5-turbo",
  GPT_41 = "gpt-4.1",
  GPT_41_MINI = "gpt-4.1-mini",
  GPT_41_NANO = "gpt-4.1-nano"
}

export enum OpenAIMultiModalTextGenerationModel {
  GPT_4O = "gpt-4o",
  GPT_41 = "gpt-4.1"
}

export enum OpenAIImageGenerationModel {
  DALLE_2 = "dall-e-2",
  DALLE_3 = "dall-e-3",
  GPT_IMAGE_1 = "gpt-image-1"
}

export enum OpenAIMultiModalImageGenerationModel {
  GPT_IMAGE_1 = "gpt-image-1"
}

export type OpenAIModel =
  | OpenAITextGenerationModel
  | OpenAIImageGenerationModel
  | OpenAIMultiModalImageGenerationModel
  | OpenAIMultiModalTextGenerationModel;
export interface OpenAIConfig {
  apiKey: string;
  models: OpenAIModel[];
}

export interface OpenAIModelRequestConfig extends ModelRequestConfig {
  n?: number;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
}
