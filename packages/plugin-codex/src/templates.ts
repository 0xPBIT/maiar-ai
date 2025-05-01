/**
 * Generates a template for extracting Codex command details from the context chain.
 * @param contextChain The current context chain
 * @returns A formatted prompt string for extracting command details
 */
export function generateCodexCommandTemplate(contextChain: string): string {
  return `Extract the Codex CLI command details from the context chain.
Look for the user's request or intent to run a Codex command.

Here is the context chain:
${contextChain}

Return a JSON object with the following fields:
- prompt: The prompt or command to pass to Codex CLI
- approvalMode: (optional) The approval mode for Codex CLI, one of 'suggest', 'auto-edit', or 'full-auto'
- flags: (optional) An array of additional flags to pass to Codex CLI

Ensure your response is valid JSON with double quotes, and escape any internal quotes with a backslash. Do not include any meta-commentary or explanations.`;
}
