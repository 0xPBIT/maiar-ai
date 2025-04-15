import { Request, RequestHandler, Response } from "express";

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
 * Listens for HTTP requests OR process triggers, then creates an event invoke the MAIAR agent.
 */
export interface TriggerRoute {
  /**
   * Unique identifier for the trigger.
   */
  name: string;

  /**
   * HTTP route configuration for the trigger.
   */
  route: {
    /**
     * The path of the route.
     */
    path: string;

    /**
     * The handler for the route.
     */
    handler: (req: Request, res: Response) => Promise<void> | void;

    /**
     * Optional middleware to apply before the handler.
     * Defaults to express.raw if not provided.
     */
    middleware?: RequestHandler | RequestHandler[];
  };

  /**
   * Start is of type never because it is not used in the TriggerRoute type.
   */
  start?: never;
}

export interface TriggerStart {
  /**
   * Unique identifier for the trigger.
   */
  name: string;

  /**
   * The start function for the trigger.
   */
  start: (context: AgentContext) => Promise<void> | void;

  /**
   * Route is of type never because it is not used in the TriggerStart type.
   */
  route?: never;
}

export type Trigger = TriggerRoute | TriggerStart;
