import Database from "better-sqlite3";
import path from "path";

import { AgentTask, Plugin, PluginResult, TableSchema } from "@maiar-ai/core";

import { SQLiteDatabase } from "./database";
import { SQLiteMemoryUploadSchema, SQLiteQuerySchema, SQLiteTableCreateSchema, SQLiteTableOperationSchema } from "./types";

export class SQLiteMemoryPlugin extends Plugin {
  private db: Database.Database;

  constructor() {
    super({
      id: "plugin-sqlite-memory",
      description: async () =>
        (
          await this.runtime.templates.render(`${this.id}/plugin_description`)
        ).trim(),
      requiredCapabilities: [],
      promptsDir: path.resolve(__dirname, "prompts")
    });

    // Get database connection instance
    this.db = SQLiteDatabase.getInstance().getDatabase();

    this.executors = [
      {
        name: "save_memory",
        description: async () =>
          (
            await this.runtime.templates.render(
              `${this.id}/save_memory_description`
            )
          ).trim(),
        fn: this.addDocument.bind(this)
      },
      {
        name: "remove_memory",
        description: async () =>
          (
            await this.runtime.templates.render(
              `${this.id}/remove_memory_description`
            )
          ).trim(),
        fn: this.removeDocument.bind(this)
      },
      {
        name: "query_memory",
        description: async () =>
          (
            await this.runtime.templates.render(
              `${this.id}/query_memory_description`
            )
          ).trim(),
        fn: this.query.bind(this)
      },
      // New table operation executors
      {
        name: "create_table",
        description: async () =>
          "Create a new custom table with specified schema for storing structured data",
        fn: this.createTable.bind(this)
      },
      {
        name: "insert_into_table",
        description: async () =>
          "Insert data into a custom table",
        fn: this.insertIntoTable.bind(this)
      },
      {
        name: "update_table_record",
        description: async () =>
          "Update a record in a custom table",
        fn: this.updateTableRecord.bind(this)
      },
      {
        name: "query_table",
        description: async () =>
          "Query data from a custom table with optional filtering and sorting",
        fn: this.queryTable.bind(this)
      },
      {
        name: "delete_from_table",
        description: async () =>
          "Delete a record from a custom table",
        fn: this.deleteFromTable.bind(this)
      },
      {
        name: "table_exists",
        description: async () =>
          "Check if a custom table exists",
        fn: this.tableExists.bind(this)
      },
      {
        name: "drop_table",
        description: async () =>
          "Drop a custom table",
        fn: this.dropTable.bind(this)
      }
    ];
  }

