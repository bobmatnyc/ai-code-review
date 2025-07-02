/**
 * @fileoverview Centralized configuration type definitions.
 *
 * This module defines the types for configuration options used throughout the application.
 * It provides a type-safe way to define, access, and validate configuration settings.
 */

import { z } from 'zod';

/**
 * Environment source for a configuration value
 */
export type EnvSource =
  // Primary environment variables
  | 'AI_CODE_REVIEW_GOOGLE_API_KEY'
  | 'AI_CODE_REVIEW_OPENROUTER_API_KEY'
  | 'AI_CODE_REVIEW_ANTHROPIC_API_KEY'
  | 'AI_CODE_REVIEW_OPENAI_API_KEY'
  | 'AI_CODE_REVIEW_MODEL'
  | 'AI_CODE_REVIEW_WRITER_MODEL'
  | 'AI_CODE_REVIEW_LOG_LEVEL'
  | 'AI_CODE_REVIEW_OUTPUT_DIR'
  | 'AI_CODE_REVIEW_CONTEXT'
  | 'AI_CODE_REVIEW_DIR'
  | 'AI_CODE_REVIEW_DEBUG'
  // Legacy environment variables
  | 'CODE_REVIEW_GOOGLE_API_KEY'
  | 'CODE_REVIEW_OPENROUTER_API_KEY'
  | 'CODE_REVIEW_ANTHROPIC_API_KEY'
  | 'CODE_REVIEW_OPENAI_API_KEY'
  // Generic environment variables
  | 'GOOGLE_GENERATIVE_AI_KEY'
  | 'GOOGLE_AI_STUDIO_KEY'
  | 'OPENROUTER_API_KEY'
  | 'ANTHROPIC_API_KEY'
  | 'OPENAI_API_KEY'
  // CLI option
  | 'cli_option'
  // Default value
  | 'default_value'
  // None (not set)
  | 'none';

/**
 * Configuration value record with its source
 */
export interface ConfigValue<T> {
  value: T;
  source: EnvSource;
}

/**
 * API keys configuration
 */
export interface ApiKeysConfig {
  google?: ConfigValue<string>;
  openRouter?: ConfigValue<string>;
  anthropic?: ConfigValue<string>;
  openai?: ConfigValue<string>;
}

/**
 * API provider types
 */
export type ApiProvider = 'gemini' | 'openrouter' | 'anthropic' | 'openai';

/**
 * API endpoint configuration
 */
export interface ApiEndpointsConfig {
  gemini: ConfigValue<string>;
  openRouter: ConfigValue<string>;
  anthropic: ConfigValue<string>;
  openai: ConfigValue<string>;
}

/**
 * API version configuration
 */
export interface ApiVersionsConfig {
  gemini: ConfigValue<string>;
  openRouter: ConfigValue<string>;
  anthropic: ConfigValue<string>;
  openai: ConfigValue<string>;
}

/**
 * Log level type
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

/**
 * Paths configuration
 */
export interface PathsConfig {
  outputDir: ConfigValue<string>;
  promptsDir: ConfigValue<string>;
  templatesDir: ConfigValue<string>;
  contextPaths?: ConfigValue<string[]>;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  tokensPerSecond: ConfigValue<number>;
  maxConcurrentRequests: ConfigValue<number>;
  retryDelayMs: ConfigValue<number>;
  maxRetries: ConfigValue<number>;
}

/**
 * Token configuration
 */
export interface TokenConfig {
  maxTokensPerRequest: ConfigValue<number>;
  contextWindowSize: Record<ApiProvider, ConfigValue<number>>;
  costPerInputToken: Record<ApiProvider, ConfigValue<number>>;
  costPerOutputToken: Record<ApiProvider, ConfigValue<number>>;
}

/**
 * Complete application configuration interface
 */
export interface ApplicationConfig {
  // API connections
  apiKeys: ApiKeysConfig;
  apiEndpoints: ApiEndpointsConfig;
  apiVersions: ApiVersionsConfig;

