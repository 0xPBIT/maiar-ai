import {
  Response as ExpressResponse,
  NextFunction,
  RequestHandler
} from "express";

import { PluginTriggerHTTPMethod, PluginTriggerRequest } from "../managers";
import { AgentContext } from "../pipeline/agent";

/**
 * Result of a plugin execution
 */
export interface PluginResult {
  success: boolean;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
}

/**
 * Implementation of an executor for a plugin.
 */
export interface Executor {
  /**
   * Unique identifier for the executor.
   */
  name: string;

  /**
   * Human-readable description of what the executor does.
   */
  description: string;

  /**
   * Executes the plugin logic with the given agent context.
   *
   * @param {AgentContext} context - The execution context for the agent.
   * @returns {Promise<PluginResult>} A promise resolving to the result of execution.
   */
  fn: (context: AgentContext) => Promise<PluginResult> | PluginResult;
}

/**
 * Implementation of a trigger for a plugin.
 * Listens for events and creates an event to trigger the MAIAR agent
 */
export interface TriggerRoute {
  name: string;
  route: {
    path: string;
    method: PluginTriggerHTTPMethod;
    handler: (
      req: PluginTriggerRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => Promise<void>;
    middleware?: RequestHandler[];
  };
  start?: never;
}

export interface TriggerStart {
  name: string;
  start: (context: AgentContext) => Promise<void> | void;
  route?: never;
}

export type Trigger = TriggerRoute | TriggerStart;
