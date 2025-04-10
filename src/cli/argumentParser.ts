/**
 * @fileoverview Command-line argument parser for the code review tool.
 *
 * This module is responsible for parsing and validating command-line arguments
 * using the yargs library. It defines the expected arguments, their types,
 * allowed values, and default values.
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { ReviewOptions, ReviewType } from '../types/review';
import { OutputFormat, ProgrammingLanguage, VALID_LANGUAGES, VALID_OUTPUT_FORMATS, VALID_REVIEW_TYPES, VALID_PRIORITY_FILTERS } from '../types/common';
import { SUPPORTED_LANGUAGES } from '../utils/i18n';
import { LogLevel } from '../utils/logger';

// Extended review options including CLI-specific options
export interface CliOptions extends ReviewOptions {
  target: string;
  version?: boolean;
  uiLanguage?: string;
  model?: string;
  outputDir?: string;
  logLevel?: string;
  apiKey?: {
    google?: string;
    openrouter?: string;
    anthropic?: string;
    openai?: string;
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
      .command('$0 [target]', 'Run AI code review on a file or directory', (yargs) => {
        return yargs.positional('target', {
          describe: 'Path to the file or directory to review',
          type: 'string',
          default: '.',
        });
      })
      .option('target', {
        type: 'string',
        default: '.',
        describe: 'Path to the file or directory to review',
      })
      .option('type', {
        alias: 't',
        choices: VALID_REVIEW_TYPES.filter(type => type !== 'consolidated') as readonly ReviewType[],
        default: 'quick-fixes' as ReviewType,
        describe: 'Type of review to perform',
      })
      .option('output', {
        alias: 'o',
        choices: VALID_OUTPUT_FORMATS as readonly OutputFormat[],
        default: 'markdown' as OutputFormat,
        describe: 'Output format for the review',
      })
      .option('interactive', {
        alias: 'i',
        type: 'boolean',
        default: false,
        describe: 'Run in interactive mode with real-time feedback',
      })
      .option('individual', {
        type: 'boolean',
        default: false,
        describe: 'Process each file individually instead of a consolidated review',
      })
      .option('include-tests', {
        type: 'boolean',
        default: false,
        describe: 'Include test files in the review',
      })
      .option('include-project-docs', {
        type: 'boolean',
        default: false,
        describe: 'Include project documentation in the review context',
      })
      .option('debug', {
        type: 'boolean',
        default: false,
        describe: 'Enable debug logging',
      })
      .option('test-api', {
        type: 'boolean',
        default: false,
        describe: 'Test API connections before starting the review',
      })
      .option('auto-fix', {
        type: 'boolean',
        default: false,
        describe: 'Automatically implement suggested fixes in interactive mode',
      })
      .option('prompt-all', {
        type: 'boolean',
        default: false,
        describe: 'Prompt for all fixes, including high priority ones',
      })
      .option('version', {
        alias: 'v',
        type: 'boolean',
        describe: 'Show version information',
      })
      .option('estimate', {
        alias: 'e',
        type: 'boolean',
        default: false,
        describe: 'Estimate token usage and cost without performing the review',
      })
      .option('language', {
        alias: 'l',
        choices: VALID_LANGUAGES as readonly ProgrammingLanguage[],
        default: 'typescript' as ProgrammingLanguage,
        describe: 'Programming language for the code review',
      })
      .option('listmodels', {
        type: 'boolean',
        default: false,
        describe: 'List all available models based on configured API keys',
      })
      .option('strategy', {
        type: 'string',
        describe: 'Custom review strategy to use (plugin name)',
      })
      .option('prompt-file', {
        alias: 'prompt',
        type: 'string',
        describe: 'Path to a custom prompt template file',
      })
      .option('prompt-fragment', {
        type: 'string',
        describe: 'Custom prompt fragment to inject into the prompt',
      })
      .option('prompt-fragment-position', {
        choices: ['start', 'middle', 'end'],
        default: 'middle',
        describe: 'Position of the prompt fragment in the prompt',
      })
      .option('prompt-strategy', {
        type: 'string',
        describe: 'Prompt strategy to use (e.g., anthropic, gemini, openai)',
      })
      .option('use-cache', {
        type: 'boolean',
        default: true,
        describe: 'Whether to use cached prompts',
      })
      .option('ui-language', {
        choices: SUPPORTED_LANGUAGES,
        default: 'en',
        describe: 'Language for the user interface',
      })
      .option('model', {
        alias: 'm',
        type: 'string',
        describe: 'Override the model to use (format: provider:model-name)',
      })
      .option('output-dir', {
        type: 'string',
        describe: 'Override the output directory for review results',
      })
      .option('log-level', {
        choices: ['debug', 'info', 'warn', 'error', 'none'],
        describe: 'Set the logging level',
      })
      .option('google-api-key', {
        type: 'string',
        describe: 'Override the Google API key',
      })
      .option('openrouter-api-key', {
        type: 'string',
        describe: 'Override the OpenRouter API key',
      })
      .option('anthropic-api-key', {
        type: 'string',
        describe: 'Override the Anthropic API key',
      })
      .option('openai-api-key', {
        type: 'string',
        describe: 'Override the OpenAI API key',
      })
      .strict() // Report errors for unknown options
      .help()
      .parseAsync();

    // Process API key overrides
    const apiKey: CliOptions['apiKey'] = {};
    if (argv['google-api-key']) apiKey.google = argv['google-api-key'] as string;
    if (argv['openrouter-api-key']) apiKey.openrouter = argv['openrouter-api-key'] as string;
    if (argv['anthropic-api-key']) apiKey.anthropic = argv['anthropic-api-key'] as string;
    if (argv['openai-api-key']) apiKey.openai = argv['openai-api-key'] as string;

    // Add API key overrides to the options
    if (Object.keys(apiKey).length > 0) {
      argv.apiKey = apiKey;
    }

    // Process other config overrides
    if (argv['output-dir']) argv.outputDir = argv['output-dir'] as string;
    if (argv['log-level']) argv.logLevel = argv['log-level'] as string;

    return argv as CliOptions;
  } catch (error) {
    logger.error('Error parsing arguments:', error instanceof Error ? error.message : String(error));
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
    logger.warn('Interactive mode is not compatible with JSON output. Switching to markdown output.');
    options.output = 'markdown';
  }

  // Validate review type
  const validReviewTypes = VALID_REVIEW_TYPES.filter(type => type !== 'consolidated') as Array<Exclude<ReviewType, 'consolidated'>>;
  if (!validReviewTypes.includes(options.type as Exclude<ReviewType, 'consolidated'>)) {
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
  if (options.language && !VALID_LANGUAGES.includes(options.language as ProgrammingLanguage)) {
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

  return options;
}

/**
 * Parse and validate command-line arguments
 * @returns The validated command-line arguments
 */
export async function getCommandLineArguments(): Promise<CliOptions> {
  const parsedArgs = await parseArguments();
  return validateArguments(parsedArgs);
}
