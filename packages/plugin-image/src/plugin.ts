import { AgentTask, Plugin, PluginResult } from "@maiar-ai/core";

import {
  imageGenerationCapability,
  multiModalImageGenerationCapability
} from "./capabilities";
import { multimodalToImageTemplate, textToImageTemplate } from "./templates";
import { MultimodalPromptResponseSchema, PromptResponseSchema } from "./types";

export class ImageGenerationPlugin extends Plugin {
  constructor() {
    super({
      id: "plugin-image-generation",
      name: "image",
      description: "Generate images from text descriptions using GetImg.ai API",
      requiredCapabilities: [
        imageGenerationCapability.id,
        multiModalImageGenerationCapability.id
      ]
    });

    this.executors = [
      {
        name: "generate_image",
        description: "Generate an image based on a text prompt",
        fn: this.generateImage.bind(this)
      },
      {
        name: "generate_image_with_images",
        description:
          "Generate an image based on a text prompt and other images",
        fn: this.generateImageWithImages.bind(this)
      }
    ];
  }

  private async generateImage(task: AgentTask): Promise<PluginResult> {
    try {
      const promptResponse = await this.runtime.getObject(
        PromptResponseSchema,
        textToImageTemplate(JSON.stringify(task))
      );

      const prompt = promptResponse.prompt;

      const urls = await this.runtime.executeCapability(
        imageGenerationCapability.id,
        prompt
      );

      return {
        success: true,
        data: {
          urls,
          helpfulInstruction:
            "IMPORTANT: You MUST use the exact URLs provided in the urls array above, including query parameters. DO NOT trucate the urls. DO NOT use placeholders like [generated-image-url]. Instead, copy and paste the complete URL from the urls array into your response. The user can access these URLs directly. Other plugins can also access these URLs."
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  private async generateImageWithImages(
    task: AgentTask
  ): Promise<PluginResult> {
    try {
      const promptResponse = await this.runtime.getObject(
        MultimodalPromptResponseSchema,
        multimodalToImageTemplate(JSON.stringify(task))
      );

      const prompt = promptResponse.prompt;
      const images = promptResponse.images;

      const urls = await this.runtime.executeCapability(
        multiModalImageGenerationCapability.id,
        {
          prompt,
          images
        }
      );

      return {
        success: true,
        data: {
          urls,
          helpfulInstruction:
            "IMPORTANT: You MUST use the exact URLs provided in the urls array above, including query parameters. DO NOT trucate the urls. DO NOT use placeholders like [generated-image-url]. Instead, copy and paste the complete URL from the urls array into your response. The user can access these URLs directly. Other plugins can also access these URLs."
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  public async init(): Promise<void> {}

  public async shutdown(): Promise<void> {}
}
