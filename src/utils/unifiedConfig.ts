/**
 * @fileoverview Unified configuration management system
 *
 * This module provides a simplified, centralized configuration system that:
 * 1. Establishes clear precedence order: CLI > Environment > Config File > Defaults
 * 2. Deprecates old CODE_REVIEW_* prefixes in favor of AI_CODE_REVIEW_*
 * 3. Consolidates all configuration logic into a single module
 * 4. Provides clear error messages and validation
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import yaml from 'yaml';
import { z } from 'zod';
import logger from './logger';

// Configuration schema with validation
const ConfigSchema = z.object({
  // API Keys
  googleApiKey: z.string().optional(),
  openRouterApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  openAIApiKey: z.string().optional(),

  // Model configuration
  model: z.string().default('gemini:gemini-1.5-pro'),
  writerModel: z.string().optional(),

  // Output configuration
  outputDir: z.string().default('ai-code-review-docs'),
  outputFormat: z.enum(['markdown', 'json']).default('markdown'),

  // Behavior configuration
  debug: z.boolean().default(false),
  logLevel: z.enum(['debug', 'info', 'warn', 'error', 'none']).default('info'),
  interactive: z.boolean().default(false),

  // Feature flags
  includeTests: z.boolean().default(false),
  includeProjectDocs: z.boolean().default(false),
  includeDependencyAnalysis: z.boolean().default(false),
  enableSemanticChunking: z.boolean().default(true),

  // Advanced configuration
  contextPaths: z.array(z.string()).optional(),
  maxTokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

// CLI options interface (simplified)
export interface CliOptions {
  model?: string;
  writerModel?: string;
  outputDir?: string;
  outputFormat?: 'markdown' | 'json';
  debug?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error' | 'none';
  interactive?: boolean;
  includeTests?: boolean;
  includeProjectDocs?: boolean;
  includeDependencyAnalysis?: boolean;
  enableSemanticChunking?: boolean;
  config?: string;
  [key: string]: any;
}

// Configuration file interface
interface ConfigFile {
  api?: {
    google_api_key?: string;
    openrouter_api_key?: string;
    anthropic_api_key?: string;
    openai_api_key?: string;
  };
  model?: {
    default?: string;
    writer?: string;
  };
  output?: {
    directory?: string;
    format?: 'markdown' | 'json';
  };
  behavior?: {
    debug?: boolean;
    log_level?: string;
    interactive?: boolean;
  };
  features?: {
    include_tests?: boolean;
    include_project_docs?: boolean;
    include_dependency_analysis?: boolean;
    enable_semantic_chunking?: boolean;
  };
}

// Singleton configuration instance
let configInstance: Config | null = null;

/**
 * Load environment variables from .env.local file
 */
function loadEnvironmentFile(): void {
  const envPaths = [path.resolve(process.cwd(), '.env.local'), path.resolve(process.cwd(), '.env')];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
      logger.debug(`Loaded environment variables from ${envPath}`);
      break;
    }
  }
}

/**
 * Load configuration file (YAML or JSON)
 */
function loadConfigurationFile(configPath?: string): ConfigFile | null {
  const configPaths = configPath
    ? [configPath]
    : ['.ai-code-review.yaml', '.ai-code-review.yml', '.ai-code-review.json'];

  for (const filePath of configPaths) {
    const fullPath = path.resolve(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const config = filePath.endsWith('.json') ? JSON.parse(content) : yaml.parse(content);
        logger.debug(`Loaded configuration from ${fullPath}`);
        return config;
      } catch (error) {
        logger.warn(`Failed to parse configuration file ${fullPath}: ${error}`);
      }
    }
  }

  return null;
}

/**
 * Get API key with deprecation warnings for old prefixes
 */
function getApiKey(provider: 'google' | 'openrouter' | 'anthropic' | 'openai'): string | undefined {
  const envMappings = {
    google: {
      new: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      legacy: 'CODE_REVIEW_GOOGLE_API_KEY',
      generic: ['GOOGLE_GENERATIVE_AI_KEY', 'GOOGLE_AI_STUDIO_KEY'],
    },
    openrouter: {
      new: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      legacy: 'CODE_REVIEW_OPENROUTER_API_KEY',
      generic: ['OPENROUTER_API_KEY'],
    },
    anthropic: {
      new: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      legacy: 'CODE_REVIEW_ANTHROPIC_API_KEY',
      generic: ['ANTHROPIC_API_KEY'],
    },
    openai: {
      new: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      legacy: 'CODE_REVIEW_OPENAI_API_KEY',
      generic: ['OPENAI_API_KEY'],
    },
  };

  const mapping = envMappings[provider];

  // Check new prefix first
  const newKey = process.env[mapping.new];
  if (newKey) return newKey;

  // Check legacy prefix with deprecation warning
  const legacyKey = process.env[mapping.legacy];
  if (legacyKey) {
    logger.warn(
      `⚠️  DEPRECATION WARNING: ${mapping.legacy} is deprecated. Please use ${mapping.new} instead.`,
    );
    return legacyKey;
  }

  // Check generic environment variables
  for (const genericVar of mapping.generic) {
    const genericKey = process.env[genericVar];
    if (genericKey) return genericKey;
  }

  return undefined;
}

