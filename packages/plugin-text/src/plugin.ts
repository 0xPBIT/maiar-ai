import express from "express";

import {
  AgentTask,
  Context,
  Plugin,
  PluginResult,
  Request,
  Response,
  Space
} from "@maiar-ai/core";

import {
  multiModalTextGenerationCapability,
  textGenerationCapability
} from "./capabiliites";
import {
  generateChatResponseTemplate,
  generateTextMultimodalTemplate,
  generateTextTemplate
} from "./templates";
import {
  ChatPlatformContext,
  ChatResponseSchema,
  MultimodalPromptResponseSchema
} from "./types";

export class TextGenerationPlugin extends Plugin {
  constructor() {
    super({
      id: "plugin-text",
      name: "Text Generation",
      description: "Provides text generation capabilities",
      requiredCapabilities: [
        textGenerationCapability.id,
        multiModalTextGenerationCapability.id
      ]
    });

    this.executors = [
      {
        name: "generate_text",
        description: "Generates text in response to a prompt",
        fn: this.generateText.bind(this)
      },
      {
        name: "generate_text_multimodal",
        description:
          "Generates text in response to a prompt and images. Use this when you need to understand any images that are in your context chain that are relevant to the prompt.",
        fn: this.generateTextMultimodal.bind(this)
      },
      {
        name: "send_chat_response",
        description: "Sends a chat response to the user",
        fn: this.sendChatResponse.bind(this)
      }
    ];

    this.triggers = [
      {
        name: "server_chat",
        route: {
          path: "/chat",
          handler: this.handleChat.bind(this),
          middleware: [express.json()]
        }
      }
    ];
  }

  private async generateText(task: AgentTask): Promise<PluginResult> {
    const generated = await this.runtime.executeCapability(
      textGenerationCapability.id,
      generateTextTemplate(JSON.stringify(task))
    );

    return { success: true, data: { text: generated } };
  }

  private async generateTextMultimodal(task: AgentTask): Promise<PluginResult> {
    const promptResponse = await this.runtime.getObject(
      MultimodalPromptResponseSchema,
      generateTextMultimodalTemplate(JSON.stringify(task))
    );

    const prompt = promptResponse.prompt;
    const images = promptResponse.images;

    const generated = await this.runtime.executeCapability(
      multiModalTextGenerationCapability.id,
      {
        prompt,
        images
      }
    );

    return { success: true, data: { text: generated } };
  }

  private async handleChat(req: Request, res: Response): Promise<void> {
    const { message, user } = req.body;

    // Create event with initial context and response handler
    const platformContext: ChatPlatformContext = {
      platform: this.id,
      responseHandler: (result: unknown) => res.json(result)
    };

    const initialContext: Context = {
      id: `${this.id}-${Date.now()}`,
      pluginId: this.id,
      content: message,
      timestamp: Date.now(),
      metadata: {
        user,
        platformContext
      }
    };

    const spacePrefix = `${this.id}-${user}`;

    const space: Space = {
      id: `${spacePrefix}-${Date.now()}`,
      relatedSpaces: {
        prefix: spacePrefix
      }
    };

    await this.runtime.createEvent(initialContext, space);
  }

  private async sendChatResponse(task: AgentTask): Promise<PluginResult> {
    // Check if task.trigger.metadata exists, then if platformContext exists, then if responseHandler exists
    if (!task.trigger || !task.trigger.metadata) {
      this.logger.error("no metadata available on task trigger", { task });
      return {
        success: false,
        error: "No metadata available on task trigger"
      };
    }

    if (!task.trigger.metadata.platformContext) {
      this.logger.error("no platformContext in metadata");
      return {
        success: false,
        error: "No platformContext available in metadata"
      };
    }

    const platformContext = task.trigger.metadata.platformContext;

    if (typeof platformContext !== "object" || platformContext === null) {
      this.logger.error("platformContext is not an object");
      return {
        success: false,
        error: "platformContext is not an object"
      };
    }

    if (!("responseHandler" in platformContext)) {
      this.logger.error("no responseHandler in platformContext");
      return {
        success: false,
        error: "No response handler available in platformContext"
      };
    }

    try {
      // Format the response based on the context chain
      const formattedResponse = await this.runtime.getObject(
        ChatResponseSchema,
        generateChatResponseTemplate(JSON.stringify(task))
      );

      // Type assertion for responseHandler since TypeScript doesn't know its type
      const responseHandler = platformContext.responseHandler as (
        result: unknown
      ) => void;
      responseHandler(formattedResponse.message);

      return {
        success: true,
        data: {
          message: formattedResponse.message,
          helpfulInstruction:
            "This is the formatted response sent to the HTTP client"
        }
      };
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error("error sending response:", { error: error.message });
      return {
        success: false,
        error: "Failed to send response"
      };
    }
  }

  public async init(): Promise<void> {}

  public async shutdown(): Promise<void> {}
}
