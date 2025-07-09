/**
 * @fileoverview Configuration manager for centralized configuration access.
 *
 * This module provides a comprehensive and type-safe configuration management system,
 * centralizing all configuration values, eliminating hardcoded values, and providing
 * consistent access to configuration options throughout the application.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CliOptions } from '../cli/argumentParser';
import {
  type ApiProvider,
  type ApplicationConfig,
  applicationConfigSchema,
  type ConfigValue,
  type EnvSource,
  type LogLevel,
} from '../types/configuration';
import {
  getAnthropicApiKey,
  getGoogleApiKey,
  getOpenAIApiKey,
  getOpenRouterApiKey,
  loadEnvVariables,
} from './envLoader';
import logger from './logger';

/**
 * Singleton instance of the configuration
 */
let configInstance: ApplicationConfig | null = null;

/**
 * Create a configuration value with source tracking
 * @param value The configuration value
 * @param source The source of the value
 * @returns The configuration value object
 */
function createConfigValue<T>(value: T, source: EnvSource): ConfigValue<T> {
  return { value, source };
}

/**
 * Resolve a configuration value with priority order
 * @param envValue The value from environment variables
 * @param envSource The source of the environment value
 * @param cliValue The value from CLI options
 * @param defaultValue The default value to use if no others are provided
 * @returns The resolved configuration value
 */
function resolveConfigValue<T>(
  envValue: T | undefined,
  envSource: EnvSource,
  cliValue: T | undefined,
  defaultValue: T,
): ConfigValue<T> {
  if (cliValue !== undefined) {
    return createConfigValue(cliValue, 'cli_option');
  }

  if (envValue !== undefined) {
    return createConfigValue(envValue, envSource);
  }

  return createConfigValue(defaultValue, 'default_value');
}

/**
 * Get the provider from a model string
 * @param modelString The model string (e.g., "gemini:gemini-1.5-pro")
 * @returns The provider (e.g., "gemini")
 */
function getProviderFromModel(modelString: string): ApiProvider {
  const modelParts = modelString.split(':');
  if (modelParts.length === 2) {
    const provider = modelParts[0].toLowerCase();
    if (
      provider === 'gemini' ||
      provider === 'openrouter' ||
      provider === 'anthropic' ||
      provider === 'openai'
    ) {
      return provider;
    }
  }

  // For unrecognized or malformed strings, assume gemini as the default
  logger.warn(`Invalid model string format: ${modelString}. Using gemini as default provider.`);
  return 'gemini';
}

/**
 * Initialize the application configuration
 * @param cliOptions CLI options to override environment variables
 * @returns The initialized configuration
 */
