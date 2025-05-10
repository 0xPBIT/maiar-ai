import { Logger } from "winston";

import logger from "../../../lib/logger";
import { ModelProvider } from "../../providers/model";
import { CapabilityRegistry } from "./capability";
import { CapabilityTransformEntry } from "./capability/transform";
import { ICapabilities } from "./capability/types";

/**
 * ModelManager is responsible for managing model instances and their capabilities
 */
export class ModelManager {
  private _modelProviders: Map<string, ModelProvider>;
  private capabilityRegistry: CapabilityRegistry;
  private capabilityAliases: Map<string, string>;
  private capabilityAliasTransforms = new Map<
    string,
    {
      canonical: string;
      entries: CapabilityTransformEntry[];
    }
  >();

  public get logger(): Logger {
    return logger.child({ scope: "model.manager" });
  }

  public get modelProviders(): ModelProvider[] {
    return Array.from(this._modelProviders.values());
  }

  constructor() {
    this._modelProviders = new Map<string, ModelProvider>();
    this.capabilityRegistry = new CapabilityRegistry();
    this.capabilityAliases = new Map<string, string>();
  }

  /**
   * Register a model
   */
  public async registerModel(modelProvider: ModelProvider): Promise<void> {
    try {
      await modelProvider.init();
      this.logger.info(
        `model provider "${modelProvider.id}" initialized successfully`,
        {
          type: "model.provider.init.success",
          modelProvider: modelProvider.id
        }
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `model provider "${modelProvider.id}" initialization failed`,
        {
          type: "model.provider.init.failed",
          modelProvider: modelProvider.id,
          error: error.message
        }
      );

      throw err;
    }

    try {
      await modelProvider.checkHealth();
      this.logger.info(
        `model provider "${modelProvider.id}" health check passed`,
        {
          type: "model.provider.healthcheck.passed",
          modelProvider: modelProvider.id
        }
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `model provider "${modelProvider.id}" health check failed`,
        {
          type: "model.provider.healthcheck.failed",
          modelProvider: modelProvider.id,
          error: error.message
        }
      );

      throw err;
    }

    this.logger.info(
      `model provider "${modelProvider.id}" registered successfully`,
      {
        type: "model.provider.registered",
        modelProvider: modelProvider.id
      }
    );

    // Register all capabilities provided by the model
    const capabilities = modelProvider.getCapabilities();
    for (const capability of capabilities) {
      this.capabilityRegistry.registerCapability(
        modelProvider.id,
        capability.id
      );

      // Check if this capability already has a default model
      // If not, set this model as the default for this capability
      if (
        !this.capabilityRegistry.getDefaultModelForCapability(capability.id)
      ) {
        this.capabilityRegistry.setDefaultModelForCapability(
          capability.id,
          modelProvider.id
        );
        this.logger.debug(
          `set model provider ${modelProvider.id} as default for capability "${capability.id}"`,
          {
            type: "default.model.capability.set"
          }
        );
      }
    }

    this._modelProviders.set(modelProvider.id, modelProvider);
    this.logger.debug(
      `model provider "${modelProvider.id}" registered successfully`,
      {
        type: "model.provider.registered"
      }
    );
  }

  public async unregisterModel(modelProvider: ModelProvider): Promise<void> {
    try {
      await modelProvider.shutdown();
      this.logger.info(
        `model provider "${modelProvider.id}" shutdown successfully`,
        {
          type: "model.provider.shutdown.success"
        }
      );
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.logger.error(
        `model provider "${modelProvider.id}" shutdown failed`,
        {
          type: "model.provider.shutdown.failed",
          error: error.message
        }
      );

      throw err;
    }

    this._modelProviders.delete(modelProvider.id);
    this.logger.debug(
      `model provider "${modelProvider.id}" unregistered successfully`,
      {
        type: "model.provider.unregistered"
      }
    );
  }

  /**
   * Register a capability alias
   */
  public registerCapabilityAlias(
    alias: string,
    canonicalId: string,
    transforms: CapabilityTransformEntry[] = []
  ): void {
    if (!this.capabilityRegistry.hasCapability(canonicalId)) {
      throw new Error(`Capability ${canonicalId} not found`);
    }
    this.capabilityAliases.set(alias, canonicalId);
    if (transforms.length > 0) {
      this.capabilityAliasTransforms.set(alias, {
        canonical: canonicalId,
        entries: transforms
      });
    }
    this.logger.debug(
      `registered capability alias "${alias}" for "${canonicalId}"`,
      {
        type: "model.capability.alias.registered",
        alias,
        canonicalId,
        hasTransforms: transforms.length > 0
      }
    );
  }

