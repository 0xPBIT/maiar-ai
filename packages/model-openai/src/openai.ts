import fs from "fs";
import mime from "mime";
import OpenAI from "openai";
import { toFile } from "openai/uploads";
import os from "os";
import path from "path";
import { z } from "zod";

import { ModelProvider, ModelRequestConfig } from "@maiar-ai/core";

import {
  imageGenerationCapability,
  multiModalImageGenerationCapability,
  multiModalTextGenerationCapability,
  textGenerationCapability
} from "./capabilities";
import {
  OpenAIConfig,
  OpenAIImageGenerationModel,
  OpenAIModel,
  OpenAIModelRequestConfig,
  OpenAIMultiModalImageGenerationModel,
  OpenAIMultiModalTextGenerationModel,
  OpenAITextGenerationModel
} from "./types";

// Pre-computed model family sets for quick capability checks
const TEXT_MODELS = new Set<OpenAIModel>(
  Object.values(OpenAITextGenerationModel) as OpenAIModel[]
);

const MULTI_MODAL_TEXT_MODELS = new Set<OpenAIModel>(
  Object.values(OpenAIMultiModalTextGenerationModel) as OpenAIModel[]
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
        inputSchema: textGenerationCapability.input,
        outputSchema: textGenerationCapability.output
      });
    }

    if (this.models.some((m) => MULTI_MODAL_TEXT_MODELS.has(m))) {
      this.addCapability({
        ...multiModalTextGenerationCapability,
        execute: this.generateTextMultimodal.bind(this)
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
        inputSchema: imageGenerationCapability.input,
        outputSchema: imageGenerationCapability.output
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
        inputSchema: multiModalImageGenerationCapability.input,
        outputSchema: multiModalImageGenerationCapability.output
      });
    }
  }

  public async checkHealth(): Promise<void> {
    // Verifying if we can call the API
    try {
      await this.executeCapability(
        textGenerationCapability.id,
        "[SYSTEM HEALTH CHECK] are you alive? please response with 'yes' only"
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

  /**
   * Generate an image with a text prompt
   * @param input - The text prompt to generate an image from
   * @param config - The configuration for the image generation
   * @returns an array of strings, each representing a URL to the generated image
   */
  public async generateImageWithText(
    input: z.infer<typeof imageGenerationCapability.input>,
    config?: OpenAIModelRequestConfig
  ): Promise<z.infer<typeof imageGenerationCapability.output>> {
    const response = await this.client.images.generate({
      prompt: input,
      n: config?.n ?? 1,
      size: config?.size ?? "1024x1024"
    });

    if (!response.data || response.data.length === 0) {
      throw new Error("No image data returned from OpenAI");
    }

    if (response.data.length !== (config?.n ?? 1)) {
      throw new Error("Unexpected number of images generated");
    }

    const urls = response.data!.map((image) => image.url).filter(Boolean);
    const filteredUrls = urls.filter((url) => url !== undefined);

    if (filteredUrls.length === 0) {
      throw new Error("No valid image URLs generated");
    }

    return filteredUrls;
  }

  /**
   * Generate text with a text prompt
   * @param input - The text prompt to generate text from
   * @param config - The configuration for the text generation
   * @returns the generated text
   */
  public async generateTextWithText(
    input: z.infer<typeof textGenerationCapability.input>,
    config?: ModelRequestConfig
  ): Promise<z.infer<typeof textGenerationCapability.output>> {
    try {
      const textModel = this.models.find((m) => TEXT_MODELS.has(m));

      if (!textModel) {
        throw new Error("No text generation model configured");
      }

      const completion = await this.client.chat.completions.create({
        model: textModel,
        messages: [{ role: "user", content: input }],
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
          input: input,
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

  /**
   * Generate an image with a text prompt and other images
   * @param input - The text prompt and other images to generate an image from
   * @returns an array of strings, each representing a URL to the generated image
   */
  public async generateImageMultimodal(
    input: z.infer<typeof multiModalImageGenerationCapability.input>
  ): Promise<z.infer<typeof multiModalImageGenerationCapability.output>> {
    // If no images are provided, call the create method
    if (!input.images || input.images?.length === 0) {
      const response = await this.client.images.generate({
        prompt: input.prompt,
        n: 1,
        size: "1024x1024",
        model: this.models.find((m) => MULTI_MODAL_IMAGE_MODELS.has(m))
      });

      const filePaths: string[] = [];
      for (let i = 0; i < (response.data ?? []).length; i++) {
        const image = (response.data ?? [])[i];
        if (image) {
          if (image.url) {
            const tempFilePath = await this.saveImageFromUrl(
              image.url,
              `generated_image_${Date.now()}_${i}`
            );
            filePaths.push(tempFilePath);
          } else if (image.b64_json) {
            const tempFilePath = await this.saveImageFromBase64(
              image.b64_json,
              `generated_image_${Date.now()}_${i}`
            );
            filePaths.push(tempFilePath);
          }
        }
      }

      if (filePaths.length === 0) {
        throw new Error("No valid image data to save");
      }

      return filePaths;
    }

    // If images are provided, call the edit method
    if (input.images.length > 0) {
      const results: string[] = [];
      for (const image of input.images) {
        try {
          let imageData;
          let fileName = `image-${results.length}`;
          let mimeType = "image/png";
          if (image.startsWith("http://") || image.startsWith("https://")) {
            // Handle URL
            const response = await fetch(image);
            if (!response.ok) {
              throw new Error(
                `Failed to fetch image from ${image}: ${response.status} ${response.statusText}`
              );
            }
            const blob = await response.blob();
            imageData = blob;
            // Try to infer file extension from URL if possible
            const urlParts = image.split(".");
            const extension =
              urlParts[urlParts.length - 1]?.toLowerCase() || "";
            if (["png", "jpg", "jpeg", "webp"].includes(extension)) {
              fileName += `.${extension}`;
              mimeType =
                extension === "png"
                  ? "image/png"
                  : extension === "webp"
                    ? "image/webp"
                    : "image/jpeg";
            }
          } else {
            // Handle local file path
            if (!fs.existsSync(image)) {
              throw new Error(`File does not exist at path: ${image}`);
            }
            const fileExtension = image.split(".").pop()?.toLowerCase() || "";
            if (!["png", "jpg", "jpeg", "webp"].includes(fileExtension)) {
              throw new Error(
                `Unsupported file format for ${image}. Only PNG, JPEG, and WebP are supported for image editing.`
              );
            }
            fileName += fileExtension ? `.${fileExtension}` : ".png";
            mimeType =
              fileExtension === "png"
                ? "image/png"
                : fileExtension === "webp"
                  ? "image/webp"
                  : fileExtension === "jpg" || fileExtension === "jpeg"
                    ? "image/jpeg"
                    : "image/png";
            imageData = fs.createReadStream(image);
          }
          const uploadableImage = await toFile(imageData, fileName, {
            type: mimeType
          });
          const editResponse = await this.client.images
            .edit({
              prompt: input.prompt,
              n: 1,
              size: "1024x1024",
              image: uploadableImage,
              model: this.models.find((m) => MULTI_MODAL_IMAGE_MODELS.has(m))
            })
            .catch((err) => {
              throw new Error(
                `API error during image edit for ${image}: ${err.message || err}`
              );
            });

          if (!editResponse.data) {
            continue;
          }
          for (let i = 0; i < editResponse.data.length; i++) {
            const editedImage = editResponse.data[i];
            if (editedImage) {
              if (editedImage.url) {
                const tempFilePath = await this.saveImageFromUrl(
                  editedImage.url,
                  `edited_image_${Date.now()}_${results.length}_${i}`
                );
                results.push(tempFilePath);
              } else if (editedImage.b64_json) {
                const tempFilePath = await this.saveImageFromBase64(
                  editedImage.b64_json,
                  `edited_image_${Date.now()}_${results.length}_${i}`
                );
                results.push(tempFilePath);
              }
            }
          }
        } catch (error: unknown) {
          console.error(`Error processing image ${image}:`, error);
          throw new Error(
            `Failed to process image ${image}: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }

      if (results.length === 0) {
        throw new Error("No valid edited image data to save");
      }

      return results;
    }

    return [];
  }

  /**
   * Generate text with a text prompt and other images
   * @param input - The text prompt and other images to generate text from
   * @returns the generated text
   */
  public async generateTextMultimodal(
    input: z.infer<typeof multiModalTextGenerationCapability.input>
  ): Promise<z.infer<typeof multiModalTextGenerationCapability.output>> {
    const model = this.models.find((m) => MULTI_MODAL_TEXT_MODELS.has(m));
    if (!model) throw new Error("No multimodal text model configured");

    const imageParts = input.images
      ? await Promise.all(
          input.images.map(
            async (image): Promise<OpenAI.ChatCompletionContentPartImage> => {
              if (image.startsWith("http://") || image.startsWith("https://")) {
                return {
                  type: "image_url",
                  image_url: { url: image }
                };
              } else {
                // Local file: read and convert to base64
                const fileBuffer = fs.readFileSync(image);
                const ext = image.split(".").pop() || "png";
                const mimeType = mime.getType(ext) || "image/png";
                const base64 = fileBuffer.toString("base64");
                return {
                  type: "image_url",
                  image_url: { url: `data:${mimeType};base64,${base64}` }
                };
              }
            }
          )
        )
      : [];

    const response = await this.client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: input.prompt }, ...imageParts]
        }
      ]
    });

    return response.choices[0]?.message?.content ?? "";
  }

  /**
   * Save an image from a URL to a temporary file
   * @param url - The URL of the image to save
   * @param filename - The filename to save the image as
   * @returns the path to the saved image
   */
  private async saveImageFromUrl(
    url: string,
    filename: string
  ): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch image from ${url}: ${response.status} ${response.statusText}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, `${filename}.png`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }

  /**
   * Save an image from base64 data to a temporary file
   * @param base64Data - The base64 data of the image to save
   * @param filename - The filename to save the image as
   * @returns the path to the saved image
   */
  private async saveImageFromBase64(
    base64Data: string,
    filename: string
  ): Promise<string> {
    const buffer = Buffer.from(base64Data, "base64");
    const tempDir = os.tmpdir();
    const filePath = path.join(tempDir, `${filename}.png`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
  }
}
