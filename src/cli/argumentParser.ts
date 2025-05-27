/**
 * @fileoverview Command-line argument parser for the code review tool.
 *
 * This module is responsible for parsing and validating command-line arguments
 * using the yargs library. It defines the expected arguments, their types,
 * allowed values, and default values.
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import path from 'path';
import { ReviewOptions, ReviewType } from '../types/review';
import {
  OutputFormat,
  ProgrammingLanguage,
  VALID_LANGUAGES,
  VALID_OUTPUT_FORMATS,
  VALID_REVIEW_TYPES
} from '../types/common';
import { SUPPORTED_LANGUAGES } from '../utils/i18n';
// import { LogLevel } from '../utils/logger'; // Not used in this file
import { detectProjectType } from '../utils/detection';
import configFileManager from '../utils/configFileManager';

// Extended review options including CLI-specific options
export interface CliOptions extends ReviewOptions {
  target: string;
  version?: boolean;
  uiLanguage?: string;
  model?: string;
  writerModel?: string;
  outputDir?: string;
  logLevel?: string;
  config?: string;
  generateConfig?: boolean;
  apiKey?: {
    google?: string;
    openrouter?: string;
    anthropic?: string;
    openai?: string;
  };
  githubSync?: {
    direction?: 'to-github' | 'from-github';
    projectPath?: string;
    projectId?: string;
    projectNumber?: number;
  };
}
import logger from '../utils/logger';

/**
 * Parse command-line arguments using yargs
 * @returns Parsed arguments as ReviewOptions
 */
