/**
 * @fileoverview Project-level configuration manager for .ai-code-review/config.json
 *
 * This module manages project-specific configuration stored in .ai-code-review/config.json
 * including API keys, model preferences, and review settings.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import logger from './logger';

/**
 * Project configuration structure
 */
export interface ProjectConfig {
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
 * Default project configuration
 */
const DEFAULT_CONFIG: ProjectConfig = {
  reviewSettings: {
    strictness: 'balanced',
    focusAreas: ['security', 'performance', 'maintainability'],
    autoFix: false,
  },
  mcp: {
    enabled: true,
  },
};

/**
 * Configuration directory name
 */
const CONFIG_DIR = '.ai-code-review';

/**
 * Configuration file name
 */
const CONFIG_FILE = 'config.json';

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
    const config = JSON.parse(configContent) as ProjectConfig;
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

  // Add timestamp
  const configWithTimestamp: ProjectConfig = {
    ...config,
    lastUpdated: new Date().toISOString(),
  };

  // Write config file
  fs.writeFileSync(configPath, JSON.stringify(configWithTimestamp, null, 2), 'utf-8');
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
    apiKeys: {
      ...existingConfig.apiKeys,
      ...updates.apiKeys,
    },
    reviewSettings: {
      ...existingConfig.reviewSettings,
      ...updates.reviewSettings,
    },
    mcp: {
      ...existingConfig.mcp,
      ...updates.mcp,
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
  if (config?.apiKeys?.[provider]) {
    return config.apiKeys[provider];
  }

  return undefined;
}

/**
 * Ensure .gitignore excludes the config file
 * @param projectPath Path to the project root (defaults to current directory)
 */
export function ensureGitignore(projectPath: string = process.cwd()): void {
  const gitignorePath = path.join(projectPath, '.gitignore');
  const configPattern = `${CONFIG_DIR}/${CONFIG_FILE}`;

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
