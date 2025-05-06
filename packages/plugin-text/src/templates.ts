export function generateTextTemplate(context: string): string {
  return `Generate text in response to the following prompt, using any relevant information from the context chain.

Context Chain:
${context}

Within that context chain represents the users initial message. Consider this your prompt and objective.
Sometimes the user just wants to chat, so don't think you always have some objective to accomplish.

Generate text that directly answers or responds to the prompt. If there is relevant information in the context chain (like current time, previous responses, etc), incorporate it naturally into the response.

Return a JSON object with a single "text" field containing your response.
Do NOT include any meta-commentary about how you generated the response or what information you used.
Respond as if you are directly answering the user's request.`;
}

export function generateTextMultimodalTemplate(context: string): string {
  return `Generate a JSON object that contains a "text" field and a "images" field.
  The "text" field should contain the text you would like to generate.
  The "images" field should contain an array of URLs to images that are relevant to the text you would like to generate.

  Here is the context chain of the users initial message, and your internal operations which generated useful data for your response:
  ${context}
  `;
}

export function generateChatResponseTemplate(context: string): string {
  return `Generate a response based on the context chain. Your response should be a JSON object with a single "message" field containing your response.
    The response should be related to the original message you received from the user. 

    IMPORTANT: Your response MUST be valid JSON:
    - Use double quotes (") not single quotes (')
    - Escape any quotes within strings with backslash
    - Do not use smart/curly quotes
    - The response must be parseable by JSON.parse()

    Do NOT include any metadata, context information, or explanation of how the response was generated.
    Look for the relevant information in the most recent context items (e.g. generated text, current time, etc).

    Here is the Context Chain of the users initial message, and your internal operations which generated useful data for your response:

    ${context}
    Your job is to synthesize the context chain into a comprehensive and useful response to the user's intitial message.

    Return a JSON object with a single "message" field containing your response.
    `;
}
