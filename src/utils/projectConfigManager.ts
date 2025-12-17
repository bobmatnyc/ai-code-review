/**
 * @fileoverview Project-level configuration manager for .ai-code-review/config.yaml
 *
 * This module manages project-specific configuration stored in .ai-code-review/config.yaml
 * including API keys, model preferences, and review settings.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import type { ProjectConfig } from '../types/review';
import logger from './logger';

/**
 * Default project configuration
 */
const DEFAULT_CONFIG: ProjectConfig = {
  api: {
    preferred_provider: 'openrouter',
    model: 'openrouter:openai/gpt-5.2',
    keys: {
      google: '',
      anthropic: '',
      openrouter: '',
      openai: '',
    },
  },
  preferences: {
    store_keys: false,
    skip_validation: false,
  },
};

/**
 * Configuration directory name
 */
const CONFIG_DIR = '.ai-code-review';

/**
 * Configuration file name
 */
const CONFIG_FILE = 'config.yaml';

/**
 * Get the path to the project config directory
 * @param projectPath Path to the project root (defaults to current directory)
 * @returns Path to the config directory
 */
export function getConfigDir(projectPath: string = process.cwd()): string {
  return path.join(projectPath, CONFIG_DIR);
}

/**
 * Get the path to the project config file
 * @param projectPath Path to the project root (defaults to current directory)
 * @returns Path to the config file
 */
export function getConfigPath(projectPath: string = process.cwd()): string {
  return path.join(getConfigDir(projectPath), CONFIG_FILE);
}

/**
 * Check if a project config exists
 * @param projectPath Path to the project root (defaults to current directory)
 * @returns True if config exists
 */
export function configExists(projectPath: string = process.cwd()): boolean {
  return fs.existsSync(getConfigPath(projectPath));
}

/**
 * Load project configuration
 * @param projectPath Path to the project root (defaults to current directory)
 * @returns Project configuration or null if not found
 */
export function loadProjectConfig(projectPath: string = process.cwd()): ProjectConfig | null {
  const configPath = getConfigPath(projectPath);

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.parse(configContent) as ProjectConfig;
    return config;
  } catch (error) {
    logger.error(`Failed to load project config from ${configPath}: ${error}`);
    return null;
  }
}

/**
 * Save project configuration
 * @param config Configuration to save
 * @param projectPath Path to the project root (defaults to current directory)
 */
export function saveProjectConfig(
  config: ProjectConfig,
  projectPath: string = process.cwd(),
): void {
  const configDir = getConfigDir(projectPath);
  const configPath = getConfigPath(projectPath);

  // Create config directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Convert to YAML with nice formatting
  const yamlContent = yaml.stringify(config, {
    indent: 2,
    lineWidth: 0, // Don't wrap long lines
  });

  // Write config file
  fs.writeFileSync(configPath, yamlContent, 'utf-8');
}

/**
 * Initialize a new project configuration with defaults
 * @param projectPath Path to the project root (defaults to current directory)
 * @returns The initialized configuration
 */
export function initProjectConfig(projectPath: string = process.cwd()): ProjectConfig {
  const config: ProjectConfig = { ...DEFAULT_CONFIG };
  saveProjectConfig(config, projectPath);
  return config;
}

/**
 * Update project configuration
 * @param updates Partial configuration to merge with existing config
 * @param projectPath Path to the project root (defaults to current directory)
 * @returns The updated configuration
 */
export function updateProjectConfig(
  updates: Partial<ProjectConfig>,
  projectPath: string = process.cwd(),
): ProjectConfig {
  const existingConfig = loadProjectConfig(projectPath) || DEFAULT_CONFIG;

  const updatedConfig: ProjectConfig = {
    ...existingConfig,
    ...updates,
    // Deep merge for nested objects
    api: {
      ...existingConfig.api,
      ...(updates.api || {}),
      keys: {
        ...existingConfig.api.keys,
        ...(updates.api?.keys || {}),
      },
    },
    preferences: {
      ...existingConfig.preferences,
      ...(updates.preferences || {}),
    },
  };

  saveProjectConfig(updatedConfig, projectPath);
  return updatedConfig;
}

/**
 * Get API key from project config or environment
 * @param provider API provider (openrouter, anthropic, google, openai)
 * @param projectPath Path to the project root (defaults to current directory)
 * @returns API key or undefined
 */
export function getApiKey(
  provider: 'openrouter' | 'anthropic' | 'google' | 'openai',
  projectPath: string = process.cwd(),
): string | undefined {
  // First try environment variable
  const envVarName = `${provider.toUpperCase()}_API_KEY`;
  const envKey = process.env[envVarName];
  if (envKey) {
    return envKey;
  }

  // Then try project config
  const config = loadProjectConfig(projectPath);
  if (config?.api?.keys?.[provider]) {
    return config.api.keys[provider];
  }

  return undefined;
}

/**
 * Get API key for a specific provider from project config
 * @param provider Provider name (google, anthropic, openrouter, openai)
 * @param projectPath Path to the project root (defaults to current directory)
 * @returns API key or null if not found
 */
