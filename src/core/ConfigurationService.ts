/**
 * @fileoverview Unified Configuration Service
 * 
 * This service consolidates all configuration management into a single, cohesive module.
 * It replaces the fragmented configuration files (config.ts, configFileManager.ts, 
 * configManager.ts, unifiedConfig.ts, codingTestConfigLoader.ts, envLoader.ts) with
 * a single source of truth for configuration.
 * 
 * Key features:
 * - Single source of truth for all configuration
 * - Clear precedence order: CLI > Environment > Config File > Defaults
 * - Type-safe configuration with Zod validation
 * - Support for YAML and JSON config files
 * - Environment variable loading with .env.local support
 * - Comprehensive error handling and validation
 */

import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
// Use dynamic import for js-yaml to avoid type issues
// import * as yaml from 'js-yaml';
import * as dotenv from 'dotenv';
import type { CliOptions } from '../cli/argumentParser';
import logger from '../utils/logger';

// Configuration schema with validation
const ConfigSchema = z.object({
  // API Keys
  googleApiKey: z.string().optional(),
  openRouterApiKey: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  openAIApiKey: z.string().optional(),

  // Model configuration
  model: z.string().default('gemini:gemini-2.5-pro'),
  writerModel: z.string().optional(),

  // Output configuration
  outputDir: z.string().default('ai-code-review-docs'),
  outputFormat: z.enum(['markdown', 'json']).default('markdown'),

  // Behavior configuration
  debug: z.boolean().default(false),
  logLevel: z.enum(['debug', 'info', 'warn', 'error', 'none']).default('info'),
  interactive: z.boolean().default(false),

  // Review features
  includeTests: z.boolean().default(false),
  includeProjectDocs: z.boolean().default(true),
  includeDependencyAnalysis: z.boolean().default(true),
  enableSemanticChunking: z.boolean().default(true),

  // Multi-pass configuration
  multiPass: z.boolean().default(false),
  forceSinglePass: z.boolean().default(false),
  contextMaintenanceFactor: z.number().min(0).max(1).default(0.15),

  // Advanced features
  testApi: z.boolean().default(false),
  estimate: z.boolean().default(false),
  noConfirm: z.boolean().default(false),

  // Paths
  contextPaths: z.array(z.string()).optional(),
  configPath: z.string().optional(),

  // Coding test specific
  assignmentFile: z.string().optional(),
  assignmentUrl: z.string().optional(),
  assignmentText: z.string().optional(),
  evaluationTemplate: z.string().optional(),
  templateUrl: z.string().optional(),
  rubricFile: z.string().optional(),
  assessmentType: z.enum(['coding-challenge', 'take-home', 'live-coding', 'code-review']).default('coding-challenge'),
  difficultyLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'architect']).default('mid'),

  // Evaluation weights
  weightCorrectness: z.number().min(0).max(100).default(30),
  weightCodeQuality: z.number().min(0).max(100).default(25),
  weightArchitecture: z.number().min(0).max(100).default(20),
  weightPerformance: z.number().min(0).max(100).default(15),
  weightTesting: z.number().min(0).max(100).default(10),

  // Evaluation options
  evaluateDocumentation: z.boolean().default(false),
  evaluateGitHistory: z.boolean().default(false),
  evaluateEdgeCases: z.boolean().default(false),
  evaluateErrorHandling: z.boolean().default(false),

  // Scoring system
  scoringSystem: z.enum(['numeric', 'letter', 'pass-fail', 'custom']).default('numeric'),
  maxScore: z.number().default(100),
  passingThreshold: z.number().default(70),
  scoreBreakdown: z.boolean().default(true),

  // Feedback configuration
  feedbackLevel: z.enum(['basic', 'detailed', 'comprehensive']).default('detailed'),
  includeExamples: z.boolean().default(true),
  includeSuggestions: z.boolean().default(true),
  includeResources: z.boolean().default(false),

  // AI detection
  enableAiDetection: z.boolean().default(false),
  aiDetectionThreshold: z.number().min(0).max(1).default(0.7),
  aiDetectionAnalyzers: z.string().default('git,documentation'),
  aiDetectionIncludeInReport: z.boolean().default(true),
  aiDetectionFailOnDetection: z.boolean().default(false),

  // Constraints
  allowedLibraries: z.array(z.string()).optional(),
  forbiddenPatterns: z.array(z.string()).optional(),
  nodeVersion: z.string().optional(),
  typescriptVersion: z.string().optional(),
  memoryLimit: z.number().optional(),
  executionTimeout: z.number().optional(),
  timeLimit: z.number().optional(),

  // Diagram generation
  diagram: z.boolean().default(false),

  // Batch processing
  batchTokenLimit: z.number().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

