import {
  PipelineGenerationContext,
  PipelineEvaluationContext,
  PipelineStep,
  PipelineModification
} from "./types";

interface ConversationMessage {
  timestamp: number;
  role: string;
  content: string;
}

// Helper functions for formatting
const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toISOString();
};

const formatPluginDescriptions = (plugins: {
  availablePlugins: {
    id: string;
    name: string;
    description: string;
    executors: { name: string; description: string }[];
  }[];
}): string => {
  return plugins.availablePlugins
    .map(
      (plugin) => `Plugin: ${plugin.name} (${plugin.id})
Description: ${plugin.description}
Executors:
${plugin.executors.map((e) => `  - ${e.name}: ${e.description}`).join("\n")}
`
    )
    .join("\n\n");
};

const formatConversationHistory = (messages: ConversationMessage[]): string => {
  if (!messages || messages.length === 0) return "";

  const formattedMessages = messages
    .map(
      (msg) => `[${formatTimestamp(msg.timestamp)}]
Role: ${msg.role}
Message: ${msg.content}
---`
    )
    .join("\n\n");

  return `<conversation_history>
${formattedMessages}
</conversation_history>`;
};

const formatCurrentContext = (context: Record<string, unknown>): string => {
  const contextOrder = {
    platform: 1,
    conversation_history: 2,
    current_message: 3
  };

  return Object.entries(context)
    .map(([key, value]) => {
      if (key === "conversationHistory") {
        if (Array.isArray(value) && value.every(isConversationMessage)) {
          return formatConversationHistory(value);
        }
        return "";
      }
      if (key === "platform") return `<platform>${String(value)}</platform>`;
      if (key === "message")
        return `<current_message>${String(value)}</current_message>`;
      return `${key}: ${value}`;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const getOrder = (str: string) => {
        if (str.includes("<platform>")) return contextOrder.platform;
        if (str.includes("<conversation_history>"))
          return contextOrder.conversation_history;
        if (str.includes("<current_message>"))
          return contextOrder.current_message;
        return 99;
      };
      return getOrder(a) - getOrder(b);
    })
    .join("\n\n");
};

// Type guard for ConversationMessage
function isConversationMessage(value: unknown): value is ConversationMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "timestamp" in value &&
    typeof (value as ConversationMessage).timestamp === "number" &&
    "role" in value &&
    typeof (value as ConversationMessage).role === "string" &&
    "content" in value &&
    typeof (value as ConversationMessage).content === "string"
  );
}

// Template sections
const EXAMPLES_SECTION = `<examples>

The examples below are not meant to demonstrate specific use cases, but rather to illustrate the different ways in which the agent can interact with the world via the plugin syntax.
Do not take the exact pipeline steps as steps you must follow, come up with your own steps based on the context and the plugins available.

Example 1 - User asks for current time via terminal:
[
  {
    "pluginId": "plugin-time",
    "action": "get_current_time"
  },
  {
    "pluginId": "plugin-terminal",
    "action": "send_response"
  }
]

Example 2 - User asks to generate an image via HTTP:
[
  {
    "pluginId": "plugin-text",
    "action": "generate_text" 
  },
  {
    "pluginId": "plugin-image-generation",
    "action": "generate_image"
  },
  {
    "pluginId": "plugin-express",
    "action": "send_response"
  }
]

Example 3 - User asks for a greeting via WebSocket:
[
  {
    "pluginId": "plugin-text",
    "action": "generate_text"
  },
  {
    "pluginId": "plugin-websocket",
    "action": "send_response"
  }
]

Example 4 - User mentions the agent account on X (formerly Twitter):
[
  {
    "pluginId": "plugin-text",
    "action": "generate_text"
  },
  {
    "pluginId": "plugin-x",
    "action": "send_post"
  }
]
</examples>`;

const RULES_SECTION = `<rules>
1. Your job is to generate the NEXT steps to handle this request. The trigger event has already happened.
2. The final response MUST be sent back through the same plugin that triggered the request using its response executor (e.g. send_response)
3. Each plugin has its own response executor(s) for sending responses back to its platform
4. The response executor must be the LAST step in the pipeline
5. The response should be exactly what a user would expect to see based on their initial message:
   - If they ask for a story, the response should be just the story
   - If they ask for the time, the response should be just the time
   - If they ask for data, the response should be just that data
   - NEVER include meta-information about how the response was generated
   - NEVER mention plugins, actions, or system details in the response
   - Respond as if you were directly answering their message
6. NEVER include the same action twice in the pipeline - each action should only be called once
7. If you need data from a plugin (like the current time), get it ONCE and use that result
8. You can ONLY use the executors listed under each plugin's "Executors" section
9. If there is conversation history, use it to maintain context and provide more relevant responses
10. Make sure your response acknowledges and builds upon any previous conversation context when appropriate
11. A response executor (send_response) MUST NOT be used alone - it must be preceded by a step that generates the content to send (e.g. generate_text, get_current_time, etc.)
</rules>`;

const TASK_SECTION = `<task>
Generate a sequence of steps to handle this context. Each step should use an available plugin executor.

IMPORTANT: Return ONLY the raw JSON array. Do NOT wrap it in code blocks or add any other text.
</task>`;

const formatExecutedSteps = (
  executedSteps: PipelineEvaluationContext["executedSteps"]
): string => {
  return executedSteps
    .map(
      ({ step, result }) => `Step: ${step.pluginId}:${step.action}
Result: ${result.success ? "Success" : "Failed"}
${result.data ? `Output: ${JSON.stringify(result.data, null, 2)}` : ""}
${result.error ? `Error: ${result.error}` : ""}`
    )
    .join("\n\n");
};

