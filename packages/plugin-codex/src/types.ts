import { z } from "zod";

// Schema for extracting Codex command details from context
export const CodexCommandSchema = z.object({
  prompt: z.string().describe("The prompt or command to pass to Codex CLI"),
  approvalMode: z
    .enum(["suggest", "auto-edit", "full-auto"])
    .optional()
    .describe("Approval mode for Codex CLI"),
  flags: z
    .array(z.string())
    .optional()
    .describe("Additional flags to pass to Codex CLI")
});
