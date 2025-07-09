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
 * Apply configuration to review options
 * @param config The configuration (YAML or JSON)
 * @param options The review options to modify
 * @returns The modified review options
 */
export function applyConfigToOptions(config: ConfigFile, options: ReviewOptions): ReviewOptions {
  // Make a copy of the options to avoid modifying the original
  const newOptions = { ...options };

  // Apply output configuration
  if (config.output) {
    if (config.output.format && !newOptions.output) {
      newOptions.output = config.output.format as any;
    }
    if (config.output.dir && !(newOptions as CliOptions).outputDir) {
      (newOptions as CliOptions).outputDir = config.output.dir;
    }
  }

  // Apply review configuration
  if (config.review) {
    if (config.review.type && newOptions.type === undefined) {
      newOptions.type = config.review.type as any;
    }
    if (config.review.interactive !== undefined && newOptions.interactive === undefined) {
      newOptions.interactive = config.review.interactive;
    }
    if (config.review.include_tests !== undefined && newOptions.includeTests === undefined) {
      newOptions.includeTests = config.review.include_tests;
    }
    if (
      config.review.include_project_docs !== undefined &&
      newOptions.includeProjectDocs === undefined
    ) {
      newOptions.includeProjectDocs = config.review.include_project_docs;
    }
    if (
      config.review.include_dependency_analysis !== undefined &&
      newOptions.includeDependencyAnalysis === undefined
    ) {
      newOptions.includeDependencyAnalysis = config.review.include_dependency_analysis;
    }
    if (config.review.consolidated !== undefined && newOptions.consolidated === undefined) {
      newOptions.consolidated = config.review.consolidated;
    }
    if (config.review.trace_code !== undefined && newOptions.traceCode === undefined) {
      newOptions.traceCode = config.review.trace_code;
    }
    if (config.review.use_ts_prune !== undefined && newOptions.useTsPrune === undefined) {
      newOptions.useTsPrune = config.review.use_ts_prune;
    }
    if (config.review.use_eslint !== undefined && newOptions.useEslint === undefined) {
      newOptions.useEslint = config.review.use_eslint;
    }
    if (config.review.auto_fix !== undefined && newOptions.autoFix === undefined) {
      newOptions.autoFix = config.review.auto_fix;
    }
    if (config.review.prompt_all !== undefined && newOptions.promptAll === undefined) {
      newOptions.promptAll = config.review.prompt_all;
    }
    if (config.review.confirm !== undefined && newOptions.noConfirm === undefined) {
      // noConfirm is the inverse of confirm
      newOptions.noConfirm = !config.review.confirm;
    }
  }

  // Apply API configuration
  if (config.api) {
    if (config.api.model && !(newOptions as CliOptions).model) {
      (newOptions as CliOptions).model = config.api.model;
    }
    if (config.api.writer_model && !(newOptions as CliOptions).writerModel) {
      (newOptions as CliOptions).writerModel = config.api.writer_model;
    }
    if (config.api.test_api !== undefined && newOptions.testApi === undefined) {
      newOptions.testApi = config.api.test_api;
    }

    // Handle API keys
    if (config.api.keys) {
      // If apiKey doesn't exist on newOptions, create it
      const cliOptions = newOptions as CliOptions;
      if (!cliOptions.apiKey) {
        cliOptions.apiKey = {};
      }

      // Only set API keys if they are not already set and are non-null in the config
      if (config.api.keys.google && !cliOptions.apiKey.google) {
        cliOptions.apiKey.google = config.api.keys.google;
      }
      if (config.api.keys.openrouter && !cliOptions.apiKey.openrouter) {
        cliOptions.apiKey.openrouter = config.api.keys.openrouter;
      }
      if (config.api.keys.anthropic && !cliOptions.apiKey.anthropic) {
        cliOptions.apiKey.anthropic = config.api.keys.anthropic;
      }
      if (config.api.keys.openai && !cliOptions.apiKey.openai) {
        cliOptions.apiKey.openai = config.api.keys.openai;
      }
    }
  }

  // Apply prompts configuration
  if (config.prompts) {
    if (config.prompts.prompt_file && !newOptions.promptFile) {
      newOptions.promptFile = config.prompts.prompt_file;
    }
    if (config.prompts.prompt_fragment && !newOptions.promptFragments) {
      // Create a promptFragments array if it doesn't exist
      newOptions.promptFragments = [
        {
          content: config.prompts.prompt_fragment,
          position: config.prompts.prompt_fragment_position || 'middle',
          priority: 5,
        },
      ];
    }
    if (config.prompts.prompt_strategy && !newOptions.promptStrategy) {
      newOptions.promptStrategy = config.prompts.prompt_strategy;
    }
    if (config.prompts.use_cache !== undefined && newOptions.useCache === undefined) {
      newOptions.useCache = config.prompts.use_cache;
    }
  }

  // Apply system configuration
  if (config.system) {
    if (config.system.debug !== undefined && newOptions.debug === undefined) {
      newOptions.debug = config.system.debug;
    }
    if (config.system.log_level && !(newOptions as CliOptions).logLevel) {
      (newOptions as CliOptions).logLevel = config.system.log_level;
    }
  }

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
