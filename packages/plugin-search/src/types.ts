import { z } from "zod";

export interface SearchPluginConfig {
  apiKey: string;
}

export const PerplexityQueryResponseSchema = z.object({
  query: z.string().describe("The query that was used to search the web")
});
