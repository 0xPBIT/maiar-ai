//************************************************** */
// Plugin Setup Templates
//************************************************** */
export const DESCRIPTION = `
  This plugin is used to create images.
  It contains a group of tools that you can use to create and edit and recombine images using various tools.

  Consider this plugin when you need to create or manipulate images given instructions or other media to influence the output.
`;

export const GENERATE_IMAGE_TEMPLATE = `
  Create an image based on a text prompt.

  You can use this tool when you need to create an image using soley text as the mechanism to generate the image.
  Important when you want to create an image that is from a text based description alone. 

  Calling this tools means a prompt will be constructed and passed to an AI which will generate an image based on the prompt.
`;

export const GENERATE_IMAGE_WITH_IMAGES_TEMPLATE = `
  Create an image based on a text prompt and other images.

  You can use this tool when you need to create an image using a text prompt and other images as reference.
  Important when you want to create an image that is from a text based description and other images to influence the output.

  Calling this tools means a prompt will be constructed and passed to an AI which will generate an image based on the prompt and other reference images.
  Using this tool you can reimagine, recreate, recombine images and components of those images to create new images.
`;

//************************************************** */
// Shared Prompting Guidelines
//************************************************** */

export const COMMON_PROMPT_GUIDELINES = `
    Guidelines for composing the prompt:
    • Analyse the provided Context Chain (chronological, newest last) and infer the user's latest intent and any creative constraints.
    • Follow this order so downstream tools can parse components easily:
      1. Main Subject        who / what should appear
      2. Descriptors         quantity, colours, emotions, motion, era, size, etc.
      3. Environment         setting / background / lighting / time-of-day
      4. Style Tags          medium, genre, artist references, rendering engine
      5. Technical Cues      camera lens, aspect ratio, resolution, colour palette
    • Focus on the most recent, relevant items in the chain; newer overrides older.
    • If the chain contains any "avoid" instructions or policy warnings, turn them into a short negative clause prefixed with "--no" (e.g. "--no text watermark").
    • Be vivid yet concise; 20-60 tokens is ideal.
    • Do NOT include any explanation or additional keys—only the prompt text itself.`;

//************************************************** */
// Get Object Templates
//************************************************** */

export function textToImageTemplate(context: string): string {
  return `
    You are preparing a single PROMPT STRING that will be forwarded to an image-generation engine.

    ${COMMON_PROMPT_GUIDELINES}

    Context Chain:
    ${context}

    Return a JSON object with a single "prompt" field containing the composed prompt.
    Example:
    {
        "prompt": "A serene 3D render of a glass lighthouse on a cliff at dusk, soft purple sky, volumetric fog, octane render, --ar 16:9"
    }
    `;
}

export function multimodalToImageTemplate(context: string): string {
  return `
    You are preparing a TEXT PROMPT *and* a list of reference IMAGES for a multimodal image-generation engine.

    1. Gather every string that appears to be an image URL or local path (extensions: .png .jpg .jpeg .gif .webp). Preserve their order. If the context strongly implies an image but no literal path is present, create a short descriptive placeholder such as "sketch_reference.png".

    ${COMMON_PROMPT_GUIDELINES}

    Additional guidance for editing / modification requests:
    • If the user wants to transform or edit existing images, include clear, concise directives that reference the relevant image by index or description. Examples:
        - "Replace the sky in image[0] with a starry night."
        - "Merge image[0] and image[1] with a double-exposure effect."
        - "In image[2], change the shirt colour to red and add a futuristic visor."
    • Layering, masking, cropping, recolouring, or style-transfer instructions are welcome when they help achieve the desired outcome.

    Context Chain:
    ${context}

    Return a JSON object with two fields: "prompt" (string) and "images" (string array).
    Example:
    {
      "prompt": "Cyberpunk cityscape re-imagined as an ancient watercolor, wide view, moonlit night, --ar 21:9 --no logos modern vehicles",
      "images": [
        "https://example.com/original_city.jpg",
        "https://example.com/color_palette.png"
      ]
    }
    `;
}
