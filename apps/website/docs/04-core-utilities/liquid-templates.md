---
sidebar_position: 3
title: Liquid Templates
description: Use Liquid templates to craft dynamic, readable prompts for your MAIAR plugins
---

# Liquid Templates

MAIAR ships with **[Liquid](https://shopify.github.io/liquid/)** as the _first-class_ templating engine for prompts. Liquid's familiar `{{ handlebars }}` syntax, logic tags, and filters make it easy to:

- Separate long, hard-to-read prompt strings from TypeScript logic
- Re-use snippets across multiple executors / triggers
- Inject rich JSON contexts without messy string concatenation
- Preview and iterate on prompts in isolation

> **_Why Liquid?_**  
> Unlike raw template literals, Liquid lends structure and re-usability. It's battle-tested (Shopify, Jekyll, etc.) and has a solid TypeScript implementation via **[liquidjs](https://liquidjs.com/)** that MAIAR embeds under the hood.

---

## Registering templates in your plugin

1. **Create a `prompts/` folder** inside your plugin package. Put one `.liquid` file per template:

```
packages/plugin-my-awesome/prompts/
├─ plugin_description.liquid
├─ generate_email.liquid
└─ follow_up_question.liquid
```

2. **Point the runtime at that directory** when you construct the plugin:

```ts
import path from "path";

import { Plugin } from "@maiar-ai/core";

export class MyAwesomePlugin extends Plugin {
  constructor() {
    super({
      id: "plugin-awesome",
      name: "Awesome",
      description: async () =>
        (
          await this.runtime.templates.render(`${this.id}/plugin_description`)
        ).trim(),
      requiredCapabilities: ["text-generation"],
      // 👇 tells MAIAR where to find your .liquid files
      promptsDir: path.resolve(__dirname, "prompts")
    });

    // … executors / triggers …
  }

  // …
}
```

The **Runtime** automatically calls `promptRegistry.registerDirectory()` for every plugin that declares `promptsDir`, namespacing each file under `<pluginId>/`.

---

## Rendering a template

Inside your executors (or anywhere you have access to `this.runtime`):

```ts
const prompt = await this.runtime.templates.render(
  `${this.id}/generate_email`, // ← template ID
  {
    userName: "Alice",
    previousTopics: task.contextChain.slice(-5)
  }
);

const response = await this.runtime.executeCapability(
  "text-generation",
  prompt
);
```

The second argument is an arbitrary object that becomes the Liquid **render context** (`{{ userName }}`, `{% for t in previousTopics %}`, …).

---

## Template IDs & Lookup Rules

- **ID format**: `<namespace>/<fileName>` (without the `.liquid` extension).
- The **namespace** is the `id` you passed to the plugin constructor (`plugin-awesome` in the example).
- Sub-folders are supported – `prompts/email/welcome.liquid` → `plugin-awesome/email/welcome`.

If you attempt to render an ID that hasn't been registered, the runtime throws a descriptive error so you catch typos early.

---

## Liquid features at your disposal

Liquid gives you all the essentials for ergonomic prompt engineering:

- **Interpolation** – `Hello, {{ userName }}!`
- **Control flow** – `{% if condition %} … {% endif %}`
- **Loops** – `{% for item in list %} … {% endfor %}`
- **Filters** – `{{ title | downcase }}`
- **Partials / includes** – `{% include 'shared/header' %}` (works across your `promptsDir`)

For the full language reference see the [_Liquid Documentation_](https://shopify.github.io/liquid/) and the **[liquidjs guide](https://liquidjs.com/tutorials/)**.

---

## Best Practices

1. **Keep logic in templates, data in TypeScript.** Push conditionals/loops to Liquid so your executors stay thin.
2. **Avoid stray whitespace.** End lines with `{%-` / `-%}` where necessary to trim newlines — this helps the LLM focus on the important text.
3. **Name templates descriptively.** `summarise_context.liquid` beats `template1.liquid`.
4. **Co-locate instructions with data.** Include comments/instructions _within_ the template so the LLM sees them together.

---

_That's it!_ Point MAIAR at your `prompts/` folder and start leveraging the power of Liquid to craft expressive, maintainable prompts.
