/* eslint-disable no-useless-escape */

export function generateUploadDocumentTemplate(context: string): string {
  return `Generate a response based on the context chain. Your response shoudl be a JSON object with a single "content" field containing your response.
        The response should be the exact text that should be uploaded to the sandbox database for later use.

        IMPORTANT: Your response MUST be valid JSON:
        - Use double quotes (") not single quotes (')
        - Escape any quotes within strings with backslash (\")
        - Do not use smart/curly quotes
        - The response must be parseable by JSON.parse()

        Do NOT include any metadata, context information, or explanation of how the response was generated.
        Look for the relevant information in the most recent context items (e.g. generated text, current time, etc).

        Here is the Context Chain, it contains all messages from the user and plugin response. Your job is to find the content
        that the user or plugin wants to upload to the database for future use and generate a response with just that information.
        Make sure to keep the content exactly how it was presented by the user or plugin.
        ${context}

        Example of a valid response:
        {
            "content": "This is example text to upload to the database"
        }
    `;
}

export function generateQueryTemplate(
  context: string,
  properties: string[] | string = "id"
): string {
  return `Generate a response based on the context chain. Your response should be a JSON object with a single "query" field containing a valid SQL query.
        The query should be a search on the sandbox table that returns document values ${properties}.

        IMPORTANT: Your response MUST be valid JSON:
        - Use double quotes (") not single quotes (')
        - Escape any quotes within strings with backslash (\")
        - Do not use smart/curly quotes
        - The response must be parseable by JSON.parse()

        Do NOT include any metadata, context information, or explanation of how the response was generated.
        Look for the relevant information in the most recent context items (e.g. generated text, current time, etc).

        Here is the context chain, it contains all messages from the user and plugin responses. Your job is to construct
        a query on the sandbox table that satisifes the users or plugins request outlined in the context chain.
        Make sure to only respond with the documnet ids that match the query.
        ${context}

        Example of a valid response:
        {
            "query": "SELECT id FROM sandbox WHERE content == 'This is the content of a test document'"
        }
    `;
}
