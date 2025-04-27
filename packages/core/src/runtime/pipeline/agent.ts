// DEV NOTE: GET RID OF THIS ENTIRE FILE OR MOVE THE CONTENTS TO SOMEWHERE ELSE

// Base context item that all items must include
export interface BaseContextItem {
  id: string; // Unique identifier for this context item
  pluginId: string; // Which plugin created this context
  action: string; // What action/executor was used
  type: string; // Type of context item for model understanding
  content: string; // Serialized content for model consumption
  timestamp: number; // When this context was added
  helpfulInstruction?: string; // Instructions for how to use this context item's data
}

// Initial user input context
export interface UserInputContext extends BaseContextItem {
  type: "user_input";
  user: string;
  rawMessage: string;
  messageHistory?: Array<{
    role: string;
    content: string;
    timestamp: number;
  }>;
}

// History context item
export interface HistoryContextItem extends BaseContextItem {
  type: "history";
  messages: Array<{
    role: string;
    content: string;
    timestamp: number;
  }>;
}

// The full context chain container
export interface AgentTask {
  contextChain: BaseContextItem[];
  conversationId?: string;
  platformContext?: {
    platform: string;
    responseHandler?: (response: unknown) => void;
    metadata?: Record<string, unknown>;
  };
}

// Helper to get the initial user input
export function getUserInput(task: AgentTask): UserInputContext | undefined {
  const firstItem = task.contextChain[0];
  return firstItem?.type === "user_input"
    ? (firstItem as UserInputContext)
    : undefined;
}
