/**
 * @fileoverview Configuration file manager for JSON config files.
 *
 * This module provides functions for loading, parsing, and generating
 * JSON configuration files for the AI code review tool.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as YAML from 'yaml';
import type { CliOptions } from '../cli/argumentParser';
import type { ReviewOptions } from '../types/review';
import logger from './logger';

/**
 * Interface for the configuration file structure (supports both YAML and JSON)
 */
export interface ConfigFile {
  output?: {
    format?: string;
    dir?: string;
  };
  review?: {
    type?: string;
    interactive?: boolean;
    include_tests?: boolean;
    include_project_docs?: boolean;
    include_dependency_analysis?: boolean;
    consolidated?: boolean;
    trace_code?: boolean;
    use_ts_prune?: boolean;
    use_eslint?: boolean;
    auto_fix?: boolean;
    prompt_all?: boolean;
    confirm?: boolean;
  };
  api?: {
    model?: string;
    writer_model?: string;
    keys?: {
      google?: string;
      openrouter?: string;
      anthropic?: string;
      openai?: string;
    };
    test_api?: boolean;
  };
  prompts?: {
    prompt_file?: string;
    prompt_fragment?: string;
    prompt_fragment_position?: 'start' | 'middle' | 'end';
    prompt_strategy?: string;
    use_cache?: boolean;
  };
  system?: {
    debug?: boolean;
    log_level?: string;
  };
}

/**
 * Default configuration file paths (in order of preference)
 */
const DEFAULT_CONFIG_FILES = [
  '.ai-code-review.yaml',
  '.ai-code-review.yml',
  '.ai-code-review.json',
];

/**
 * Load a configuration file (YAML or JSON)
 * @param configFilePath Path to the configuration file
 * @returns The parsed configuration or null if the file doesn't exist
 */
