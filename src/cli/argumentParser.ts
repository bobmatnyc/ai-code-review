/**
 * @fileoverview Command-line argument parser for the code review tool.
 *
 * This module defines and parses command-line arguments for the code review tool
 * using the yargs library. It provides a consistent interface for all commands
 * and ensures that required arguments are provided.
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ReviewType, ReviewOptions } from '../types/review';
import { loadConfigSafe, displayConfigError } from '../utils/config';
import logger from '../utils/logger';

// Define valid review types
const validReviewTypes: ReviewType[] = [
  'quick-fixes',
  'architectural',
  'security',
  'performance',
  'unused-code',
  'focused-unused-code',
  'code-tracing-unused-code',
  'improved-quick-fixes',
  'consolidated',
  'evaluation',
  'extract-patterns'
];

// Define valid output formats
const validOutputFormats = ['markdown', 'json'];

/**
 * Parse command-line arguments for the code review tool
 * @returns Parsed arguments
 */
export function parseArguments(): any {
  // Try to load configuration safely
  const configResult = loadConfigSafe();

  if (!configResult.success) {
    // Display user-friendly error and exit
    displayConfigError(configResult);
    process.exit(1);
  }

  const config = configResult.config;

  // Get the default model from configuration
  const defaultModel = config.selectedModel || '';
  
  // Parse command-line arguments using yargs
  const argv = yargs(hideBin(process.argv))
    .command(
      ['$0 [target]', 'code-review [target]'],
      'Run a code review on the specified target',
      yargs => {
        return yargs
          .positional('target', {
            describe: 'Path to the file or directory to review',
            type: 'string',
            default: '.'
          })
          .option('type', {
            alias: 't',
            describe: 'Type of review to perform',
            choices: validReviewTypes
            // No default here - will be set after config file is applied
          })
          .option('output', {
            alias: 'o',
            describe: 'Output format (markdown or json)',
            choices: validOutputFormats,
            default: 'markdown'
          })
          .option('output-dir', {
            describe: 'Directory to save review output',
            type: 'string'
          })
          .option('model', {
            alias: 'm',
            describe: 'Model to use for the review (format: provider:model)',
            type: 'string',
            default: defaultModel
          })
          .option('include-tests', {
            describe: 'Include test files in the review',
            type: 'boolean',
            default: false
          })
          .option('include-project-docs', {
            describe: 'Include project documentation in the review context',
            type: 'boolean',
            default: true
          })
          .option('include-dependency-analysis', {
            describe: 'Include dependency analysis in the review',
            type: 'boolean',
            default: undefined
          })
          .option('enable-semantic-chunking', {
            describe: 'Enable semantic chunking for intelligent code analysis',
            type: 'boolean',
            default: process.env.AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING === 'false' ? false : true
          })
          .option('interactive', {
            alias: 'i',
            describe: 'Run in interactive mode, processing review results in real-time',
            type: 'boolean',
            default: false
          })
          .option('test-api', {
            describe: 'Test API connections before running the review',
            type: 'boolean',
            default: false
          })
          .option('estimate', {
            describe: 'Estimate token usage and cost without performing the review',
            type: 'boolean',
            default: false
          })
          .option('multi-pass', {
            describe: 'Use multi-pass review for large codebases',
            type: 'boolean',
            default: false
          })
          .option('force-single-pass', {
            describe: 'Force single-pass review even if token analysis suggests multiple passes are needed',
            type: 'boolean',
            default: false
          })
          .option('context-maintenance-factor', {
            describe: 'Context maintenance factor for multi-pass reviews (0-1)',
            type: 'number',
            default: 0.15
          })
          .option('no-confirm', {
            describe: 'Skip confirmation prompts',
            type: 'boolean',
            default: false
          })
          .option('debug', {
            describe: 'Enable debug logging',
            type: 'boolean',
            default: false
          })
          .option('language', {
            describe: 'Specify the programming language (auto-detected if not specified)',
            type: 'string'
          })
          .option('framework', {
            describe: 'Specify the framework (auto-detected if not specified)',
            type: 'string'
          })
          .option('listmodels', {
            describe: 'List available models based on configured API keys',
            type: 'boolean',
            default: false
          })
          .option('models', {
            describe: 'List all supported models and their configuration names',
            type: 'boolean',
            default: false
          })
          .option('config', {
            describe: 'Path to JSON configuration file',
            type: 'string'
          })
          .option('google-api-key', {
            describe: 'Google API key for Gemini models',
            type: 'string'
          })
          .option('openrouter-api-key', {
            describe: 'OpenRouter API key',
            type: 'string'
          })
          .option('anthropic-api-key', {
            describe: 'Anthropic API key for Claude models',
            type: 'string'
          })
          .option('openai-api-key', {
            describe: 'OpenAI API key for GPT models',
            type: 'string'
          });
      }
    )
    .command(
      'test-model',
      'Test the configured model with a simple prompt',
      yargs => {
        return yargs
          .option('model', {
            alias: 'm',
            describe: 'Model to test (format: provider:model)',
            type: 'string',
            default: defaultModel
          })
          .option('debug', {
            describe: 'Enable debug logging',
            type: 'boolean',
            default: false
          })
          .option('google-api-key', {
            describe: 'Google API key for Gemini models',
            type: 'string'
          })
          .option('openrouter-api-key', {
            describe: 'OpenRouter API key',
            type: 'string'
          })
          .option('anthropic-api-key', {
            describe: 'Anthropic API key for Claude models',
            type: 'string'
          })
          .option('openai-api-key', {
            describe: 'OpenAI API key for GPT models',
            type: 'string'
          });
      }
    )
    .command(
      'test-build',
      'Test the build by running a simple command',
      yargs => {
        return yargs
          .option('debug', {
            describe: 'Enable debug logging',
            type: 'boolean',
            default: false
          });
      }
    )
    .command(
      'sync-github-projects',
      'Sync GitHub projects to local directory',
      yargs => {
        return yargs
          .option('token', {
            describe: 'GitHub token',
            type: 'string',
            demandOption: true
          })
          .option('org', {
            describe: 'GitHub organization',
            type: 'string',
            demandOption: true
          })
          .option('output-dir', {
            describe: 'Output directory',
            type: 'string',
            default: './github-projects'
          })
          .option('debug', {
            describe: 'Enable debug logging',
            type: 'boolean',
            default: false
          });
      }
    )
    .command(
      'generate-config',
      'Generate a sample configuration file',
      yargs => {
        return yargs
          .option('output', {
            alias: 'o',
            describe: 'Output file path for the configuration',
            type: 'string'
          })
          .option('format', {
            alias: 'f',
            describe: 'Configuration file format',
            choices: ['yaml', 'json'],
            default: 'yaml'
          })
          .option('force', {
            describe: 'Overwrite existing configuration file',
            type: 'boolean',
            default: false
          });
      }
    )
    .option('show-version', {
      describe: 'Show version information',
      type: 'boolean',
      default: false
    })
    .help()
    .alias('help', 'h')
    .alias('version', 'v')
    .strict()
    .demandCommand(0) // Don't require a command for version/help flags
    .parse();

  // Enable debug logging if requested
  if ((argv as any).debug) {
    logger.setLogLevel('debug');
    logger.debug('Debug logging enabled');
    logger.debug(`Environment variable AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING: ${process.env.AI_CODE_REVIEW_ENABLE_SEMANTIC_CHUNKING || 'not set (defaults to true)'}`);
    logger.debug(`Semantic chunking enabled: ${(argv as any).enableSemanticChunking}`);
    logger.debug(`Command-line arguments: ${JSON.stringify(argv, null, 2)}`);
  }

  return argv;
}

