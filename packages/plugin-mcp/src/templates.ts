/**
 * Generates the prompt template for requesting valid JSON arguments for a given MCP tool.
 * This mirrors the template‑helper pattern used in other Maiar plugins.
 */
export function generateArgumentTemplate(params: {
  executorName: string;
  description?: string;
  task: string;
}): string {
  return `You are the argument generator for the MCP tool <tool>${params.executorName}</tool>.
  Tool description: ${params.description ?? "n/a"}
  
  Here is the full conversation/context chain so far:
  <context_chain>
  ${params.task}
  </context_chain>
  
  From the above, extract any information needed and return ONLY a JSON object that satisfies the tool's input schema.`;
}
