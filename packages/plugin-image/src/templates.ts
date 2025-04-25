import { BaseContextItem } from "@maiar-ai/core";

export function generatePromptTemplate(
  contextChain: BaseContextItem[]
): string {
  return `
    Generate a prompt for an image generation model based on the context chain. Your response should be a JSON object with a single "prompt" field containing your response.
    The response should be related to the original message you received from the user. 

    Do NOT include any metadata, context information, or explanation of how the response was generated.
    Look for the relevant information in the most recent context items (e.g. generated text, current time, etc).

    Here is the Context Chain of the users initial message, and your internal operations which generated useful data for your response:
    ${JSON.stringify(contextChain, null, 2)}

    Return a JSON object with a single "prompt" field containing your response.
    Example of valid response:
    {
        "prompt": "A beautiful sunset over a calm ocean with a clear sky and a few clouds"
    }
    `;
}

export function generateMultiModalPromptTemplate(
  contextChain: BaseContextItem[]
): string {
  return `
    Generate a prompt for an image generation model based on the context chain. Your response should be a JSON object with a "prompt" field containing your response.
    Your response can also include an array of image URLs or file paths to images that will be used to generate the image, with the goal of editing the provided images or assiting in the generation process.
    The context chain will assist you in making useful decisions about the prompt and if you should provide images to the image generation, which ones are relevant, and how you will best fulfil the users request.

    Here is the Context Chain of the users initial message, and your internal operations which generated useful data for your response:
    ${JSON.stringify(contextChain, null, 2)}

    Return a JSON object with a single "prompt" field containing your response.
    Example of valid response:
    {
        "prompt": "A beautiful sunset over a calm ocean with a clear sky and a few clouds, include the guy in the image with the hat, and put him in the last image. Make the style of the image match the style of the second image.",
        "images": ["image1.png", "image2.png", "https://example.com/image3.png"]
    }
    `;
}
