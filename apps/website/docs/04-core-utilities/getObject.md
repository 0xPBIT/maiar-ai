---
sidebar_position: 2
---

# getObject

`getObject` is a powerful utility in MAIAR that enables structured data extraction from model text responses using Zod schemas. It's particularly useful when you need to extract specific data structures from natural language or convert unstructured text into typed objects.

## Basic Usage

```typescript
import { z } from "zod";

// Define your schema
const LocationSchema = z.object({
  city: z.string().describe("The name of the city"),
  country: z.string().describe("The name of the country")
});

// Use getObject to extract data
const location = await runtime.getObject(
  LocationSchema,
  "Extract the location from: 'I live in Paris, France'",
  { temperature: 0.1 }
);

// Result: { city: "Paris", country: "France" }
```

## How It Works

1. **Schema Definition**: You define a Zod schema that describes the structure and types of data you want to extract.
2. **Prompt Generation**: The utility generates a specialized prompt that includes the schema description.
3. **Model Processing**: The model processes the prompt and returns a JSON response.
4. **Validation**: The response is validated against your schema to ensure type safety.
5. **Retries**: If validation fails, the utility automatically retries with more specific instructions.

## Advanced Features

### Schema Descriptions

Use schema descriptions to guide the model:

```typescript
const UserSchema = z.object({
  name: z.string().describe("The user's full name"),
  age: z.number().describe("The user's age in years"),
  interests: z.array(z.string()).describe("List of user's hobbies or interests")
});
```

## Common Use Cases

### 1. Command Parsing

Extract structured commands from natural language:

```typescript
const CommandSchema = z.object({
  action: z.enum(["create", "update", "delete"]),
  target: z.string(),
  parameters: z.record(z.string())
});

const command = await runtime.getObject(
  CommandSchema,
  "Create a new user named John with age 25"
);

// Result:
// {
//   action: "create",
//   target: "user",
//   parameters: { name: "John", age: "25" }
// }
```

### 2. Data Extraction

Pull specific data points from text:

```typescript
const ContactSchema = z.object({
  email: z.string().email(),
  phone: z.string(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    country: z.string()
  })
});

const contact = await runtime.getObject(
  ContactSchema,
  "My email is john@example.com, phone is 555-0123, and I live at 123 Main St, Boston, USA"
);
```

### 3. Decision Making

Structure complex decisions:

```typescript
const DecisionSchema = z.object({
  decision: z.boolean(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string()
});

const analysis = await runtime.getObject(
  DecisionSchema,
  "Should we approve this transaction of $5000 to an unknown account?",
  { temperature: 0.2 }
);
```

## Best Practices

- **Schema Design**

  - Use descriptive schema names
  - Add clear descriptions to fields
  - Keep schemas focused and minimal
  - Use appropriate field types

- **Prompt Engineering**

  - Be specific about what you want to extract
  - Provide context when needed
  - Use examples for complex schemas

## Next Steps

- Explore [Building Plugins](/docs/building-plugins/philosophy/) for using getObject in plugins
- Check out [Model Providers](/docs/model-providers/overview/) for model configuration
- Read about [Executors](/docs/building-plugins/executors/) for practical usage examples
