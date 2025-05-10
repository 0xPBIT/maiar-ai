export function generateTextTemplate(context: string): string {
  return `
    You are a text-generation engine. Produce content that directly satisfies the user's latest intent.

    ${COMMON_TEXT_PROMPT_GUIDELINES}

    Context Chain:
    ${context}

    Return a JSON object with a single "text" field containing your response.
    Do NOT include meta-commentary, tool explanations, or any additional keys.`;
}

//************************************************** */
// Shared Prompting Guidelines
//************************************************** */

export const COMMON_TEXT_PROMPT_GUIDELINES = `
    Prompt-crafting guidelines:
    • Review the provided Context Chain (chronological, newest last). Infer the user's current goal and required tone.
    • Respect recency bias: new information overrides old unless explicitly contradicted.
    • Weave relevant contextual data naturally (e.g., current date/time, location, prior messages, domain knowledge).
    • Maintain the conversation style: match formality, persona, first/second/third person, preferred language.
    • Be vivid yet concise; avoid unnecessary verbosity.
    • Adhere to content-safety policies; omit disallowed content or replace with safe alternatives.
    • Output MUST be valid JSON with the specified keys only — no comments, markdown, or explanatory text.`;

//************************************************** */
// Multimodal Prompt Template
//************************************************** */

export function generateTextMultimodalTemplate(context: string): string {
  return `
    You will create a PROMPT and gather relevant IMAGES for a multimodal text-generation engine.

    1. Scan the Context Chain and collect every string that looks like an image URL or local file path (extensions: .png .jpg .jpeg .gif .webp). Keep them in the order of importance.
    2. Compose a concise textual prompt (1-3 sentences) that references or describes the selected images as needed.
    3. If the user asks to describe, analyse, transform, or compare the images, embed clear instructions inside the prompt. Reference images by index (image[0], image[1], …) or by a brief descriptor.
    4. Follow these additional editing helpers when relevant:
        - "Describe the style of image[0] in poetic form."
        - "Compare image[0] and image[1], highlighting colour palettes and composition."
        - "Rewrite the scene from image[2] as cyberpunk noir."
    5. Apply all items from COMMON_TEXT_PROMPT_GUIDELINES.

    Context Chain:
    ${context}

    Return a JSON object with exactly two fields:
    {
      "prompt": string,
      "images": string[]
    }
    `;
}

//************************************************** */
// Chat Response Template
//************************************************** */

export function generateChatResponseTemplate(context: string): string {
  return `Generate a response to the user based on the following Context Chain.

  ${COMMON_TEXT_PROMPT_GUIDELINES}

  Context Chain:

  ${context}

  Return a JSON object with a single "message" field containing your response.

  IMPORTANT: Your response MUST be valid JSON:
  - Use double quotes (") not single quotes (')
  - Escape any quotes within strings with backslash
  - Do not use smart/curly quotes
  - The response must be parseable by JSON.parse()
  `;
}

//************************************************** */
// Plugin Setup Templates (metadata & executor descriptions)
//************************************************** */

export const DESCRIPTION = `
  Comprehensive text-processing suite. Use this plugin to synthesise, summarise, translate, rewrite, classify, and reason over textual or multimodal context. It excels at turning raw user prompts, documents, tables, code snippets, or referenced images into clear, textual outputs.
`;

export const GENERATE_TEXT_TEMPLATE = `
  General-purpose text engine.

  Run this tool when you need to draft, expand, summarise, translate, reorganise, or otherwise transform pure textual information found in the Context Chain into a coherent response.
`;

export const GENERATE_TEXT_MULTIMODAL_TEMPLATE = `
  Multimodal text engine.

  Invoke when the Context Chain contains image URLs or file paths and you must describe, analyse, compare, caption, label, or incorporate those images into the written output (e.g., alt-text generation, visual storytelling, scene descriptions, analytical reports). The call will collect a "prompt" plus an "images" array for downstream multimodal capabilities.
`;
