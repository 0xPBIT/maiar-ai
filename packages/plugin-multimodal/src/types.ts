import { z } from "zod";

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

export const MultimodalTextPromptResponseSchema = z.object({
  prompt: z.string().describe("The prompt for the text generation model"),
  images: z
    .array(z.string())
    .describe(
      "The URLs of the images that are related to the text you would like to generate"
    )
});

export const MultimodalImagePromptResponseSchema = z.object({
  prompt: z.string().describe("The prompt for the image generation model"),
  images: z
    .array(z.string())
    .describe(
      "The URLs of the images that are related to the image you are generating"
    )
});
