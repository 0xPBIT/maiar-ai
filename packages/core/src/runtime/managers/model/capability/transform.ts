import { ZodType } from "zod";

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

export type CapabilityAliasGroup =
  | string[]
  | { ids: string[]; transforms?: CapabilityTransformEntry[] };
