import { z } from "zod";

export const TextGenerationSchema = z.object({
  text: z.string().describe("The generated text content")
});

export type TextGeneration = z.infer<typeof TextGenerationSchema>;

export const TEXT_GENERATION_CAPABILITY_ID = "text-generation";

declare module "@maiar-ai/core" {
  interface ICapabilities {
    [TEXT_GENERATION_CAPABILITY_ID]: {
      input: string;
      output: string;
    };
  }
}

export interface ChatPlatformContext {
  platform: string;
  responseHandler?: (response: unknown) => void;
  metadata?: {
    req: Request;
    res: Response;
  };
}

export const ChatResponseSchema = z.object({
  message: z.string().describe("The response data to send back to the client")
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;
