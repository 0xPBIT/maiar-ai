import { Logger } from "winston";

import { MemoryManager } from "../managers/memory";
import { PluginRegistry } from "../managers/plugin";
import {
  AgentTask,
  BaseContextItem,
  getUserInput,
  UserInputContext
} from "./agent";
import { Engine } from "./engine";
import { Operations } from "./types";

export class Processor {
  private readonly memoryManager: MemoryManager;
  private readonly logger: Logger;
  private readonly engine: Engine;

  private eventQueue: AgentTask[];
  private isProcessing: boolean = false;

  constructor(
    operations: Operations,
    pluginRegistry: PluginRegistry,
    memoryManager: MemoryManager,
    parentLogger: Logger
  ) {
    this.memoryManager = memoryManager;
    this.logger = parentLogger.child({ scope: "processor" });

    this.engine = new Engine(
      operations,
      pluginRegistry,
      memoryManager,
      this.logger
    );

    this.eventQueue = [];
  }

  private enqueue(task: AgentTask): void {
    this.eventQueue.push(task);
    this.logger.debug("Pushed task to queue", {
      type: "processor.queue.push",
      queueLength: this.eventQueue.length
    });

    // Trigger processing
    this.triggerProcessing();
  }

  private dequeue(): AgentTask | null {
    return this.eventQueue.shift() || null;
  }

  private triggerProcessing(): void {
    // If processing is already running, do nothing
    if (this.isProcessing) {
      return;
    }

    // Set processing to true and start processing
    this.isProcessing = true;
    this.logger.debug("Starting queue processing", {
      type: "processor.queue.processing.start",
      queueLength: this.eventQueue.length
    });

    setImmediate(() => {
      this.processQueue()
        .catch((error: unknown) => {
          this.logger.error("Unhandled error in queue processing", {
            type: "processor.queue.processing.unhandled_error",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        })
        .finally(() => {
          // Always reset processing state on completion
          this.isProcessing = false;
          this.logger.debug("Queue processing complete", {
            type: "processor.queue.processing.complete",
            queueLength: this.eventQueue.length
          });
        });
    });
  }

  private async processQueue(): Promise<void> {
    let task = this.dequeue();
    while (task) {
      try {
        await this.processTask(task);
      } catch (error) {
        this.logger.error("Error processing task", {
          type: "processor.queue.processing.error",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }

      task = this.dequeue();
    }

    // Queue is now empty
  }

  private async processTask(task: AgentTask): Promise<void> {
    this.logger.debug("Processing task", {
      type: "processor.task.processing",
      task
    });

    await this.engine.startEngine(task);
    const userInput = getUserInput(task);

    if (userInput) {
      const lastContext = task.contextChain[
        task.contextChain.length - 1
      ] as BaseContextItem & { message: string };
      this.logger.info("storing assistant response in memory", {
        type: "runtime.assistant.response.storing",
        user: userInput.user,
        platform: userInput.pluginId,
        response: lastContext.message
      });

      await this.memoryManager.storeAssistantInteraction(
        userInput.user,
        userInput.pluginId,
        lastContext.message,
        task.contextChain
      );
    }

    this.logger.info("pipeline execution complete", {
      type: "runtime.pipeline.execution.complete"
    });
  }

  public async createEvent(
    initialContext: UserInputContext,
    platformContext?: AgentTask["platformContext"]
  ): Promise<void> {
    // Get conversationId from memory manager
    const conversationId = await this.memoryManager.getOrCreateConversation(
      initialContext.user,
      initialContext.pluginId
    );

    // Add conversationId to platform context metadata
    const task: AgentTask = {
      contextChain: [initialContext],
      conversationId,
      platformContext
    };
    try {
      await this.enqueue(task);
    } catch (error) {
      this.logger.error("error pushing event to queue", {
        type: "runtime.event.queue.push.failed",
        error: error instanceof Error ? error.message : String(error),
        task
      });
      throw error; // Re-throw to allow caller to handle
    }
  }
}
