/**
 * @fileoverview Configuration module for managing environment variables.
 *
 * This module provides a centralized way to access environment variables with
 * proper validation and error handling. It ensures that required variables are
 * present and provides type-safe access to configuration values.
 *
 * Uses Zod for schema validation to ensure type safety and provide clear error messages.
 *
 * @deprecated This module is being replaced by unifiedConfig.ts for better maintainability.
 * New code should use getUnifiedConfig() from './unifiedConfig' instead.
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
// Import the new unified configuration system
import { getUnifiedConfig } from './unifiedConfig';

/**
 * Configuration error result
 */
export interface ConfigErrorResult {
  success: false;
  error: string;
  suggestions: string[];
  details?: string;
}

/**
 * Configuration success result
 */
export interface ConfigSuccessResult {
  success: true;
  config: AppConfig;
}

/**
 * Configuration result type
 */
export type ConfigResult = ConfigSuccessResult | ConfigErrorResult;

/**
 * Display user-friendly configuration error
 * @param result Configuration error result
 */
export function displayConfigError(result: ConfigErrorResult): void {
  console.log('\n🚨 Configuration Error');
  console.log('═'.repeat(50));
  console.log(`\n❌ ${result.error}`);

  if (result.details) {
    console.log(`\n📋 Details: ${result.details}`);
  }

  console.log('\n💡 How to fix this:');
  result.suggestions.forEach(suggestion => {
    console.log(`   ${suggestion}`);
  });

  console.log('\n📚 Additional help:');
  console.log('   • Run with --debug for detailed error information');
  console.log('   • Check the documentation for configuration examples');
  console.log('   • Use ai-code-review generate-config to create a sample config file');
  console.log('');
}

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
 * Build configuration object from various sources
 * @param cliOptions Optional CLI options
 * @returns Configuration object ready for validation
 */
function buildConfigObject(cliOptions?: CliOptions) {
  // Load JSON configuration if specified or if default file exists
  let jsonConfig = null;
  if (cliOptions?.config) {
    // Load from specified config file
    jsonConfig = loadConfigFile(cliOptions.config);
    if (!jsonConfig) {
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
    process.env.AI_CODE_REVIEW_LOG_LEVEL?.toLowerCase() ||
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

  return {
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
}

/**
 * Load and validate environment variables
 * @param cliOptions Optional CLI options that override environment variables
 * @returns Validated configuration object
 * @throws Error if required environment variables are missing
 */
function loadConfig(cliOptions?: CliOptions): AppConfig {
  // Build configuration object
  const configObj = buildConfigObject(cliOptions);

  // Validate the configuration using Zod
  try {
    return appConfigSchema.parse(configObj);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Log configuration validation errors
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
 * Load configuration safely with improved error handling
 * @param cliOptions Optional CLI options
 * @returns Configuration result with success/error status
 */
export function loadConfigSafe(cliOptions?: CliOptions): ConfigResult {
  try {
    // Convert CLI options to unified config format
    const unifiedCliOptions = cliOptions ? {
      model: cliOptions.model,
      writerModel: cliOptions.writerModel,
      outputDir: cliOptions.outputDir,
      outputFormat: cliOptions.output as 'markdown' | 'json' | undefined,
      debug: cliOptions.debug,
      logLevel: cliOptions.logLevel as 'debug' | 'info' | 'warn' | 'error' | 'none' | undefined,
      interactive: cliOptions.interactive,
      includeTests: cliOptions.includeTests,
      includeProjectDocs: cliOptions.includeProjectDocs,
      includeDependencyAnalysis: cliOptions.includeDependencyAnalysis,
      enableSemanticChunking: cliOptions.enableSemanticChunking,
      config: cliOptions.config
    } : undefined;

    // Try the new unified configuration system first
    const unifiedConfig = getUnifiedConfig(unifiedCliOptions);

    // Convert to legacy format for backward compatibility
    const legacyConfig: AppConfig = {
      googleApiKey: unifiedConfig.googleApiKey,
      openRouterApiKey: unifiedConfig.openRouterApiKey,
      anthropicApiKey: unifiedConfig.anthropicApiKey,
      openAIApiKey: unifiedConfig.openAIApiKey,
      selectedModel: unifiedConfig.model,
      writerModel: unifiedConfig.writerModel,
      debug: unifiedConfig.debug,
      logLevel: unifiedConfig.logLevel,
      contextPaths: unifiedConfig.contextPaths,
      outputDir: unifiedConfig.outputDir
    };

    return {
      success: true,
      config: legacyConfig
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Provide helpful suggestions based on common configuration errors
    const suggestions: string[] = [];

    if (errorMessage.includes('API key')) {
      suggestions.push('Set at least one API key using AI_CODE_REVIEW_*_API_KEY environment variables');
      suggestions.push('Check your .env.local file for correct API key format');
    }

    if (errorMessage.includes('model')) {
      suggestions.push('Set AI_CODE_REVIEW_MODEL environment variable (e.g., "gemini:gemini-1.5-pro")');
      suggestions.push('Ensure the model format is "provider:model-name"');
    }

    if (errorMessage.includes('validation')) {
      suggestions.push('Check your configuration file syntax (.ai-code-review.yaml)');
      suggestions.push('Verify all required fields are present and correctly formatted');
    }

    return {
      success: false,
      error: errorMessage,
      suggestions,
      details: error instanceof Error ? error.stack : undefined
    };
  }
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
