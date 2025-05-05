import { execa } from "execa";
import path from "path";

import { AgentTask, Plugin, PluginResult } from "@maiar-ai/core";

import { generateCodexCommandTemplate } from "./templates";
import { CodexCommandSchema } from "./types";

export class CodexPlugin extends Plugin {
  constructor(config: {
    apiKey: string;
    timeout?: number;
    maxBuffer?: number;
  }) {
    super({
      id: "plugin-codex",
      name: "Codex CLI",
      description: "Run CLI commands and write code on behalf of the user",
      requiredCapabilities: []
    });

    this.executors = [
      {
        name: "run_codex_command",
        description:
          "this command will write code on request and behalf of the user. coding related requesets should invoke this command.",
        fn: async (task: AgentTask): Promise<PluginResult> => {
          try {
            // Extract command details from context
            const commandDetails = await this.runtime.getObject(
              CodexCommandSchema,
              generateCodexCommandTemplate(JSON.stringify(task))
            );

            // Resolve the path to the Codex CLI binary
            const command = "npx";
            const pluginRoot = path.join(__dirname, "..");

            // Build arguments for the Codex command
            const args = ["codex"];
            if (commandDetails.approvalMode) {
              args.push("-a", commandDetails.approvalMode);
            }
            if (commandDetails.flags) {
              args.push(...commandDetails.flags);
            }

            const fullPrompt = `
                        ${commandDetails.prompt}

                        You will perform all your work in the /sandbox directory.
                        First, search the /sandbox directory to identify any existing projects related to the current request.
                        Then, create a new subdirectory within /sandbox specifically for the work related to this immediate request if a related project is not found.
                        All files and code should be organized within this new subdirectory.
                        `;

            args.push(fullPrompt);
            args.push("--quiet");

            // Set environment variables, including OPENAI_API_KEY if provided
            const env = {
              ...process.env,
              OPENAI_API_KEY: config.apiKey
            };

            // Execute the Codex CLI command
            const { stdout, stderr, exitCode } = await execa(command, args, {
              cwd: pluginRoot,
              env,
              timeout: config.timeout || 600000, // 600 seconds timeout to prevent hanging
              maxBuffer: config.maxBuffer || 1024 * 1024 * 10 // 10MB buffer for output
            });

            // Return the result
            return {
              success: exitCode === 0,
              data: {
                stdout,
                stderr
              }
            };
          } catch (error) {
            return {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred while running Codex CLI command"
            };
          }
        }
      }
    ];
  }

  public async init(): Promise<void> {}

  public async shutdown(): Promise<void> {}
}

export default CodexPlugin;
