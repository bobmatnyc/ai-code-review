/**
 * @fileoverview Command to sync PROJECT.md with GitHub Projects.
 *
 * This module provides a command-line interface for syncing PROJECT.md content
 * with GitHub Projects. It supports both directions: from PROJECT.md to GitHub
 * Projects and from GitHub Projects to PROJECT.md.
 */

import path from 'path';
import fs from 'fs/promises';
import { fileExists } from '../utils/files/fileSystem';
import logger from '../utils/logger';
import {
  getGitHubProjectsConfig,
  syncProjectMdToGitHub,
  syncGitHubToProjectMd
} from '../utils/githubProjectsClient';

/**
 * Command options
 */
interface SyncGitHubProjectsOptions {
  direction?: 'to-github' | 'from-github';
  projectPath?: string;
  descriptionOnly?: boolean;
}

/**
 * Sync PROJECT.md with GitHub Projects
 * @param options Command options
 */
export async function syncGitHubProjects(options: SyncGitHubProjectsOptions = {}): Promise<void> {
  try {
    // Default options
    const direction = options.direction || 'to-github';
    const projectPath = options.projectPath || process.cwd();
    const descriptionOnly = options.descriptionOnly || false;

    // Get GitHub Projects configuration
    const config = getGitHubProjectsConfig();

    // Path to PROJECT.md
    const projectMdPath = path.join(projectPath, 'PROJECT.md');

    // Check if PROJECT.md exists
    const projectMdExists = await fileExists(projectMdPath);

    if (direction === 'to-github') {
      // Sync from PROJECT.md to GitHub Projects
      if (!projectMdExists) {
        logger.error(`PROJECT.md not found at ${projectMdPath}`);
        process.exit(1);
      }

      if (descriptionOnly) {
        logger.info(`Updating GitHub Project readme with PROJECT.md content...`);
        await syncProjectMdToGitHub(projectMdPath, config, true);
        logger.info('Project readme updated successfully');
      } else {
        logger.info(`Syncing PROJECT.md to GitHub Projects...`);
        await syncProjectMdToGitHub(projectMdPath, config, false);
        logger.info('Sync completed successfully');
      }
    } else {
      // Sync from GitHub Projects to PROJECT.md
      logger.info(`Syncing GitHub Projects to PROJECT.md...`);
      await syncGitHubToProjectMd(projectMdPath, config);
      logger.info(`Sync completed successfully. PROJECT.md updated at ${projectMdPath}`);
    }
  } catch (error) {
    logger.error(`Error syncing with GitHub Projects: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Command line handler for sync-github-projects command
 * @param args Command line arguments
 */
export async function handleSyncGitHubProjectsCommand(): Promise<void> {
  // Import the argument parser here to avoid circular dependencies
  const { parseGitHubProjectsArguments } = await import('../cli/githubProjectsArgumentParser.js');

  try {
    // Parse command line arguments
    const options = await parseGitHubProjectsArguments();

    // Run the sync command
    await syncGitHubProjects(options);
  } catch (error) {
    logger.error(`Error handling GitHub Projects sync command: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

/**
 * Print help information
 */
function printHelp(): void {
  console.log(`
Sync PROJECT.md with GitHub Projects

Usage:
  sync-github-projects [options]

Options:
  --direction, -d     Sync direction: 'to-github' or 'from-github' (default: 'to-github')
  --project-path, -p  Path to the project directory (default: current directory)
  --description-only, --desc  Update only the project readme with PROJECT.md content (default: false)
  --help, -h          Show this help message

Environment Variables:
  GITHUB_TOKEN         GitHub API token (required)
  GITHUB_PROJECT_ID    GitHub Project ID (required if GITHUB_PROJECT_NUMBER not provided)
  GITHUB_PROJECT_NUMBER GitHub Project number (required if GITHUB_PROJECT_ID not provided)
  GITHUB_OWNER         GitHub owner (default: 'bobmatnyc')

Examples:
  # Update GitHub Project readme with PROJECT.md content
  sync-github-projects --description-only

  # Sync PROJECT.md to GitHub Projects as items
  sync-github-projects

  # Sync GitHub Projects to PROJECT.md
  sync-github-projects --direction from-github

  # Specify project path
  sync-github-projects --project-path /path/to/project
  `);
}
