/**
 * Command definition for GitHub Projects sync
 */

import { Command } from 'commander';
import { handleSyncGitHubProjectsCommand } from './syncGithubProjects';

export const syncGitHubProjectsCommand = new Command('sync-github-projects')
  .description('Sync GitHub Projects with local PROJECT.md file')
  .option('-d, --direction <direction>', 'Sync direction', 'to-github')
  .option('-p, --project-path <path>', 'Path to the project directory')
  .option('--description-only', 'Update only the project readme with PROJECT.md content')
  .option('--update-readme', 'Update README.md with PROJECT.md content')
  .action(async (options) => {
    try {
      await handleSyncGitHubProjectsCommand();
    } catch (error) {
      console.error('Error syncing GitHub Projects:', error);
      process.exit(1);
    }
  });