const formatPipelineSteps = (steps: PipelineStep[]): string => {
  return steps.map((step) => `${step.pluginId}:${step.action}`).join("\n");
};

// Add a function to format modification history
const formatModificationHistory = (
  executedSteps: PipelineEvaluationContext["executedSteps"],
  modificationHistory: PipelineEvaluationContext["modificationHistory"]
): string => {
  const modifications: string[] = [];

  // Add modifications from history
  modificationHistory.forEach(({ step, modification, timestamp, reason }) => {
    const time = new Date(timestamp).toISOString();
    modifications.push(`- At step ${step.pluginId}:${step.action} (${time}):
  * Reason: ${reason}
  * Modified Steps: ${modification.modifiedSteps?.map((s) => `${s.pluginId}:${s.action}`).join(", ") || "none"}`);
  });

  // Add any modifications from executed steps that aren't in history
  executedSteps.forEach(({ step, result }) => {
    if (result.data && "modification" in result.data) {
      const mod = result.data.modification as PipelineModification;
      if (
        mod.shouldModify &&
        !modificationHistory.some((h) => h.modification === mod)
      ) {
        modifications.push(`- At step ${step.pluginId}:${step.action}:
  * Reason: ${mod.explanation}
  * Modified Steps: ${mod.modifiedSteps?.map((s) => `${s.pluginId}:${s.action}`).join(", ") || "none"}`);
      }
    }
  });

  return modifications.length > 0
    ? `Previous Modifications:\n${modifications.join("\n")}`
    : "No previous modifications";
};

// Update the modification rules to emphasize history awareness
const PIPELINE_MODIFICATION_RULES = `<rules>
1. You are evaluating a pipeline during execution to determine if it needs modification
2. CRITICAL: Before suggesting any modifications:
   - Review the history of previous modifications
   - Check if required steps are ALREADY present in the remaining steps
   - Check if the current pipeline ALREADY satisfies security and permission requirements
   - Only suggest modifications if the current pipeline state does NOT meet requirements
   - Do NOT suggest modifications that have already been made
   - Do NOT undo necessary modifications from previous steps
3. Consider:
   - Security and permissions based on context:
     * If a permission check fails (permissionStatus: "denied"), remove ALL actions from that plugin
     * Add appropriate context about permission requirements to the response
   - Dependencies between steps
   - Success/failure of previous steps
   - User's intent and safety
   - Current context state
   - Impact of previous modifications
4. When modifying:
   - Preserve the user's original intent where possible
   - Remove actions that require permissions the user doesn't have
   - Maintain proper step ordering
   - Ensure new steps are compatible
   - Add only necessary steps
   - Document what steps are being added and removed
5. The final step must always be a response action from the original trigger's plugin
6. Return shouldModify: false if:
   - The required steps are already present in the correct order
   - Previous modifications have already addressed the concerns
   - The current pipeline already satisfies all requirements
   - A similar modification has already been made
   - A modification with the same explanation exists in history
   - A modification affecting the same plugin/actions exists
7. IMPORTANT: Check modification history carefully:
   - Look for similar modifications by explanation
   - Look for modifications affecting the same plugins/actions
   - Consider timestamps of previous modifications
   - Avoid undoing recent security-related modifications
   - Do not modify steps that were recently modified
</rules>`;

export function generatePipelineTemplate(
  context: PipelineGenerationContext
): string {
  const pluginSection = `<plugins>\n${formatPluginDescriptions(context)}\n</plugins>`;
  const contextSection = `<context>\n${formatCurrentContext(context.currentContext)}\n</context>`;

  return [
    pluginSection,
    EXAMPLES_SECTION,
    RULES_SECTION,
    contextSection,
    TASK_SECTION
  ].join("\n\n");
}

export function generatePipelineModificationTemplate(
  context: PipelineEvaluationContext
): string {
  return `You are evaluating a pipeline during execution to determine if it needs modification.

${PIPELINE_MODIFICATION_RULES}

CRITICAL EVALUATION INSTRUCTIONS:
1. The current step (${context.currentStepIndex}) has ALREADY been executed - do not include it in modifications
2. Previous steps have already been executed and their effects applied
3. Only consider modifying REMAINING steps (steps after the current index)
4. Check the execution history to avoid suggesting duplicate modifications
5. If a required step is already present in executed steps, do NOT add it again
6. Return shouldModify: false if no NEW modifications are needed

Available Plugins:
${formatPluginDescriptions({ availablePlugins: context.availablePlugins })}

Execution State:
Original Pipeline:
${formatPipelineSteps(context.originalPipeline)}

Executed Steps:
${formatExecutedSteps(context.executedSteps)}

Remaining Steps:
${formatPipelineSteps(context.remainingSteps)}

${formatModificationHistory(context.executedSteps, context.modificationHistory)}

Current Context Chain:
${JSON.stringify(context.contextChain, null, 2)}

Task:
Evaluate if the remaining pipeline steps need to be modified based on the current state.
IMPORTANT: Review the previous modifications to avoid duplicating changes or undoing necessary modifications.
If modification is needed, provide the new sequence of steps that should replace the remaining steps.

The modification steps available to you are adding new steps, removing steps, or reordering steps.
You do not have the ability to modify the previous steps.
You are not concerned with modifying what the steps do internally, only the order of the steps.
You can add, remove, or reorder steps as they are needed based on the data you have available.

Return a JSON object with:
- shouldModify: boolean indicating if modification is needed
- explanation: string explaining why modification is/isn't needed (reference previous modifications if relevant)
- modifiedSteps: array of new steps (only if shouldModify is true)

IMPORTANT: Return ONLY the raw JSON object. Do NOT wrap it in code blocks or add any other text.`;
}
