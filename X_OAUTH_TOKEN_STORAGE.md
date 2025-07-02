# X Plugin OAuth Token Storage

This document describes the OAuth token storage functionality implemented in the X plugin using the runtime's table operations. This enables storing and managing OAuth tokens for multiple users without creating events.

## Overview

The X plugin now supports multi-user OAuth token storage through:

- **Automatic table creation**: Creates `x_oauth_tokens` table during plugin initialization
- **Route triggers**: HTTP endpoints for OAuth callback handling and token retrieval
- **Runtime table operations**: Direct use of memory provider table functionality
- **Multi-user support**: Store and retrieve tokens for different users

## Implementation Details

### Table Schema

The `x_oauth_tokens` table is automatically created with the following schema:

```sql
CREATE TABLE x_oauth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at BIGINT,
  scope TEXT,
  token_data JSON,
  created_at BIGINT NOT NULL,
  updated_at BIGINT
);

-- Indexes
CREATE UNIQUE INDEX idx_user_provider ON x_oauth_tokens(user_id, provider);
CREATE INDEX idx_expires_at ON x_oauth_tokens(expires_at);
```

### Route Endpoints

#### OAuth Callback Handler
- **Path**: `POST /x/oauth/callback`
- **Purpose**: Handles OAuth authorization callbacks and stores tokens
- **Body Parameters**:
  - `code` (required): Authorization code from OAuth provider
  - `user_id` (required): Unique identifier for the user
  - `state` (optional): OAuth state parameter for security

**Example Request**:
```bash
curl -X POST http://localhost:3000/x/oauth/callback \
  -H "Content-Type: application/json" \
  -d '{
    "code": "abc123def456",
    "user_id": "user_12345",
    "state": "random_state_value"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "message": "OAuth token stored successfully",
  "tokenId": "token_uuid_here"
}
```

#### Token Retrieval Handler
- **Path**: `GET /x/oauth/token/:userId`
- **Purpose**: Retrieves stored OAuth token for a specific user
- **Parameters**:
  - `userId`: User ID from URL path

**Example Request**:
```bash
curl http://localhost:3000/x/oauth/token/user_12345
```

**Example Response**:
```json
{
  "success": true,
  "token": {
    "id": "token_uuid_here",
    "user_id": "user_12345",
    "provider": "x",
    "scope": "tweet.read tweet.write users.read",
    "expires_at": 1703980800000,
    "created_at": 1703894400000,
    "updated_at": 1703894400000,
    "is_expired": false
  }
}
```

### Plugin Methods

The X plugin provides the following methods for programmatic token management:

#### `getUserOAuthToken(userId: string)`
Retrieves OAuth token for a specific user.

```typescript
const xPlugin = new XPlugin(config);
const token = await xPlugin.getUserOAuthToken("user_12345");

if (token) {
  console.log("Access Token:", token.access_token);
  console.log("Expires At:", new Date(token.expires_at));
} else {
  console.log("No valid token found for user");
}
```

#### `storeUserOAuthToken(userId: string, tokenData: TokenData)`
Stores or updates OAuth token for a specific user.

```typescript
const tokenId = await xPlugin.storeUserOAuthToken("user_12345", {
  access_token: "ya29.abc123...",
  refresh_token: "1//04def567...",
  expires_at: Date.now() + 3600000, // 1 hour from now
  scope: "tweet.read tweet.write users.read"
});

console.log("Token stored with ID:", tokenId);
```

## Usage Examples

### OAuth Flow Integration