  /**
   * Execute a capability with the given input
   */
  public async executeCapability<K extends keyof ICapabilities>(
    capabilityId: K,
    input: ICapabilities[K]["input"],
    config?: unknown,
    modelId?: string
  ): Promise<ICapabilities[K]["output"]> {
    // [alias-transform] begin resolve alias and transform
    let aliasMeta = this.capabilityAliasTransforms.get(capabilityId as string);

    const resolvedCapabilityId =
      aliasMeta?.canonical ||
      this.capabilityAliases.get(capabilityId as string) ||
      capabilityId;

    // If no meta was found for the alias itself, try the canonical id. This covers the
    // case where the alias == canonical (we still registered transforms keyed by the canonical id).
    if (!aliasMeta) {
      aliasMeta = this.capabilityAliasTransforms.get(
        resolvedCapabilityId as string
      );
    }
    // [alias-transform] end resolve alias and transform

    // Get the effective model to use
    const effectiveModelId =
      modelId ||
      this.capabilityRegistry.getDefaultModelForCapability(
        resolvedCapabilityId as string
      );

    if (!effectiveModelId) {
      throw new Error(
        `No model specified and no default model set for capability ${resolvedCapabilityId}`
      );
    }

    const modelProvider = this._modelProviders.get(effectiveModelId);
    if (!modelProvider) {
      throw new Error(`Unknown model: ${effectiveModelId}`);
    }

    // Try to get the capability from the model
    const capability = modelProvider.getCapability(
      resolvedCapabilityId as string
    );
    if (!capability) {
      throw new Error(
        `Capability ${resolvedCapabilityId} not found on model ${modelProvider.id}`
      );
    }

    // [alias-transform] begin schema transform logic (new grouped design)
    let entry: CapabilityTransformEntry | undefined = undefined;
    if (aliasMeta) {
      // Try to find an entry whose plugin-side schemas accept the provided data
      entry =
        aliasMeta.entries.find((e) => {
          // Check input schema match (if defined)
          if (e.input) {
            const result = e.input.plugin.safeParse(input);
            if (!result.success) return false;
          }

          // Check config schema match (if defined and config provided)
          if (e.config && config !== undefined) {
            const cfgResult = e.config.plugin.safeParse(config);
            if (!cfgResult.success) return false;
          }

          // Optionally we could verify output compatibility here, but input/config is enough
          return true;
        }) || aliasMeta.entries[0]; // Fallback to the first entry
    }
    // Input transform
    let providerInput: unknown = input;
    let providerConfig = config;
    if (entry?.input) {
      providerInput = entry.input.transform(
        input,
        entry.input.plugin,
        entry.input.provider
      );
    }
    if (entry?.config?.transform) {
      providerConfig = entry.config.transform(
        config,
        entry.config.plugin,
        entry.config.provider
      );
    }
    // Validate the config against the capability's config schema if present
    let validatedConfig = providerConfig;
    const cfgSchema = entry?.config?.provider ?? capability.config;
    if (cfgSchema && providerConfig !== undefined) {
      const parsedCfg = cfgSchema.safeParse(providerConfig);
      if (!parsedCfg.success) {
        throw new Error(
          `Invalid config for capability ${resolvedCapabilityId}: ${parsedCfg.error}`
        );
      }
      validatedConfig = parsedCfg.data;
    }
    // Validate the input against the capability's input schema
    const validatedInput = (
      entry?.input?.provider ?? capability.input
    ).safeParse(providerInput);
    if (!validatedInput.success) {
      throw new Error(
        `Invalid input for capability ${resolvedCapabilityId}: ${validatedInput.error}`
      );
    }
    const rawResult = await capability.execute(
      validatedInput.data,
      validatedConfig
    );
    const finalOutput = entry?.output
      ? entry.output.transform(
          rawResult,
          entry.output.provider,
          entry.output.plugin
        )
      : rawResult;
    return finalOutput as ICapabilities[K]["output"];
  }

  /**
   * Get all available capabilities
   */
  public getAvailableCapabilities(): string[] {
    return this.capabilityRegistry.getAllCapabilities();
  }

  /**
   * Get all models that support a capability
   */
  public getModelsWithCapability(capabilityId: string): string[] {
    const resolvedId = this.capabilityAliases.get(capabilityId) || capabilityId;
    return this.capabilityRegistry.getModelsWithCapability(resolvedId);
  }

  /**
   * Set the default model for a capability
   */
  public setDefaultModelForCapability(
    capabilityId: string,
    modelId: string
  ): void {
    const resolvedId = this.capabilityAliases.get(capabilityId) || capabilityId;
    this.capabilityRegistry.setDefaultModelForCapability(resolvedId, modelId);
  }

  /**
   * Check if any model supports a capability
   */
  public hasCapability(capabilityId: string): boolean {
    const resolvedId = this.capabilityAliases.get(capabilityId) || capabilityId;
    return this.capabilityRegistry.hasCapability(resolvedId);
  }
}
