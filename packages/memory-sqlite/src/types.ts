import { z } from "zod";

export interface SQLiteConfig {
  dbPath: string;
}

export const SQLiteMemoryUploadSchema = z.object({
  content: z.string().describe("The response data to send back to the client")
});

export const SQLiteQuerySchema = z.object({
  query: z.string().describe("SQL query string")
});

// New schemas for table operations

export const SQLiteTableCreateSchema = z.object({
  name: z.string().describe("The name of the table to create"),
  columns: z.array(z.object({
    name: z.string().describe("Column name"),
    type: z.enum(['text', 'integer', 'real', 'blob', 'json', 'bigint', 'boolean']).describe("Column data type"),
    constraints: z.array(z.enum(['primary_key', 'not_null', 'unique', 'auto_increment'])).optional().describe("Column constraints")
  })).describe("Array of column definitions"),
  indexes: z.array(z.object({
    name: z.string().describe("Index name"),
    columns: z.array(z.string()).describe("Array of column names for the index"),
    unique: z.boolean().optional().describe("Whether the index should be unique")
  })).optional().describe("Optional indexes to create")
});

export const SQLiteTableOperationSchema = z.object({
  tableName: z.string().describe("The name of the table to operate on"),
  id: z.string().optional().describe("Record ID for update/delete operations"),
  data: z.record(z.unknown()).optional().describe("Data to insert or update"),
  queryOptions: z.object({
    where: z.record(z.unknown()).optional().describe("WHERE clause conditions"),
    orderBy: z.array(z.object({
      column: z.string().describe("Column name to order by"),
      direction: z.enum(['asc', 'desc']).describe("Sort direction")
    })).optional().describe("ORDER BY clauses"),
    limit: z.number().optional().describe("LIMIT for results"),
    offset: z.number().optional().describe("OFFSET for pagination")
  }).optional().describe("Query options for table operations")
});
