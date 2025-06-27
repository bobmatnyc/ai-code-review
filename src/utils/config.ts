/**
 * @fileoverview Configuration module for managing environment variables.
 *
 * This module provides a centralized way to access environment variables with
 * proper validation and error handling. It ensures that required variables are
 * present and provides type-safe access to configuration values.
 *
 * Uses Zod for schema validation to ensure type safety and provide clear error messages.
 */

import {
  getGoogleApiKey,
  getOpenRouterApiKey,
  getAnthropicApiKey,
  getOpenAIApiKey
} from './envLoader';
import logger from './logger';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { CliOptions } from '../cli/argumentParser';
import { loadConfigFile, applyConfigToOptions } from './configFileManager';
import { ReviewOptions } from '../types/review';

/**
 * Zod schema for application configuration
 */
export const appConfigSchema = z.object({
  // API Keys
  googleApiKey: z.string().optional(),
  openRouterApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  openAIApiKey: z.string().optional(),

  // Model configuration
  selectedModel: z.string(),
  writerModel: z.string().optional(),

  // Other configuration
  debug: z.boolean(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error', 'none']).default('info'),
  contextPaths: z.array(z.string()).optional(),
  outputDir: z.string().default('ai-code-review-docs')
});

/**
 * Application configuration interface
 */
export type AppConfig = z.infer<typeof appConfigSchema>;

// Singleton instance of the configuration
let config: AppConfig | null = null;

/**
 * Load and validate environment variables
 * @param cliOptions Optional CLI options that override environment variables
 * @returns Validated configuration object
 * @throws Error if required environment variables are missing
 */
function loadConfig(cliOptions?: CliOptions): AppConfig {
  // Load JSON configuration if specified or if default file exists
  let jsonConfig = null;
  if (cliOptions?.config) {
    // Load from specified config file
    jsonConfig = loadConfigFile(cliOptions.config);
    if (!jsonConfig) {
      logger.error(`Failed to load configuration file: ${cliOptions.config}`);
      throw new Error(`Configuration file not found or invalid: ${cliOptions.config}`);
    }
  } else {
    // Try to load default config file (don't fail if it doesn't exist)
    jsonConfig = loadConfigFile();
  }

  // Apply JSON configuration to CLI options if JSON config was loaded
  let mergedOptions = cliOptions;
  if (jsonConfig && cliOptions) {
    // Create a base ReviewOptions object from CLI options
    const baseOptions: ReviewOptions = { ...cliOptions };
    const appliedOptions = applyConfigToOptions(jsonConfig, baseOptions);
    mergedOptions = { ...cliOptions, ...appliedOptions } as CliOptions;
  } else if (jsonConfig && !cliOptions) {
    // If no CLI options but we have JSON config, create options from JSON
    const baseOptions: ReviewOptions = { type: 'quick-fixes' }; // Provide default type
    const appliedOptions = applyConfigToOptions(jsonConfig, baseOptions);
    mergedOptions = appliedOptions as CliOptions;
  }

  // Get API keys from environment variables
  const googleApiKeyResult = getGoogleApiKey();
  const openRouterApiKeyResult = getOpenRouterApiKey();
  const anthropicApiKeyResult = getAnthropicApiKey();
  const openAIApiKeyResult = getOpenAIApiKey();

  // Override API keys with merged options if provided (support both apiKey and apiKeys)
  const googleApiKey = mergedOptions?.apiKey?.google || mergedOptions?.apiKeys?.google || googleApiKeyResult.apiKey;
  const openRouterApiKey =
    mergedOptions?.apiKey?.openrouter || mergedOptions?.apiKeys?.openrouter || openRouterApiKeyResult.apiKey;
  const anthropicApiKey =
    mergedOptions?.apiKey?.anthropic || mergedOptions?.apiKeys?.anthropic || anthropicApiKeyResult.apiKey;
  const openAIApiKey = mergedOptions?.apiKey?.openai || mergedOptions?.apiKeys?.openai || openAIApiKeyResult.apiKey;

  // Get selected model (merged options take precedence)
  const selectedModel =
    mergedOptions?.model ||
    process.env.AI_CODE_REVIEW_MODEL ||
    'gemini:gemini-2.5-pro-preview';

  // Get writer model (merged options take precedence)
  const writerModel =
    mergedOptions?.writerModel ||
    process.env.AI_CODE_REVIEW_WRITER_MODEL ||
    undefined;

  // Get debug mode
  const debug =
    mergedOptions?.debug ||
    process.env.AI_CODE_REVIEW_DEBUG === 'true' ||
    process.argv.includes('--debug');

  // Get log level (merged options take precedence)
  const logLevel = (mergedOptions?.logLevel ||
    process.env.AI_CODE_REVIEW_LOG_LEVEL ||
    'info') as 'debug' | 'info' | 'warn' | 'error' | 'none';

  // Get context paths
  const contextPathsStr = process.env.AI_CODE_REVIEW_CONTEXT;
  const contextPaths = contextPathsStr
    ? contextPathsStr.split(',').map(p => p.trim())
    : undefined;

  // Get output directory (merged options take precedence)
  const outputDir =
    mergedOptions?.outputDir ||
    process.env.AI_CODE_REVIEW_OUTPUT_DIR ||
    'ai-code-review-docs';

  // Create the configuration object
  const configObj = {
    googleApiKey,
    openRouterApiKey,
    anthropicApiKey,
    openAIApiKey,
    selectedModel,
    writerModel,
    debug,
    logLevel,
    contextPaths,
    outputDir
  };

  // Validate the configuration using Zod
  try {
    return appConfigSchema.parse(configObj);
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error('Configuration validation failed:', error.errors);
      throw new Error(
        `Configuration validation failed: ${error.errors.map(e => e.message).join(', ')}`
      );
    }
    throw error;
  }
}