/**
 * Build configuration from all sources with proper precedence
 */
function buildConfiguration(cliOptions?: CliOptions): Config {
  // 1. Load environment file
  loadEnvironmentFile();

  // 2. Load configuration file
  const configFile = loadConfigurationFile(cliOptions?.config);

  // 3. Build configuration object with precedence: CLI > Environment > Config File > Defaults
  const rawConfig = {
    // API Keys (environment only, not exposed via CLI for security)
    googleApiKey: getApiKey('google'),
    openRouterApiKey: getApiKey('openrouter'),
    anthropicApiKey: getApiKey('anthropic'),
    openAIApiKey: getApiKey('openai'),

    // Model configuration
    model:
      cliOptions?.model ||
      process.env.AI_CODE_REVIEW_MODEL ||
      configFile?.model?.default ||
      'gemini:gemini-1.5-pro',

    writerModel:
      cliOptions?.writerModel ||
      process.env.AI_CODE_REVIEW_WRITER_MODEL ||
      configFile?.model?.writer,

    // Output configuration
    outputDir:
      cliOptions?.outputDir ||
      process.env.AI_CODE_REVIEW_OUTPUT_DIR ||
      configFile?.output?.directory ||
      'ai-code-review-docs',

    outputFormat: cliOptions?.outputFormat || configFile?.output?.format || 'markdown',

    // Behavior configuration
    debug:
      cliOptions?.debug ??
      process.env.AI_CODE_REVIEW_DEBUG === 'true' ??
      configFile?.behavior?.debug ??
      false,

    logLevel:
      cliOptions?.logLevel ||
      process.env.AI_CODE_REVIEW_LOG_LEVEL ||
      configFile?.behavior?.log_level ||
      'info',

    interactive: cliOptions?.interactive ?? configFile?.behavior?.interactive ?? false,

    // Feature flags
    includeTests: cliOptions?.includeTests ?? configFile?.features?.include_tests ?? false,

    includeProjectDocs:
      cliOptions?.includeProjectDocs ?? configFile?.features?.include_project_docs ?? false,

    includeDependencyAnalysis:
      cliOptions?.includeDependencyAnalysis ??
      configFile?.features?.include_dependency_analysis ??
      false,

    enableSemanticChunking:
      cliOptions?.enableSemanticChunking ??
      process.env.AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING === 'true' ??
      configFile?.features?.enable_semantic_chunking ??
      true,

    // Advanced configuration
    contextPaths: process.env.AI_CODE_REVIEW_CONTEXT?.split(',').map((p) => p.trim()),
  };

  // 4. Validate configuration
  try {
    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`Configuration validation failed: ${issues}`);
    }
    throw error;
  }
}

/**
 * Get the unified configuration
 */
export function getUnifiedConfig(cliOptions?: CliOptions): Config {
  if (!configInstance || cliOptions) {
    configInstance = buildConfiguration(cliOptions);
  }
  return configInstance;
}

/**
 * Reset configuration (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Check if any API key is available
 */
export function hasAnyApiKey(config?: Config): boolean {
  const cfg = config || getUnifiedConfig();
  return !!(cfg.googleApiKey || cfg.openRouterApiKey || cfg.anthropicApiKey || cfg.openAIApiKey);
}

/**
 * Validate configuration for a specific model
 */
export function validateModelConfig(
  model: string,
  config?: Config,
): { valid: boolean; error?: string } {
  const cfg = config || getUnifiedConfig();
  const [provider] = model.split(':');

  const providerKeyMap = {
    gemini: cfg.googleApiKey,
    google: cfg.googleApiKey,
    openrouter: cfg.openRouterApiKey,
    anthropic: cfg.anthropicApiKey,
    openai: cfg.openAIApiKey,
  };

  const requiredKey = providerKeyMap[provider as keyof typeof providerKeyMap];

  if (!requiredKey) {
    return {
      valid: false,
      error: `No API key found for provider '${provider}'. Please set the appropriate AI_CODE_REVIEW_*_API_KEY environment variable.`,
    };
  }

  return { valid: true };
}
