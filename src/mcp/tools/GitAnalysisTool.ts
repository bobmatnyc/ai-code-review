/**
 * @fileoverview Git Analysis MCP Tool
 *
 * This module implements the Git analysis tool for MCP, providing
 * repository analysis capabilities including commit history, change patterns,
 * and code quality trends.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import logger from '../../utils/logger';
import type { GitAnalysisToolInput, McpRequestContext } from '../types';
import { BaseTool } from './BaseTool';

/**
 * Git Analysis Tool for MCP
 *
 * Provides comprehensive Git repository analysis including:
 * - Commit history analysis
 * - Change pattern detection
 * - Code quality trends
 * - Developer activity analysis
 * - Branch and merge analysis
 */
export class GitAnalysisTool extends BaseTool {
  constructor() {
    super(
      'git-analysis',
      'Analyze Git repository history, commit patterns, change trends, and code quality metrics. Provides insights into development patterns and repository health.',
      {
        type: 'object',
        properties: {
          repository: {
            type: 'string',
            description: 'Path to the Git repository to analyze',
          },
          commitCount: {
            type: 'number',
            description: 'Number of recent commits to analyze (default: 50)',
            default: 50,
          },
          branch: {
            type: 'string',
            description: 'Branch to analyze (default: current branch)',
          },
          analysisType: {
            type: 'string',
            enum: ['commits', 'changes', 'patterns', 'quality'],
            description: 'Type of analysis to perform',
            default: 'commits',
          },
          since: {
            type: 'string',
            description: 'Start date for analysis (ISO format or relative like "1 week ago")',
          },
          until: {
            type: 'string',
            description: 'End date for analysis (ISO format or relative like "yesterday")',
          },
        },
        required: ['repository'],
      },
    );
  }

