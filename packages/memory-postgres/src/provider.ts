import { Pool } from "pg";

import {
  Memory,
  MemoryProvider,
  Plugin,
  QueryMemoryOptions
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
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          space_id TEXT NOT NULL,
          trigger TEXT NOT NULL,
          context TEXT,
          timestamp BIGINT NOT NULL,
          result_ts BIGINT,
          reply_to_id TEXT,
          metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_space_time ON messages(space_id, timestamp DESC);
      `);
    } finally {
      client.release();
    }
  }

  public getPlugin(): Plugin {
    return this.plugin;
  }

  async storeMemory(memory: Omit<Memory, "id">): Promise<string> {
    const id = Math.random().toString(36).substring(2);
    const client = await this.pool.connect();
    try {
      await client.query(
        `INSERT INTO messages (id, space_id, trigger, context, timestamp, result_ts, reply_to_id, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          id,
          memory.spaceId,
          memory.trigger,
          memory.context || null,
          memory.createdAt,
          memory.resultTs || null,
          null,
          memory.metadata ? memory.metadata : null
        ]
      );
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
    if (patch.resultTs !== undefined) {
      sets.push(`result_ts = $${paramIndex++}`);
      params.push(patch.resultTs);
    }
    if (patch.metadata !== undefined) {
      sets.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(patch.metadata));
    }
    if (!sets.length) return;
    params.push(id);
    const client = await this.pool.connect();
    try {
      await client.query(
        `UPDATE messages SET ${sets.join(", ")} WHERE id = $${paramIndex}`,
        params
      );
      this.logger.info("updated memory successfully", {
        type: "memory.postgres.update.success",
        id
      });
    } finally {
      client.release();
    }
  }

  async queryMemory(options: QueryMemoryOptions): Promise<Memory[]> {
    let query = "SELECT * FROM messages";
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
      conditions.push(`timestamp > $${paramIndex++}`);
      params.push(options.after);
    }

    if (options.before) {
      conditions.push(`timestamp < $${paramIndex++}`);
      params.push(options.before);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY timestamp DESC";

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
      const res = await client.query(query, params);
      this.logger.info("queried memory", {
        type: "memory.postgres.query",
        count: res.rows.length,
        options
      });
      return res.rows.map((row) => ({
        id: row.id,
        spaceId: row.space_id,
        trigger: row.trigger,
        context: row.context || undefined,
        createdAt: row.timestamp,
        resultTs: row.result_ts || undefined,
        replyToId: undefined,
        metadata: row.metadata || undefined
      }));
    } finally {
      client.release();
    }
  }
}
