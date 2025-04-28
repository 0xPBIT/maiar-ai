import { Logger } from "winston";

import { Runtime } from "../..";
import logger from "../../lib/logger";
import { MemoryManager } from "../managers/memory";
import { PluginRegistry } from "../managers/plugin";
import { AgentTask } from "./agent";
import { Processor } from "./processor";

export class Scheduler {
  private readonly runtime: Runtime;
  private readonly memoryManager: MemoryManager;
  private readonly pluginRegistry: PluginRegistry;
  private readonly processor: Processor;

  private taskQueue: AgentTask[];
  private isRunning: boolean;

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

    this.taskQueue = [];
    this.isRunning = false;
  }

  /**
   * Adds a task to the task queue
   * @param task - the task to add to the queue
   */
  private enqueue(task: AgentTask): void {
    this.taskQueue.push(task);
    this.logger.debug("pushed task to queue", {
      type: "scheduler.queue.push",
      queueLength: this.taskQueue.length
    });

    // Start processing the queue, no-op if already started
    this.schedule();
  }

  /**
   * Removes and returns the first task from the task queue
   * @returns the first task from the queue or null if the queue is empty
   */
  private dequeue(): AgentTask | null {
    return this.taskQueue.shift() || null;
  }

  /**
   * Starts the queue processing, this is run if an item is added to the queue and the queue is not already processing an item
   */
  private schedule(): void {
    // If processing is already running, do nothing
    if (this.isRunning) return;

    setImmediate(() => this.cycle());
  }

  /**
   * Iterates over the queue and runs each task
   */
  private async cycle(): Promise<void> {
    this.isRunning = true;
    this.logger.debug("starting queue processing", {
      type: "scheduler.queue.processing.start",
      queueLength: this.taskQueue.length
    });

    let task = this.dequeue();

    while (task) {
      try {
        await this.execute(task);
      } catch (error) {
        this.logger.error("error processing task", {
          type: "scheduler.queue.processing.error",
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      task = this.dequeue();
    }

    this.isRunning = false;
    this.logger.debug("queue processing complete", {
      type: "scheduler.queue.processing.complete",
      queueLength: this.taskQueue.length
    });
  }

  /**
   * Runs a task on the processor
   * @param task - the task to run
   */
  private async execute(task: AgentTask): Promise<void> {
    this.logger.debug("processing task", {
      type: "processor.task.processing",
      task
    });

    // store the incoming task event in memory
    const memoryId = await this.memoryManager.storeMemory(task);

    const completedTaskChain = await this.processor.spawn(task);

    await this.memoryManager.updateMemory(memoryId, {
      context: JSON.stringify(completedTaskChain)
    });

    this.logger.info("pipeline execution complete", {
      type: "runtime.pipeline.execution.complete"
    });
  }

  /**
   * Queues a task to be run, first stores the user interaction in memory, augments the task context with the conversationId, and then queues the task
   * @param task - the task to queue
   * @param platformContext - the platform context of the task
   */
  public async queueTask(
    trigger: AgentTask["trigger"],
    space: AgentTask["space"],
    platformContext?: AgentTask["platformContext"]
  ): Promise<void> {
    // Add conversationId to platform context metadata
    const task: AgentTask = {
      trigger,
      context: [],
      space,
      metadata: {},
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