export async function parseArguments(): Promise<CliOptions> {
  try {
    const argv = await yargs(hideBin(process.argv))
      .command(
        '$0 [target]',
        'Run AI code review on a file or directory',
        yargs => {
          return yargs.positional('target', {
            describe: 'Path to the file or directory to review',
            type: 'string',
            default: '.'
          });
        }
      )
      .option('target', {
        type: 'string',
        default: '.',
        describe: 'Path to the file or directory to review'
      })
      .option('type', {
        alias: 't',
        choices: [
          'architectural',
          'arch',
          'quick-fixes',
          'security',
          'performance',
          'unused-code',
          'code-tracing-unused-code',
          'best-practices'
        ] as readonly ReviewType[],
        default: 'quick-fixes' as ReviewType,
        describe: 'Type of review to perform'
      })
      .option('output', {
        alias: 'o',
        choices: VALID_OUTPUT_FORMATS as readonly OutputFormat[],
        default: 'markdown' as OutputFormat,
        describe: 'Output format for the review'
      })
      .option('interactive', {
        alias: 'i',
        type: 'boolean',
        default: false,
        describe: 'Run in interactive mode with real-time feedback'
      })
      .option('individual', {
        type: 'boolean',
        default: false,
        describe:
          'Generate separate reviews for each file instead of one consolidated review'
      })
      .option('include-tests', {
        type: 'boolean',
        default: false,
        describe: 'Include test files in the review (normally excluded by default)'
      })
      .option('include-project-docs', {
        type: 'boolean',
        default: false,
        describe: 'Include README.md and other project docs in the AI context for better understanding'
      })
      .option('include-dependency-analysis', {
        type: 'boolean',
        default: true,
        describe: 'Include dependency analysis in architectural and security reviews'
      })
      .option('debug', {
        type: 'boolean',
        default: false,
        describe: 'Enable detailed debug logging for troubleshooting'
      })
      .option('test-api', {
        type: 'boolean',
        default: false,
        describe: 'Verify AI provider API connections before starting the review'
      })
      .option('auto-fix', {
        type: 'boolean',
        default: false,
        describe: 'Automatically implement high-priority fixes without confirmation in interactive mode'
      })
      .option('prompt-all', {
        type: 'boolean',
        default: false,
        describe: 'Ask for confirmation on all fixes, including high priority ones (overrides --auto-fix)'
      })
      // Configure version handling
      .version(false) // Disable automatic version handling
      .option('show-version', {
        alias: 'v',
        type: 'boolean',
        describe: 'Show version information'
      })
      .option('estimate', {
        alias: 'e',
        type: 'boolean',
        default: false,
        describe: 'Estimate token usage and cost without performing the review'
      })
      .option('language', {
        alias: 'l',
        choices: VALID_LANGUAGES as readonly ProgrammingLanguage[],
        describe: 'Programming language for the code review (auto-detected if not specified)'
      })
      .option('listmodels', {
        type: 'boolean',
        default: false,
        describe: 'Display all available AI models based on your configured API keys'
      })
      .option('models', {
        type: 'boolean',
        default: false,
        describe: 'Show all supported AI models and their configuration details, regardless of API key availability'
      })
      .option('strategy', {
        type: 'string',
        describe: 'Custom review strategy to use (plugin name)'
      })
      .option('prompt-file', {
        alias: 'prompt',
        type: 'string',
        describe: 'Path to a custom prompt template file (overrides built-in prompts)'
      })
      .option('prompt-fragment', {
        type: 'string',
        describe: 'Custom instructions to inject into the AI prompt (focuses the review)'
      })
      .option('prompt-fragment-position', {
        choices: ['start', 'middle', 'end'],
        default: 'middle',
        describe: 'Position of the prompt fragment in the prompt'
      })
      .option('prompt-strategy', {
        type: 'string',
        describe: 'Prompt formatting strategy to use (anthropic, gemini, openai, langchain)'
      })
      .option('use-cache', {
        type: 'boolean',
        default: true,
        describe: 'Enable prompt template caching for faster execution (use --no-use-cache to disable)'
      })
      .option('trace-code', {
        type: 'boolean',
        default: false,
        describe:
          'Enable deep code tracing for high-confidence unused code detection (used with --type unused-code)'
      })
      .option('use-ts-prune', {
        type: 'boolean',
        default: false,
        describe:
          'Use ts-prune static analysis to detect unused exports (used with --type unused-code)'
      })
      .option('use-eslint', {
        type: 'boolean',
        default: false,
        describe:
          'Use eslint static analysis to detect unused variables (used with --type unused-code)'
      })
      .option('confirm', {
        type: 'boolean',
        default: true,
        describe: 'Prompt for confirmation before proceeding with multi-pass reviews (use --no-confirm to skip)'
      })
      .option('ui-language', {
        choices: SUPPORTED_LANGUAGES,
        default: 'en',
        describe: 'Language for the user interface'
      })
      .option('model', {
        alias: 'm',
        type: 'string',
        describe: 'Override the model to use (format: provider:model-name)'
      })
      .option('writer-model', {
        type: 'string',
        describe: 'Override the model to use for report consolidation/writing (format: provider:model-name)'
      })
      .option('output-dir', {
        type: 'string',
        describe: 'Override the output directory for review results'
      })
      .option('log-level', {
        choices: ['debug', 'info', 'warn', 'error', 'none'],
        describe: 'Set the logging level'
      })
      .option('google-api-key', {
        type: 'string',
        describe: 'Override the Google API key'
      })
      .option('openrouter-api-key', {
        type: 'string',
        describe: 'Override the OpenRouter API key'
      })
      .option('anthropic-api-key', {
        type: 'string',
        describe: 'Override the Anthropic API key'
      })
      .option('openai-api-key', {
        type: 'string',
        describe: 'Override the OpenAI API key'
      })
      .option('which-dir', {
        type: 'boolean',
        default: false,
        describe: 'Show the tool installation directory and environment file locations'
      })
      .option('config', {
        type: 'string',
        describe: 'Path to a JSON configuration file'
      })
      .option('generate-config', {
        type: 'boolean',
        default: false,
        describe: 'Generate a sample configuration file to stdout'
      })
      .strict() // Report errors for unknown options
      .help()
      .parseAsync();

    // Process API key overrides
    const apiKey: CliOptions['apiKey'] = {};
    if (argv['google-api-key'])
      apiKey.google = argv['google-api-key'] as string;
    if (argv['openrouter-api-key'])
      apiKey.openrouter = argv['openrouter-api-key'] as string;
    if (argv['anthropic-api-key'])
      apiKey.anthropic = argv['anthropic-api-key'] as string;
    if (argv['openai-api-key'])
      apiKey.openai = argv['openai-api-key'] as string;

    // Add API key overrides to the options
    if (Object.keys(apiKey).length > 0) {
      argv.apiKey = apiKey;
    }

    // Process other config overrides
    if (argv['output-dir']) argv.outputDir = argv['output-dir'] as string;
    if (argv['log-level']) argv.logLevel = argv['log-level'] as string;
    if (argv['generate-config']) argv.generateConfig = argv['generate-config'] as boolean;

    // Auto-detect language if not specified
    if (!argv.language) {
      try {
        const targetPath = path.resolve(process.cwd(), argv.target || '.');
        logger.debug(`Auto-detecting project language for: ${targetPath}`);

        const detection = await detectProjectType(targetPath);
        if (detection) {
          const confidenceEmoji =
            detection.confidence === 'high' ? '✅' :
            detection.confidence === 'medium' ? '🔍' : '🔎';

          logger.debug(
            `Detected project language: ${detection.language} (${detection.confidence} confidence)` +
            (detection.projectType ? ` - Project type: ${detection.projectType}` : '')
          );

          // Set the detected language in the arguments
          argv.language = detection.language;

          // Show info message for medium/high confidence detections
          if (detection.confidence !== 'low') {
            logger.info(
              `${confidenceEmoji} Auto-detected project language: ${detection.language}` +
              (detection.projectType ? ` (${detection.projectType})` : '')
            );
          } else {
            // For low confidence, still set the language but default to typescript if not found
            argv.language = detection.language || 'typescript';
            logger.debug(`Low confidence detection, using language: ${argv.language}`);
          }
        } else {
          // If detection returns null or undefined, default to typescript
          argv.language = 'typescript';
          logger.debug(`No language detected, defaulting to TypeScript`);
        }
      } catch (error) {
        // Log error but continue with typescript as default
        logger.debug(
          `Error auto-detecting project language: ${error instanceof Error ? error.message : String(error)}`
        );
        argv.language = 'typescript';
      }
    }

    return argv as CliOptions;
  } catch (error) {
    logger.error(
      'Error parsing arguments:',
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  }
}

/**
 * Validate the parsed arguments for consistency and correctness
 * @param options The parsed command-line arguments
 * @returns The validated options
 */
export function validateArguments(options: CliOptions): CliOptions {
  // Check for conflicting options
  if (options.interactive && options.output === 'json') {
    logger.warn(
      'Interactive mode is not compatible with JSON output. Switching to markdown output.'
    );
    options.output = 'markdown';
  }

  // Handle review type aliases
  if (options.type === 'arch') {
    options.type = 'architectural';
    logger.debug('Mapped review type alias "arch" to "architectural"');
  }

  // Validate review type
  const validReviewTypes = VALID_REVIEW_TYPES.filter(
    type => type !== 'consolidated'
  ) as Array<Exclude<ReviewType, 'consolidated'>>;
  if (
    !validReviewTypes.includes(
      options.type as Exclude<ReviewType, 'consolidated'>
    )
  ) {
    logger.error(`Invalid review type: ${options.type}`);
    logger.error(`Valid types are: ${validReviewTypes.join(', ')}`);
    process.exit(1);
  }

  // Validate output format
  if (!VALID_OUTPUT_FORMATS.includes(options.output as OutputFormat)) {
    logger.error(`Invalid output format: ${options.output}`);
    logger.error(`Valid formats are: ${VALID_OUTPUT_FORMATS.join(', ')}`);
    process.exit(1);
  }

  // Validate programming language
  if (
    options.language &&
    !VALID_LANGUAGES.includes(options.language as ProgrammingLanguage)
  ) {
    logger.error(`Invalid programming language: ${options.language}`);
    logger.error(`Valid languages are: ${VALID_LANGUAGES.join(', ')}`);
    process.exit(1);
  }

  // Validate UI language
  if (options.uiLanguage && !SUPPORTED_LANGUAGES.includes(options.uiLanguage)) {
    logger.error(`Invalid UI language: ${options.uiLanguage}`);
    logger.error(`Valid UI languages are: ${SUPPORTED_LANGUAGES.join(', ')}`);
    process.exit(1);
  }

  // Map ui-language option to uiLanguage property
  if ((options as any)['ui-language']) {
    options.uiLanguage = (options as any)['ui-language'];
    delete (options as any)['ui-language'];
  }

  // Map confirm option to noConfirm property (inverse logic)
  if ((options as any)['confirm'] !== undefined) {
    options.noConfirm = !(options as any)['confirm'];
    delete (options as any)['confirm'];
  }

  return options;
}

/**
 * Parse and validate command-line arguments
 * @returns The validated command-line arguments
 */
export async function getCommandLineArguments(): Promise<CliOptions> {
  // Parse arguments from command line
  const parsedArgs = await parseArguments();
  
  // Handle generate-config flag
  if (parsedArgs.generateConfig) {
    // Print sample config to stdout and exit
    console.log(configFileManager.generateSampleConfig());
    process.exit(0);
  }
  
  // Load config file if specified
  const configFilePath = parsedArgs.config;
  const configData = configFileManager.loadConfigFile(configFilePath);
  
  // Apply config file values to options (CLI args take precedence)
  let finalOptions: CliOptions = parsedArgs;
  if (configData) {
    // Apply config file values, but CLI args still take precedence
    const updatedOptions = configFileManager.applyConfigToOptions(configData, parsedArgs);
    
    // Ensure we maintain the target property which is required in CliOptions
    finalOptions = {
      ...updatedOptions,
      target: parsedArgs.target
    } as CliOptions;
    
    // Map any snake_case config values to camelCase
    if (configFilePath) {
      logger.info(`Applied configuration from ${configFilePath}`);
    } else {
      logger.info('Applied configuration from default .ai-code-review.json file');
    }
  }
  
  // Validate arguments
  return validateArguments(finalOptions);
}
