import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { z, ZodType } from "zod";

import {
  AgentContext,
  BaseContextItem,
  Plugin,
  PluginResult
} from "@maiar-ai/core";

import { generateArgumentTemplate } from "./templates";

interface Tool {
  name: string;
  description?: string;
  inputSchema: unknown;
}

interface MCPPluginConfig {
  /** Absolute or relative path to a .js or .py file. Ignored if `command` is provided. */
  serverScriptPath?: string;
  /** If supplied, the executable to run (e.g. "docker", "npx", "node") */
  command?: string;
  /** Arguments passed to the executable. */
  args?: string[];
  /** Extra environment variables for the spawned process. */
  env?: Record<string, string>;

  /** Optional name passed to the underlying MCP client */
  clientName?: string;
  /** Optional version passed to the underlying MCP client */
  clientVersion?: string;
}

export class MCPPlugin extends Plugin {
  private readonly config: MCPPluginConfig;
  private mcp: MCPClient | null = null;
  private transport: StdioClientTransport | null = null;

  constructor(config: MCPPluginConfig) {
    super({
      id: "plugin-mcp",
      name: "MCP",
      description:
        "Connects to an MCP server and exposes its tools as executors",
      requiredCapabilities: []
    });

    this.config = config;
  }

  /* -------------------------------------------------------------------------- */
  /*                                Lifecycle                                   */
  /* -------------------------------------------------------------------------- */

  public async init(): Promise<void> {
    const {
      serverScriptPath,
      command: explicitCommand,
      args: explicitArgs,
      env,
      clientName = "maiar-mcp-plugin",
      clientVersion = "1.0.0"
    } = this.config;

    let command: string;
    let args: string[];

    if (explicitCommand) {
      // Desktop‑style configuration (command + args provided directly)
      command = explicitCommand;
      args = explicitArgs ?? [];
    } else if (serverScriptPath) {
      // Legacy single‑file configuration
      const isPython = serverScriptPath.endsWith(".py");
      const isNode = serverScriptPath.endsWith(".js");

      if (!isPython && !isNode) {
        throw new Error(
          "Provide either { command, args } or a .py/.js serverScriptPath to MCPPlugin"
        );
      }

      command = isPython
        ? process.platform === "win32"
          ? "python"
          : "python3"
        : process.execPath;
      args = [serverScriptPath];
    } else {
      throw new Error(
        "MCPPlugin requires either command+args or serverScriptPath"
      );
    }

    // Initialise MCP client & transport (env is optional)
    this.transport = new StdioClientTransport({ command, args, env });
    this.mcp = new MCPClient({ name: clientName, version: clientVersion });
    this.mcp.connect(this.transport);

    // Fetch tools from the server
    const toolsResult = await this.mcp.listTools();
    const tools = toolsResult?.tools ?? [];

    // Register every tool as an executor
    tools.forEach((tool) => this.registerToolAsExecutor(tool));

    this.logger.info("connected to MCP server and registered executors", {
      type: "plugin-mcp.init",
      command,
      args,
      tools: tools.map((t) => t.name)
    });
  }

  public async shutdown(): Promise<void> {
    try {
      await this.mcp?.close();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.transport as any)?.close?.();
    } catch (err) {
      this.logger.warn("error shutting down MCP client", {
        type: "plugin-mcp.shutdown.error",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                              Helper methods                                */
  /* -------------------------------------------------------------------------- */

  private registerToolAsExecutor(tool: Tool): void {
    const executorName = tool.name;

    const zodSchema = jsonSchemaToZod(tool.inputSchema);

    this.executors.push({
      name: executorName,
      description: tool.description ?? "",
      fn: async (context: AgentContext): Promise<PluginResult> => {
        const contextChain = context.contextChain as BaseContextItem[];
        const prompt = generateArgumentTemplate({
          executorName,
          description: tool.description,
          contextChain
        });

        if (!this.mcp) {
          return { success: false, error: "MCP client not initialised" };
        }

        try {
          // Ask the LLM to produce arguments matching the schema
          const args = (await this.runtime.operations.getObject(
            zodSchema,
            prompt,
            { temperature: 0.2 }
          )) as Record<string, unknown>;

          const result = await this.mcp.callTool({
            name: executorName,
            arguments: args
          });

          return {
            success: true,
            data: result.content ?? result // pass through whatever the MCP server returned
          };
        } catch (err: unknown) {
          return {
            success: false,
            error: err instanceof Error ? err.message : String(err)
          };
        }
      }
    });
  }
}

/**
 * Convert a (very) small subset of JSON Schema into a Zod schema.
 * Supports: type: object / string / number / boolean / integer / array
 * Nested objects & arrays are handled recursively. Anything unknown → z.any().
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
function jsonSchemaToZod(schema: unknown): ZodType<unknown> {
  if (!schema || typeof schema !== "object") return z.any();
  const s: any = schema;

  switch (s.type) {
    case "string":
      return z.string();
    case "number":
      return z.number();
    case "integer":
      return z.number().int();
    case "boolean":
      return z.boolean();
    case "array":
      return z.array(jsonSchemaToZod(s.items ?? {}));
    case "object": {
      const shape: Record<string, ZodType<unknown>> = {};
      const props = s.properties ?? {};
      for (const key of Object.keys(props)) {
        shape[key] = jsonSchemaToZod(props[key]);
        // If not required, mark optional
        if (!s.required || !s.required.includes(key)) {
          shape[key] = shape[key].optional();
        }
      }
      return z.object(shape);
    }
    default:
      return z.any();
  }
}
