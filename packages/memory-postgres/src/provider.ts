import { Pool } from "pg";

import {
  Memory,
  MemoryProvider,
  Plugin,
  QueryMemoryOptions,
  TableSchema,
  TableColumn,
  TableQueryOptions
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
          created_at BIGINT NOT NULL,
          updated_at BIGINT,
          metadata JSONB
        );
        CREATE INDEX IF NOT EXISTS idx_space_time ON memories(space_id, created_at DESC);
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
        `INSERT INTO memories (id, space_id, trigger, context, created_at, updated_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          id,
          memory.spaceId,
          memory.trigger,
          memory.context || null,
          memory.createdAt,
          memory.updatedAt || null,
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
    if (patch.metadata !== undefined) {
      sets.push(`metadata = $${paramIndex++}`);
      params.push(JSON.stringify(patch.metadata));
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
        createdAt: row.createdAt,
        updatedAt: row.updatedAt || undefined,
        metadata: row.metadata || undefined
      }));
    } finally {
      client.release();
    }
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
    
    const client = await this.pool.connect();
    try {
      await client.query(createTableQuery);
      
      // Create indexes if specified
      if (indexes && indexes.length > 0) {
        for (const index of indexes) {
          const uniqueKeyword = index.unique ? "UNIQUE " : "";
          const indexQuery = `CREATE ${uniqueKeyword}INDEX IF NOT EXISTS ${index.name} ON ${name} (${index.columns.join(", ")})`;
          await client.query(indexQuery);
        }
      }
      
      this.logger.info("created custom table successfully", {
        type: "memory.postgres.table.create.success",
        tableName: name
      });
    } catch (error) {
      this.logger.error("failed to create custom table", {
        type: "memory.postgres.table.create.failed",
        tableName: name,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  private buildColumnDefinition(column: TableColumn): string {
    let def = `${column.name} `;
    
    // Map generic types to PostgreSQL types
    switch (column.type) {
      case 'text':
        def += 'TEXT';
        break;
      case 'integer':
        def += 'INTEGER';
        break;
      case 'bigint':
        def += 'BIGINT';
        break;
      case 'real':
        def += 'REAL';
        break;
      case 'blob':
        def += 'BYTEA';
        break;
      case 'json':
        def += 'JSONB';
        break;
      case 'boolean':
        def += 'BOOLEAN';
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
            def += ' GENERATED ALWAYS AS IDENTITY';
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
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = columns.map(col => {
      const value = dataWithId[col];
      return typeof value === 'object' && value !== null ? value : value;
    });

    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id`;
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, values);
      
      this.logger.info("inserted into custom table successfully", {
        type: "memory.postgres.table.insert.success",
        tableName,
        id
      });
      
      return id;
    } catch (error) {
      this.logger.error("failed to insert into custom table", {
        type: "memory.postgres.table.insert.failed",
        tableName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async updateTableRecord(tableName: string, id: string, data: Record<string, unknown>): Promise<void> {
    // Validate table name
    if (!(await this.tableExists(tableName))) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const keys = Object.keys(data);
    const sets = keys.map((key, i) => `${key} = $${i + 1}`);
    const values = Object.values(data);
    values.push(id);

    const query = `UPDATE ${tableName} SET ${sets.join(', ')} WHERE id = $${keys.length + 1}`;
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, values);
      
      if (result.rowCount === 0) {
        throw new Error(`No record found with id: ${id}`);
      }
      
      this.logger.info("updated custom table record successfully", {
        type: "memory.postgres.table.update.success",
        tableName,
        id
      });
    } catch (error) {
      this.logger.error("failed to update custom table record", {
        type: "memory.postgres.table.update.failed",
        tableName,
        id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
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
    let paramIndex = 1;

    // Build WHERE clause
    if (options?.where) {
      for (const [key, value] of Object.entries(options.where)) {
        conditions.push(`${key} = $${paramIndex++}`);
        params.push(value);
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
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(options.offset);
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query(query, params);
      
      this.logger.info("queried custom table successfully", {
        type: "memory.postgres.table.query.success",
        tableName,
        count: result.rows.length
      });
      
      return result.rows;
    } catch (error) {
      this.logger.error("failed to query custom table", {
        type: "memory.postgres.table.query.failed",
        tableName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async deleteFromTable(tableName: string, id: string): Promise<void> {
    // Validate table name
    if (!(await this.tableExists(tableName))) {
      throw new Error(`Table ${tableName} does not exist`);
    }

    const query = `DELETE FROM ${tableName} WHERE id = $1`;
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new Error(`No record found with id: ${id}`);
      }
      
      this.logger.info("deleted from custom table successfully", {
        type: "memory.postgres.table.delete.success",
        tableName,
        id
      });
    } catch (error) {
      this.logger.error("failed to delete from custom table", {
        type: "memory.postgres.table.delete.failed",
        tableName,
        id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }

  async tableExists(tableName: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = $1
      `, [tableName]);
      return result.rows.length > 0;
    } catch (error) {
      this.logger.error("failed to check table existence", {
        type: "memory.postgres.table.exists.failed",
        tableName,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    } finally {
      client.release();
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
    
    const client = await this.pool.connect();
    try {
      await client.query(query);
      
      this.logger.info("dropped custom table successfully", {
        type: "memory.postgres.table.drop.success",
        tableName
      });
    } catch (error) {
      this.logger.error("failed to drop custom table", {
        type: "memory.postgres.table.drop.failed",
        tableName,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      client.release();
    }
  }
}
