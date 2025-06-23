---
sidebar_position: 2
title: Executors
description: Learn about the role of executors in MAIAR
---

# Executors

Executors are the actions that your AI agent can perform. They are the tools in your agent's toolbox that process and enhance the context chain.

## Understanding Executors

An executor is a function that:

1. Has a clear name and description
2. Extracts needed data from the context chain
3. Can modify or enhance the context
4. Returns structured results

Here's a basic executor:

```typescript
// Snippet from inside a plugin, this is not a full implementation
this.executors = [
  {
    name: "generate_image",
    description: "Generate an image based on a text prompt",
    fn: async (context: AgentContext): Promise<PluginResult> => {
      try {
        // Extract prompt from context using getObject
        const promptResponse = await this.runtime.operations.getObject(
          PromptResponseSchema,
          generatePromptTemplate(context.contextChain),
          { temperature: 0.7 }
        );

        const prompt = promptResponse.prompt;
        const urls = await this.service.getImage(prompt);

        return {
          success: true,
          data: {
            urls,
            helpfulInstruction:
              "IMPORTANT: You MUST use the exact URLs provided in the urls array above."
          }
        };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred"
        };
      }
    }
  }
];
```

## Executor Components

### Name and Description

```typescript
{
  name: "generate_image",
  description: "Generate an image based on a text prompt"
}
```

The name and description are crucial because:

- They help the AI understand the executor's purpose
- They provide context for data extraction
- They guide the AI in choosing the right tool

### Data Extraction

Instead of accepting parameters directly, executors use `getObject` to extract needed data from the context chain. Here's how it works:

```typescript
// 1. Define your schema with descriptions
const PromptResponseSchema = z.object({
  prompt: z.string().describe("The prompt for the image generation model")
});

// 2. Create a prompt string that guides the AI in extracting data
const promptResponse = await this.runtime.operations.getObject(
  PromptResponseSchema,
  `Generate a prompt for an image generation model based on the context chain.
   Look for relevant information in the most recent context items.
   
   Here is the context chain with the user's message and previous operations:
   ${JSON.stringify(context.contextChain, null, 2)}`,
  {
    temperature: 0.7 // Higher temperature for more creative prompts
  }
);
```

This approach:

- Uses schema descriptions to guide the AI
- Provides clear instructions in the prompt string
- Ensures type safety through Zod validation
- Handles missing or ambiguous data gracefully

### Context Management

Executors can read from and enhance the context chain:

```typescript
execute: async (context: AgentContext): Promise<PluginResult> => {
  const promptResponse = await this.runtime.operations.getObject(
    PromptResponseSchema,
    generatePromptTemplate(context.contextChain),
    { temperature: 0.7 }
  );

  const prompt = promptResponse.prompt;

  const urls = await this.service.getImage(prompt);

  return {
    success: true,
    data: {
      urls,
      helpfulInstruction:
        "IMPORTANT: You MUST use the exact URLs provided in the urls array above. DO NOT use placeholders like [generated-image-url]. Instead, copy and paste the complete URL from the urls array into your response. The user can access these URLs directly. Other plugins can also access these URLs."
    }
  };
};
```

### Results

You can add hardcoded strings to the `data` field of the `PluginResult` object.

The `helpfulInstruction` field is particularly important example as it co-locates data with guidance for the model:

```typescript
return {
  success: true,
  data: {
    urls,
    helpfulInstruction:
      "IMPORTANT: You MUST use the exact URLs provided in the urls array above. DO NOT use placeholders like [generated-image-url]. Instead, copy and paste the complete URL from the urls array into your response. The user can access these URLs directly. Other plugins can also access these URLs."
  }
};
```

This approach:

- Ensures the model understands how to use the data correctly
- Prevents common mistakes (like using placeholders)
- Provides context about data accessibility and usage
- Guides the model in maintaining data integrity

You can think of helpful instructions as programmer-written notes that help the model understand and use the data appropriately in its responses.

## Schema Definition

Use Zod schemas with clear descriptions:

```typescript
const PromptResponseSchema = z.object({
  prompt: z.string().describe("The prompt for the image generation model")
});
```

## Clear Documentation

Document your executor's context requirements:

```typescript
this.executors = [
  {
    name: "generate_image",
    description: "Generate an image based on a text prompt",
    helpfulInstructions: `
    Required context:
    - User's image description or request
    - Any style preferences or requirements
    
    Enhances context with:
    - Generated image URLs
    - Original prompt used
    - Timestamp of generation
  `,
    fn: async (context: AgentContext) => {
      // Implementation
    }
  }
];
```

## Real-World Example

Here's a complete example of an image generation plugin:

```typescript
export class SearchPlugin extends Plugin {
  private service: PerplexityService;

  constructor(config: SearchPluginConfig) {
    super({
      id: "plugin-search",
      name: "Search",
      description: "Search the web for information",
      ...
    });

    this.service = new PerplexityService(config.apiKey);

    this.executors = [
      {
        name: "search",
        description: async () =>
          (
            await this.runtime.templates.render(`${this.id}/search_description`)
          ).trim(),
        fn: this.search.bind(this)
      }
    ];
  }

  private async search(task: AgentTask): Promise<PluginResult> {
    const queryPrompt = await this.runtime.templates.render(
      `${this.id}/query`,
      {
        context: JSON.stringify(task, null, 2)
      }
    );

    const params = await this.runtime.getObject(
      PerplexityQueryResponseSchema,
      queryPrompt
    );

    const query = params.query;
    const result = await this.service.query(query);

    return {
      success: true,
      data: {
        content: result.content,
        citations: result.citations
      }
    };
  }
}
```

:::tip Next Steps

- Learn about [Triggers](./triggers) for handling events
- Explore [getObject](../core-utilities/getObject) for data extraction
- Check out [Plugin Philosophy](./philosophy) for architectural overview
- Read about [Model Providers](../model-providers/overview) for model integration
