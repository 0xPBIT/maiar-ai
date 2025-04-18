import * as fs from "fs";
import * as net from "net";

import {
  AgentTask,
  Plugin,
  PluginResult,
  UserInputContext
} from "@maiar-ai/core";

import { CHAT_SOCKET_PATH } from "./index";
import { generateResponseTemplate } from "./templates";
import { TerminalPluginConfig, TerminalResponseSchema } from "./types";

interface TerminalPlatformContext {
  platform: string;
  responseHandler: (response: unknown) => void;
  metadata?: Record<string, unknown>;
}

export class TerminalPlugin extends Plugin {
  private server: net.Server | null = null;
  private clients: Set<net.Socket> = new Set();

  constructor(private config: TerminalPluginConfig) {
    super({
      id: "plugin-terminal",
      name: "Terminal Plugin",
      description:
        "Handles terminal-based chat interaction. This plugin is used to receive messages from the user over terminal. All messages recieved over terminal must be sent to the user in the terminal as the very last action you perform. It is called send_response under the plugin-terminal namespace. You must make this your last action if the incoming message is from the terminal plugin.",
      requiredCapabilities: []
    });
    this.config = config;

    // Ensure socket cleanup on process exit
    process.on("SIGINT", () => this.cleanup());
    process.on("SIGTERM", () => this.cleanup());
    process.on("exit", () => this.cleanup());

    this.executors = [
      {
        name: "send_response",
        description: "Send a response to connected terminal clients",
        fn: this.sendResponse.bind(this)
      }
    ];

    this.triggers = [
      {
        name: "terminal_server",
        start: this.startServer.bind(this)
      }
    ];
  }

  private async sendResponse(task: AgentTask): Promise<PluginResult> {
    const platformContext = task.platformContext as TerminalPlatformContext;
    if (!platformContext?.responseHandler) {
      this.logger.error("no response handler available");
      return {
        success: false,
        error: "No response handler available"
      };
    }

    try {
      // Format the response based on the context chain
      const formattedResponse = await this.runtime.operations.getObject(
        TerminalResponseSchema,
        generateResponseTemplate(task.contextChain),
        { temperature: 0.2 }
      );

      await platformContext.responseHandler(formattedResponse.message);
      return {
        success: true,
        data: {
          message: formattedResponse.message,
          helpfulInstruction:
            "This is the formatted response sent to the terminal"
        }
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("error sending response:", { error: err.message });
      return {
        success: false,
        error: "Failed to send response"
      };
    }
  }

  private async startServer(): Promise<void> {
    this.logger.info("starting terminal server...");

    if (this.server) {
      this.logger.warn("terminal server already running");
      return;
    }

    // Remove existing socket file if it exists
    this.cleanup();

    try {
      this.server = net.createServer((socket) => {
        this.logger.info("new client connected");
        this.clients.add(socket);

        socket.on("data", async (data) => {
          try {
            const { message, user, type } = JSON.parse(data.toString());
            if (!message && !type) return;

            // Handle config request from chat client
            if (type === "get_config") {
              socket.write(JSON.stringify(this.config));
              return;
            }

            this.logger.info(`received message from ${user}`, {
              user,
              message
            });

            // Create new context chain with initial user input
            const initialContext: UserInputContext = {
              id: `${this.id}-${Date.now()}`,
              pluginId: this.id,
              action: "receive_message",
              type: "user_input",
              content: message,
              timestamp: Date.now(),
              rawMessage: message,
              user: user || "local"
            };

            // Create response handler that handles type conversion
            const responseHandler = (response: unknown) => {
              const responseStr =
                typeof response === "string"
                  ? response
                  : JSON.stringify(response);

              this.logger.info(`sending response to clients`, {
                response: responseStr
              });

              for (const client of this.clients) {
                client.write(
                  JSON.stringify({
                    message: responseStr,
                    user: "maiar"
                  }) + "\n"
                );
              }
            };

            // Create event with initial context and response handler
            const platformContext: TerminalPlatformContext = {
              platform: this.id,
              responseHandler,
              metadata: {
                helpfulInstruction:
                  "This is a terminal chat message. This means you must send a response to the user in the terminal as the very last action you perform. It is called send_response under the plugin-terminal namespace."
              }
            };

            await this.runtime.createEvent(initialContext, platformContext);
          } catch (err: unknown) {
            const error = err instanceof Error ? err : new Error(String(err));
            this.logger.error("error processing message:", {
              error: error.message
            });
            socket.write("Error processing message. Please try again.\n");
          }
        });

        socket.on("end", () => {
          this.logger.info("client disconnected");
          this.clients.delete(socket);
        });

        socket.on("error", (error) => {
          this.logger.error("socket error:", { error: error.message });
          this.clients.delete(socket);
        });
      });

      this.server.listen(CHAT_SOCKET_PATH, () => {
        // Set socket permissions to be readable/writable by all users
        fs.chmodSync(CHAT_SOCKET_PATH, 0o666);
        this.logger.info(`server listening on ${CHAT_SOCKET_PATH}`, {
          socketPath: CHAT_SOCKET_PATH
        });
        this.logger.info("to connect, run: pnpm maiar-chat");
      });

      this.server.on("error", (error) => {
        this.logger.error("server error:", { error: error.message });
      });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error("failed to start server:", { error: error.message });
    }
  }

  public async init(): Promise<void> {}

  public async shutdown(): Promise<void> {
    if (fs.existsSync(CHAT_SOCKET_PATH)) {
      fs.unlinkSync(CHAT_SOCKET_PATH);
    }
  }

  private cleanup(): void {
    if (fs.existsSync(CHAT_SOCKET_PATH)) {
      fs.unlinkSync(CHAT_SOCKET_PATH);
    }
  }
}
