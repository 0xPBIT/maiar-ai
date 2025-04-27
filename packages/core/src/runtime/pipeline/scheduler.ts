import { Logger } from "winston";

import { Runtime } from "../..";
import logger from "../../lib/logger";
import { MemoryManager } from "../managers/memory";
import { PluginRegistry } from "../managers/plugin";
import {
  AgentTask,
  BaseContextItem,
  getUserInput,
  UserInputContext
} from "./agent";
import { Processor } from "./processor";

export class Scheduler {
  private readonly runtime: Runtime;
  private readonly memoryManager: MemoryManager;
  private readonly pluginRegistry: PluginRegistry;
  private readonly processor: Processor;

  private eventQueue: AgentTask[];
  private isRunning: boolean = false;

  public get logger(): Logger {
    return logger.child({ scope: "scheduler" });
  }

  constructor(
    runtime: Runtime,
    memoryManager: MemoryManager,
    pluginRegistry: PluginRegistry
  ) {
    this.runtime = runtime;
    this.memoryManager = memoryManager;
    this.pluginRegistry = pluginRegistry;

    this.processor = new Processor(
      this.runtime,
      this.memoryManager,
      this.pluginRegistry
    );

    this.eventQueue = [];
  }

  /**
   * Adds a task to the event queue
   * @param task - the task to add to the queue
   */
  private enqueue(task: AgentTask): void {
    this.eventQueue.push(task);
    this.logger.debug("Pushed task to queue", {
      type: "scheduler.queue.push",
      queueLength: this.eventQueue.length
    });

    // Start processing the queue, no-op if already started
    this.start();
  }

  /**
   * Removes and returns the first task from the event queue
   * @returns the first task from the queue or null if the queue is empty
   */
  private dequeue(): AgentTask | null {
    return this.eventQueue.shift() || null;
  }

  /**
   * Starts the queue processing, this is run if an item is added to the queue and the queue is not already processing an item
   */
  private start(): void {
    // If processing is already running, do nothing
    if (this.isRunning) {
      return;
    }

    // Set processing to true and start processing
    this.isRunning = true;
    this.logger.debug("Starting queue processing", {
      type: "scheduler.queue.processing.start",
      queueLength: this.eventQueue.length
    });

    setImmediate(() => {
      this.queueIterator()
        .catch((error: unknown) => {
          this.logger.error("Unhandled error in queue processing", {
            type: "processor.queue.processing.unhandled_error",
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
        })
        .finally(() => {
          // Always reset processing state on completion
          this.isRunning = false;
          this.logger.debug("Queue processing complete", {
            type: "scheduler.queue.processing.complete",
            queueLength: this.eventQueue.length
          });
        });
    });
  }

  /**
   * Iterates over the queue and runs each task
   */
  private async queueIterator(): Promise<void> {
    let task = this.dequeue();
    while (task) {
      try {
        await this.runTask(task);
      } catch (error) {
        this.logger.error("Error processing task", {
          type: "scheduler.queue.processing.error",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }

      task = this.dequeue();
    }

    // Queue is now empty
  }

  /**
   * Runs a task on the processor
   * @param task - the task to run
   */
  private async runTask(task: AgentTask): Promise<void> {
    this.logger.debug("Processing task", {
      type: "processor.task.processing",
      task
    });

    const userInput = getUserInput(task);

    if (userInput) {
      await this.memoryManager.storeUserInteraction(
        userInput.user,
        userInput.pluginId,
        userInput.rawMessage,
        userInput.timestamp,
        userInput.id
      );
    }

    const completedTaskChain = await this.processor.startProcessor(task);
    if (userInput) {
      const lastContext = completedTaskChain[
        completedTaskChain.length - 1
      ] as BaseContextItem & { message: string };
      this.logger.info("storing assistant response in memory", {
        type: "runtime.assistant.response.storing",
        user: userInput.user,
        platform: userInput.pluginId,
        response: lastContext.message || lastContext.content
      });

      this.logger.info("completed task chain", {
        type: "runtime.pipeline.execution.complete",
        taskChain: completedTaskChain
      });

      await this.memoryManager.storeAssistantInteraction(
        userInput.user,
        userInput.pluginId,
        lastContext.message || lastContext.content,
        completedTaskChain
      );
    }

    this.logger.info("pipeline execution complete", {
      type: "runtime.pipeline.execution.complete"
    });
  }

  /**
   * Queues a task to be run, first stores the user interaction in memory, augments the task context with the conversationId, and then queues the task
   * @param initialContext - the initial context of the task
   * @param platformContext - the platform context of the task
   */
  public async queueTask(
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
      this.enqueue(task);
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
