import { Pool } from "pg";

import {
  Memory,
  MemoryProvider,
  Plugin,
  QueryMemoryOptions,
  MemoryQueryResult,
  FileReference,
  MultiResolutionSummary
} from "@maiar-ai/core";

import { PostgresDatabase } from "./database";
import { PostgresMemoryPlugin } from "./plugin";
import { PostgresConfig } from "./types";

export class PostgresMemoryProvider extends MemoryProvider {
  private pool: Pool;
  private plugin: PostgresMemoryPlugin;

  constructor(config: PostgresConfig) {
    super();
    const poolInstance = PostgresDatabase.getInstance();
    poolInstance.init(config);
    // Get the pool safely after initialization
    this.pool = poolInstance.getPool();
    this.plugin = new PostgresMemoryPlugin();
  }

  public async init(): Promise<void> {
    await this.initializeStorage();
  }

  public async checkHealth() {
    try {
      const client = await this.pool.connect();
      try {
        await client.query("SELECT 1");
        this.logger.info("postgresql health check passed", {
          type: "memory.postgres.health_check"
        });
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error("postgresql health check failed", {
        type: "memory.postgres.health_check.failed",
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(
        `Failed to initialize PostgreSQL database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  public async shutdown(): Promise<void> {
    await this.pool.end();
  }

  private async initializeStorage() {
    try {
      await this.createTables();
      this.logger.info("initialized postgresql memory storage", {
        type: "memory.postgres.storage.initialized"
      });
    } catch (error) {
      this.logger.error("failed to initialize postgresql memory storage", {
        type: "memory.postgres.storage.initialization_failed",
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS memories (
          id TEXT PRIMARY KEY,
          space_id TEXT NOT NULL,
          trigger TEXT NOT NULL,
          context TEXT,
          files JSONB,
          created_at BIGINT NOT NULL,
          updated_at BIGINT,
          metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_space_time ON memories(space_id, created_at DESC);
        
        CREATE TABLE IF NOT EXISTS memory_files (
          id TEXT PRIMARY KEY,
          memory_id TEXT NOT NULL,
          type TEXT NOT NULL,
          value TEXT NOT NULL,
          metadata JSONB,
          context TEXT,
          created_at BIGINT NOT NULL,
          FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS idx_memory_files ON memory_files(memory_id);
        CREATE INDEX IF NOT EXISTS idx_file_type ON memory_files(type);
        CREATE INDEX IF NOT EXISTS idx_file_value ON memory_files(value);
      `);
    } finally {
      client.release();
    }
  }

  public getPlugin(): Plugin {
    return this.plugin;
  }

  async storeMemory(memory: Omit<Memory, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO memories (id, space_id, trigger, context, files, created_at, updated_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          memory.spaceId,
          memory.trigger,
          memory.context || null,
          memory.files ? JSON.stringify(memory.files) : null,
          memory.createdAt,
          memory.updatedAt || null,
          memory.metadata ? memory.metadata : null
        ]
      );

      // Store individual file references if present
      if (memory.files && memory.files.length > 0) {
        await this.storeFileReferences(client, id, memory.files);
      }

      this.logger.info("stored memory successfully", {
        type: "memory.postgres.store.success",
        id
      });
      return id;
    } finally {
      client.release();
    }
  }

  async updateMemory(id: string, patch: Partial<Memory>): Promise<void> {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    let paramIndex = 1;
    if (patch.context !== undefined) {
      sets.push(`context = $${paramIndex++}`);
      params.push(patch.context);
    }
    if (patch.metadata !== undefined) {
      sets.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(patch.metadata));
    }
    if (patch.files !== undefined) {
      sets.push(`files = $${paramIndex++}`);
      params.push(patch.files ? JSON.stringify(patch.files) : null);
    }

    // add the updated_at field
    sets.push(`updated_at = $${paramIndex++}`);
    params.push(new Date().getTime());

    if (!sets.length) return;
    params.push(id);
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE memories SET ${sets.join(", ")} WHERE id = $${paramIndex}`,
        params
      );

      // Update file references in separate table if files were provided
      if (patch.files !== undefined && patch.files && patch.files.length > 0) {
        await this.updateFileReferences(client, id, patch.files);
      }

      this.logger.info("updated memory successfully", {
        type: "memory.postgres.update.success",
        id
      });
    } finally {
      client.release();
    }
  }

  async queryMemory(options: QueryMemoryOptions): Promise<Memory[]> {
    let query = "SELECT * FROM memories";
    const params: (string | number)[] = [];
    const conditions: string[] = [];
    let paramIndex = 1;

    if (options.relatedSpaces) {
      if (options.relatedSpaces.pattern) {
        conditions.push(`space_id ~ $${paramIndex++}`);
        params.push(options.relatedSpaces.pattern);
      } else if (options.relatedSpaces.prefix) {
        conditions.push(`space_id LIKE $${paramIndex++}`);
        params.push(options.relatedSpaces.prefix + "%");
      }
    } else if (options.spaceId) {
      conditions.push(`space_id = $${paramIndex++}`);
      params.push(options.spaceId);
    }

    if (options.after) {
      conditions.push(`created_at > $${paramIndex++}`);
      params.push(options.after);
    }

    if (options.before) {
      conditions.push(`created_at < $${paramIndex++}`);
      params.push(options.before);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    if (options.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    const client = await this.pool.connect();
    try {
      const res = await client.query<Memory>(query, params);
      this.logger.info("queried memory", {
        type: "memory.postgres.query",
        count: res.rows.length,
        options
      });
      return res.rows.map((row) => ({
        id: row.id,
        spaceId: row.spaceId,
        trigger: row.trigger,
        context: row.context || undefined,
        files: row.files || undefined,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt || undefined,
        metadata: row.metadata || undefined
      }));
    } finally {
      client.release();
    }
  }

  private async storeFileReferences(client: any, memoryId: string, files: FileReference[]): Promise<void> {
    for (const file of files) {
      await client.query(
        `INSERT INTO memory_files (id, memory_id, type, value, metadata, context, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          crypto.randomUUID(),
          memoryId,
          file.type,
          file.value,
          file.metadata ? JSON.stringify(file.metadata) : null,
          file.context || null,
          Date.now()
        ]
      );
    }
  }

  private async updateFileReferences(client: any, memoryId: string, files: FileReference[]): Promise<void> {
    // Delete existing file references
    await client.query("DELETE FROM memory_files WHERE memory_id = $1", [memoryId]);
    
    // Insert new file references
    await this.storeFileReferences(client, memoryId, files);
  }

  async queryMemoryWithFiles(options: QueryMemoryOptions): Promise<MemoryQueryResult> {
    // Get memories using existing query
    const memories = await this.queryMemory(options);
    
    // Get related files based on memory IDs
    const relatedFiles = await this.getFilesForMemories(memories.map(m => m.id), options.fileTypes);
    
    // Generate multi-resolution summary
    const summary = await this.generateMultiResolutionSummary(memories);
    
    return {
      memories,
      relatedFiles,
      summary
    };
  }

  private async getFilesForMemories(memoryIds: string[], fileTypes?: FileReference["type"][]): Promise<FileReference[]> {
    if (memoryIds.length === 0) return [];

    let query = "SELECT * FROM memory_files WHERE memory_id = ANY($1)";
    const params: any[] = [memoryIds];
    let paramIndex = 2;

    if (fileTypes && fileTypes.length > 0) {
      query += ` AND type = ANY($${paramIndex++})`;
      params.push(fileTypes);
    }

    query += " ORDER BY created_at DESC";

    const client = await this.pool.connect();
    try {
      const res = await client.query(query, params);
      return res.rows.map((row: any) => ({
        type: row.type as FileReference["type"],
        value: row.value,
        metadata: row.metadata || undefined,
        context: row.context || undefined
      }));
    } finally {
      client.release();
    }
  }

  extractFileReferences(contextChain: string): FileReference[] {
    const files: FileReference[] = [];
    
    try {
      // Parse context chain to look for common file patterns
      const contexts = JSON.parse(contextChain);
      
      if (Array.isArray(contexts)) {
        for (const context of contexts) {
          // Extract URLs from context content
          if (context.content) {
            const urlMatches = context.content.match(/https?:\/\/[^\s]+/g);
            if (urlMatches) {
              for (const url of urlMatches) {
                files.push({
                  type: "url",
                  value: url,
                  context: `Found in ${context.pluginId} context`,
                  metadata: {
                    extractedFrom: context.id,
                    timestamp: context.timestamp
                  }
                });
              }
            }
            
            // Extract file paths
            const pathMatches = context.content.match(/\/[^\s]+\.[a-zA-Z0-9]+/g);
            if (pathMatches) {
              for (const filePath of pathMatches) {
                files.push({
                  type: "path",
                  value: filePath,
                  context: `Found in ${context.pluginId} context`,
                  metadata: {
                    extractedFrom: context.id,
                    timestamp: context.timestamp
                  }
                });
              }
            }
          }

          // Extract specific fields that might contain files
          if (context.outputImageUrls) {
            for (const url of context.outputImageUrls) {
              files.push({
                type: "url",
                value: url,
                context: `Generated image from ${context.pluginId}`,
                metadata: {
                  mimeType: "image/*",
                  extractedFrom: context.id,
                  timestamp: context.timestamp
                }
              });
            }
          }

          if (context.images && Array.isArray(context.images)) {
            for (const image of context.images) {
              files.push({
                type: "url",
                value: image,
                context: `Image reference from ${context.pluginId}`,
                metadata: {
                  mimeType: "image/*",
                  extractedFrom: context.id,
                  timestamp: context.timestamp
                }
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.warn("failed to extract file references", {
        type: "memory.files.extract.failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return files;
  }

  async generateMultiResolutionSummary(memories: Memory[]): Promise<MultiResolutionSummary> {
    if (memories.length === 0) {
      return {
        recent: "No recent memories available.",
        short: "No recent memories available.",
        medium: "No recent memories available.",
        long: "No memories available."
      };
    }

    // Sort memories by creation time (most recent first)
    const sortedMemories = [...memories].sort((a, b) => b.createdAt - a.createdAt);

    // Generate summaries at different granularities
    const recent = this.summarizeMemories(sortedMemories.slice(0, 2), "recent");
    const short = this.summarizeMemories(sortedMemories.slice(0, 5), "short");
    const medium = this.summarizeMemories(sortedMemories.slice(0, 10), "medium");
    const long = this.summarizeMemories(sortedMemories.slice(0, 20), "long");

    return {
      recent: await recent,
      short: await short,
      medium: await medium,
      long: await long
    };
  }

  private async summarizeMemories(memories: Memory[], level: string): Promise<string> {
    if (memories.length === 0) {
      return `No ${level} memories available.`;
    }

    // Simple text-based summarization
    // In a production system, this could use an LLM for better summarization
    const summary = memories.map(memory => {
      const trigger = JSON.parse(memory.trigger);
      const timestamp = new Date(memory.createdAt).toLocaleString();
      let text = `[${timestamp}] ${trigger.content || 'Task triggered'}`;
      
      if (memory.files && memory.files.length > 0) {
        text += ` (${memory.files.length} file references)`;
      }
      
      return text;
    }).join('; ');

    return `${level.toUpperCase()} CONTEXT (${memories.length} memories): ${summary}`;
  }
}
