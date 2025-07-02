/**
 * @fileoverview Command-line argument parser for GitHub Projects sync.
 *
 * This module is responsible for parsing and validating command-line arguments
 * for the GitHub Projects sync command using the yargs library.
 */

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import logger from '../utils/logger';

/**
 * GitHub Projects sync options
 */
export interface GitHubProjectsSyncOptions {
  direction?: 'to-github' | 'from-github';
  projectPath?: string;
  descriptionOnly?: boolean;
}

/**
 * Parse command-line arguments for GitHub Projects sync
 * @returns Parsed arguments as GitHubProjectsSyncOptions
 */
export async function parseGitHubProjectsArguments(): Promise<GitHubProjectsSyncOptions> {
  try {
    const argv = await yargs(hideBin(process.argv).slice(1)) // Skip the 'sync-github-projects' command
      .option('direction', {
        alias: 'd',
        choices: ['to-github', 'from-github'],
        default: 'to-github',
        describe: 'Sync direction',
      })
      .option('project-path', {
        alias: 'p',
        type: 'string',
        describe: 'Path to the project directory',
      })
      .option('description-only', {
        alias: 'desc',
        type: 'boolean',
        default: false,
        describe: 'Update only the project readme with PROJECT.md content',
      })
      .help()
      .alias('help', 'h')
      .parseAsync();

    const options: GitHubProjectsSyncOptions = {
      direction: argv.direction as 'to-github' | 'from-github',
      projectPath: argv['project-path'] as string,
      descriptionOnly: argv['description-only'] as boolean,
    };

    return options;
  } catch (error) {
    logger.error(
      'Error parsing GitHub Projects sync arguments:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}
