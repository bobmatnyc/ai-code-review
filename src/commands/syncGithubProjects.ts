/**
 * @fileoverview Command to sync PROJECT.md with GitHub Projects.
 *
 * This module provides a command-line interface for syncing PROJECT.md content
 * with GitHub Projects. It supports both directions: from PROJECT.md to GitHub
 * Projects and from GitHub Projects to PROJECT.md.
 */

import * as path from 'path';
import { fileExists } from '../utils/fileSystemUtils';
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