function initializeConfig(cliOptions?: CliOptions): ApplicationConfig {
  // Make sure environment variables are loaded
  loadEnvVariables().catch((error) => {
    logger.warn(`Error loading environment variables: ${error.message}`);
  });

  // Retrieve API keys from environment
  const googleApiKeyResult = getGoogleApiKey();
  const openRouterApiKeyResult = getOpenRouterApiKey();
  const anthropicApiKeyResult = getAnthropicApiKey();
  const openAIApiKeyResult = getOpenAIApiKey();

  // --- API Keys ---
  const apiKeys = {
    google: googleApiKeyResult.apiKey
      ? createConfigValue(googleApiKeyResult.apiKey, googleApiKeyResult.source as EnvSource)
      : undefined,

    openRouter: openRouterApiKeyResult.apiKey
      ? createConfigValue(openRouterApiKeyResult.apiKey, openRouterApiKeyResult.source as EnvSource)
      : undefined,

    anthropic: anthropicApiKeyResult.apiKey
      ? createConfigValue(anthropicApiKeyResult.apiKey, anthropicApiKeyResult.source as EnvSource)
      : undefined,

    openai: openAIApiKeyResult.apiKey
      ? createConfigValue(openAIApiKeyResult.apiKey, openAIApiKeyResult.source as EnvSource)
      : undefined,
  };

  // --- Selected Model ---
  const selectedModelEnvVar = process.env.AI_CODE_REVIEW_MODEL;
  const selectedModelValue = resolveConfigValue(
    selectedModelEnvVar,
    'AI_CODE_REVIEW_MODEL',
    cliOptions?.model,
    'gemini:gemini-1.5-pro-latest',
  );

  // --- Model Provider ---
  const modelProvider = createConfigValue(
    getProviderFromModel(selectedModelValue.value),
    'default_value',
  );

  // --- Debug Mode ---
  const debugEnvVar = process.env.AI_CODE_REVIEW_DEBUG === 'true';
  const debugValue = resolveConfigValue(
    debugEnvVar,
    'AI_CODE_REVIEW_DEBUG',
    cliOptions?.debug,
    false,
  );

  // --- Log Level ---
  const logLevelEnvVar = process.env.AI_CODE_REVIEW_LOG_LEVEL as LogLevel | undefined;
  const logLevelValue = resolveConfigValue(
    logLevelEnvVar,
    'AI_CODE_REVIEW_LOG_LEVEL',
    cliOptions?.logLevel as LogLevel,
    'info' as LogLevel,
  );

  // --- Paths ---
  // Output directory
  const outputDirEnvVar = process.env.AI_CODE_REVIEW_OUTPUT_DIR;
  const outputDirValue = resolveConfigValue(
    outputDirEnvVar,
    'AI_CODE_REVIEW_OUTPUT_DIR',
    cliOptions?.outputDir,
    'ai-code-review-docs',
  );

  // Prompts directory
  const promptsDirValue = createConfigValue(findPromptsDirectory(), 'default_value');

  // Templates directory
  const templatesDirValue = createConfigValue(
    path.join(promptsDirValue.value, 'templates'),
    'default_value',
  );

  // Context paths
  const contextPathsEnvVar = process.env.AI_CODE_REVIEW_CONTEXT?.split(',').map((p) => p.trim());
  const contextPathsValue = contextPathsEnvVar
    ? createConfigValue(contextPathsEnvVar, 'AI_CODE_REVIEW_CONTEXT')
    : undefined;

  // --- API Endpoints ---
  const apiEndpoints = {
    gemini: createConfigValue('https://generativelanguage.googleapis.com/v1', 'default_value'),
    openRouter: createConfigValue('https://openrouter.ai/api/v1', 'default_value'),
    anthropic: createConfigValue('https://api.anthropic.com/v1/messages', 'default_value'),
    openai: createConfigValue('https://api.openai.com/v1', 'default_value'),
  };

  // --- API Versions ---
  const apiVersions = {
    gemini: createConfigValue('v1beta', 'default_value'),
    openRouter: createConfigValue('v1', 'default_value'),
    anthropic: createConfigValue('2023-06-01', 'default_value'),
    openai: createConfigValue('v1', 'default_value'),
  };

  // --- Rate Limiting ---
  const rateLimit = {
    tokensPerSecond: createConfigValue(5, 'default_value'),
    maxConcurrentRequests: createConfigValue(3, 'default_value'),
    retryDelayMs: createConfigValue(1000, 'default_value'),
    maxRetries: createConfigValue(3, 'default_value'),
  };

  // --- Token Configuration ---
  const tokens = {
    maxTokensPerRequest: createConfigValue(4096, 'default_value'),
    contextWindowSize: {
      gemini: createConfigValue(1000000, 'default_value'), // 1M tokens for Gemini models
      openrouter: createConfigValue(128000, 'default_value'), // Depends on model, using Claude Opus
      anthropic: createConfigValue(200000, 'default_value'), // 200K for Claude 3 Opus
      openai: createConfigValue(128000, 'default_value'), // GPT-4 Turbo (128K)
    },
    costPerInputToken: {
      gemini: createConfigValue(0.000007, 'default_value'), // $0.000007 per input token
      openrouter: createConfigValue(0.00001, 'default_value'), // Average depends on model
      anthropic: createConfigValue(0.00001, 'default_value'), // $0.00001 per input token for Opus
      openai: createConfigValue(0.00001, 'default_value'), // $0.00001 per input token for GPT-4 Turbo
    },
    costPerOutputToken: {
      gemini: createConfigValue(0.000021, 'default_value'), // $0.000021 per output token
      openrouter: createConfigValue(0.00003, 'default_value'), // Average depends on model
      anthropic: createConfigValue(0.00003, 'default_value'), // $0.00003 per output token for Opus
      openai: createConfigValue(0.00003, 'default_value'), // $0.00003 per output token for GPT-4 Turbo
    },
  };

  // Assemble the complete configuration
  const config: ApplicationConfig = {
    apiKeys,
    apiEndpoints,
    apiVersions,
    selectedModel: selectedModelValue,
    modelProvider,
    debug: debugValue,
    logLevel: logLevelValue,
    paths: {
      outputDir: outputDirValue,
      promptsDir: promptsDirValue,
      templatesDir: templatesDirValue,
      contextPaths: contextPathsValue,
    },
    rateLimit,
    tokens,
  };

  // Validate the configuration
  try {
    applicationConfigSchema.parse(config);
  } catch (error) {
    logger.error('Configuration validation failed:', error);
    logger.warn('Using potentially invalid configuration - some features may not work correctly');
  }

  return config;
}