// Configuration file interface (supports both YAML and JSON)
interface ConfigFile {
  api?: {
    google_api_key?: string;
    openrouter_api_key?: string;
    anthropic_api_key?: string;
    openai_api_key?: string;
    model?: string;
    writer_model?: string;
    test_api?: boolean;
  };
  model?: {
    default?: string;
    writer?: string;
  };
  output?: {
    directory?: string;
    dir?: string;
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
    multi_pass?: boolean;
    force_single_pass?: boolean;
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
  system?: {
    debug?: boolean;
    log_level?: string;
  };
  prompts?: {
    prompt_file?: string;
    prompt_fragment?: string;
    prompt_fragment_position?: 'start' | 'middle' | 'end';
    prompt_strategy?: string;
    use_cache?: boolean;
  };
}

/**
 * Unified Configuration Service
 * 
 * This class provides a single source of truth for all configuration management.
 * It handles loading from CLI arguments, environment variables, and config files
 * with a clear precedence order.
 */
export class ConfigurationService {
  private static instance: ConfigurationService | null = null;
  private config: Config | null = null;

  private constructor() {}

  /**
   * Get the singleton instance of the configuration service
   */
  public static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService();
    }
    return ConfigurationService.instance;
  }

  /**
   * Get the current configuration
   * @param cliOptions Optional CLI options to override configuration
   * @returns The validated configuration object
   */
  public getConfig(cliOptions?: CliOptions): Config {
    if (!this.config || cliOptions) {
      this.config = this.buildConfiguration(cliOptions);
    }
    return this.config;
  }

  /**
   * Reset the configuration (useful for testing)
   */
  public resetConfig(): void {
    this.config = null;
  }

  /**
   * Check if any API key is available
   */
  public hasAnyApiKey(config?: Config): boolean {
    const cfg = config || this.getConfig();
    return !!(cfg.googleApiKey || cfg.openRouterApiKey || cfg.anthropicApiKey || cfg.openAIApiKey);
  }

  /**
   * Build the configuration from all sources with proper precedence
   */
  private buildConfiguration(cliOptions?: CliOptions): Config {
    // 1. Load environment variables from .env.local
    this.loadEnvironmentVariables();

    // 2. Load configuration file
    const configFile = this.loadConfigFile(cliOptions?.config);

    // 3. Build configuration with precedence: CLI > Environment > Config File > Defaults
    const rawConfig = this.mergeConfigurationSources(cliOptions, configFile);

    // 4. Validate and return the configuration
    try {
      return ConfigSchema.parse(rawConfig);
    } catch (error) {
      logger.error('Configuration validation failed:', error);
      throw new Error(`Invalid configuration: ${error}`);
    }
  }

  /**
   * Load environment variables from .env.local file
   */
  private loadEnvironmentVariables(): void {
    const envLocalPath = path.join(process.cwd(), '.env.local');
    
    if (fs.existsSync(envLocalPath)) {
      try {
        dotenv.config({ path: envLocalPath, override: true });
        logger.debug(`Loaded environment variables from ${envLocalPath}`);
      } catch (error) {
        logger.warn(`Failed to load environment variables from ${envLocalPath}:`, error);
      }
    }
  }

  /**
   * Load configuration file (YAML or JSON)
   */
  private loadConfigFile(configPath?: string): ConfigFile | null {
    const defaultConfigFiles = [
      '.ai-code-review.yaml',
      '.ai-code-review.yml',
      '.ai-code-review.json',
    ];

    const filesToTry = configPath ? [configPath] : defaultConfigFiles;

    for (const filePath of filesToTry) {
      const fullPath = path.resolve(filePath);

      if (fs.existsSync(fullPath)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const extension = path.extname(fullPath).toLowerCase();

          let config: ConfigFile;
          if (extension === '.json') {
            config = JSON.parse(content);
          } else if (extension === '.yaml' || extension === '.yml') {
            // Use dynamic import for js-yaml
            const yaml = require('js-yaml');
            config = yaml.load(content) as ConfigFile;
          } else {
            logger.warn(`Unsupported config file format: ${extension}`);
            continue;
          }

          logger.debug(`Loaded configuration from ${fullPath}`);
          return config;
        } catch (error) {
          logger.error(`Failed to load config file ${fullPath}:`, error);
          if (configPath) {
            throw error; // If explicitly specified, throw the error
          }
          continue; // Otherwise, try the next file
        }
      }
    }

    return null;
  }

  /**
   * Merge configuration from all sources with proper precedence
   */
  private mergeConfigurationSources(cliOptions?: CliOptions, configFile?: ConfigFile | null): Partial<Config> {
    return {
      // API Keys (environment only, not exposed via CLI for security)
      googleApiKey: this.getApiKey('google'),
      openRouterApiKey: this.getApiKey('openrouter'),
      anthropicApiKey: this.getApiKey('anthropic'),
      openAIApiKey: this.getApiKey('openai'),

      // Model configuration
      model: cliOptions?.model ||
             process.env.AI_CODE_REVIEW_MODEL ||
             configFile?.model?.default ||
             configFile?.api?.model ||
             'gemini:gemini-2.5-pro',

      writerModel: cliOptions?.writerModel ||
                   process.env.AI_CODE_REVIEW_WRITER_MODEL ||
                   configFile?.model?.writer ||
                   configFile?.api?.writer_model,

      // Output configuration
      outputDir: cliOptions?.outputDir ||
                 process.env.AI_CODE_REVIEW_OUTPUT_DIR ||
                 configFile?.output?.directory ||
                 configFile?.output?.dir ||
                 'ai-code-review-docs',

      outputFormat: (cliOptions?.output as 'markdown' | 'json') ||
                    (process.env.AI_CODE_REVIEW_OUTPUT_FORMAT as 'markdown' | 'json') ||
                    configFile?.output?.format ||
                    'markdown',

      // Behavior configuration
      debug: cliOptions?.debug ??
             (process.env.AI_CODE_REVIEW_DEBUG === 'true') ??
             configFile?.behavior?.debug ??
             configFile?.system?.debug ??
             false,

      logLevel: (cliOptions?.logLevel as any) ||
                (process.env.AI_CODE_REVIEW_LOG_LEVEL as any) ||
                configFile?.behavior?.log_level ||
                configFile?.system?.log_level ||
                'info',

      interactive: cliOptions?.interactive ??
                   (process.env.AI_CODE_REVIEW_INTERACTIVE === 'true') ??
                   configFile?.behavior?.interactive ??
                   configFile?.review?.interactive ??
                   false,

      // Review features
      includeTests: cliOptions?.includeTests ??
                    (process.env.AI_CODE_REVIEW_INCLUDE_TESTS === 'true') ??
                    configFile?.features?.include_tests ??
                    configFile?.review?.include_tests ??
                    false,

      includeProjectDocs: cliOptions?.includeProjectDocs ??
                          (process.env.AI_CODE_REVIEW_INCLUDE_PROJECT_DOCS === 'true') ??
                          configFile?.features?.include_project_docs ??
                          configFile?.review?.include_project_docs ??
                          true,

      includeDependencyAnalysis: cliOptions?.includeDependencyAnalysis ??
                                 (process.env.AI_CODE_REVIEW_INCLUDE_DEPENDENCY_ANALYSIS === 'true') ??
                                 configFile?.features?.include_dependency_analysis ??
                                 configFile?.review?.include_dependency_analysis ??
                                 true,

      enableSemanticChunking: cliOptions?.enableSemanticChunking ??
                              (process.env.AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING === 'true') ??
                              configFile?.features?.enable_semantic_chunking ??
                              true,

      // Multi-pass configuration
      multiPass: cliOptions?.multiPass ??
                 (process.env.AI_CODE_REVIEW_MULTI_PASS === 'true') ??
                 configFile?.features?.multi_pass ??
                 false,

      forceSinglePass: cliOptions?.forceSinglePass ??
                       (process.env.AI_CODE_REVIEW_FORCE_SINGLE_PASS === 'true') ??
                       configFile?.features?.force_single_pass ??
                       false,

      contextMaintenanceFactor: cliOptions?.contextMaintenanceFactor ??
                                Number(process.env.AI_CODE_REVIEW_CONTEXT_MAINTENANCE_FACTOR) ??
                                0.15,

      // Advanced features
      testApi: cliOptions?.testApi ??
               (process.env.AI_CODE_REVIEW_TEST_API === 'true') ??
               configFile?.api?.test_api ??
               false,

      estimate: cliOptions?.estimate ??
                (process.env.AI_CODE_REVIEW_ESTIMATE === 'true') ??
                false,

      noConfirm: cliOptions?.noConfirm ??
                 (process.env.AI_CODE_REVIEW_NO_CONFIRM === 'true') ??
                 !(configFile?.review?.confirm ?? true),

      // Paths
      contextPaths: undefined, // contextPaths is not available in CliOptions
      configPath: cliOptions?.config,

      // Coding test specific (from CLI options)
      assignmentFile: cliOptions?.assignmentFile,
      assignmentUrl: cliOptions?.assignmentUrl,
      assignmentText: cliOptions?.assignmentText,
      evaluationTemplate: cliOptions?.evaluationTemplate,
      templateUrl: cliOptions?.templateUrl,
      rubricFile: cliOptions?.rubricFile,
      assessmentType: cliOptions?.assessmentType || 'coding-challenge',
      difficultyLevel: cliOptions?.difficultyLevel || 'mid',

      // Evaluation weights
      weightCorrectness: cliOptions?.weightCorrectness ?? 30,
      weightCodeQuality: cliOptions?.weightCodeQuality ?? 25,
      weightArchitecture: cliOptions?.weightArchitecture ?? 20,
      weightPerformance: cliOptions?.weightPerformance ?? 15,
      weightTesting: cliOptions?.weightTesting ?? 10,

      // Evaluation options
      evaluateDocumentation: cliOptions?.evaluateDocumentation ?? false,
      evaluateGitHistory: cliOptions?.evaluateGitHistory ?? false,
      evaluateEdgeCases: cliOptions?.evaluateEdgeCases ?? false,
      evaluateErrorHandling: cliOptions?.evaluateErrorHandling ?? false,

      // Scoring system
      scoringSystem: cliOptions?.scoringSystem || 'numeric',
      maxScore: cliOptions?.maxScore ?? 100,
      passingThreshold: cliOptions?.passingThreshold ?? 70,
      scoreBreakdown: cliOptions?.scoreBreakdown ?? true,

      // Feedback configuration
      feedbackLevel: cliOptions?.feedbackLevel || 'detailed',
      includeExamples: cliOptions?.includeExamples ?? true,
      includeSuggestions: cliOptions?.includeSuggestions ?? true,
      includeResources: cliOptions?.includeResources ?? false,

      // AI detection
      enableAiDetection: cliOptions?.enableAiDetection ?? false,
      aiDetectionThreshold: cliOptions?.aiDetectionThreshold ?? 0.7,
      aiDetectionAnalyzers: cliOptions?.aiDetectionAnalyzers || 'git,documentation',
      aiDetectionIncludeInReport: cliOptions?.aiDetectionIncludeInReport ?? true,
      aiDetectionFailOnDetection: cliOptions?.aiDetectionFailOnDetection ?? false,

      // Constraints
      allowedLibraries: cliOptions?.allowedLibraries,
      forbiddenPatterns: cliOptions?.forbiddenPatterns,
      nodeVersion: cliOptions?.nodeVersion,
      typescriptVersion: cliOptions?.typescriptVersion,
      memoryLimit: cliOptions?.memoryLimit,
      executionTimeout: cliOptions?.executionTimeout,
      timeLimit: cliOptions?.timeLimit,

      // Diagram generation
      diagram: cliOptions?.diagram ?? false,

      // Batch processing
      batchTokenLimit: cliOptions?.batchTokenLimit,
    };
  }

  /**
   * Get API key from environment variables with fallback support
   */
  private getApiKey(provider: 'google' | 'openrouter' | 'anthropic' | 'openai'): string | undefined {
    switch (provider) {
      case 'google':
        return process.env.AI_CODE_REVIEW_GOOGLE_API_KEY ||
               process.env.GOOGLE_GENERATIVE_AI_KEY ||
               process.env.GOOGLE_AI_STUDIO_KEY;
      case 'openrouter':
        return process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY ||
               process.env.OPENROUTER_API_KEY;
      case 'anthropic':
        return process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY ||
               process.env.ANTHROPIC_API_KEY;
      case 'openai':
        return process.env.AI_CODE_REVIEW_OPENAI_API_KEY ||
               process.env.OPENAI_API_KEY;
      default:
        return undefined;
    }
  }
}

// Export singleton instance for easy access
export const configurationService = ConfigurationService.getInstance();

// Export convenience functions for backward compatibility
export function getConfig(cliOptions?: CliOptions): Config {
  return configurationService.getConfig(cliOptions);
}

export function resetConfig(): void {
  configurationService.resetConfig();
}

export function hasAnyApiKey(config?: Config): boolean {
  return configurationService.hasAnyApiKey(config);
}
