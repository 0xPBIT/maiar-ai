import { Logger } from "winston";

import logger from "../../lib/logger";
import { Plugin } from "../providers/plugin";

/**
 * Defines a unit of memory that is stored for the memory provider
 * @property id - unique identifier for the memory
 * @property spaceId - path identifier for the conversationspace
 * @property trigger - trigger info for the incoming event
 * @property context - context chain built as a result of the trigger
 * @property createdAt - timestamp for the trigger event
 * @property updatedAt - timestamp for the result of the context chain processing
 * @property metadata - extra metadata for the message
 */
export interface Memory {
  id: string;
  spaceId: string;
  trigger: string;
  context?: string;
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
 */
export interface QueryMemoryOptions {
  relatedSpaces?: Space["relatedSpaces"];
  spaceId?: string;
  before?: number;
  after?: number;
  limit?: number;
  offset?: number;
}

/**
 * Defines column information for custom table creation
 * @property name - column name
 * @property type - column data type (text, integer, real, blob, json, etc.)
 * @property constraints - optional column constraints (primary key, not null, unique, etc.)
 */
export interface TableColumn {
  name: string;
  type: 'text' | 'integer' | 'real' | 'blob' | 'json' | 'bigint' | 'boolean';
  constraints?: Array<'primary_key' | 'not_null' | 'unique' | 'auto_increment'>;
}

/**
 * Defines schema for custom table creation
 * @property name - table name
 * @property columns - array of column definitions
 * @property indexes - optional indexes to create on the table
 */
export interface TableSchema {
  name: string;
  columns: TableColumn[];
  indexes?: Array<{
    name: string;
    columns: string[];
    unique?: boolean;
  }>;
}

/**
 * Defines options for querying custom tables
 * @property where - optional where conditions
 * @property orderBy - optional order by clauses
 * @property limit - optional limit for results
 * @property offset - optional offset for pagination
 */
export interface TableQueryOptions {
  where?: Record<string, unknown>;
  orderBy?: Array<{
    column: string;
    direction: 'asc' | 'desc';
  }>;
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

  // New table operation methods for client-side table management

  /**
   * Create a new custom table with the specified schema
   * @param {TableSchema} schema - The table schema definition
   * @returns {Promise<void>} A promise that resolves when the table is created
   */
  public abstract createTable(schema: TableSchema): Promise<void>;

  /**
   * Insert data into a custom table
   * @param {string} tableName - The name of the table
   * @param {Record<string, unknown>} data - The data to insert
   * @returns {Promise<string>} A promise that resolves to the inserted record ID
   */
  public abstract insertIntoTable(
    tableName: string,
    data: Record<string, unknown>
  ): Promise<string>;

  /**
   * Update data in a custom table
   * @param {string} tableName - The name of the table
   * @param {string} id - The ID of the record to update
   * @param {Record<string, unknown>} data - The data to update
   * @returns {Promise<void>} A promise that resolves when the update is complete
   */
  public abstract updateTableRecord(
    tableName: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void>;

  /**
   * Query data from a custom table
   * @param {string} tableName - The name of the table
   * @param {TableQueryOptions} options - The query options
   * @returns {Promise<Record<string, unknown>[]>} A promise that resolves to the query results
   */
  public abstract queryTable(
    tableName: string,
    options?: TableQueryOptions
  ): Promise<Record<string, unknown>[]>;

  /**
   * Delete a record from a custom table
   * @param {string} tableName - The name of the table
   * @param {string} id - The ID of the record to delete
   * @returns {Promise<void>} A promise that resolves when the deletion is complete
   */
  public abstract deleteFromTable(tableName: string, id: string): Promise<void>;

  /**
   * Check if a custom table exists
   * @param {string} tableName - The name of the table
   * @returns {Promise<boolean>} A promise that resolves to true if the table exists
   */
  public abstract tableExists(tableName: string): Promise<boolean>;

  /**
   * Drop a custom table
   * @param {string} tableName - The name of the table to drop
   * @returns {Promise<void>} A promise that resolves when the table is dropped
   */
  public abstract dropTable(tableName: string): Promise<void>;
}
