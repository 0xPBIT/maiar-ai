import { Logger } from "winston";

import logger from "../../lib/logger";
import { Plugin } from "../providers/plugin";

export interface Memory {
  id: string; // unique identifier for the message
  spaceId: string; // path identifier for the conversationspace
  trigger: string; // trigger info for the incoming event
  context?: string; // context chain built as a result of the trigger
  createdAt: number; // timestamp for the trigger event
  resultTs?: number; // timestamp for the result of the context chain processing
  metadata?: Record<string, unknown>; // extra metadata for the message
}

export interface Space {
  id: string; // unique identifier for the space this message belongs to
  prefix?: string; // prefix for the space to search for additional context
  pattern?: string; // regex pattern for the space to search for additional context
}

export interface QueryMemoryOptions {
  space?: Space;
  before?: number;
  after?: number;
  limit?: number;
  offset?: number;
}

/**
 * Interface that all memory providers must implement
 */
export abstract class MemoryProvider {
  public get logger(): Logger {
    return logger.child({ scope: "memory.provider" });
  }

  constructor() {}

  /**
   * Initializes the memory provider. Must be implemented by subclasses.
   * @returns {Promise<void>} A promise that resolves when initialization is complete.
   */
  public abstract init(): Promise<void> | void;

  /**
   * Checks the health of the memory provider. Must be implemented by subclasses.
   * @returns {Promise<void>} A promise that resolves when health check is complete.
   */
  public abstract checkHealth(): Promise<void> | void;

  /**
   * Shuts down the memory provider. Must be implemented by subclasses.
   * @returns {Promise<void>} A promise that resolves when shutdown is complete.
   */
  public abstract shutdown(): Promise<void> | void;

  // Get memory plugin
  public abstract getPlugin(): Plugin;

  /**
   * Store the incoming task event in the memory store
   * @param {Task} task - The incoming task event
   */
  public abstract storeMemory(taskEvent: Omit<Memory, "id">): Promise<string>;

  /**
   * Update the memory item with new content
   * @param {string} id - The id of the memory item to update
   * @param {Partial<Memory>} patch - The update to apply to the memory item
   */
  public abstract updateMemory(
    id: string,
    patch: Partial<Memory>
  ): Promise<void>;

  /**
   * Search for related memories based on query and filter options
   * @param {QueryMemoryOptions} options - The options for the search
   * @returns {Promise<Memory[]>} A promise that resolves to the list of memories
   */
  public abstract queryMemory(options: QueryMemoryOptions): Promise<Memory[]>;
}
