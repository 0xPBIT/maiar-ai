# Memory Provider Table Operations

This document describes the new table operations functionality added to the Maiar AI memory providers, which allows clients to create and manage custom tables from the plugin side.

## Overview

The memory provider has been enhanced with the following capabilities:

- **Client-side table creation**: Create custom tables with specified schemas
- **Runtime-level operations**: Perform table operations that can be used in plugins without creating events
- **Cross-database compatibility**: Works with both SQLite and PostgreSQL providers
- **Flexible data storage**: Store structured data like OAuth tokens, plugin-specific data, and more

## New Interfaces

### TableColumn
Defines the structure of a table column:

```typescript
interface TableColumn {
  name: string;
  type: 'text' | 'integer' | 'real' | 'blob' | 'json' | 'bigint' | 'boolean';
  constraints?: Array<'primary_key' | 'not_null' | 'unique' | 'auto_increment'>;
}
```

### TableSchema
Defines the complete table structure:

```typescript
interface TableSchema {
  name: string;
  columns: TableColumn[];
  indexes?: Array<{
    name: string;
    columns: string[];
    unique?: boolean;
  }>;
}
```

### TableQueryOptions
Defines query parameters for table operations:

```typescript
interface TableQueryOptions {
  where?: Record<string, unknown>;
  orderBy?: Array<{
    column: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
  offset?: number;
}
```

## New MemoryProvider Methods

### Table Management

#### `createTable(schema: TableSchema): Promise<void>`
Creates a new custom table with the specified schema.

#### `tableExists(tableName: string): Promise<boolean>`
Checks if a table exists in the database.

#### `dropTable(tableName: string): Promise<void>`
Drops a custom table (core tables like 'memories' and 'sandbox' are protected).

### Data Operations

#### `insertIntoTable(tableName: string, data: Record<string, unknown>): Promise<string>`
Inserts data into a custom table and returns the generated ID.

#### `updateTableRecord(tableName: string, id: string, data: Record<string, unknown>): Promise<void>`
Updates a record in a custom table by ID.

#### `queryTable(tableName: string, options?: TableQueryOptions): Promise<Record<string, unknown>[]>`
Queries data from a custom table with optional filtering and sorting.

#### `deleteFromTable(tableName: string, id: string): Promise<void>`
Deletes a record from a custom table by ID.

## Plugin Executors

The memory plugins now expose the following executors for runtime operations:

- `create_table`: Create a new custom table
- `insert_into_table`: Insert data into a table
- `update_table_record`: Update a record in a table
- `query_table`: Query data from a table
- `delete_from_table`: Delete a record from a table
- `table_exists`: Check if a table exists
- `drop_table`: Drop a table

## Usage Examples

### Example 1: OAuth Token Storage

This example demonstrates creating a table for OAuth tokens and performing operations on it:

```typescript
import { MemoryProvider, TableSchema } from "@maiar-ai/core";

// Create OAuth tokens table
const oauthTokensSchema: TableSchema = {
  name: "oauth_tokens",
  columns: [
    { name: "id", type: "text", constraints: ["primary_key"] },
    { name: "user_id", type: "text", constraints: ["not_null"] },
    { name: "provider", type: "text", constraints: ["not_null"] },
    { name: "access_token", type: "text", constraints: ["not_null"] },
    { name: "refresh_token", type: "text" },
    { name: "expires_at", type: "bigint" },
    { name: "scope", type: "text" },
    { name: "token_data", type: "json" },
    { name: "created_at", type: "bigint", constraints: ["not_null"] },
    { name: "updated_at", type: "bigint" }
  ],
  indexes: [
    {
      name: "idx_user_provider",
      columns: ["user_id", "provider"],
      unique: true
    }
  ]
};

await memoryProvider.createTable(oauthTokensSchema);

// Save an OAuth token
const tokenId = await memoryProvider.insertIntoTable("oauth_tokens", {
  user_id: "user123",
  provider: "twitter",
  access_token: "token_xyz",
  refresh_token: "refresh_abc",
  expires_at: Date.now() + 3600000,
  scope: "read write",
  created_at: Date.now(),
  updated_at: Date.now()
});

// Retrieve a token
const tokens = await memoryProvider.queryTable("oauth_tokens", {
  where: {
    user_id: "user123",
    provider: "twitter"
  },
  limit: 1
});
```

### Example 2: Plugin-Specific Data Storage

