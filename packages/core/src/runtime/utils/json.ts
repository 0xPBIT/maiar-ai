export function extractJson(str: string): string {
  // Remove markdown code blocks
  str = str.replace(/```(?:\w*\s*)\n?/g, "").replace(/```/g, "");

  const matches = str.match(/\{[\s\S]*\}|\[[\s\S]*\]/g);
  if (!matches) throw new Error("No JSON-like structure found in response");
  return matches[matches.length - 1] ?? "";
}

export const cleanJsonString = (str: string): string => str.trim();
