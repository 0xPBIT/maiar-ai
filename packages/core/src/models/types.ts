/* eslint-disable @typescript-eslint/no-empty-object-type */

/**
 * This is the base interface for all capabilities.
 * Model providers and plugins will extend ICapabilities with the input and output types
 */
export interface BaseCapability {
  input: unknown;
  output: unknown;
}

/**
 * This is the base interface for all capabilities.
 * Model providers and plugins can extend this interface
 * to add their own capabilities.
 */
export interface ICapabilities {}

/**
 * This is how model providers and plugins can extend the ICapabilities interface
 * to add their own capabilities.
 *
 * For example, the core runtime requires and consumes the "text-generation" capability,
 * which takes a string input (the prompt) and returns a string output (the generated text).
 * This capability must be provided by at least one registered model for text generation
 * features to work.
 */
declare module "../models/types" {
  interface ICapabilities {
    "text-generation": {
      input: string;
      output: string;
    };
  }
}
