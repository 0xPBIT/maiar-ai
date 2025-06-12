import path from "path";

import { AgentTask, Plugin, PluginResult } from "@maiar-ai/core";

import {
  imageGenerationCapability,
  multiModalImageGenerationCapability
} from "./capabilities";
import { MultimodalPromptResponseSchema, PromptResponseSchema } from "./types";

export class ImageGenerationPlugin extends Plugin {
  constructor(useMultiModal: boolean = false) {
    super({
      id: "plugin-image-generation",
      name: "image",
      description: async () =>
        (
          await this.runtime.templates.render(`${this.id}/plugin_description`)
        ).trim(),
      requiredCapabilities: [
        useMultiModal
          ? multiModalImageGenerationCapability.id
          : imageGenerationCapability.id
      ],
      promptsDir: path.resolve(__dirname, "prompts")

    });

    this.executors = [
      {
        name: "generate_image",
        description: async () => {
          return useMultiModal
            ? await this.runtime.templates.render(
              `${this.id}/generate_image_with_images_description`
            )
            : await this.runtime.templates.render(
              `${this.id}/generate_image_description`
            )
        },
        fn: useMultiModal
          ? this.generateImageWithImages.bind(this)
          : this.generateImage.bind(this)
      }
    ];
  }

  private async generateImage(task: AgentTask): Promise<PluginResult> {
    try {
      const promptTemplate = await this.runtime.templates.render(
        `${this.id}/text_to_image`,
        { context: JSON.stringify(task, null, 2) }
      );

      const promptResponse = await this.runtime.getObject(
        PromptResponseSchema,
        promptTemplate
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
          prompt,
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
      const promptTemplate = await this.runtime.templates.render(
        `${this.id}/multimodal_to_image`,
        { context: JSON.stringify(task, null, 2) }
      );

      const promptResponse = await this.runtime.getObject(
        MultimodalPromptResponseSchema,
        promptTemplate
      );

      const prompt = promptResponse.prompt;
      const images = promptResponse.images;

      const outputImageUrls = await this.runtime.executeCapability(
        multiModalImageGenerationCapability.id,
        {
          prompt,
          urls: images
        }
      );

      return {
        success: true,
        data: {
          inputData: {
            prompt,
            images,
            helpfulInstruction:
              "These are the inputs that you used to generate the images. These datapoints are here only for reference. These are not the actual images that you generated."
          },
          outputData: {
            outputImageUrls,
            helpfulInstruction:
              "These are the images that you generated. Use these URLs to access the images directly. Other plugins can also access these URLs."
          },
          helpfulInstruction:
            "IMPORTANT: You MUST use the exact URLs provided in the outputImageUrls array above, including query parameters. DO NOT trucate the urls. DO NOT use placeholders like [generated-image-url]. Instead, copy and paste the complete URL from the outputImageUrls array into your response. The user can access these URLs directly. Other plugins can also access these URLs."
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }

  public async init(): Promise<void> { }

  public async shutdown(): Promise<void> { }
}