  private async addDocument(task: AgentTask): Promise<PluginResult> {
    const stmt = this.db.prepare(`
      INSERT INTO sandbox (id, space_id, content, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const timestamp = Date.now();
    const documentId = `doc_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    // Get data to store in database from context chain
    const uploadPrompt = await this.runtime.templates.render(
      `${this.id}/upload_document`,
      {
        context: JSON.stringify(task, null, 2)
      }
    );

    const formattedResponse = await this.runtime.getObject(
      SQLiteMemoryUploadSchema,
      uploadPrompt
    );

    // Get conversation ID from context
    const spaceId = task.space.id;
    if (!spaceId) {
      return {
        success: false,
        data: { message: "Conversation ID not available in agent context" }
      };
    }

    stmt.run(documentId, spaceId, formattedResponse.content, timestamp);

    return {
      success: true,
      data: { documentId }
    };
  }

  private async removeDocument(task: AgentTask): Promise<PluginResult> {
    // Construct query for document ids
    const queryPrompt = await this.runtime.templates.render(
      `${this.id}/query`,
      {
        context: JSON.stringify(task, null, 2),
        properties: "id"
      }
    );

    const queryFormattedResponse = await this.runtime.getObject(
      SQLiteQuerySchema,
      queryPrompt
    );
    const queryStmt = this.db.prepare(queryFormattedResponse.query);
    const queryResults = queryStmt.all() as { id: string }[];
    if (queryResults.length === 0) {
      return {
        success: false,
        data: {
          message: `No documnets found with query: ${queryFormattedResponse.query}`
        }
      };
    }

    const documentIds = queryResults.map((result) => result.id);
    const deleteStmt = this.db.prepare(`
      DELETE FROM sandbox 
      WHERE id IN (${queryResults.map(() => "?").join(",")})
    `);
    const result = deleteStmt.run(...documentIds);
    if (result.changes === 0) {
      return {
        success: false,
        data: {
          message: `Database was not altered, check query. ${queryFormattedResponse.query}. Found documents ids ${documentIds}`
        }
      };
    }

    return {
      success: true,
      data: { documentIds }
    };
  }

  private async query(task: AgentTask): Promise<PluginResult> {
    // Construct query from context
    const queryPrompt = await this.runtime.templates.render(
      `${this.id}/query`,
      {
        context: JSON.stringify(task, null, 2),
        properties: ["id", "content"]
      }
    );

    const queryFormattedResponse = await this.runtime.getObject(
      SQLiteQuerySchema,
      queryPrompt
    );
    const queryStmt = this.db.prepare(queryFormattedResponse.query);
    const results = queryStmt.all() as { id: string; content: string }[];
    return {
      success: true,
      data: { results }
    };
  }

  // New table operation methods

  private async createTable(task: AgentTask): Promise<PluginResult> {
    try {
      const createPrompt = await this.runtime.templates.render(
        `${this.id}/create_table`,
        {
          context: JSON.stringify(task, null, 2)
        }
      );

      const schemaResponse = await this.runtime.getObject(
        SQLiteTableCreateSchema,
        createPrompt
      );

      const memoryProvider = this.runtime.memoryManager.memoryProvider;
      await memoryProvider.createTable(schemaResponse as TableSchema);

      return {
        success: true,
        data: { tableName: schemaResponse.name, message: "Table created successfully" }
      };
    } catch (error) {
      return {
        success: false,
        data: { 
          message: `Failed to create table: ${error instanceof Error ? error.message : String(error)}` 
        }
      };
    }
  }

  private async insertIntoTable(task: AgentTask): Promise<PluginResult> {
    try {
      const insertPrompt = await this.runtime.templates.render(
        `${this.id}/table_operation`,
        {
          context: JSON.stringify(task, null, 2),
          operation: "insert"
        }
      );

      const operationResponse = await this.runtime.getObject(
        SQLiteTableOperationSchema,
        insertPrompt
      );

      const memoryProvider = this.runtime.memoryManager.memoryProvider;
      const id = await memoryProvider.insertIntoTable(operationResponse.tableName, operationResponse.data);

      return {
        success: true,
        data: { id, message: "Record inserted successfully" }
      };
    } catch (error) {
      return {
        success: false,
        data: { 
          message: `Failed to insert record: ${error instanceof Error ? error.message : String(error)}` 
        }
      };
    }
  }

  private async updateTableRecord(task: AgentTask): Promise<PluginResult> {
    try {
      const updatePrompt = await this.runtime.templates.render(
        `${this.id}/table_operation`,
        {
          context: JSON.stringify(task, null, 2),
          operation: "update"
        }
      );

      const operationResponse = await this.runtime.getObject(
        SQLiteTableOperationSchema,
        updatePrompt
      );

      if (!operationResponse.id) {
        return {
          success: false,
          data: { message: "Record ID is required for update operation" }
        };
      }

      const memoryProvider = this.runtime.memoryManager.memoryProvider;
      await memoryProvider.updateTableRecord(operationResponse.tableName, operationResponse.id, operationResponse.data);

      return {
        success: true,
        data: { message: "Record updated successfully" }
      };
    } catch (error) {
      return {
        success: false,
        data: { 
          message: `Failed to update record: ${error instanceof Error ? error.message : String(error)}` 
        }
      };
    }
  }

  private async queryTable(task: AgentTask): Promise<PluginResult> {
    try {
      const queryPrompt = await this.runtime.templates.render(
        `${this.id}/table_operation`,
        {
          context: JSON.stringify(task, null, 2),
          operation: "query"
        }
      );

      const operationResponse = await this.runtime.getObject(
        SQLiteTableOperationSchema,
        queryPrompt
      );

      const memoryProvider = this.runtime.memoryManager.memoryProvider;
      const results = await memoryProvider.queryTable(operationResponse.tableName, operationResponse.queryOptions);

      return {
        success: true,
        data: { results, count: results.length }
      };
    } catch (error) {
      return {
        success: false,
        data: { 
          message: `Failed to query table: ${error instanceof Error ? error.message : String(error)}` 
        }
      };
    }
  }

  private async deleteFromTable(task: AgentTask): Promise<PluginResult> {
    try {
      const deletePrompt = await this.runtime.templates.render(
        `${this.id}/table_operation`,
        {
          context: JSON.stringify(task, null, 2),
          operation: "delete"
        }
      );

      const operationResponse = await this.runtime.getObject(
        SQLiteTableOperationSchema,
        deletePrompt
      );

      if (!operationResponse.id) {
        return {
          success: false,
          data: { message: "Record ID is required for delete operation" }
        };
      }

      const memoryProvider = this.runtime.memoryManager.memoryProvider;
      await memoryProvider.deleteFromTable(operationResponse.tableName, operationResponse.id);

      return {
        success: true,
        data: { message: "Record deleted successfully" }
      };
    } catch (error) {
      return {
        success: false,
        data: { 
          message: `Failed to delete record: ${error instanceof Error ? error.message : String(error)}` 
        }
      };
    }
  }

  private async tableExists(task: AgentTask): Promise<PluginResult> {
    try {
      const existsPrompt = await this.runtime.templates.render(
        `${this.id}/table_operation`,
        {
          context: JSON.stringify(task, null, 2),
          operation: "exists"
        }
      );

      const operationResponse = await this.runtime.getObject(
        SQLiteTableOperationSchema,
        existsPrompt
      );

      const memoryProvider = this.runtime.memoryManager.memoryProvider;
      const exists = await memoryProvider.tableExists(operationResponse.tableName);

      return {
        success: true,
        data: { exists, tableName: operationResponse.tableName }
      };
    } catch (error) {
      return {
        success: false,
        data: { 
          message: `Failed to check table existence: ${error instanceof Error ? error.message : String(error)}` 
        }
      };
    }
  }

  private async dropTable(task: AgentTask): Promise<PluginResult> {
    try {
      const dropPrompt = await this.runtime.templates.render(
        `${this.id}/table_operation`,
        {
          context: JSON.stringify(task, null, 2),
          operation: "drop"
        }
      );

      const operationResponse = await this.runtime.getObject(
        SQLiteTableOperationSchema,
        dropPrompt
      );

      const memoryProvider = this.runtime.memoryManager.memoryProvider;
      await memoryProvider.dropTable(operationResponse.tableName);

      return {
        success: true,
        data: { message: "Table dropped successfully", tableName: operationResponse.tableName }
      };
    } catch (error) {
      return {
        success: false,
        data: { 
          message: `Failed to drop table: ${error instanceof Error ? error.message : String(error)}` 
        }
      };
    }
  }

  public async init(): Promise<void> {
    // Make new sandbox table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sandbox (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at BIGINT NOT NULL
      )
    `);
  }

  public async shutdown(): Promise<void> {
    this.db.close();
  }
}
