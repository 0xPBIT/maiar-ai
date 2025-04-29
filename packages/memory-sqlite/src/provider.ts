import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

import {
  Memory,
  MemoryProvider,
  Plugin,
  QueryMemoryOptions
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
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        trigger TEXT NOT NULL,
        context TEXT,
        timestamp INTEGER NOT NULL,
        result_ts INTEGER,
        reply_to_id TEXT,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_space_time ON messages(space_id, timestamp DESC);
    `);
  }

  public getPlugin(): Plugin {
    return this.plugin;
  }

  async storeMemory(memory: Omit<Memory, "id">): Promise<string> {
    const id = Math.random().toString(36).substring(2);
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, space_id, trigger, context, timestamp, result_ts, reply_to_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      memory.spaceId,
      memory.trigger,
      memory.context || null,
      memory.createdAt,
      memory.resultTs || null,
      undefined,
      memory.metadata ? JSON.stringify(memory.metadata) : null
    );
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
    if (patch.resultTs !== undefined) {
      sets.push("result_ts = ?");
      params.push(patch.resultTs);
    }
    if (patch.metadata !== undefined) {
      sets.push("metadata = ?");
      params.push(JSON.stringify(patch.metadata));
    }
    if (!sets.length) return;
    params.push(id);
    this.db
      .prepare(`UPDATE messages SET ${sets.join(", ")} WHERE id = ?`)
      .run(...params);
    this.logger.info("updated memory successfully", {
      type: "memory.sqlite.update.success",
      id
    });
  }

  async queryMemory(options: QueryMemoryOptions): Promise<Memory[]> {
    let query = "SELECT * FROM messages";
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (options.space) {
      if (options.space.id) {
        conditions.push("space_id = ?");
        params.push(options.space.id);
      } else if (options.space.prefix) {
        conditions.push("space_id LIKE ?");
        params.push(options.space.prefix + "%");
      } else if (options.space.pattern) {
        conditions.push("space_id GLOB ?");
        params.push(options.space.pattern);
      }
    }

    if (options.after) {
      conditions.push("timestamp > ?");
      params.push(options.after);
    }

    if (options.before) {
      conditions.push("timestamp < ?");
      params.push(options.before);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY timestamp DESC";

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
      timestamp: number;
      result_ts?: number;
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
      createdAt: row.timestamp,
      resultTs: row.result_ts || undefined,
      replyToId: undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }
}