/**
 * CLI options interface that extends ReviewOptions with CLI-specific properties
 */
export interface CliOptions extends ReviewOptions {
  /** Target file or directory path */
  target: string;
  /** Output directory for generated files */
  outputDir?: string;
  /** Writer model for consolidation */
  writerModel?: string;
  /** API keys for different providers */
  apiKey?: Record<string, string>;
  /** API keys from CLI (alternative name for compatibility) */
  apiKeys?: Record<string, string>;
  /** Log level for logging */
  logLevel?: string;
  /** Path to JSON configuration file */
  config?: string;
}

/**
 * Map command-line arguments to review options
 * @param argv Parsed command-line arguments
 * @returns Review options
 */
interface ParsedArguments {
  type?: string;
  individual?: boolean;
  output?: string;
  outputDir?: string;
  model?: string;
  includeTests?: boolean;
  includeProjectDocs?: boolean;
  includeDependencyAnalysis?: boolean;
  enableSemanticChunking?: boolean;
  interactive?: boolean;
  testApi?: boolean;
  estimate?: boolean;
  multiPass?: boolean;
  forceSinglePass?: boolean;
  contextMaintenanceFactor?: number;
  noConfirm?: boolean;
  confirm?: boolean;
  debug?: boolean;
  language?: string;
  framework?: string;
  listmodels?: boolean;
  models?: boolean;
  target?: string;
  config?: string;
  'ui-language'?: string;
  uiLanguage?: string;
  'google-api-key'?: string;
  'openrouter-api-key'?: string;
  'anthropic-api-key'?: string;
  'openai-api-key'?: string;
}