/**
 * Get the application configuration
 * @param cliOptions Optional CLI options that override environment variables
 * @returns Application configuration
 */
export function getConfig(cliOptions?: CliOptions): AppConfig {
  if (!config || cliOptions) {
    try {
      config = loadConfig(cliOptions);
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
  const { googleApiKey, openRouterApiKey, anthropicApiKey, openAIApiKey } =
    getConfig();
  return !!(
    googleApiKey ||
    openRouterApiKey ||
    anthropicApiKey ||
    openAIApiKey
  );
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
 * Validate that the configuration has the required API key for the selected model
 * @returns Object containing validation result and error message if applicable
 */
export function validateConfigForSelectedModel(): {
  valid: boolean;
  message: string;
} {
  const config = getConfig();
  const [provider] = config.selectedModel.split(':');

  // Check if the provider is valid
  if (!provider) {
    return {
      valid: false,
      message: `Invalid model format: ${config.selectedModel}. Expected format: provider:model-name`
    };
  }

  // Check if the required API key is available
  switch (provider.toLowerCase()) {
    case 'gemini':
      if (!config.googleApiKey) {
        return {
          valid: false,
          message: `Missing Google API key for model ${config.selectedModel}. Set AI_CODE_REVIEW_GOOGLE_API_KEY in your .env.local file.`
        };
      }
      break;
    case 'openrouter':
      if (!config.openRouterApiKey) {
        return {
          valid: false,
          message: `Missing OpenRouter API key for model ${config.selectedModel}. Set AI_CODE_REVIEW_OPENROUTER_API_KEY in your .env.local file.`
        };
      }
      break;
    case 'anthropic':
      if (!config.anthropicApiKey) {
        return {
          valid: false,
          message: `Missing Anthropic API key for model ${config.selectedModel}. Set AI_CODE_REVIEW_ANTHROPIC_API_KEY in your .env.local file.`
        };
      }
      break;
    case 'openai':
      if (!config.openAIApiKey) {
        return {
          valid: false,
          message: `Missing OpenAI API key for model ${config.selectedModel}. Set AI_CODE_REVIEW_OPENAI_API_KEY in your .env.local file.`
        };
      }
      break;
    default:
      return {
        valid: false,
        message: `Unknown provider: ${provider}. Supported providers are: gemini, openrouter, anthropic, openai`
      };
  }

  return {
    valid: true,
    message: 'Configuration is valid for the selected model'
  };
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
