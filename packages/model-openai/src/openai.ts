import OpenAI from "openai";
import { ImageEditParams } from "openai/resources/images";
import { Uploadable } from "openai/uploads";
import { z } from "zod";

import { ModelProvider, ModelRequestConfig } from "@maiar-ai/core";

import {
  imageGenerationCapability,
  multiModalImageGenerationCapability,
  textGenerationCapability
} from "./capabilities";
import {
  OpenAIConfig,
  OpenAIImageGenerationModel,
  OpenAIModel,
  OpenAIModelRequestConfig,
  OpenAIMultiModalImageGenerationModel,
  OpenAITextGenerationModel
} from "./types";

// Aliases for input/output schemas used in type inference
const imageGenerationSchema = imageGenerationCapability;
const textGenerationSchema = textGenerationCapability;
const multiModalImageGenerationSchema = multiModalImageGenerationCapability;
// Pre-computed model family sets for quick capability checks
const TEXT_MODELS = new Set<OpenAIModel>(
  Object.values(OpenAITextGenerationModel) as OpenAIModel[]
);

const IMAGE_MODELS = new Set<OpenAIModel>(
  Object.values(OpenAIImageGenerationModel) as OpenAIModel[]
);

const MULTI_MODAL_IMAGE_MODELS = new Set<OpenAIModel>(
  Object.values(OpenAIMultiModalImageGenerationModel) as OpenAIModel[]
);

// Constants for provider information
const PROVIDER_ID = "openai";
const PROVIDER_NAME = "OpenAI";
const PROVIDER_DESCRIPTION = "OpenAI API models like GPT-4 and GPT-3.5";

export class OpenAIModelProvider extends ModelProvider {
  private client: OpenAI;
  private models: OpenAIModel[];

  constructor(config: OpenAIConfig) {
    super({
      id: PROVIDER_ID,
      name: PROVIDER_NAME,
      description: PROVIDER_DESCRIPTION
    });
    this.client = new OpenAI({ apiKey: config.apiKey });
    this.models = config.models;

    if (this.models.some((m) => TEXT_MODELS.has(m))) {
      this.addCapability({
        ...textGenerationCapability,
        execute: this.generateTextWithText.bind(this)
      });

      this.logger.info("add text generation capability", {
        type: "openai.model.capability.registration",
        model: this.id,
        capability: "text-generation",
        inputSchema: textGenerationSchema.input,
        outputSchema: textGenerationSchema.output
      });
    }

    if (this.models.some((m) => IMAGE_MODELS.has(m))) {
      this.addCapability({
        ...imageGenerationCapability,
        execute: this.generateImageWithText.bind(this)
      });

      this.logger.info("add image generation capability", {
        type: "openai.model.capability.registration",
        model: this.id,
        capability: "image-generation",
        inputSchema: imageGenerationSchema.input,
        outputSchema: imageGenerationSchema.output
      });
    }

    if (this.models.some((m) => MULTI_MODAL_IMAGE_MODELS.has(m))) {
      this.addCapability({
        ...multiModalImageGenerationCapability,
        execute: this.generateImageMultimodal.bind(this)
      });

      this.logger.info("add multi-modal image generation capability", {
        type: "openai.model.capability.registration",
        model: this.id,
        capability: "multi-modal-image-generation",
        inputSchema: multiModalImageGenerationSchema.input,
        outputSchema: multiModalImageGenerationSchema.output
      });
    }
  }

  public async checkHealth(): Promise<void> {
    // Verifying if we can call the API
    try {
      await this.executeCapability(
        textGenerationCapability.id,
        "[SYSTEM HEALTH CHECK] are you alive? please response with 'yes' only",
        {
          temperature: 0.7,
          maxTokens: 5
        }
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      throw new Error(
        `health check failed for model provider ${this.id}: ${error.message}`
      );
    }
  }

  public async init(): Promise<void> {}

  public async shutdown(): Promise<void> {}

  public async generateImageWithText(
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

  public async generateTextWithText(
    prompt: string,
    config?: ModelRequestConfig
  ): Promise<z.infer<typeof textGenerationSchema.output>> {
    try {
      const textModel = this.models.find((m) => TEXT_MODELS.has(m));

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
      this.logger.info({
        type: "model.provider.interaction",
        message: `model provider ${this.id} executed capability text-generation`,
        metadata: {
          modelId: this.id,
          capabilityId: "text-generation",
          input: prompt,
          output: content
        }
      });

      return content;
    } catch (error) {
      this.logger.error("error executing capability text-generation on model", {
        type: "model_error",
        modelId: this.id,
        capabilityId: "text-generation",
        error: error instanceof Error ? error.message : String(error)
      });

      throw error;
    }
  }

  public async generateImageMultimodal(
    prompt: string,
    config?: Omit<ImageEditParams, "model" | "prompt" | "user">
  ): Promise<z.infer<typeof multiModalImageGenerationSchema.output>> {
    const response = await this.client.images.edit({
      model: this.models.find((m) => MULTI_MODAL_IMAGE_MODELS.has(m)),
      prompt: prompt,
      image: config?.image as Uploadable
    });

    return response.data.map((image) => image.url).filter(Boolean) as string[];
  }
}
