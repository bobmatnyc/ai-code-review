/**
 * @fileoverview Unified API Clients Registration
 *
 * This module registers all unified API clients with the factory
 * and provides a simple way to initialize the unified client system.
 */

import logger from '../../utils/logger';
import type { ApiClientConfig } from '../IApiClient';
import { UnifiedClientFactory } from '../UnifiedClientFactory';
import { OpenAIApiClient } from './OpenAIApiClient';

/**
 * Register all unified API clients with the factory
 */
export function registerUnifiedClients(): void {
  // Register OpenAI client
  UnifiedClientFactory.registerProvider('openai', (config: ApiClientConfig) => {
    return new OpenAIApiClient(config);
  });

  // TODO: Register other providers as they are migrated
  // UnifiedClientFactory.registerProvider('anthropic', (config: ApiClientConfig) => {
  //   return new AnthropicApiClient(config);
  // });

  // UnifiedClientFactory.registerProvider('gemini', (config: ApiClientConfig) => {
  //   return new GeminiApiClient(config);
  // });

  // UnifiedClientFactory.registerProvider('openrouter', (config: ApiClientConfig) => {
  //   return new OpenRouterApiClient(config);
  // });

  logger.info('Unified API clients registered successfully');
}

/**
 * Initialize the unified client system
 * This should be called once during application startup
 */
export function initializeUnifiedClients(): void {
  registerUnifiedClients();
  logger.info('Unified client system initialized');
}

// Export the unified clients
export { OpenAIApiClient };

export { BaseApiClient } from '../BaseApiClient';
export type { ApiClientConfig, IApiClient, ModelSupportInfo } from '../IApiClient';
// Export the factory and interfaces
export { UnifiedClientFactory } from '../UnifiedClientFactory';

/**
 * Convenience function to create a client for a specific model
 * @param modelName The model name (with or without provider prefix)
 * @returns Promise resolving to the API client
 */
export async function createUnifiedClient(modelName: string) {
  // Ensure clients are registered
  if (UnifiedClientFactory.getAvailableProviders().length === 0) {
    registerUnifiedClients();
  }

  return UnifiedClientFactory.createClient(modelName);
}

/**
 * Convenience function to get the best client for a model
 * @param modelName The model name to find a client for
 * @returns Promise resolving to the best client and support info
 */
export async function getBestUnifiedClient(modelName: string) {
  // Ensure clients are registered
  if (UnifiedClientFactory.getAvailableProviders().length === 0) {
    registerUnifiedClients();
  }

  return UnifiedClientFactory.findBestClient(modelName);
}

/**
 * Test all available unified clients
 * @returns Promise resolving to test results
 */
export async function testUnifiedClients() {
  // Ensure clients are registered
  if (UnifiedClientFactory.getAvailableProviders().length === 0) {
    registerUnifiedClients();
  }

  return UnifiedClientFactory.testAllClients();
}

/**
 * Get statistics about the unified client system
 * @returns Object with statistics
 */
export function getUnifiedClientStats() {
  return UnifiedClientFactory.getStatistics();
}
