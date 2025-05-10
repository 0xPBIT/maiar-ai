import { ZodType } from "zod";

/*
 * Capability transform entry - used to transform the input, output, or config of a capability.
 * This enables consumers of model providers and plugins to bind together disparate capabilities that
 * share similar functionality, but have different names, or input/output types or shapes.
 */
export interface CapabilityTransformEntry {
  input?: {
    plugin: ZodType<unknown>;
    provider: ZodType<unknown>;
    transform: (
      data: unknown,
      pluginSchema?: ZodType<unknown>,
      providerSchema?: ZodType<unknown>
    ) => unknown;
  };
  output?: {
    plugin: ZodType<unknown>;
    provider: ZodType<unknown>;
    transform: (
      data: unknown,
      providerSchema?: ZodType<unknown>,
      pluginSchema?: ZodType<unknown>
    ) => unknown;
  };
  config?: {
    plugin: ZodType<unknown>;
    provider: ZodType<unknown>;
    transform?: (
      cfg: unknown,
      pluginSchema?: ZodType<unknown>,
      providerSchema?: ZodType<unknown>
    ) => unknown;
  };
}

export type CapabilityAliasGroup = {
  ids: string[];
  transforms?: CapabilityTransformEntry[];
};