export function getApiKeyFromProjectConfig(
  provider: string,
  projectPath: string = process.cwd(),
): string | null {
  const config = loadProjectConfig(projectPath);
  if (!config?.api?.keys) {
    return null;
  }

  const key = config.api.keys[provider as keyof typeof config.api.keys];
  return key || null;
}

/**
 * Set API key for a specific provider in project config
 * @param provider Provider name (google, anthropic, openrouter, openai)
 * @param apiKey API key to set
 * @param projectPath Path to the project root (defaults to current directory)
 * @returns true if saved successfully, false otherwise
 */
export function setApiKeyInProjectConfig(
  provider: string,
  apiKey: string,
  projectPath: string = process.cwd(),
): boolean {
  try {
    const updates: Partial<ProjectConfig> = {
      api: {
        keys: {
          [provider]: apiKey,
        },
      },
    };

    updateProjectConfig(updates, projectPath);
    return true;
  } catch (error) {
    logger.error(`Failed to set API key for ${provider}: ${error}`);
    return false;
  }
}

/**
 * Ensure config directory exists
 * @param projectPath Path to the project root (defaults to current directory)
 */
export function ensureConfigDir(projectPath: string = process.cwd()): void {
  const configDir = getConfigDir(projectPath);
  if (!fs.existsSync(configDir)) {
    logger.debug(`Creating config directory: ${configDir}`);
    fs.mkdirSync(configDir, { recursive: true });
  }
}

/**
 * Ensure .gitignore excludes the config directory
 * @param projectPath Path to the project root (defaults to current directory)
 */
export function ensureGitignore(projectPath: string = process.cwd()): void {
  const gitignorePath = path.join(projectPath, '.gitignore');
  const configPattern = `${CONFIG_DIR}/`;

  // If .gitignore doesn't exist, create it
  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(
      gitignorePath,
      `# AI Code Review configuration (contains API keys)\n${configPattern}\n`,
      'utf-8',
    );
    return;
  }

  // Check if pattern already exists
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
  if (gitignoreContent.includes(configPattern)) {
    return; // Already present
  }

  // Append pattern to .gitignore
  const updatedContent = gitignoreContent.endsWith('\n')
    ? `${gitignoreContent}\n# AI Code Review configuration (contains API keys)\n${configPattern}\n`
    : `${gitignoreContent}\n\n# AI Code Review configuration (contains API keys)\n${configPattern}\n`;

  fs.writeFileSync(gitignorePath, updatedContent, 'utf-8');
}

/**
 * Validate an API key by checking its format
 * @param provider API provider
 * @param apiKey API key to validate
 * @returns True if the key format appears valid
 */
export function validateApiKeyFormat(
  provider: 'openrouter' | 'anthropic' | 'google' | 'openai',
  apiKey: string,
): boolean {
  if (!apiKey || apiKey.trim().length === 0) {
    return false;
  }

  // Basic format validation based on known patterns
  switch (provider) {
    case 'openrouter':
      return apiKey.startsWith('sk-or-v1-');
    case 'anthropic':
      return apiKey.startsWith('sk-ant-');
    case 'google':
      return apiKey.length > 20; // Google API keys are typically 39 characters
    case 'openai':
      return apiKey.startsWith('sk-');
    default:
      return true; // Unknown provider, accept any non-empty key
  }
}

/**
 * Legacy project configuration structure for backward compatibility
 * @deprecated Use ProjectConfig from ../types/review.ts instead
 */
export interface LegacyProjectConfig {
  /** API keys for different providers */
  apiKeys?: {
    openrouter?: string;
    anthropic?: string;
    google?: string;
    openai?: string;
  };
  /** Default AI model to use */
  defaultModel?: string;
  /** Review settings */
  reviewSettings?: {
    strictness?: 'strict' | 'balanced' | 'lenient';
    focusAreas?: string[];
    autoFix?: boolean;
  };
  /** MCP settings */
  mcp?: {
    enabled?: boolean;
    toolchainDetected?: string;
  };
  /** Timestamp of last configuration update */
  lastUpdated?: string;
}

/**
 * Convert new ProjectConfig format to legacy format for backward compatibility
 * @param config New ProjectConfig
 * @returns Legacy config format
 */
export function toLegacyConfig(config: ProjectConfig): LegacyProjectConfig {
  return {
    apiKeys: config.api?.keys || {},
    defaultModel: config.api?.model || '',
    reviewSettings: undefined,
    mcp: undefined,
  };
}

/**
 * Convert legacy config format to new ProjectConfig format
 * @param legacy Legacy config
 * @returns New ProjectConfig
 */
export function fromLegacyConfig(legacy: LegacyProjectConfig): ProjectConfig {
  return {
    api: {
      preferred_provider: legacy.apiKeys?.openrouter
        ? 'openrouter'
        : legacy.apiKeys?.anthropic
          ? 'anthropic'
          : legacy.apiKeys?.google
            ? 'google'
            : legacy.apiKeys?.openai
              ? 'openai'
              : 'openrouter',
      model: legacy.defaultModel || '',
      keys: legacy.apiKeys || {},
    },
    preferences: {
      store_keys: false,
      skip_validation: false,
    },
  };
}