/**
 * Find the prompts directory
 * @returns The path to the prompts directory
 */
function findPromptsDirectory(): string {
  // Try different paths to find the prompts directory
  const possiblePaths = [
    // For local development
    path.resolve('promptText'),
    // For npm package
    path.resolve(__dirname, '..', '..', 'promptText'),
    // For global installation
    path.resolve(__dirname, '..', '..', '..', 'promptText'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }

  // Fallback to the first path if none exist
  return possiblePaths[0];
}

/**
 * Get the application configuration
 * @param cliOptions CLI options to override environment variables
 * @returns The application configuration
 */
export function getApplicationConfig(cliOptions?: CliOptions): ApplicationConfig {
  if (!configInstance || cliOptions) {
    try {
      configInstance = initializeConfig(cliOptions);

      // Advanced debug: show config sources if debugMode is true
      if (configInstance.debug.value) {
        logger.debug('Configuration initialized. Selected values:');
        logger.debug(
          `- Model: ${configInstance.selectedModel.value} (source: ${configInstance.selectedModel.source})`,
        );
        logger.debug(
          `- Log Level: ${configInstance.logLevel.value} (source: ${configInstance.logLevel.source})`,
        );
        logger.debug(
          `- Output Dir: ${configInstance.paths.outputDir.value} (source: ${configInstance.paths.outputDir.source})`,
        );
      }
    } catch (error) {
      logger.error(
        `Failed to load configuration: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  return configInstance;
}

/**
 * Reset the configuration (mainly for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Get a specific API key
 * @param provider The API provider
 * @returns The API key or undefined if not available
 */
export function getApiKey(provider: ApiProvider): string | undefined {
  const config = getApplicationConfig();

  switch (provider) {
    case 'gemini':
      return config.apiKeys.google?.value;
    case 'openrouter':
      return config.apiKeys.openRouter?.value;
    case 'anthropic':
      return config.apiKeys.anthropic?.value;
    case 'openai':
      return config.apiKeys.openai?.value;
    default:
      return undefined;
  }
}

/**
 * Get the API endpoint for a provider
 * @param provider The API provider
 * @returns The API endpoint
 */
export function getApiEndpoint(provider: ApiProvider): string {
  const config = getApplicationConfig();

  // Ensure we're using the correct case for property names
  switch (provider) {
    case 'gemini':
      return config.apiEndpoints.gemini.value;
    case 'openrouter':
      return config.apiEndpoints.openRouter.value;
    case 'anthropic':
      return config.apiEndpoints.anthropic.value;
    case 'openai':
      return config.apiEndpoints.openai.value;
    default:
      return config.apiEndpoints.gemini.value;
  }
}

/**
 * Get the API version for a provider
 * @param provider The API provider
 * @returns The API version
 */
export function getApiVersion(provider: ApiProvider): string {
  const config = getApplicationConfig();

  // Ensure we're using the correct case for property names
  switch (provider) {
    case 'gemini':
      return config.apiVersions.gemini.value;
    case 'openrouter':
      return config.apiVersions.openRouter.value;
    case 'anthropic':
      return config.apiVersions.anthropic.value;
    case 'openai':
      return config.apiVersions.openai.value;
    default:
      return config.apiVersions.gemini.value;
  }
}

/**
 * Get the rate limit configuration
 * @returns The rate limit configuration
 */
export function getRateLimitConfig(): {
  tokensPerSecond: number;
  maxConcurrentRequests: number;
  retryDelayMs: number;
  maxRetries: number;
} {
  const config = getApplicationConfig();
  return {
    tokensPerSecond: config.rateLimit.tokensPerSecond.value,
    maxConcurrentRequests: config.rateLimit.maxConcurrentRequests.value,
    retryDelayMs: config.rateLimit.retryDelayMs.value,
    maxRetries: config.rateLimit.maxRetries.value,
  };
}

/**
 * Get token configuration for cost estimation
 * @param provider The API provider
 * @returns Token configuration
 */
export function getTokenConfig(provider: ApiProvider): {
  maxTokensPerRequest: number;
  contextWindowSize: number;
  costPerInputToken: number;
  costPerOutputToken: number;
} {
  const config = getApplicationConfig();

  // For contextWindowSize, costPerInputToken, and costPerOutputToken,
  // we need to handle the property name mismatch explicitly
  let contextWindowSize: number;
  let costPerInputToken: number;
  let costPerOutputToken: number;

  // Get tokens configuration for easier access
  const tokens = config.tokens;

  switch (provider) {
    case 'gemini':
      contextWindowSize = tokens.contextWindowSize.gemini.value;
      costPerInputToken = tokens.costPerInputToken.gemini.value;
      costPerOutputToken = tokens.costPerOutputToken.gemini.value;
      break;
    case 'openrouter':
      // Access with consistent casing (match the enum-defined provider format)
      contextWindowSize = tokens.contextWindowSize.openrouter.value;
      costPerInputToken = tokens.costPerInputToken.openrouter.value;
      costPerOutputToken = tokens.costPerOutputToken.openrouter.value;
      break;
    case 'anthropic':
      contextWindowSize = tokens.contextWindowSize.anthropic.value;
      costPerInputToken = tokens.costPerInputToken.anthropic.value;
      costPerOutputToken = tokens.costPerOutputToken.anthropic.value;
      break;
    case 'openai':
      contextWindowSize = tokens.contextWindowSize.openai.value;
      costPerInputToken = tokens.costPerInputToken.openai.value;
      costPerOutputToken = tokens.costPerOutputToken.openai.value;
      break;
    default:
      contextWindowSize = tokens.contextWindowSize.gemini.value;
      costPerInputToken = tokens.costPerInputToken.gemini.value;
      costPerOutputToken = tokens.costPerOutputToken.gemini.value;
  }

  return {
    maxTokensPerRequest: config.tokens.maxTokensPerRequest.value,
    contextWindowSize,
    costPerInputToken,
    costPerOutputToken,
  };
}

/**
 * Get paths configuration
 * @returns The paths configuration
 */
export function getPathsConfig(): {
  outputDir: string;
  promptsDir: string;
  templatesDir: string;
  contextPaths?: string[];
} {
  const config = getApplicationConfig();
  return {
    outputDir: config.paths.outputDir.value,
    promptsDir: config.paths.promptsDir.value,
    templatesDir: config.paths.templatesDir.value,
    contextPaths: config.paths.contextPaths?.value,
  };
}

/**
 * Checks if the configuration is valid for the selected model
 * @returns Object containing validation result and error message if applicable
 */
export function validateConfigForSelectedModel(): {
  valid: boolean;
  message: string;
} {
  const config = getApplicationConfig();
  const provider = config.modelProvider.value;

  // Check if the required API key is available based on the provider
  switch (provider) {
    case 'gemini':
      if (!config.apiKeys.google?.value) {
        return {
          valid: false,
          message: `Missing Google API key for model ${config.selectedModel.value}. Set AI_CODE_REVIEW_GOOGLE_API_KEY in your .env.local file.`,
        };
      }
      break;
    case 'openrouter':
      if (!config.apiKeys.openRouter?.value) {
        return {
          valid: false,
          message: `Missing OpenRouter API key for model ${config.selectedModel.value}. Set AI_CODE_REVIEW_OPENROUTER_API_KEY in your .env.local file.`,
        };
      }
      break;
    case 'anthropic':
      if (!config.apiKeys.anthropic?.value) {
        return {
          valid: false,
          message: `Missing Anthropic API key for model ${config.selectedModel.value}. Set AI_CODE_REVIEW_ANTHROPIC_API_KEY in your .env.local file.`,
        };
      }
      break;
    case 'openai':
      if (!config.apiKeys.openai?.value) {
        return {
          valid: false,
          message: `Missing OpenAI API key for model ${config.selectedModel.value}. Set AI_CODE_REVIEW_OPENAI_API_KEY in your .env.local file.`,
        };
      }
      break;
  }

  return {
    valid: true,
    message: 'Configuration is valid for the selected model',
  };
}

/**
 * Check if any API key is available
 * @returns True if at least one API key is available
 */
export function hasAnyApiKey(): boolean {
  const config = getApplicationConfig();
  return !!(
    config.apiKeys.google?.value ||
    config.apiKeys.openRouter?.value ||
    config.apiKeys.anthropic?.value ||
    config.apiKeys.openai?.value
  );
}

/**
 * Export a default configuration manager object
 */
export default {
  getApplicationConfig,
  resetConfig,
  getApiKey,
  getApiEndpoint,
  getApiVersion,
  getRateLimitConfig,
  getTokenConfig,
  getPathsConfig,
  validateConfigForSelectedModel,
  hasAnyApiKey,
};
