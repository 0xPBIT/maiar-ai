import { z } from "zod";

import OpenAI from "openai";
import {
  ModelProviderBase,
  ModelRequestConfig,
  MonitorService
} from "@maiar-ai/core";

export enum OpenAITextGenerationModel {
  GPT4O = "gpt-4o",
  GPT4O_MINI = "gpt-4o-mini",
  GPT35_TURBO = "gpt-3.5-turbo"
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

interface OpenAIModelRequestConfig extends ModelRequestConfig {
  n?: number;
  size?: "1024x1024" | "1792x1024" | "1024x1792";
}

// Define capability schemas
export const textGenerationSchema = {
  input: z.union([z.string(), z.array(z.string())]),
  output: z.string()
};

export const imageGenerationSchema = {
  input: z.string(),
  output: z.array(z.string())
};

// Helper functions to check model types
const isTextGenerationModel = (
  model: OpenAIModel
): model is OpenAITextGenerationModel => {
  return Object.values(OpenAITextGenerationModel).includes(
    model as OpenAITextGenerationModel
  );
};

const isImageGenerationModel = (
  model: OpenAIModel
): model is OpenAIImageGenerationModel => {
  return Object.values(OpenAIImageGenerationModel).includes(
    model as OpenAIImageGenerationModel
  );
};

// Constants for provider information
const PROVIDER_ID = "openai";
const PROVIDER_NAME = "OpenAI";
const PROVIDER_DESCRIPTION = "OpenAI API models like GPT-4 and GPT-3.5";

export class OpenAIProvider extends ModelProviderBase {
  private client: OpenAI;
  private models: OpenAIModel[];

  constructor(config: OpenAIConfig) {
    super(PROVIDER_ID, PROVIDER_NAME, PROVIDER_DESCRIPTION);
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.models = config.models;

    if (this.models.some(isTextGenerationModel)) {
      this.addCapability({
        id: "text-generation",
        name: "Text generation capability",
        description: "Generate text completions from prompts",
        input: textGenerationSchema.input,
        output: textGenerationSchema.output,
        execute: this.generateText.bind(this)
      });

      this.monitor.publishEvent({
        type: "openai.model.capability.registration",
        message: "capabilty.registration",
        metadata: {
          model: this.id,
          capability: "text-generation",
          input: textGenerationSchema.input,
          output: textGenerationSchema.output
        }
      });
    }

    if (this.models.some(isImageGenerationModel)) {
      this.addCapability({
        id: "image-generation",
        name: "Image generation capability",
        description: "Generate images from prompts",
        input: imageGenerationSchema.input,
        output: imageGenerationSchema.output,
        execute: this.generateImage.bind(this)
      });
    }
  }

  async generateImage(
    prompt: string,
    config?: OpenAIModelRequestConfig
  ): Promise<z.infer<typeof imageGenerationSchema.output>> {
    const response = await this.client.images.generate({
      prompt: prompt,
      n: config?.n ?? 1,
      size: config?.size ?? "1024x1024"
    });

    if (response.data.length !== (config?.n ?? 1)) {
      throw new Error("Unexpected number of images generated");
    }

    const urls = response.data.map((image) => image.url).filter(Boolean);
    const filteredUrls = urls.filter((url) => url !== undefined);

    if (filteredUrls.length === 0) {
      throw new Error("No valid image URLs generated");
    }

    return filteredUrls;
  }

  async generateText(
    prompt: string,
    config?: ModelRequestConfig
  ): Promise<z.infer<typeof textGenerationSchema.output>> {
    try {
      const textModel = this.models.find(isTextGenerationModel);

      if (!textModel) {
        throw new Error("No text generation model configured");
      }

      const completion = await this.client.chat.completions.create({
        model: textModel,
        messages: [{ role: "user", content: prompt }],
        temperature: config?.temperature ?? 0.7,
        max_tokens: config?.maxTokens,
        stop: config?.stopSequences
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }

      // Log the interaction
      MonitorService.publishEvent({
        type: "model_interaction",
        message: `Model ${this.id} executed capability text-generation`,
        metadata: {
          modelId: this.id,
          capabilityId: "text-generation",
          input: prompt,
          output: content
        }
      });

      return content;
    } catch (error) {
      // Log the error
      MonitorService.publishEvent({
        type: "model_error",
        message: `Error executing capability text-generation on model ${this.id}`,
        metadata: {
          modelId: this.id,
          capabilityId: "text-generation",
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw error;
    }
  }

  async init(): Promise<void> {
    // Nothing to init
  }

  async checkHealth(): Promise<void> {
    // Verifying if we can call the API
    try {
      const resp = await this.executeCapability<string, string>(
        "text-generation",
        "are you alive? Please respond 'yes' or 'no' only.",
        {
          temperature: 0.7,
          maxTokens: 5
        }
      );
      MonitorService.publishEvent({
        type: "openai.model.health.check",
        message: "health.check.passed",
        metadata: {
          model: this.id,
          response: resp
        }
      });
    } catch (error) {
      MonitorService.publishEvent({
        type: "openai.model.health.check",
        message: "health.check.failed",
        metadata: {
          model: this.id,
          error: error instanceof Error ? error.message : String(error)
        }
      });
      throw new Error(
        `Failed to initialize Model ${this.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
