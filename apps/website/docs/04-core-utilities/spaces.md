---
title: Spaces
description: Learn how hierarchical **Spaces** group related memories and events in MAIAR and how to craft them in your own plugins
sidebar_position: 2
---

# Working with Spaces

A **Space** is the _address_ for a unit of work inside MAIAR. Every `AgentTask` that enters the runtime is tagged with a `Space` so that:

1.  Historical context can be fetched later by "looking in the same neighbourhood" (e.g. the last 20 messages in a chat channel).
2.  Independent conversations that happen in parallel (different channels, threads, users, etc.) never bleed into each other.
3.  Storage engines can _index_ efficiently – most queries are prefix-scoped.

Think of a Space like a folder path: the **full** `id` pin-points one concrete event, while broader _prefixes_ capture related history.

```ts
interface Space {
  /** The canonical ID for _this_ event – MUST be globally unique */
  id: string;

  /**
   * Let the agent "fan-out" when querying memory.
   *   • prefix   – any `spaceId` that _starts with_ the string
   *   • pattern  – advanced glob / regex matching (provider-specific)
   */
  relatedSpaces?: {
    prefix?: string;
    pattern?: string;
  };
}
```

The `id` plus `relatedSpaces` give the runtime two super-powers:

- **Isolation** – only events that share a common prefix are considered during context building.
- **Flexibility** – you can opt-in broader context (all DM sessions with the same user, the whole project repo, etc.).

---

## Anatomy of a good `spaceId`

1. **Start with your plugin ID** – prevents collisions between plugins.
2. **Append hierarchical scopes** – channel → thread → user → message.
3. **Use stable delimiters** – we recommend `-` because it is file-path-safe and easy to read.
4. **End with the event's unique identifier** – message ID, database primary key, etc.

This gives you a tidy tree:

```
plugin-discord-<guildId>
└─ plugin-discord-<guildId>-<channelId>
   └─ plugin-discord-<guildId>-<channelId>-<userId>
      └─ plugin-discord-<guildId>-<channelId>-<userId>-<messageId>   ← concrete Space.id
```

---

## Real-world example – Discord plugin

The Discord plugin is a textbook example of Spaces in action. Below is a trimmed version of the trigger that converts every incoming message into an `AgentTask`:

```ts
const discordSpacePrefix = `${pluginId}-${message.guildId}-${message.channelId}`;

const space: Space = {
  id: `${discordSpacePrefix}-${message.author.id}-${message.id}`,
  relatedSpaces: {
    // "look back" at everything that happened in this channel
    prefix: discordSpacePrefix
  }
};
```

Why this shape?

• **Isolation** – Two different channels (`#general` vs `#random`) never mix because the channel ID is baked into the prefix.

• **Context fan-out** – When querying memory the plugin uses `relatedSpaces.prefix === discordSpacePrefix` so the agent sees _all_ messages from that channel, not just the single one that triggered the run.

• **Granularity when needed** – The full `space.id` drills all the way down to one message. This lets you store and reference that exact event later (e.g. "edit the reply to message _ABC_").

---

## Querying with Spaces

When you need historical context you call `runtime.memory.queryMemory(...)` (or the `memory:query` executor in a prompt) and pass _either_:

• `spaceId` – **exact** match (only memories for that single event), or
• `relatedSpaces.prefix` / `relatedSpaces.pattern` – **broad** match.

```ts
// Last 10 memories from the same Discord channel
const history = await runtime.memory.queryMemory({
  relatedSpaces: { prefix: discordSpacePrefix },
  limit: 10
});
```

Under the hood the memory provider converts the filter into the most efficient query its backend supports (SQL `LIKE`, Redis prefix tree, etc.).

---

## How the runtime uses `relatedSpaces`

Before the first pipeline step runs the **MemoryManager** performs a _pre-fetch_ pass. It takes the incoming task's `space` object and:

1. Looks at `relatedSpaces` (prefix or pattern).
2. Pulls in a configurable window of recent memories that match.
3. Injects those memories into the `contextChain` so every downstream step (and the LLM) sees the most relevant history _automatically_.

## Your only job is to craft a descriptive `space.id` _and_ a useful `relatedSpaces` filter.

## Best practices & gotchas

1. **Be consistent** – changing the delimiter or segment order mid-stream will fragment your history.
2. **Index for speed** – If you are writing a custom provider, index the `space_id` and `created_at` columns together – almost every query filters by those.
3. **Avoid PII** – Use internal user IDs instead of emails or real names.
4. **One plugin, one namespace** – The prefix strategy only works when every plugin is disciplined about using its own namespace.

---

## Other examples

| Use-case            | Space prefix example                   | Full `space.id` example                              |
| ------------------- | -------------------------------------- | ---------------------------------------------------- |
| Slack thread        | `plugin-slack-T12345-C99999-THREAD987` | `plugin-slack-T12345-C99999-THREAD987-U55555-M33333` |
| Notion page         | `plugin-notion-PAGE_abcdef`            | `plugin-notion-PAGE_abcdef-BLOCK_ghijk`              |
| GitHub pull-request | `plugin-github-REPO_fullname-PR_42`    | `plugin-github-REPO_fullname-PR_42-COMMENT_1001`     |
| Local CLI session   | `plugin-cli-session_<uuid>`            | `plugin-cli-session_<uuid>-CMD_<timestamp>`          |

Use these as inspiration – you are free to invent whatever hierarchy makes sense for your domain.

---

## Summary

Spaces give MAIAR a simple yet powerful way to group memories. By crafting deterministic, hierarchical IDs and using `relatedSpaces` filters you can:

- scope context precisely,
- keep parallel conversations isolated, and
- write providers that scale from SQLite to planet-scale clusters without touching core logic.

When in doubt, follow the Discord example – start with your plugin ID, add the scopes that matter, and finish with the unique event handle.
