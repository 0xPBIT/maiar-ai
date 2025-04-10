/**
 * Application-wide configuration constants
 */

/**
 * Default URLs for various services
 */
export const DEFAULT_URLS = {
  /**
   * Default WebSocket URL for monitoring
   */
  MONITOR_WEBSOCKET: "http://localhost:3001/monitor",

  /**
   * Default HTTP URL for chat API
   */
  CHAT_API: "http://localhost:3001/message"
};

/**
 * LocalStorage keys
 */
export const STORAGE_KEYS = {
  /**
   * Storage key for the WebSocket URL
   */
  MONITOR_WEBSOCKET_URL: "maiar-monitor-websocket-url",

  /**
   * Storage key for the Chat API URL
   */
  CHAT_API_URL: "maiar-chat-api-url"
};