  /**
   * Execute the Git analysis
   */
  protected async executeImpl(
    args: GitAnalysisToolInput,
    context: McpRequestContext,
  ): Promise<string> {
    const { repository, commitCount = 50, branch, analysisType = 'commits', since, until } = args;

    logger.info(`Starting Git analysis for: ${repository}`);
    logger.info(`Analysis type: ${analysisType}`);

    const repoPath = path.resolve(repository);

    try {
      // Verify it's a Git repository
      this.verifyGitRepository(repoPath);

      // Change to repository directory
      const originalCwd = process.cwd();
      process.chdir(repoPath);

      let analysisResult: string;

      try {
        switch (analysisType) {
          case 'commits':
            analysisResult = await this.analyzeCommits(commitCount, branch, since, until);
            break;
          case 'changes':
            analysisResult = await this.analyzeChanges(commitCount, branch, since, until);
            break;
          case 'patterns':
            analysisResult = await this.analyzePatterns(commitCount, branch, since, until);
            break;
          case 'quality':
            analysisResult = await this.analyzeQuality(commitCount, branch, since, until);
            break;
          default:
            throw new Error(`Unknown analysis type: ${analysisType}`);
        }
      } finally {
        // Restore original working directory
        process.chdir(originalCwd);
      }

      logger.info(`Git analysis completed for: ${repository}`);

      return this.formatAnalysisResult(analysisResult, {
        repository: repoPath,
        analysisType,
        commitCount,
        branch,
        since,
        until,
        timestamp: context.timestamp,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Git analysis failed for ${repository}: ${errorMessage}`);
      throw new Error(`Git analysis failed: ${errorMessage}`);
    }
  }

  /**
   * Verify that the path is a Git repository
   */
  private verifyGitRepository(repoPath: string): void {
    try {
      execSync('git rev-parse --git-dir', {
        cwd: repoPath,
        stdio: 'pipe',
      });
    } catch (_error) {
      throw new Error(`Not a Git repository: ${repoPath}`);
    }
  }

  /**
   * Analyze commit history
   */
  private async analyzeCommits(
    commitCount: number,
    branch?: string,
    since?: string,
    until?: string,
  ): Promise<string> {
    let gitLogCommand = `git log --pretty=format:"%H|%s|%ai|%an|%ae|%cn|%ce" -n ${commitCount}`;

    if (branch) {
      gitLogCommand += ` ${branch}`;
    }

    if (since) {
      gitLogCommand += ` --since="${since}"`;
    }

    if (until) {
      gitLogCommand += ` --until="${until}"`;
    }

    const logOutput = execSync(gitLogCommand, { encoding: 'utf8' });
    const commits = this.parseCommitLog(logOutput);

    let analysis = `## Commit History Analysis\n\n`;
    analysis += `**Total Commits Analyzed:** ${commits.length}\n\n`;

    if (commits.length === 0) {
      return `${analysis}No commits found in the specified range.\n`;
    }

    // Analyze commit patterns
    const authors = new Map<string, number>();
    const commitsByDay = new Map<string, number>();
    const commitMessages: string[] = [];

    for (const commit of commits) {
      // Count commits by author
      const authorCount = authors.get(commit.author) || 0;
      authors.set(commit.author, authorCount + 1);

      // Count commits by day
      const day = commit.date.split('T')[0];
      const dayCount = commitsByDay.get(day) || 0;
      commitsByDay.set(day, dayCount + 1);

      commitMessages.push(commit.message);
    }

    // Top contributors
    analysis += `### Top Contributors\n\n`;
    const sortedAuthors = Array.from(authors.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [author, count] of sortedAuthors) {
      analysis += `- **${author}**: ${count} commits\n`;
    }

    // Recent activity
    analysis += `\n### Recent Activity\n\n`;
    const recentCommits = commits.slice(0, 10);
    for (const commit of recentCommits) {
      const shortHash = commit.hash.substring(0, 8);
      const date = new Date(commit.date).toLocaleDateString();
      analysis += `- \`${shortHash}\` ${commit.message} - ${commit.author} (${date})\n`;
    }

    return analysis;
  }

  /**
   * Analyze file changes
   */
  private async analyzeChanges(
    commitCount: number,
    branch?: string,
    since?: string,
    until?: string,
  ): Promise<string> {
    let gitLogCommand = `git log --name-only --pretty=format:"%H|%s|%ai|%an" -n ${commitCount}`;

    if (branch) {
      gitLogCommand += ` ${branch}`;
    }

    if (since) {
      gitLogCommand += ` --since="${since}"`;
    }

    if (until) {
      gitLogCommand += ` --until="${until}"`;
    }

    const logOutput = execSync(gitLogCommand, { encoding: 'utf8' });

    // Parse file changes
    const fileChanges = new Map<string, number>();
    const lines = logOutput.split('\n');

    for (const line of lines) {
      if (line && !line.includes('|') && !line.startsWith(' ')) {
        const count = fileChanges.get(line) || 0;
        fileChanges.set(line, count + 1);
      }
    }

    let analysis = `## File Changes Analysis\n\n`;
    analysis += `**Total Files Changed:** ${fileChanges.size}\n\n`;

    // Most frequently changed files
    analysis += `### Most Frequently Changed Files\n\n`;
    const sortedFiles = Array.from(fileChanges.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    for (const [file, count] of sortedFiles) {
      analysis += `- \`${file}\`: ${count} changes\n`;
    }

    return analysis;
  }

  /**
   * Analyze development patterns
   */
  private async analyzePatterns(
    _commitCount: number,
    _branch?: string,
    _since?: string,
    _until?: string,
  ): Promise<string> {
    // This would include more sophisticated pattern analysis
    // For now, provide basic pattern insights
    let analysis = `## Development Patterns Analysis\n\n`;
    analysis += `*Pattern analysis would include:*\n`;
    analysis += `- Commit frequency patterns\n`;
    analysis += `- File modification patterns\n`;
    analysis += `- Branch and merge patterns\n`;
    analysis += `- Code churn analysis\n\n`;
    analysis += `*This feature is under development.*\n`;

    return analysis;
  }

  /**
   * Analyze code quality trends
   */
  private async analyzeQuality(
    _commitCount: number,
    _branch?: string,
    _since?: string,
    _until?: string,
  ): Promise<string> {
    let analysis = `## Code Quality Trends Analysis\n\n`;
    analysis += `*Quality analysis would include:*\n`;
    analysis += `- Code complexity trends\n`;
    analysis += `- Test coverage changes\n`;
    analysis += `- Documentation updates\n`;
    analysis += `- Refactoring patterns\n\n`;
    analysis += `*This feature is under development.*\n`;

    return analysis;
  }

  /**
   * Parse git log output
   */
  private parseCommitLog(logOutput: string): Array<{
    hash: string;
    message: string;
    date: string;
    author: string;
    email: string;
  }> {
    const commits: Array<{
      hash: string;
      message: string;
      date: string;
      author: string;
      email: string;
    }> = [];

    const lines = logOutput.trim().split('\n');
    for (const line of lines) {
      if (line.includes('|')) {
        const parts = line.split('|');
        if (parts.length >= 5) {
          commits.push({
            hash: parts[0],
            message: parts[1],
            date: parts[2],
            author: parts[3],
            email: parts[4],
          });
        }
      }
    }

    return commits;
  }

  /**
   * Format analysis result
   */
  private formatAnalysisResult(
    result: string,
    metadata: {
      repository: string;
      analysisType: string;
      commitCount: number;
      branch?: string;
      since?: string;
      until?: string;
      timestamp: Date;
    },
  ): string {
    const { repository, analysisType, commitCount, branch, since, until, timestamp } = metadata;

    let output = `# Git Repository Analysis\n\n`;
    output += `**Repository:** \`${repository}\`\n`;
    output += `**Analysis Type:** ${analysisType}\n`;
    output += `**Commit Count:** ${commitCount}\n`;
    if (branch) {
      output += `**Branch:** ${branch}\n`;
    }
    if (since) {
      output += `**Since:** ${since}\n`;
    }
    if (until) {
      output += `**Until:** ${until}\n`;
    }
    output += `**Timestamp:** ${timestamp.toISOString()}\n\n`;
    output += `---\n\n`;
    output += result;

    return output;
  }
}
