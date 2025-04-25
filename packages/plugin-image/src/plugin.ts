import { AgentContext, Plugin, PluginResult } from "@maiar-ai/core";

import {
  generateMultiModalPromptTemplate,
  generatePromptTemplate
} from "./templates";
import {
  IMAGE_GENERATION_CAPABILITY_ID,
  MULTI_MODAL_IMAGE_GENERATION_CAPABILITY_ID,
  MultiModalPromptResponseSchema,
  PromptResponseSchema
} from "./types";

export class ImageGenerationPlugin extends Plugin {
  constructor() {
    super({
      id: "plugin-image-generation",
      name: "image",
      description: "Generate images from text descriptions using GetImg.ai API",
      requiredCapabilities: [IMAGE_GENERATION_CAPABILITY_ID]
    });

    this.executors = [
      {
        name: "generate_image",
        description: "Generate an image based on a text prompt",
        fn: this.generateMultiModalImage.bind(this)
      }
    ];
  }

  private async generateImage(context: AgentContext): Promise<PluginResult> {
    try {
      const promptResponse = await this.runtime.operations.getObject(
        PromptResponseSchema,
        generatePromptTemplate(context.contextChain),
        { temperature: 0.7 }
      );

      const prompt = promptResponse.prompt;

      const urls = await this.runtime.executeCapability(
        IMAGE_GENERATION_CAPABILITY_ID,
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

  private async generateMultiModalImage(
    context: AgentContext
  ): Promise<PluginResult> {
    try {
      const promptResponse = await this.runtime.operations.getObject(
        MultiModalPromptResponseSchema,
        generateMultiModalPromptTemplate(context.contextChain),
        { temperature: 0.7 }
      );

      const prompt = promptResponse.prompt;
      const images = promptResponse.images;

      const urls = await this.runtime.executeCapability(
        MULTI_MODAL_IMAGE_GENERATION_CAPABILITY_ID,
        {
          text: prompt,
          images
        }
      );

      return {
        success: true,
        data: { urls }
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