```typescript
// In an OAuth callback route handler
async function handleOAuthCallback(req, res) {
  const { code, state } = req.query;
  const userId = req.user.id; // from your auth middleware
  
  try {
    // Exchange code for tokens (implement based on X API docs)
    const tokenResponse = await exchangeCodeForTokens(code);
    
    // Store tokens using the X plugin
    const tokenId = await xPlugin.storeUserOAuthToken(userId, {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      expires_at: Date.now() + (tokenResponse.expires_in * 1000),
      scope: tokenResponse.scope
    });
    
    res.json({ success: true, tokenId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

### Making Authenticated API Calls

```typescript
async function postTweetForUser(userId: string, tweetText: string) {
  // Get user's stored token
  const token = await xPlugin.getUserOAuthToken(userId);
  
  if (!token) {
    throw new Error("User not authenticated with X");
  }
  
  // Use token to make API call
  const response = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: tweetText })
  });
  
  if (!response.ok) {
    throw new Error(`X API error: ${response.status}`);
  }
  
  return response.json();
}
```

### Token Refresh Implementation

```typescript
async function refreshUserToken(userId: string) {
  const token = await xPlugin.getUserOAuthToken(userId);
  
  if (!token || !token.refresh_token) {
    throw new Error("No refresh token available");
  }
  
  // Exchange refresh token for new access token
  const refreshResponse = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: token.refresh_token
    })
  });
  
  const newTokenData = await refreshResponse.json();
  
  // Update stored token
  await xPlugin.storeUserOAuthToken(userId, {
    access_token: newTokenData.access_token,
    refresh_token: newTokenData.refresh_token || token.refresh_token,
    expires_at: Date.now() + (newTokenData.expires_in * 1000),
    scope: newTokenData.scope || token.scope
  });
  
  return newTokenData.access_token;
}
```

## Configuration

To enable OAuth token storage in your X plugin configuration:

```typescript
import { XPlugin, oauthTokenStorageTrigger, oauthTokenRetrievalTrigger } from "@maiar-ai/plugin-x";

const xPlugin = new XPlugin({
  client_id: "your_client_id",
  client_secret: "your_client_secret",
  callback_url: "http://localhost:3000/x/oauth/callback",
  
  // OAuth triggers are included by default, but you can customize:
  triggerFactories: [
    oauthTokenStorageTrigger,
    oauthTokenRetrievalTrigger,
    // ... other triggers
  ]
});
```

## Database Support

The OAuth token storage works with both SQLite and PostgreSQL memory providers:

### SQLite
- JSON data stored as TEXT and automatically serialized/deserialized
- Unique constraints enforced at database level
- Automatic UUID generation for record IDs

### PostgreSQL
- JSON data stored as JSONB for better performance
- Native support for JSON querying and indexing
- Connection pooling for concurrent access

## Security Considerations

1. **Token Encryption**: Consider encrypting access tokens and refresh tokens at rest
2. **Secure Transport**: Always use HTTPS for OAuth callbacks
3. **Token Expiration**: Implement automatic token refresh before expiration
4. **Access Control**: Validate user permissions before token operations
5. **Rate Limiting**: Implement rate limiting on OAuth endpoints
6. **Audit Logging**: Log all token operations for security monitoring

## Error Handling

The implementation includes comprehensive error handling:

```typescript
// Token storage errors
try {
  const tokenId = await xPlugin.storeUserOAuthToken(userId, tokenData);
} catch (error) {
  if (error.message.includes("user_id")) {
    // Handle duplicate user constraint violation
  } else if (error.message.includes("database")) {
    // Handle database connection issues
  }
}

// Token retrieval errors
const token = await xPlugin.getUserOAuthToken(userId);
if (!token) {
  // User has no stored tokens or token is expired
  // Redirect to OAuth flow
}
```

## Monitoring and Maintenance

### Health Checks
Monitor token table health and performance:

```typescript
// Check table exists
const tableExists = await runtime.tableExists("x_oauth_tokens");

// Count stored tokens
const tokenCount = await runtime.queryTable("x_oauth_tokens", {
  // Count query implementation
});

// Find expiring tokens
const expiringTokens = await runtime.queryTable("x_oauth_tokens", {
  where: {
    // Query for tokens expiring in next 24 hours
  }
});
```

### Cleanup Tasks
Implement periodic cleanup of expired tokens:

```typescript
async function cleanupExpiredTokens() {
  const expiredTokens = await runtime.queryTable("x_oauth_tokens", {
    where: {
      expires_at: { $lt: Date.now() } // Pseudocode - implement based on provider
    }
  });
  
  for (const token of expiredTokens) {
    await runtime.deleteFromTable("x_oauth_tokens", token.id);
  }
  
  console.log(`Cleaned up ${expiredTokens.length} expired tokens`);
}
```

This implementation provides a robust foundation for managing OAuth tokens across multiple users while leveraging the memory provider's table operations for reliable, scalable storage.