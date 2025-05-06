export function textToImageTemplate(context: string): string {
  return `
    Generate a prompt for an image generation model based on the context chain. Your response should be a JSON object with a single "prompt" field containing your response.
    The response should be related to the original message you received from the user. 

    Do NOT include any metadata, context information, or explanation of how the response was generated.
    Look for the relevant information in the most recent context items (e.g. generated text, current time, etc).

    Here is the Context Chain of the users initial message, and your internal operations which generated useful data for your response:
    ${context}

    Return a JSON object with a single "prompt" field containing your response.
    Example of valid response:
    {
        "prompt": "A beautiful sunset over a calm ocean with a clear sky and a few clouds"
    }
    `;
}

export function multimodalToImageTemplate(context: string): string {
  return `
    Generate a prompt for an image generation model based on the context chain.
    You will also find relevant URLs and Files in the context chain for images that are related to the image you are generating.

    Here is the Context Chain of the users initial message, and your internal operations which generated useful data for your response:
    ${context}

    Return a JSON object with a prompt field containing the instructions based on the context chain.
    Also include the list of URLs and File locations of the images that are related to the image you are generating. Use the relevant context from the request, discussions, or infer from your world knowledge what is necessary.
    Example of valid response:
    {
        "prompt": "A beautiful sunset over a calm ocean with a clear sky and a few clouds",
        "images": ["https://example.com/image1.png", "https://example.com/image2.png"]
    }
    `;
}