export function mapArgsToReviewOptions(
  argv: ParsedArguments
): ReviewOptions & { target: string } & { apiKeys?: Record<string, string> } {
  const options: ReviewOptions & { target: string } & { apiKeys?: Record<string, string> } = {
    type: (argv.type as ReviewType) || 'quick-fixes', // Apply default if not set by CLI or config
    output: argv.output,
    outputDir: argv.outputDir,
    model: argv.model,
    includeTests: argv.includeTests,
    includeProjectDocs: argv.includeProjectDocs,
    includeDependencyAnalysis: argv.includeDependencyAnalysis,
    enableSemanticChunking: argv.enableSemanticChunking,
    interactive: argv.interactive,
    testApi: argv.testApi,
    estimate: argv.estimate,
    multiPass: argv.multiPass,
    forceSinglePass: argv.forceSinglePass,
    contextMaintenanceFactor: argv.contextMaintenanceFactor,
    noConfirm: argv.noConfirm,
    debug: argv.debug,
    language: argv.language,
    framework: argv.framework,
    listmodels: argv.listmodels,
    models: argv.models,
    target: argv.target || '.'
  };

  // Add API keys if provided
  const apiKeys: Record<string, string> = {};
  if (argv['google-api-key']) {
    apiKeys.google = argv['google-api-key'];
  }
  if (argv['openrouter-api-key']) {
    apiKeys.openrouter = argv['openrouter-api-key'];
  }
  if (argv['anthropic-api-key']) {
    apiKeys.anthropic = argv['anthropic-api-key'];
  }
  if (argv['openai-api-key']) {
    apiKeys.openai = argv['openai-api-key'];
  }

  if (Object.keys(apiKeys).length > 0) {
    options.apiKeys = apiKeys;
  }

  return options;
}

/**
 * Validate and transform command-line arguments
 * @param options Raw command-line options
 * @returns Validated and transformed options
 */
export function validateArguments(options: ParsedArguments): ParsedArguments {
  const validated = { ...options };

  // Handle review type aliases
  if (validated.type === 'arch') {
    validated.type = 'architectural';
  }

  // Map ui-language to uiLanguage and remove the original property
  if (validated['ui-language']) {
    validated.uiLanguage = validated['ui-language'];
    delete validated['ui-language'];
  }

  // Map confirm option to noConfirm with inverse logic
  if (validated.confirm !== undefined) {
    validated.noConfirm = !validated.confirm;
    delete validated.confirm;
  }

  return validated;
}
