/**
 * @fileoverview Configuration module for managing environment variables.
 *
 * This module provides a centralized way to access environment variables with
 * proper validation and error handling. It ensures that required variables are
 * present and provides type-safe access to configuration values.
 */

import { getGoogleApiKey, getOpenRouterApiKey, getAnthropicApiKey, getOpenAIApiKey } from './envLoader';
import logger from './logger';
import path from 'path';
import fs from 'fs';

/**
 * Application configuration interface
 */
export interface AppConfig {
  // API Keys
  googleApiKey?: string;
  openRouterApiKey?: string;
  anthropicApiKey?: string;
  openAIApiKey?: string;

  // Model configuration
  selectedModel: string;

  // Other configuration
  debug: boolean;
  contextPaths?: string[];
}

// Singleton instance of the configuration
let config: AppConfig | null = null;

/**
 * Load and validate environment variables
 * @returns Validated configuration object
 * @throws Error if required environment variables are missing
 */
function loadConfig(): AppConfig {
  // Get API keys
  const googleApiKeyResult = getGoogleApiKey();
  const openRouterApiKeyResult = getOpenRouterApiKey();
  const anthropicApiKeyResult = getAnthropicApiKey();
  const openAIApiKeyResult = getOpenAIApiKey();

  // Get selected model
  const selectedModel = process.env.AI_CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';

  // Get debug mode
  const debug = process.env.AI_CODE_REVIEW_DEBUG === 'true' || process.argv.includes('--debug');

  // Get context paths
  const contextPathsStr = process.env.AI_CODE_REVIEW_CONTEXT;
  const contextPaths = contextPathsStr ? contextPathsStr.split(',').map(p => p.trim()) : undefined;

  return {
    googleApiKey: googleApiKeyResult.apiKey,
    openRouterApiKey: openRouterApiKeyResult.apiKey,
    anthropicApiKey: anthropicApiKeyResult.apiKey,
    openAIApiKey: openAIApiKeyResult.apiKey,
    selectedModel,
    debug,
    contextPaths
  };
}

/**
 * Get the application configuration
 * @returns Application configuration
 */
export function getConfig(): AppConfig {
  if (!config) {
    try {
      config = loadConfig();
    } catch (error) {
      logger.error('Failed to load configuration:', error);
      throw error;
    }
  }

  return config;
}

/**
 * Check if any API key is available
 * @returns True if at least one API key is available
 */
export function hasAnyApiKey(): boolean {
  const { googleApiKey, openRouterApiKey, anthropicApiKey, openAIApiKey } = getConfig();
  return !!(googleApiKey || openRouterApiKey || anthropicApiKey || openAIApiKey);
}

/**
 * Get the API key for a specific provider
 * @param provider Provider name (gemini, openrouter, anthropic, openai)
 * @returns API key or undefined if not available
 */
export function getApiKeyForProvider(provider: string): string | undefined {
  const config = getConfig();

  switch (provider.toLowerCase()) {
    case 'gemini':
      return config.googleApiKey;
    case 'openrouter':
      return config.openRouterApiKey;
    case 'anthropic':
      return config.anthropicApiKey;
    case 'openai':
      return config.openAIApiKey;
    default:
      return undefined;
  }
}

/**
 * Reset the configuration (mainly for testing)
 */
export function resetConfig(): void {
  config = null;
}

/**
 * Get the path to the prompts directory
 * @returns Path to the prompts directory
 */
export function getPromptsPath(): string {
  // Try different paths to find the prompts directory
  const possiblePaths = [
    // For local development
    path.resolve('prompts'),
    // For npm package
    path.resolve(__dirname, '..', '..', 'prompts'),
    // For global installation
    path.resolve(__dirname, '..', '..', '..', 'prompts')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to the first path if none exist
  return possiblePaths[0];
}
