import { Logger } from "winston";

import logger from "../../lib/logger";
import { Plugin } from "../providers/plugin";

/**
 * Defines a file reference that can be stored and retrieved from memory
 * @property type - the type of file reference (url, path, blob)
 * @property value - the actual reference value (URL, file path, or blob identifier)
 * @property metadata - additional metadata about the file (size, mime type, etc.)
 * @property context - optional context about how this file was used
 */
export interface FileReference {
  type: "url" | "path" | "blob";
  value: string;
  metadata?: {
    mimeType?: string;
    size?: number;
    filename?: string;
    description?: string;
    [key: string]: unknown;
  };
  context?: string;
}

/**
 * Defines different levels of summarization granularity
 */
export type SummarizationLevel = "recent" | "short" | "medium" | "long";

/**
 * Defines a multi-resolution summary structure
 */
export interface MultiResolutionSummary {
  recent: string; // Last 1-2 messages
  short: string;  // Last 5 messages  
  medium: string; // Last 10 messages
  long: string;   // Last 20+ messages
}

/**
 * Defines a unit of memory that is stored for the memory provider
 * @property id - unique identifier for the memory
 * @property spaceId - path identifier for the conversationspace
 * @property trigger - trigger info for the incoming event
 * @property context - context chain built as a result of the trigger
 * @property files - file references associated with this memory
 * @property createdAt - timestamp for the trigger event
 * @property updatedAt - timestamp for the result of the context chain processing
 * @property metadata - extra metadata for the message
 */
export interface Memory {
  id: string;
  spaceId: string;
  trigger: string;
  context?: string;
  files?: FileReference[];
  createdAt: number;
  updatedAt?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Defines a unit of space that is stored for the memory provider
 * @property id - unique identifier for the space
 * @property relatedSpaces - optional related spaces to search for additional context
 */
export interface Space {
  id: string;
  relatedSpaces?: {
    prefix?: string;
    pattern?: string;
  };
}

/**
 * Defines a unit of query options for the memory provider
 * @property relatedSpaces - optional related spaces to search for additional context
 * @property spaceId - optional space id to search for additional context
 * @property before - optional timestamp to search for memories before a certain date
 * @property after - optional timestamp to search for memories after a certain date
 * @property limit - optional limit for the number of memories to return
 * @property offset - optional offset for the number of memories to return
 * @property includeFiles - whether to include file references in the results
 * @property fileTypes - filter by specific file types (url, path, blob)
 */
export interface QueryMemoryOptions {
  relatedSpaces?: Space["relatedSpaces"];
  spaceId?: string;
  before?: number;
  after?: number;
  limit?: number;
  offset?: number;
  includeFiles?: boolean;
  fileTypes?: FileReference["type"][];
}

/**
 * Enhanced query result that includes file context
 */
export interface MemoryQueryResult {
  memories: Memory[];
  relatedFiles: FileReference[];
  summary: MultiResolutionSummary;
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

  /**
   * Get the memory plugin
   * @returns {Plugin} The memory plugin
   */
  public abstract getPlugin(): Plugin;

  /**
   * Store the incoming task event in the memory store
   * @param {Omit<Memory, "id">} taskEvent - The memory to store
   * @returns {Promise<string>} A promise that resolves to the id of the memory item
   */
  public abstract storeMemory(taskEvent: Omit<Memory, "id">): Promise<string>;

  /**
   * Update the memory item with new content
   * @param {string} id - The id of the memory item to update
   * @param {Omit<Partial<Memory>, "id">} patch - The update to apply to the memory item
   */
  public abstract updateMemory(
    id: string,
    patch: Omit<Partial<Memory>, "id">
  ): Promise<void>;

  /**
   * Search for related memories based on query and filter options
   * @param {QueryMemoryOptions} options - The options for the search
   * @returns {Promise<Memory[]>} A promise that resolves to the list of memories
   */
  public abstract queryMemory(options: QueryMemoryOptions): Promise<Memory[]>;

  /**
   * Enhanced query that includes files and multi-resolution summaries
   * @param {QueryMemoryOptions} options - The options for the search
   * @returns {Promise<MemoryQueryResult>} Enhanced result with files and summaries
   */
  public abstract queryMemoryWithFiles(options: QueryMemoryOptions): Promise<MemoryQueryResult>;

  /**
   * Extract file references from context chain
   * @param {string} contextChain - Serialized context chain
   * @returns {FileReference[]} Array of extracted file references
   */
  public abstract extractFileReferences(contextChain: string): FileReference[];

  /**
   * Generate multi-resolution summary from memory list
   * @param {Memory[]} memories - List of memories to summarize
   * @returns {Promise<MultiResolutionSummary>} Multi-level summaries
   */
  public abstract generateMultiResolutionSummary(memories: Memory[]): Promise<MultiResolutionSummary>;
}
