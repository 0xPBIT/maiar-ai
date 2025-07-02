import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

import {
  Memory,
  MemoryProvider,
  Plugin,
  QueryMemoryOptions,
  TableSchema,
  TableColumn,
  TableQueryOptions
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
        created_at INTEGER NOT NULL,
        updated_at INTEGER,
        metadata TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_space_time ON memories(space_id, created_at DESC);
    `);
  }

  public getPlugin(): Plugin {
    return this.plugin;
  }

  async storeMemory(memory: Omit<Memory, "id">): Promise<string> {
    const id = crypto.randomUUID();
    const stmt = this.db.prepare(`
      INSERT INTO memories (id, space_id, trigger, context, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      memory.spaceId,
      memory.trigger,
      memory.context || null,
      memory.createdAt,
      memory.updatedAt || null,
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
    if (patch.metadata !== undefined) {
      sets.push("metadata = ?");
      params.push(JSON.stringify(patch.metadata));
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
      createdAt: row.created_at,
      updatedAt: row.updated_at || undefined,
      replyToId: undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }));
  }

  // Implementation of new table operation methods

  async createTable(schema: TableSchema): Promise<void> {
    const { name, columns, indexes } = schema;
    
    // Validate table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      throw new Error(`Invalid table name: ${name}`);
    }

    // Build column definitions
    const columnDefs = columns.map((col) => this.buildColumnDefinition(col)).join(", ");
    
    const createTableQuery = `CREATE TABLE IF NOT EXISTS ${name} (${columnDefs})`;
    
    try {
      this.db.exec(createTableQuery);
      
      // Create indexes if specified
      if (indexes && indexes.length > 0) {
        for (const index of indexes) {
          const uniqueKeyword = index.unique ? "UNIQUE " : "";
          const indexQuery = `CREATE ${uniqueKeyword}INDEX IF NOT EXISTS ${index.name} ON ${name} (${index.columns.join(", ")})`;
          this.db.exec(indexQuery);
        }
      }
      
      this.logger.info("created custom table successfully", {
        type: "memory.sqlite.table.create.success",
        tableName: name
      });
    } catch (error) {
      this.logger.error("failed to create custom table", {
        type: "memory.sqlite.table.create.failed",
        tableName: name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private buildColumnDefinition(column: TableColumn): string {
    let def = `${column.name} `;
    
    // Map generic types to SQLite types
    switch (column.type) {
      case 'text':
      case 'json':
        def += 'TEXT';
        break;
      case 'integer':
      case 'bigint':
        def += 'INTEGER';
        break;
      case 'real':
        def += 'REAL';
        break;
      case 'blob':
        def += 'BLOB';
        break;
      case 'boolean':
        def += 'INTEGER'; // SQLite doesn't have native boolean
        break;
      default:
        def += 'TEXT';
    }
    
    // Add constraints
    if (column.constraints) {
      for (const constraint of column.constraints) {
        switch (constraint) {
          case 'primary_key':
            def += ' PRIMARY KEY';
            break;
          case 'not_null':
            def += ' NOT NULL';
            break;
          case 'unique':
            def += ' UNIQUE';
            break;
          case 'auto_increment':
            def += ' AUTOINCREMENT';
            break;
        }
      }
    }
    
    return def;
  }

  async insertIntoTable(tableName: string, data: Record<string, unknown>): Promise<string> {
    // Validate table name
    if (!(await this.tableExists(tableName))) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const id = crypto.randomUUID();
    const dataWithId = { id, ...data };
    const columns = Object.keys(dataWithId);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => {
      const value = dataWithId[col];
      return typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
    });

    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    try {
      const stmt = this.db.prepare(query);
      stmt.run(...values);
      
      this.logger.info("inserted into custom table successfully", {
        type: "memory.sqlite.table.insert.success",
        tableName,
        id
      });
      
      return id;
    } catch (error) {
      this.logger.error("failed to insert into custom table", {
        type: "memory.sqlite.table.insert.failed",
        tableName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async updateTableRecord(tableName: string, id: string, data: Record<string, unknown>): Promise<void> {
    // Validate table name
    if (!(await this.tableExists(tableName))) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const sets = Object.keys(data).map(key => `${key} = ?`);
    const values = Object.values(data).map(value => 
      typeof value === 'object' && value !== null ? JSON.stringify(value) : value
    );
    values.push(id);

    const query = `UPDATE ${tableName} SET ${sets.join(', ')} WHERE id = ?`;
    
    try {
      const stmt = this.db.prepare(query);
      const result = stmt.run(...values);
      
      if (result.changes === 0) {
        throw new Error(`No record found with id: ${id}`);
      }
      
      this.logger.info("updated custom table record successfully", {
        type: "memory.sqlite.table.update.success",
        tableName,
        id
      });
    } catch (error) {
      this.logger.error("failed to update custom table record", {
        type: "memory.sqlite.table.update.failed",
        tableName,
        id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async queryTable(tableName: string, options?: TableQueryOptions): Promise<Record<string, unknown>[]> {
    // Validate table name
    if (!(await this.tableExists(tableName))) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    let query = `SELECT * FROM ${tableName}`;
    const params: unknown[] = [];
    const conditions: string[] = [];

    // Build WHERE clause
    if (options?.where) {
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = ?`);
        params.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : value);
      }
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Build ORDER BY clause
    if (options?.orderBy && options.orderBy.length > 0) {
      const orderClauses = options.orderBy.map(order => `${order.column} ${order.direction.toUpperCase()}`);
      query += ` ORDER BY ${orderClauses.join(', ')}`;
    }

    // Add LIMIT and OFFSET
    if (options?.limit) {
      query += ` LIMIT ?`;
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ` OFFSET ?`;
      params.push(options.offset);
    }

    try {
      const stmt = this.db.prepare(query);
      const results = stmt.all(...params) as Record<string, unknown>[];
      
      this.logger.info("queried custom table successfully", {
        type: "memory.sqlite.table.query.success",
        tableName,
        count: results.length
      });
      
      return results;
    } catch (error) {
      this.logger.error("failed to query custom table", {
        type: "memory.sqlite.table.query.failed",
        tableName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async deleteFromTable(tableName: string, id: string): Promise<void> {
    // Validate table name
    if (!(await this.tableExists(tableName))) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const query = `DELETE FROM ${tableName} WHERE id = ?`;
    
    try {
      const stmt = this.db.prepare(query);
      const result = stmt.run(id);
      
      if (result.changes === 0) {
        throw new Error(`No record found with id: ${id}`);
      }
      
      this.logger.info("deleted from custom table successfully", {
        type: "memory.sqlite.table.delete.success",
        tableName,
        id
      });
    } catch (error) {
      this.logger.error("failed to delete from custom table", {
        type: "memory.sqlite.table.delete.failed",
        tableName,
        id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async tableExists(tableName: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `);
      const result = stmt.get(tableName);
      return result !== undefined;
    } catch (error) {
      this.logger.error("failed to check table existence", {
        type: "memory.sqlite.table.exists.failed",
        tableName,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  async dropTable(tableName: string): Promise<void> {
    // Validate table name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    // Prevent dropping core tables
    if (tableName === 'memories' || tableName === 'sandbox') {
      throw new Error(`Cannot drop core table: ${tableName}`);
    }

    const query = `DROP TABLE IF EXISTS ${tableName}`;
    
    try {
      this.db.exec(query);
      
      this.logger.info("dropped custom table successfully", {
        type: "memory.sqlite.table.drop.success",
        tableName
      });
    } catch (error) {
      this.logger.error("failed to drop custom table", {
        type: "memory.sqlite.table.drop.failed",
        tableName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}
