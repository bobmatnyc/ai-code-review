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
import { getConfig } from '../utils/config';
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
  'consolidated'
];

// Define valid output formats
const validOutputFormats = ['markdown', 'json'];

/**
 * Parse command-line arguments for the code review tool
 * @returns Parsed arguments
 */
export function parseArguments() {
  const config = getConfig();
  
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
            choices: validReviewTypes,
            default: 'quick-fixes'
          })
          .option('individual', {
            alias: 'i',
            describe: 'Generate individual reviews for each file instead of a consolidated review',
            type: 'boolean',
            default: false
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
          .option('interactive', {
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
    logger.level = 'debug';
    logger.debug('Debug logging enabled');
    logger.debug(`Command-line arguments: ${JSON.stringify(argv, null, 2)}`);
  }

  return argv;
}

/**
 * Map command-line arguments to review options
 * @param argv Parsed command-line arguments
 * @returns Review options
 */
export function mapArgsToReviewOptions(
  argv: any // TODO: properly type this
): ReviewOptions {
  return {
    type: argv.type as ReviewType,
    individual: argv.individual,
    output: argv.output,
    outputDir: argv.outputDir,
    model: argv.model,
    includeTests: argv.includeTests,
    includeProjectDocs: argv.includeProjectDocs,
    includeDependencyAnalysis: argv.includeDependencyAnalysis,
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
    models: argv.models
  };
}
