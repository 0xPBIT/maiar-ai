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
  generateChatResponseTemplate,
  generateTextTemplate
} from "./templates";
import {
  ChatPlatformContext,
  ChatResponseSchema,
  TEXT_GENERATION_CAPABILITY_ID
} from "./types";

export class TextGenerationPlugin extends Plugin {
  constructor() {
    super({
      id: "plugin-text",
      name: "Text Generation",
      description: "Provides text generation capabilities",
      requiredCapabilities: [TEXT_GENERATION_CAPABILITY_ID]
    });

    this.executors = [
      {
        name: "generate_text",
        description: "Generates text in response to a prompt",
        fn: this.generateText.bind(this)
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
      TEXT_GENERATION_CAPABILITY_ID,
      generateTextTemplate(JSON.stringify(task.context)),
      {
        temperature: 0.7
      }
    );

    // Add the generated text as a new item in the context chain
    const textContext: Context & {
      text: string;
    } = {
      id: `${this.id}-${Date.now()}`,
      pluginId: this.id,
      type: "generated_text",
      action: "generate_text",
      content: generated,
      timestamp: Date.now(),
      text: generated
    };

    task.context.push(textContext);
    return { success: true };
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
      type: "user_input",
      action: "receive_message",
      content: message,
      timestamp: Date.now(),
      metadata: {
        user,
        platformContext
      }
    };

    const space: Space = {
      id: `${this.id}-${user}`
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
        generateChatResponseTemplate(JSON.stringify(task.context)),
        { temperature: 0.2 }
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
