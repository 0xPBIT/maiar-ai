import {
  AgentContext,
  BaseContextItem,
  getUserInput,
  Plugin,
  PluginResult,
  Request,
  Response,
  UserInputContext
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
          handler: this.handleChat.bind(this)
        }
      }
    ];
  }

  private async generateText(context: AgentContext): Promise<PluginResult> {
    const userInput = getUserInput(context);
    if (!userInput) {
      return {
        success: false,
        error: "No user input found in context chain"
      };
    }

    const generated = await this.runtime.executeCapability(
      TEXT_GENERATION_CAPABILITY_ID,
      generateTextTemplate(userInput.rawMessage, context.contextChain),
      {
        temperature: 0.7
      }
    );

    // Add the generated text as a new item in the context chain
    const textContext: BaseContextItem & {
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

    context.contextChain.push(textContext);
    return { success: true };
  }

  private async handleChat(req: Request, res: Response): Promise<void> {
    const { message, user } = req.body;

    const initialContext: UserInputContext = {
      id: `${this.id}-${Date.now()}`,
      pluginId: this.id,
      type: "user_input",
      action: "receive_message",
      content: message,
      timestamp: Date.now(),
      rawMessage: message,
      user: user || "anonymous"
    };

    // Create event with initial context and response handler
    const platformContext: ChatPlatformContext = {
      platform: this.id,
      responseHandler: (result: unknown) => res.json(result)
    };

    await this.runtime.createEvent(initialContext, platformContext);
  }

  private async sendChatResponse(context: AgentContext): Promise<PluginResult> {
    if (!context?.platformContext?.responseHandler) {
      this.logger.error("no response handler available");
      return {
        success: false,
        error: "No response handler available"
      };
    }

    try {
      // Format the response based on the context chain
      const formattedResponse = await this.runtime.operations.getObject(
        ChatResponseSchema,
        generateChatResponseTemplate(context.contextChain),
        { temperature: 0.2 }
      );

      await context.platformContext.responseHandler(formattedResponse.message);
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
