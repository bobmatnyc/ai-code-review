/**
 * @fileoverview Unified Client Factory
 * 
 * This factory creates API clients using the unified IApiClient interface,
 * replacing the complex inheritance hierarchy and wrapper classes with
 * a simple, consistent approach.
 */

import { getConfig } from '../utils/config';
import logger from '../utils/logger';
import type {
  ApiClientConfig,
  ApiClientRegistry,
  IApiClient,
  ModelSupportInfo,
} from './IApiClient';
import {
  ApiClientError,
  InitializationError,
  ModelNotSupportedError,
  parseModelName,
} from './IApiClient';

/**
 * Unified client factory that creates API clients using the IApiClient interface
 */
export class UnifiedClientFactory {
  private static registry: ApiClientRegistry = {};
  private static clientCache = new Map<string, IApiClient>();

  /**
   * Register an API client factory for a provider
   * @param provider The provider name (e.g., "openai", "anthropic")
   * @param factory The factory function to create clients
   */
  static registerProvider(provider: string, factory: (config: ApiClientConfig) => IApiClient): void {
    this.registry[provider.toLowerCase()] = factory;
    logger.debug(`Registered API client factory for provider: ${provider}`);
  }

  /**
   * Create or get a cached client for the specified model
   * @param modelName The model name (with or without provider prefix)
   * @param options Optional configuration overrides
   * @returns Promise resolving to the API client
   */
  static async createClient(
    modelName?: string,
    options?: Partial<ApiClientConfig>
  ): Promise<IApiClient> {
    const config = getConfig();
    const selectedModel = modelName || config.selectedModel || 'gemini:gemini-2.5-pro';
    
    // Clean the model name
    const cleanedModel = selectedModel.replace(/['"``]/g, '').trim();
    
    // Parse the model name to extract provider and model
    const { provider, model } = parseModelName(cleanedModel);
    
    // Create cache key
    const cacheKey = `${provider}:${model}`;
    
    // Return cached client if available
    if (this.clientCache.has(cacheKey)) {
      const cachedClient = this.clientCache.get(cacheKey)!;
      if (cachedClient.isInitialized()) {
        return cachedClient;
      }
    }

    // Get the factory for this provider
    const factory = this.registry[provider.toLowerCase()];
    if (!factory) {
      throw new ModelNotSupportedError(cleanedModel, provider);
    }

    // Create client configuration
    const clientConfig: ApiClientConfig = {
      apiKey: this.getApiKey(provider),
      modelName: model,
      provider,
      baseUrl: options?.baseUrl,
      timeout: options?.timeout || 30000,
      rateLimit: options?.rateLimit,
    };

    try {
      // Create the client
      const client = factory(clientConfig);
      
      // Verify the client supports the model
      const supportInfo = client.isModelSupported(cleanedModel);
      if (!supportInfo.isSupported) {
        throw new ModelNotSupportedError(cleanedModel, provider);
      }

      // Initialize the client
      const initialized = await client.initialize(model);
      if (!initialized) {
        throw new InitializationError(provider, 'Client initialization failed');
      }

      // Cache the client
      this.clientCache.set(cacheKey, client);
      
      logger.info(`Successfully created and initialized ${provider} client for model: ${model}`);
      return client;

    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new InitializationError(provider, errorMessage);
    }
  }

  /**
   * Get all available providers
   * @returns Array of registered provider names
   */
  static getAvailableProviders(): string[] {
    return Object.keys(this.registry);
  }

  /**
   * Check if a provider is registered
   * @param provider The provider name to check
   * @returns True if the provider is registered
   */
  static isProviderRegistered(provider: string): boolean {
    return provider.toLowerCase() in this.registry;
  }

  /**
   * Find the best client for a given model
   * @param modelName The model name to find a client for
   * @returns Promise resolving to model support information and client
   */
  static async findBestClient(modelName: string): Promise<{
    client: IApiClient;
    supportInfo: ModelSupportInfo;
  }> {
    const { provider } = parseModelName(modelName);
    
    // Try the detected provider first
    if (this.isProviderRegistered(provider)) {
      try {
        const client = await this.createClient(modelName);
        const supportInfo = client.isModelSupported(modelName);
        if (supportInfo.isSupported) {
          return { client, supportInfo };
        }
      } catch (error) {
        logger.debug(`Failed to create ${provider} client: ${error}`);
      }
    }

    // Try all registered providers as fallback
    for (const registeredProvider of this.getAvailableProviders()) {
      if (registeredProvider === provider) continue; // Already tried
      
      try {
        const fallbackModelName = `${registeredProvider}:${modelName.split(':').pop()}`;
        const client = await this.createClient(fallbackModelName);
        const supportInfo = client.isModelSupported(modelName);
        if (supportInfo.isSupported) {
          logger.info(`Using ${registeredProvider} as fallback for model: ${modelName}`);
          return { client, supportInfo };
        }
      } catch (error) {
        logger.debug(`Fallback ${registeredProvider} client failed: ${error}`);
      }
    }

    throw new ModelNotSupportedError(modelName, 'any provider');
  }

  /**
   * Clear the client cache
   */
  static clearCache(): void {
    this.clientCache.clear();
    logger.debug('Cleared API client cache');
  }

  /**
   * Clear all registered providers (useful for testing)
   */
  static clearProviders(): void {
    this.registry = {};
    this.clientCache.clear();
    logger.debug('Cleared all registered providers and cache');
  }

  /**
   * Get the appropriate API key for a provider
   * @param provider The provider name
   * @returns The API key
   * @throws Error if no API key is found
   */
  private static getApiKey(provider: string): string {
    const envVarMap: Record<string, string> = {
      openai: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      anthropic: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      gemini: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      google: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      openrouter: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      mock: 'AI_CODE_REVIEW_MOCK_API_KEY', // For testing
    };

    const envVar = envVarMap[provider.toLowerCase()];
    if (!envVar) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const apiKey = process.env[envVar];
    if (!apiKey) {
      throw new Error(`API key not found for ${provider}. Please set ${envVar} environment variable.`);
    }

    return apiKey;
  }

  /**
   * Test all available clients
   * @returns Promise resolving to test results
   */
  static async testAllClients(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const provider of this.getAvailableProviders()) {
      try {
        // Try to create a client with a default model for this provider
        const defaultModels: Record<string, string> = {
          openai: 'gpt-4',
          anthropic: 'claude-3-5-sonnet-20241022',
          gemini: 'gemini-2.5-pro',
          openrouter: 'openrouter:gpt-4',
        };

        const modelName = defaultModels[provider] || `${provider}:default`;
        const client = await this.createClient(modelName);
        results[provider] = await client.testConnection();
      } catch (error) {
        logger.debug(`Test failed for ${provider}: ${error}`);
        results[provider] = false;
      }
    }

    return results;
  }

  /**
   * Get client statistics
   * @returns Object with cache and provider statistics
   */
  static getStatistics(): {
    totalProviders: number;
    providers: Record<string, {
      totalModels: number;
      models: string[];
      error?: string;
    }>;
  } {
    const stats = {
      totalProviders: Object.keys(this.registry).length,
      providers: {} as Record<string, {
        totalModels: number;
        models: string[];
        error?: string;
      }>,
    };

    for (const [providerName, factory] of Object.entries(this.registry)) {
      try {
        // Create a test client to get model information
        const testClient = factory({
          provider: providerName,
          modelName: 'test',
          apiKey: 'test',
        });

        const supportedModels = testClient.getSupportedModels();
        stats.providers[providerName] = {
          totalModels: supportedModels.length,
          models: supportedModels,
        };
      } catch (error) {
        stats.providers[providerName] = {
          totalModels: 0,
          models: [],
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return stats;
  }

  /**
   * Get simple client statistics
   * @returns Object with cache and provider statistics
   */
  static getSimpleStatistics(): {
    cachedClients: number;
    registeredProviders: number;
    providers: string[];
  } {
    return {
      cachedClients: this.clientCache.size,
      registeredProviders: Object.keys(this.registry).length,
      providers: this.getAvailableProviders(),
    };
  }
}
