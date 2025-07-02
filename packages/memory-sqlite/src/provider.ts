import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

import {
  Memory,
  MemoryProvider,
  Plugin,
  QueryMemoryOptions,
  MemoryQueryResult,
  FileReference,
  MultiResolutionSummary
} from "@maiar-ai/core";

import { SQLiteDatabase } from "./database";
import { SQLiteMemoryPlugin } from "./plugin";
import { SQLiteConfig } from "./types";

export class SQLiteMemoryProvider extends MemoryProvider {
  private config: SQLiteConfig;
  private db: Database.Database;
  private plugin: SQLiteMemoryPlugin;

  constructor(config: SQLiteConfig) {
    super();
    this.config = config;
    const dbDir = path.dirname(this.config.dbPath);
    fs.mkdirSync(dbDir, { recursive: true });
    SQLiteDatabase.getInstance().init(this.config);
    this.db = SQLiteDatabase.getInstance().getDatabase();
    this.plugin = new SQLiteMemoryPlugin();
  }

  public init(): void {
    this.initializeStorage();
  }

  public checkHealth(): void {
    try {
      this.db.prepare("SELECT 1").get();
      this.db.transaction(() => {})();
      this.logger.info("sqlite health check passed", {
        type: "memory.sqlite.health_check"
      });
    } catch (error) {
      this.logger.error("sqlite health check failed", {
        type: "memory.sqlite.health_check.failed",
        error: error instanceof Error ? error.message : String(error)
      });
      throw new Error(
        `Failed to initialize SQLite database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  public shutdown(): void {
    this.db.close();
  }

  private initializeStorage() {
    this.createTables().then(() => {
      this.logger.info("initialized sqlite memory storage", {
        type: "memory.sqlite.storage.initialized"
      });
    });
  }

  private async createTables(): Promise<void> {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS memories (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        trigger TEXT NOT NULL,
        context TEXT,
        files TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_space_time ON memories(space_id, created_at DESC);
      
      CREATE TABLE IF NOT EXISTS memory_files (
        id TEXT PRIMARY KEY,
        memory_id TEXT NOT NULL,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        metadata TEXT,
        context TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (memory_id) REFERENCES memories(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_memory_files ON memory_files(memory_id);
      CREATE INDEX IF NOT EXISTS idx_file_type ON memory_files(type);
      CREATE INDEX IF NOT EXISTS idx_file_value ON memory_files(value);
    `);
  }

  public getPlugin(): Plugin {
    return this.plugin;
  }

  async storeMemory(memory: Omit<Memory, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO memories (id, space_id, trigger, context, files, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      memory.spaceId,
      memory.trigger,
      memory.context || null,
      memory.files ? JSON.stringify(memory.files) : null,
      memory.createdAt,
      memory.updatedAt || null,
      memory.metadata ? JSON.stringify(memory.metadata) : null
    );

    // Store individual file references if present
    if (memory.files && memory.files.length > 0) {
      this.storeFileReferences(id, memory.files);
    }

    this.logger.info("stored memory successfully", {
      type: "memory.sqlite.store.success",
      id
    });
    return id;
  }

  async updateMemory(id: string, patch: Partial<Memory>): Promise<void> {
    const sets: string[] = [];
    const params: (string | number | null)[] = [];
    if (patch.context !== undefined) {
      sets.push("context = ?");
      params.push(patch.context);
    }
    if (patch.metadata !== undefined) {
      sets.push("metadata = ?");
      params.push(JSON.stringify(patch.metadata));
    }
    if (patch.files !== undefined) {
      sets.push("files = ?");
      params.push(patch.files ? JSON.stringify(patch.files) : null);
      
      // Update file references in separate table
      if (patch.files && patch.files.length > 0) {
        this.updateFileReferences(id, patch.files);
      }
    }

    // add the updated_at field
    sets.push("updated_at = ?");
    params.push(new Date().getTime());

    if (!sets.length) return;
    params.push(id);
    this.db
      .prepare(`UPDATE memories SET ${sets.join(", ")} WHERE id = ?`)
      .run(...params);
    this.logger.info("updated memory successfully", {
      type: "memory.sqlite.update.success",
      id
    });
  }

  async queryMemory(options: QueryMemoryOptions): Promise<Memory[]> {
    let query = "SELECT * FROM memories";
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (options.relatedSpaces) {
      if (options.relatedSpaces.pattern) {
        // if a pattern is provided, use it to filter the space_id
        conditions.push("space_id GLOB ?");
        params.push(options.relatedSpaces.pattern);
      } else if (options.relatedSpaces.prefix) {
        // match all spaces that have the same starting prefix
        conditions.push("space_id LIKE ?");
        params.push(options.relatedSpaces.prefix + "%");
      }
    } else if (options.spaceId) {
      // match a specific space
      conditions.push("space_id = ?");
      params.push(options.spaceId);
    }

    if (options.after) {
      conditions.push("created_at > ?");
      params.push(options.after);
    }

    if (options.before) {
      conditions.push("created_at < ?");
      params.push(options.before);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC";

    if (options.limit) {
      query += " LIMIT ?";
      params.push(options.limit);
    }

    if (options.offset) {
      query += " OFFSET ?";
      params.push(options.offset);
    }

    const stmt = this.db.prepare(query);
    const results = stmt.all(...params) as {
      id: string;
      space_id: string;
      trigger: string;
      context?: string;
      created_at: number;
      updated_at?: number;
      reply_to_id?: string;
      metadata?: string;
    }[];
    this.logger.info("queried memory", {
      type: "memory.sqlite.query",
      count: results.length,
      options
    });
    return results.map((row) => ({
      id: row.id,
      spaceId: row.space_id,
      trigger: row.trigger,
      context: row.context || undefined,
      files: row.files ? JSON.parse(row.files) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
      replyToId: undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  private storeFileReferences(memoryId: string, files: FileReference[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO memory_files (id, memory_id, type, value, metadata, context, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const file of files) {
      stmt.run(
        crypto.randomUUID(),
        memoryId,
        file.type,
        file.value,
        file.metadata ? JSON.stringify(file.metadata) : null,
        file.context || null,
        Date.now()
      );
    }
  }

  private updateFileReferences(memoryId: string, files: FileReference[]): void {
    // Delete existing file references
    this.db.prepare("DELETE FROM memory_files WHERE memory_id = ?").run(memoryId);
    
    // Insert new file references
    this.storeFileReferences(memoryId, files);
  }

  async queryMemoryWithFiles(options: QueryMemoryOptions): Promise<MemoryQueryResult> {
    // Get memories using existing query
    const memories = await this.queryMemory(options);
    
    // Get related files based on memory IDs
    const relatedFiles = this.getFilesForMemories(memories.map(m => m.id), options.fileTypes);
    
    // Generate multi-resolution summary
    const summary = await this.generateMultiResolutionSummary(memories);
    
    return {
      memories,
      relatedFiles,
      summary
    };
  }

  private getFilesForMemories(memoryIds: string[], fileTypes?: FileReference["type"][]): FileReference[] {
    if (memoryIds.length === 0) return [];

    let query = "SELECT * FROM memory_files WHERE memory_id IN (" + 
      memoryIds.map(() => "?").join(", ") + ")";
    const params: (string | number)[] = [...memoryIds];

    if (fileTypes && fileTypes.length > 0) {
      query += " AND type IN (" + fileTypes.map(() => "?").join(", ") + ")";
      params.push(...fileTypes);
    }

    query += " ORDER BY created_at DESC";

    const results = this.db.prepare(query).all(...params) as {
      id: string;
      memory_id: string;
      type: string;
      value: string;
      metadata?: string;
      context?: string;
      created_at: number;
    }[];

    return results.map(row => ({
      type: row.type as FileReference["type"],
      value: row.value,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      context: row.context || undefined
    }));
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
