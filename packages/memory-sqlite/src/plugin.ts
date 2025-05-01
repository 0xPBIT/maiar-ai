import Database from "better-sqlite3";

import { AgentTask, Plugin, PluginResult } from "@maiar-ai/core";

import { SQLiteDatabase } from "./database";
import {
  generateQueryTemplate,
  generateUploadDocumentTemplate
} from "./templates";
import { SQLiteMemoryUploadSchema, SQLiteQuerySchema } from "./types";

export class SQLiteMemoryPlugin extends Plugin {
  private db: Database.Database;

  constructor() {
    super({
      id: "plugin-sqlite-memory",
      name: "SQLite Memory Plugin",
      description:
        "These are the tools you use to save, remove, and query information from the database. You should use this for planning long term goals, recalling information, facts, opinions you have learned, etc.",
      requiredCapabilities: []
    });

    // Get database connection instance
    this.db = SQLiteDatabase.getInstance().getDatabase();

    this.executors = [
      {
        name: "save_memory",
        description:
          "You should invoke this executor when you want to save a piece of information you might want to recall later",
        fn: this.addDocument.bind(this)
      },
      {
        name: "remove_memory",
        description:
          "You should invoke this executor when you want to remove a piece of information from the database",
        fn: this.removeDocument.bind(this)
      },
      {
        name: "query_memory",
        description:
          "You should invoke this executor when you want to query the database for information that you saved earlier. This could be useful for recalling information from a previous conversation, or goals you might have set for yourself.",
        fn: this.query.bind(this)
      }
    ];
  }

  private async addDocument(task: AgentTask): Promise<PluginResult> {
    const stmt = this.db.prepare(`
      INSERT INTO sandbox (id, space_id, content, timestamp)
      VALUES (?, ?, ?, ?)
    `);

    const timestamp = Date.now();
    const documentId = `doc_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;

    // Get data to store in database from context chain
    const formattedResponse = await this.runtime.getObject(
      SQLiteMemoryUploadSchema,
      generateUploadDocumentTemplate(JSON.stringify(task)),
      { temperature: 0.2 }
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
    const queryFormattedResponse = await this.runtime.getObject(
      SQLiteQuerySchema,
      generateQueryTemplate(JSON.stringify(task)),
      { temperature: 0.2 }
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
    const queryFormattedResponse = await this.runtime.getObject(
      SQLiteQuerySchema,
      generateQueryTemplate(JSON.stringify(task), ["id", "content"]),
      { temperature: 0.2 }
    );
    const queryStmt = this.db.prepare(queryFormattedResponse.query);
    const results = queryStmt.all() as { id: string; content: string }[];
    return {
      success: true,
      data: { results }
    };
  }

  public async init(): Promise<void> {
    // Make new sandbox table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sandbox (
        id TEXT PRIMARY KEY,
        space_id TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp BIGINT NOT NULL
      )
    `);
  }

  public async shutdown(): Promise<void> {
    this.db.close();
  }
}
