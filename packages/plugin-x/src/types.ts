import { AgentContext } from "@maiar-ai/core";

export interface XPluginConfig {
  // OAuth2 Authentication
  client_id: string;
  client_secret?: string; // Only required for confidential clients
  callback_url: string;
  bearer_token?: string; // For app-only authentication

  // Optional configuration
  mentionsCheckIntervalMins?: number;
  loginRetries?: number;
}

// Type for the stored OAuth token
export interface XOAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

export interface XPlatformContext
  extends NonNullable<AgentContext["platformContext"]> {
  platform: string;
  responseHandler: (result: unknown) => Promise<void>;
  metadata: {
    tweetId: string;
  };
}

// Tweet posting options
export interface TweetOptions {
  text: string;
  reply_to_tweet_id?: string;
  media_ids?: string[];
  poll?: {
    options: string[];
    duration_minutes: number;
  };
  quote_tweet_id?: string;
}

export interface MediaUploadOptions {
  file: Buffer;
  media_type: string; // e.g., 'video/mp4', 'image/jpeg', 'image/gif'
  media_category: "TWEET_IMAGE" | "TWEET_GIF" | "amplify_video" | "tweet_video";
  additional_owners?: string[];
}