export function loadConfigFile(configFilePath?: string): ConfigFile | null {
  let filePath: string;

  if (configFilePath) {
    // If explicitly provided, use the specified path
    filePath = path.resolve(process.cwd(), configFilePath);
  } else {
    // Try default config files in order of preference
    filePath = '';
    for (const defaultFile of DEFAULT_CONFIG_FILES) {
      const testPath = path.resolve(process.cwd(), defaultFile);
      if (fs.existsSync(testPath)) {
        filePath = testPath;
        break;
      }
    }

    // If no default file found, use the first preference for error messages
    if (!filePath) {
      filePath = path.resolve(process.cwd(), DEFAULT_CONFIG_FILES[0]);
    }
  }

  try {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      // File doesn't exist
      if (configFilePath) {
        // Only log an error if the path was explicitly specified
        logger.error(`Configuration file not found: ${filePath}`);
      } else {
        // Just debug log if using the default path
        logger.debug(`No configuration file found at ${filePath}`);
      }
      return null;
    }

    // Read the file content
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileExtension = path.extname(filePath).toLowerCase();

    try {
      let config: ConfigFile;

      if (fileExtension === '.yaml' || fileExtension === '.yml') {
        // Parse YAML content
        config = YAML.parse(content) as ConfigFile;
        logger.info(`Loaded YAML configuration from ${filePath}`);
      } else if (fileExtension === '.json') {
        // Parse JSON content
        config = JSON.parse(content) as ConfigFile;
        logger.info(`Loaded JSON configuration from ${filePath}`);
      } else {
        // Try to detect format by content
        try {
          config = YAML.parse(content) as ConfigFile;
          logger.info(`Loaded configuration from ${filePath} (detected as YAML)`);
        } catch (_yamlError) {
          config = JSON.parse(content) as ConfigFile;
          logger.info(`Loaded configuration from ${filePath} (detected as JSON)`);
        }
      }

      return config;
    } catch (parseError) {
      logger.error(
        `Error parsing configuration file: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
      );
      logger.error(`Please check the syntax in ${filePath}`);
      return null;
    }
  } catch (error) {
    logger.error(
      `Error reading configuration file: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Apply output configuration
 * @param config Output configuration
 * @param options Review options to modify
 */
function applyOutputConfig(config: ConfigFile['output'], options: ReviewOptions): void {
  if (!config) return;

  if (config.format && !options.output) {
    options.output = config.format as any;
  }
  if (config.dir && !(options as CliOptions).outputDir) {
    (options as CliOptions).outputDir = config.dir;
  }
}

/**
 * Apply review configuration
 * @param config Review configuration
 * @param options Review options to modify
 * @param cliSpecifiedOptions CLI-specified options that take precedence
 */
function applyReviewConfig(
  config: ConfigFile['review'],
  options: ReviewOptions,
  cliSpecifiedOptions?: { type?: boolean },
): void {
  if (!config) return;

  if (config.type && options.type === undefined && !cliSpecifiedOptions?.type) {
    options.type = config.type as any;
  }
  if (config.interactive !== undefined && options.interactive === undefined) {
    options.interactive = config.interactive;
  }
  if (config.include_tests !== undefined && options.includeTests === undefined) {
    options.includeTests = config.include_tests;
  }
  if (config.include_project_docs !== undefined && options.includeProjectDocs === undefined) {
    options.includeProjectDocs = config.include_project_docs;
  }
  if (config.include_dependency_analysis !== undefined && options.includeDependencyAnalysis === undefined) {
    options.includeDependencyAnalysis = config.include_dependency_analysis;
  }
  if (config.consolidated !== undefined && options.consolidated === undefined) {
    options.consolidated = config.consolidated;
  }
  if (config.trace_code !== undefined && options.traceCode === undefined) {
    options.traceCode = config.trace_code;
  }
  if (config.use_ts_prune !== undefined && options.useTsPrune === undefined) {
    options.useTsPrune = config.use_ts_prune;
  }
  if (config.use_eslint !== undefined && options.useEslint === undefined) {
    options.useEslint = config.use_eslint;
  }
  if (config.auto_fix !== undefined && options.autoFix === undefined) {
    options.autoFix = config.auto_fix;
  }
  if (config.prompt_all !== undefined && options.promptAll === undefined) {
    options.promptAll = config.prompt_all;
  }
  if (config.confirm !== undefined && options.noConfirm === undefined) {
    // noConfirm is the inverse of confirm
    options.noConfirm = !config.confirm;
  }
}

/**
 * Apply API keys configuration
 * @param keys API keys from config
 * @param cliOptions CLI options to modify
 */
function applyApiKeys(
  keys:
    | {
        google?: string;
        openrouter?: string;
        anthropic?: string;
        openai?: string;
      }
    | undefined,
  cliOptions: CliOptions,
): void {
  if (!keys) return;

  // If apiKey doesn't exist on cliOptions, create it
  if (!cliOptions.apiKey) {
    cliOptions.apiKey = {};
  }

  // Only set API keys if they are not already set and are non-null in the config
  if (keys.google && !cliOptions.apiKey.google) {
    cliOptions.apiKey.google = keys.google;
  }
  if (keys.openrouter && !cliOptions.apiKey.openrouter) {
    cliOptions.apiKey.openrouter = keys.openrouter;
  }
  if (keys.anthropic && !cliOptions.apiKey.anthropic) {
    cliOptions.apiKey.anthropic = keys.anthropic;
  }
  if (keys.openai && !cliOptions.apiKey.openai) {
    cliOptions.apiKey.openai = keys.openai;
  }
}

/**
 * Apply API configuration
 * @param config API configuration
 * @param options Review options to modify
 */
function applyApiConfig(config: ConfigFile['api'], options: ReviewOptions): void {
  if (!config) return;

  const cliOptions = options as CliOptions;

  if (config.model && !cliOptions.model) {
    cliOptions.model = config.model;
  }
  if (config.writer_model && !cliOptions.writerModel) {
    cliOptions.writerModel = config.writer_model;
  }
  if (config.test_api !== undefined && options.testApi === undefined) {
    options.testApi = config.test_api;
  }

  // Handle API keys
  if (config.keys) {
    applyApiKeys(config.keys, cliOptions);
  }
}

/**
 * Apply prompts configuration
 * @param config Prompts configuration
 * @param options Review options to modify
 */
function applyPromptsConfig(config: ConfigFile['prompts'], options: ReviewOptions): void {
  if (!config) return;

  if (config.prompt_file && !options.promptFile) {
    options.promptFile = config.prompt_file;
  }
  if (config.prompt_fragment && !options.promptFragments) {
    // Create a promptFragments array if it doesn't exist
    options.promptFragments = [
      {
        content: config.prompt_fragment,
        position: config.prompt_fragment_position || 'middle',
        priority: 5,
      },
    ];
  }
  if (config.prompt_strategy && !options.promptStrategy) {
    options.promptStrategy = config.prompt_strategy;
  }
  if (config.use_cache !== undefined && options.useCache === undefined) {
    options.useCache = config.use_cache;
  }
}

/**
 * Apply system configuration
 * @param config System configuration
 * @param options Review options to modify
 * @param cliSpecifiedOptions CLI-specified options that take precedence
 */
function applySystemConfig(
  config: ConfigFile['system'],
  options: ReviewOptions,
  cliSpecifiedOptions?: { debug?: boolean },
): void {
  if (!config) return;

  if (config.debug !== undefined && options.debug === undefined && !cliSpecifiedOptions?.debug) {
    options.debug = config.debug;
  }
  if (config.log_level && !(options as CliOptions).logLevel) {
    (options as CliOptions).logLevel = config.log_level;
  }
}

/**
 * Apply configuration to review options
 * @param config The configuration (YAML or JSON)
 * @param options The review options to modify
 * @returns The modified review options
 */
export function applyConfigToOptions(
  config: ConfigFile,
  options: ReviewOptions,
  cliSpecifiedOptions?: { debug?: boolean; type?: boolean; target?: boolean },
): ReviewOptions {
  // Make a copy of the options to avoid modifying the original
  const newOptions = { ...options };

  // Apply each configuration section
  applyOutputConfig(config.output, newOptions);
  applyReviewConfig(config.review, newOptions, cliSpecifiedOptions);
  applyApiConfig(config.api, newOptions);
  applyPromptsConfig(config.prompts, newOptions);
  applySystemConfig(config.system, newOptions, cliSpecifiedOptions);

  return newOptions;
}

/**
 * Generate a sample configuration file in YAML format
 * @returns A YAML string containing the sample configuration
 */
export function generateSampleConfig(): string {
  const sampleConfig: ConfigFile = {
    output: {
      format: 'markdown',
      dir: './ai-code-review-docs',
    },
    review: {
      type: 'quick-fixes',
      interactive: false,
      include_tests: false,
      include_project_docs: true,
      include_dependency_analysis: true,
      trace_code: false,
      use_ts_prune: false,
      use_eslint: false,
      auto_fix: false,
      prompt_all: false,
      confirm: true,
    },
    api: {
      model: 'gemini:gemini-1.5-pro',
      keys: {
        google: 'YOUR_GOOGLE_API_KEY_HERE',
        openrouter: 'YOUR_OPENROUTER_API_KEY_HERE',
        anthropic: 'YOUR_ANTHROPIC_API_KEY_HERE',
        openai: 'YOUR_OPENAI_API_KEY_HERE',
      },
      test_api: false,
    },
    system: {
      debug: false,
      log_level: 'info',
    },
  };

  // Generate YAML
  const yamlString = YAML.stringify(sampleConfig);

  // Add header comments
  const header = `# AI Code Review Configuration File
# This file contains configuration options for the AI Code Review tool.
#
# Configuration priority order:
# 1. Command-line arguments (highest priority)
# 2. Configuration file (this file)
# 3. Environment variables (AI_CODE_REVIEW_*)
# 4. Default values (lowest priority)
#
# Usage: ai-code-review --config .ai-code-review.yaml
#
# For security, consider using environment variables for API keys instead of
# storing them in this file. Environment variable names:
# - AI_CODE_REVIEW_GOOGLE_API_KEY
# - AI_CODE_REVIEW_OPENROUTER_API_KEY
# - AI_CODE_REVIEW_ANTHROPIC_API_KEY
# - AI_CODE_REVIEW_OPENAI_API_KEY

`;

  return header + yamlString;
}

/**
 * Generate a sample configuration file in JSON format
 * @returns A JSON string containing the sample configuration
 */
export function generateSampleConfigJSON(): string {
  const sampleConfig: ConfigFile = {
    output: {
      format: 'markdown',
      dir: './ai-code-review-docs',
    },
    review: {
      type: 'quick-fixes',
      interactive: false,
      include_tests: false,
      include_project_docs: true,
      include_dependency_analysis: true,
      trace_code: false,
      use_ts_prune: false,
      use_eslint: false,
      auto_fix: false,
      prompt_all: false,
      confirm: true,
    },
    api: {
      model: 'gemini:gemini-1.5-pro',
      keys: {
        google: 'YOUR_GOOGLE_API_KEY_HERE',
        openrouter: 'YOUR_OPENROUTER_API_KEY_HERE',
        anthropic: 'YOUR_ANTHROPIC_API_KEY_HERE',
        openai: 'YOUR_OPENAI_API_KEY_HERE',
      },
      test_api: false,
    },
    system: {
      debug: false,
      log_level: 'info',
    },
  };

  return JSON.stringify(sampleConfig, null, 2);
}

/**
 * Save a sample configuration file
 * @param outputPath Path to save the configuration file
 * @param format Format to use ('yaml' or 'json')
 * @returns True if the file was saved successfully, false otherwise
 */
export function saveSampleConfig(outputPath: string, format: 'yaml' | 'json' = 'yaml'): boolean {
  try {
    const sampleConfig = format === 'json' ? generateSampleConfigJSON() : generateSampleConfig();
    fs.writeFileSync(outputPath, sampleConfig);
    return true;
  } catch (error) {
    logger.error(
      `Error saving sample configuration: ${error instanceof Error ? error.message : String(error)}`,
    );
    return false;
  }
}

export default {
  loadConfigFile,
  applyConfigToOptions,
  generateSampleConfig,
  generateSampleConfigJSON,
  saveSampleConfig,
};