  // Model configuration
  selectedModel: ConfigValue<string>;
  writerModel?: ConfigValue<string>;
  modelProvider: ConfigValue<ApiProvider>;

  // Logging and debugging
  debug: ConfigValue<boolean>;
  logLevel: ConfigValue<LogLevel>;

  // File system
  paths: PathsConfig;

  // Rate limiting and performance
  rateLimit: RateLimitConfig;

  // Token management
  tokens: TokenConfig;
}

/**
 * Zod schema for application configuration validation
 */
export const applicationConfigSchema = z.object({
  apiKeys: z.object({
    google: z.object({ value: z.string().optional(), source: z.string() }).optional(),
    openRouter: z.object({ value: z.string().optional(), source: z.string() }).optional(),
    anthropic: z.object({ value: z.string().optional(), source: z.string() }).optional(),
    openai: z.object({ value: z.string().optional(), source: z.string() }).optional(),
  }),

  apiEndpoints: z.object({
    gemini: z.object({ value: z.string(), source: z.string() }),
    openRouter: z.object({ value: z.string(), source: z.string() }),
    anthropic: z.object({ value: z.string(), source: z.string() }),
    openai: z.object({ value: z.string(), source: z.string() }),
  }),

  apiVersions: z.object({
    gemini: z.object({ value: z.string(), source: z.string() }),
    openRouter: z.object({ value: z.string(), source: z.string() }),
    anthropic: z.object({ value: z.string(), source: z.string() }),
    openai: z.object({ value: z.string(), source: z.string() }),
  }),

  selectedModel: z.object({ value: z.string(), source: z.string() }),
  writerModel: z.object({ value: z.string(), source: z.string() }).optional(),
  modelProvider: z.object({
    value: z.enum(['gemini', 'openrouter', 'anthropic', 'openai']),
    source: z.string(),
  }),

  debug: z.object({ value: z.boolean(), source: z.string() }),
  logLevel: z.object({
    value: z.enum(['debug', 'info', 'warn', 'error', 'none']),
    source: z.string(),
  }),

  paths: z.object({
    outputDir: z.object({ value: z.string(), source: z.string() }),
    promptsDir: z.object({ value: z.string(), source: z.string() }),
    templatesDir: z.object({ value: z.string(), source: z.string() }),
    contextPaths: z
      .object({
        value: z.array(z.string()),
        source: z.string(),
      })
      .optional(),
  }),

  rateLimit: z.object({
    tokensPerSecond: z.object({ value: z.number(), source: z.string() }),
    maxConcurrentRequests: z.object({ value: z.number(), source: z.string() }),
    retryDelayMs: z.object({ value: z.number(), source: z.string() }),
    maxRetries: z.object({ value: z.number(), source: z.string() }),
  }),

  tokens: z.object({
    maxTokensPerRequest: z.object({ value: z.number(), source: z.string() }),
    contextWindowSize: z.object({
      gemini: z.object({ value: z.number(), source: z.string() }),
      openrouter: z.object({ value: z.number(), source: z.string() }),
      anthropic: z.object({ value: z.number(), source: z.string() }),
      openai: z.object({ value: z.number(), source: z.string() }),
    }),
    costPerInputToken: z.object({
      gemini: z.object({ value: z.number(), source: z.string() }),
      openrouter: z.object({ value: z.number(), source: z.string() }),
      anthropic: z.object({ value: z.number(), source: z.string() }),
      openai: z.object({ value: z.number(), source: z.string() }),
    }),
    costPerOutputToken: z.object({
      gemini: z.object({ value: z.number(), source: z.string() }),
      openrouter: z.object({ value: z.number(), source: z.string() }),
      anthropic: z.object({ value: z.number(), source: z.string() }),
      openai: z.object({ value: z.number(), source: z.string() }),
    }),
  }),
});
