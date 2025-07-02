import { MemoryProvider, TableSchema, TableQueryOptions } from "../runtime/providers/memory";

/**
 * Example demonstrating how to use the new table operations functionality
 * for storing OAuth tokens and other structured data
 */
export class TableOperationsExample {
  private memoryProvider: MemoryProvider;

  constructor(memoryProvider: MemoryProvider) {
    this.memoryProvider = memoryProvider;
  }

  /**
   * Example: Create a table for storing OAuth tokens
   */
  async createOAuthTokensTable(): Promise<void> {
    const oauthTokensSchema: TableSchema = {
      name: "oauth_tokens",
      columns: [
        {
          name: "id",
          type: "text",
          constraints: ["primary_key"]
        },
        {
          name: "user_id", 
          type: "text",
          constraints: ["not_null"]
        },
        {
          name: "provider",
          type: "text",
          constraints: ["not_null"]
        },
        {
          name: "access_token",
          type: "text",
          constraints: ["not_null"]
        },
        {
          name: "refresh_token",
          type: "text"
        },
        {
          name: "expires_at",
          type: "bigint"
        },
        {
          name: "scope",
          type: "text"
        },
        {
          name: "token_data",
          type: "json"
        },
        {
          name: "created_at",
          type: "bigint",
          constraints: ["not_null"]
        },
        {
          name: "updated_at",
          type: "bigint"
        }
      ],
      indexes: [
        {
          name: "idx_user_provider",
          columns: ["user_id", "provider"],
          unique: true
        },
        {
          name: "idx_expires_at",
          columns: ["expires_at"]
        }
      ]
    };

    await this.memoryProvider.createTable(oauthTokensSchema);
    console.log("OAuth tokens table created successfully");
  }

  /**
   * Example: Save an OAuth token to the database
   */
  async saveOAuthToken(
    userId: string,
    provider: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: number,
    scope?: string,
    additionalData?: Record<string, unknown>
  ): Promise<string> {
    const tokenData = {
      user_id: userId,
      provider,
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      scope,
      token_data: additionalData,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    const id = await this.memoryProvider.insertIntoTable("oauth_tokens", tokenData);
    console.log(`OAuth token saved with ID: ${id}`);
    return id;
  }

  /**
   * Example: Retrieve OAuth token for a user and provider
   */
  async getOAuthToken(userId: string, provider: string): Promise<Record<string, unknown> | null> {
    const queryOptions: TableQueryOptions = {
      where: {
        user_id: userId,
        provider: provider
      },
      limit: 1
    };

    const results = await this.memoryProvider.queryTable("oauth_tokens", queryOptions);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Example: Update an OAuth token (e.g., after refresh)
   */
  async updateOAuthToken(
    tokenId: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: number
  ): Promise<void> {
    const updateData = {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: expiresAt,
      updated_at: Date.now()
    };

    await this.memoryProvider.updateTableRecord("oauth_tokens", tokenId, updateData);
    console.log(`OAuth token ${tokenId} updated successfully`);
  }

  /**
   * Example: Get all tokens that are about to expire
   */
  async getExpiringTokens(bufferMinutes: number = 30): Promise<Record<string, unknown>[]> {
    const bufferTime = Date.now() + (bufferMinutes * 60 * 1000);
    
    const queryOptions: TableQueryOptions = {
      where: {
        expires_at: bufferTime
      },
      orderBy: [
        {
          column: "expires_at",
          direction: "asc"
        }
      ]
    };

    // Note: This is a simplified example. In practice, you might need to use 
    // a more complex query for "less than" comparisons
    return await this.memoryProvider.queryTable("oauth_tokens", queryOptions);
  }

  /**
   * Example: Delete an OAuth token
   */
  async deleteOAuthToken(tokenId: string): Promise<void> {
    await this.memoryProvider.deleteFromTable("oauth_tokens", tokenId);
    console.log(`OAuth token ${tokenId} deleted successfully`);
  }

  /**
   * Example: Create a custom table for plugin-specific data
   */
  async createPluginDataTable(pluginId: string): Promise<void> {
    const tableName = `plugin_${pluginId}_data`;
    
    const schema: TableSchema = {
      name: tableName,
      columns: [
        {
          name: "id",
          type: "text",
          constraints: ["primary_key"]
        },
        {
          name: "space_id",
          type: "text",
          constraints: ["not_null"]
        },
        {
          name: "key",
          type: "text",
          constraints: ["not_null"]
        },
        {
          name: "value",
          type: "json"
        },
        {
          name: "created_at",
          type: "bigint",
          constraints: ["not_null"]
        },
        {
          name: "updated_at",
          type: "bigint"
        }
      ],
      indexes: [
        {
          name: `idx_${pluginId}_space_key`,
          columns: ["space_id", "key"],
          unique: true
        }
      ]
    };

    await this.memoryProvider.createTable(schema);
    console.log(`Plugin data table ${tableName} created successfully`);
  }

  /**
   * Example: Store plugin-specific data
   */
  async storePluginData(
    pluginId: string, 
    spaceId: string, 
    key: string, 
    value: unknown
  ): Promise<string> {
    const tableName = `plugin_${pluginId}_data`;
    
    const data = {
      space_id: spaceId,
      key,
      value,
      created_at: Date.now(),
      updated_at: Date.now()
    };

    return await this.memoryProvider.insertIntoTable(tableName, data);
  }

  /**
   * Example: Retrieve plugin-specific data
   */
  async getPluginData(
    pluginId: string, 
    spaceId: string, 
    key: string
  ): Promise<unknown | null> {
    const tableName = `plugin_${pluginId}_data`;
    
    const queryOptions: TableQueryOptions = {
      where: {
        space_id: spaceId,
        key: key
      },
      limit: 1
    };

    const results = await this.memoryProvider.queryTable(tableName, queryOptions);
    return results.length > 0 ? results[0].value : null;
  }

  /**
   * Example: Runtime operation to save OAuth token that doesn't create event
   * This demonstrates the requested functionality for X route integration
   */
  async runtimeSaveOAuthToken(
    routeData: {
      userId: string;
      provider: string;
      code: string;
      // Additional route-specific data
    }
  ): Promise<{ success: boolean; tokenId?: string; error?: string }> {
    try {
      // Check if tokens table exists, create if it doesn't
      const tableExists = await this.memoryProvider.tableExists("oauth_tokens");
      if (!tableExists) {
        await this.createOAuthTokensTable();
      }

      // In a real implementation, you would exchange the code for tokens here
      // For this example, we'll simulate the token data
      const mockTokenData = {
        access_token: `access_${routeData.code}`,
        refresh_token: `refresh_${routeData.code}`,
        expires_at: Date.now() + (3600 * 1000), // 1 hour from now
        scope: "read write"
      };

      const tokenId = await this.saveOAuthToken(
        routeData.userId,
        routeData.provider,
        mockTokenData.access_token,
        mockTokenData.refresh_token,
        mockTokenData.expires_at,
        mockTokenData.scope
      );

      return { success: true, tokenId };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
}