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

// Extended review options including CLI-specific options
export interface CliOptions extends ReviewOptions {
  target: string;
  version?: boolean;
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
        choices: ['architectural', 'quick-fixes', 'security', 'performance'] as const,
        default: 'quick-fixes' as ReviewType,
        describe: 'Type of review to perform',
      })
      .option('output', {
        alias: 'o',
        choices: ['markdown', 'json'] as const,
        default: 'markdown',
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
        type: 'string',
        default: 'typescript',
        describe: 'Programming language for the code review (currently only typescript is supported)',
      })
      .option('listmodels', {
        type: 'boolean',
        default: false,
        describe: 'List all available models based on configured API keys',
      })
      .strict() // Report errors for unknown options
      .help()
      .parseAsync();

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
  const validReviewTypes = ['architectural', 'quick-fixes', 'security', 'performance'];
  if (!validReviewTypes.includes(options.type)) {
    logger.error(`Invalid review type: ${options.type}`);
    logger.error(`Valid types are: ${validReviewTypes.join(', ')}`);
    process.exit(1);
  }

  // Validate output format
  const validOutputFormats = ['markdown', 'json'];
  if (!validOutputFormats.includes(options.output)) {
    logger.error(`Invalid output format: ${options.output}`);
    logger.error(`Valid formats are: ${validOutputFormats.join(', ')}`);
    process.exit(1);
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
