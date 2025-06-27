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
