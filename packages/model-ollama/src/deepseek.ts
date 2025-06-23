import { z } from "zod";

import { ModelProvider, ModelRequestConfig } from "@maiar-ai/core";

import { verifyBasicHealth } from "./index";

// Define capability schemas
export const textGenerationSchema = {
  input: z.union([z.string(), z.array(z.string())]),
  output: z.string()
};

export interface DeepseekConfig {
  baseUrl: string;
  model: string;
}

const deepseekSystemTemplate = `
High level rules you must follow:
1. Always use english unless explicitly told otherwise in your output operations.
2. Your interal thoughs, considerations, and operations will always be in english.
3. You will not inject chinese characters, mandarin, or chinese into your thoughts, output operations, generated text, or anything else.
`;

// Constants for provider information
const PROVIDER_ID = "deepseek";

export class DeepseekModelProvider extends ModelProvider {
  private baseUrl: string;
  private model: string;

  constructor(config: DeepseekConfig) {
    super({
      id: PROVIDER_ID
    });
    if (!config.baseUrl) {
      throw new Error("baseUrl is required");
    }
    if (!config.model) {
      throw new Error("model is required");
    }

    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.model = config.model;
    this.addCapability({
      id: "text-generation",
      input: textGenerationSchema.input,
      output: textGenerationSchema.output,
      execute: this.generateText.bind(this)
    });
  }

  public async init(): Promise<void> {}

  public async checkHealth(): Promise<void> {
    const prefix = "deepseek-";
    if (!this.model.startsWith(prefix)) {
      throw new Error(
        `Deepseek Model "${this.model}" must be prefixed with ${prefix}`
      );
    }

    try {
      // Send a GET request to the tag endpoint and verify if the model exists
      await verifyBasicHealth(this.baseUrl, this.model);

      this.logger.info(`deepseek model '${this.model}' health check passed`, {
        type: "model.deepseek.health_check.passed",
        model: this.model,
        baseUrl: this.baseUrl
      });
    } catch (error) {
      this.logger.error(`deepseek model '${this.model}' health check failed`, {
        type: "model.deepseek.health_check.failed",
        model: this.model,
        baseUrl: this.baseUrl,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  public async shutdown(): Promise<void> {}

  public async generateText(
    prompt: string,
    config?: ModelRequestConfig
  ): Promise<string> {
    try {
      this.logger.info("sending prompt to deepseek", {
        type: "model.deepseek.generation.start",
        model: this.model,
        promptLength: prompt.length
      });

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          prompt: `${deepseekSystemTemplate}\n\n${prompt}\n\nAssistant: Let me help you with that.`,
          stream: false,
          options: {
            temperature: config?.temperature ?? 0.7,
            stop: config?.stopSequences
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const text = data.response;

      this.logger.info("received response from deepseek", {
        type: "model.deepseek.generation.complete",
        model: this.model,
        text: text
      });

      // Remove the "Assistant: Let me help you with that." prefix if it exists
      const cleanedText = text.replace(
        /^Assistant: Let me help you with that\.\s*/,
        ""
      );

      return cleanedText;
    } catch (error) {
      this.logger.error("error getting text from deepseek", {
        type: "model.deepseek.generation.error",
        model: this.model,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
