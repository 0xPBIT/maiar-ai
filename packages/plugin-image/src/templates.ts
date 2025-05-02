export function generatePromptTemplate(context: string): string {
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