```typescript
// Create a plugin-specific table
const pluginSchema: TableSchema = {
  name: "plugin_x_data",
  columns: [
    { name: "id", type: "text", constraints: ["primary_key"] },
    { name: "space_id", type: "text", constraints: ["not_null"] },
    { name: "key", type: "text", constraints: ["not_null"] },
    { name: "value", type: "json" },
    { name: "created_at", type: "bigint", constraints: ["not_null"] }
  ],
  indexes: [
    {
      name: "idx_space_key",
      columns: ["space_id", "key"],
      unique: true
    }
  ]
};

await memoryProvider.createTable(pluginSchema);

// Store plugin data
await memoryProvider.insertIntoTable("plugin_x_data", {
  space_id: "conversation_123",
  key: "user_preferences",
  value: { theme: "dark", notifications: true },
  created_at: Date.now()
});
```

### Example 3: Runtime Operation for X Route (No Event Creation)

This demonstrates the specific use case mentioned in the requirements:

```typescript
// In an X route handler
async function handleOAuthCallback(req: Request, res: Response) {
  const { code, userId } = req.body;
  
  try {
    // Check if tokens table exists, create if needed
    const tableExists = await memoryProvider.tableExists("oauth_tokens");
    if (!tableExists) {
      await createOAuthTokensTable(); // Helper function
    }
    
    // Exchange code for tokens (implementation specific to OAuth provider)
    const tokenResponse = await exchangeCodeForTokens(code);
    
    // Save tokens without creating events
    const tokenId = await memoryProvider.insertIntoTable("oauth_tokens", {
      user_id: userId,
      provider: "x_platform",
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: Date.now() + (tokenResponse.expires_in * 1000),
      scope: tokenResponse.scope,
      created_at: Date.now(),
      updated_at: Date.now()
    });
    
    res.json({ success: true, tokenId });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
```

## Database-Specific Considerations

### SQLite
- Column types are mapped to SQLite native types
- JSON data is stored as TEXT and automatically serialized/deserialized
- Boolean values are stored as INTEGER (0/1)
- AUTO_INCREMENT uses SQLite's AUTOINCREMENT keyword

### PostgreSQL
- Column types are mapped to PostgreSQL native types
- JSON data uses JSONB for better performance
- Boolean values use native BOOLEAN type
- AUTO_INCREMENT uses GENERATED ALWAYS AS IDENTITY

## Security Considerations

1. **Table Name Validation**: Table names are validated using regex pattern `^[a-zA-Z_][a-zA-Z0-9_]*$`
2. **Core Table Protection**: System tables ('memories', 'sandbox') cannot be dropped
3. **SQL Injection Prevention**: All queries use parameterized statements
4. **Data Sanitization**: JSON data is properly escaped and validated

## Error Handling

All table operations include comprehensive error handling:

- **Table Not Found**: Operations on non-existent tables throw descriptive errors
- **Constraint Violations**: Primary key, unique constraints, and NOT NULL violations are caught
- **Invalid Data Types**: Type mismatches are detected and reported
- **Connection Issues**: Database connection problems are handled gracefully

## Performance Considerations

1. **Indexes**: Create appropriate indexes for frequently queried columns
2. **Batch Operations**: For bulk inserts, consider batching operations
3. **Connection Pooling**: PostgreSQL provider uses connection pooling for better performance
4. **Query Optimization**: Use specific WHERE clauses and LIMIT pagination for large datasets

## Migration Strategy

For existing applications, the table operations are:

- **Backward Compatible**: Existing memory operations continue to work unchanged
- **Opt-in**: New table operations are only available when explicitly used
- **Non-breaking**: No changes to existing APIs or interfaces

## Testing

Example test cases for the new functionality:

```typescript
describe('Table Operations', () => {
  test('should create table with schema', async () => {
    const schema: TableSchema = {
      name: 'test_table',
      columns: [
        { name: 'id', type: 'text', constraints: ['primary_key'] },
        { name: 'data', type: 'json' }
      ]
    };
    
    await memoryProvider.createTable(schema);
    const exists = await memoryProvider.tableExists('test_table');
    expect(exists).toBe(true);
  });
  
  test('should insert and query data', async () => {
    const id = await memoryProvider.insertIntoTable('test_table', {
      data: { key: 'value' }
    });
    
    const results = await memoryProvider.queryTable('test_table', {
      where: { id }
    });
    
    expect(results).toHaveLength(1);
    expect(results[0].data).toEqual({ key: 'value' });
  });
});
```

This new functionality provides a powerful and flexible way to store structured data in Maiar AI applications while maintaining the simplicity and reliability of the existing memory provider system.