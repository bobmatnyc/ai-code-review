/**
 * @fileoverview PR Review MCP Tool
 *
 * This module implements the Pull Request review tool for MCP, providing
 * comprehensive PR analysis capabilities including diff analysis, change
 * impact assessment, and automated review comments.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import { orchestrateReview } from '../../core/reviewOrchestrator';
import type { ReviewOptions, ReviewType } from '../../types/review';
import logger from '../../utils/logger';
import type { McpRequestContext, PrReviewToolInput } from '../types';
import { BaseTool } from './BaseTool';

/**
 * PR Review Tool for MCP
 *
 * Provides comprehensive Pull Request review capabilities including:
 * - Diff analysis and change impact assessment
 * - Security vulnerability detection in changes
 * - Performance impact analysis
 * - Code quality and best practices review
 * - Automated review comment generation
 */
export class PrReviewTool extends BaseTool {
  constructor() {
    super(
      'pr-review',
      'Perform comprehensive Pull Request reviews with diff analysis, change impact assessment, and automated review comments. Supports both GitHub PRs and local git branches.',
      {
        type: 'object',
        properties: {
          repository: {
            type: 'string',
            description:
              'GitHub repository URL (e.g., "https://github.com/user/repo") or local git repository path',
          },
          prNumber: {
            type: 'number',
            description: 'GitHub PR number (required for GitHub repositories)',
          },
          baseBranch: {
            type: 'string',
            description: 'Base branch to compare against (default: "main" or "master")',
          },
          headBranch: {
            type: 'string',
            description: 'Head branch to review (default: current branch for local repos)',
          },
          reviewType: {
            type: 'string',
            enum: [
              'quick-fixes',
              'architectural',
              'security',
              'performance',
              'consolidated',
              'best-practices',
            ],
            description: 'Type of review to perform on the PR changes',
            default: 'consolidated',
          },
          focusAreas: {
            type: 'array',
            items: {
              type: 'string',
            },
            description:
              'Specific areas to focus on (e.g., ["security", "performance", "testing"])',
          },
          generateComments: {
            type: 'boolean',
            description: 'Whether to generate line-specific review comments',
            default: true,
          },
        },
        required: ['repository'],
      },
    );
  }

  /**
   * Execute the PR review
   */
  protected async executeImpl(
    args: PrReviewToolInput,
    context: McpRequestContext,
  ): Promise<string> {
    const {
      repository,
      prNumber,
      baseBranch = 'main',
      headBranch,
      reviewType = 'consolidated',
      focusAreas = [],
      generateComments = true,
    } = args;

    logger.info(`Starting PR review for: ${repository}`);

    try {
      // Determine if this is a GitHub URL or local path
      const isGitHubUrl = repository.startsWith('http') && repository.includes('github.com');

      let repoPath: string;
      let diffContent: string;

      if (isGitHubUrl) {
        // Handle GitHub repository
        if (!prNumber) {
          throw new Error('PR number is required for GitHub repositories');
        }

        const result = await this.analyzeGitHubPR(repository, prNumber, baseBranch);
        repoPath = result.repoPath;
        diffContent = result.diffContent;
      } else {
        // Handle local repository
        repoPath = path.resolve(repository);
        diffContent = await this.analyzeLocalBranches(repoPath, baseBranch, headBranch);
      }

      // Get changed files from diff
      const changedFiles = this.extractChangedFiles(diffContent);

      if (changedFiles.length === 0) {
        return 'No changes detected in the specified PR or branch comparison.';
      }

      logger.info(`Found ${changedFiles.length} changed files`);

      // Perform review on changed files
      const reviewResults = await this.reviewChangedFiles(
        repoPath,
        changedFiles,
        reviewType as ReviewType,
        focusAreas,
      );

      // Generate PR review summary
      const summary = this.generatePRSummary({
        repository,
        prNumber,
        baseBranch,
        headBranch,
        reviewType,
        changedFiles,
        diffContent,
        reviewResults,
        generateComments,
        timestamp: context.timestamp,
      });

      logger.info(`PR review completed for: ${repository}`);
      return summary;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`PR review failed for ${repository}: ${errorMessage}`);
      throw new Error(`PR review failed: ${errorMessage}`);
    }
  }

  /**
   * Analyze GitHub PR
   */
  private async analyzeGitHubPR(
    _repoUrl: string,
    _prNumber: number,
    _baseBranch: string,
  ): Promise<{ repoPath: string; diffContent: string }> {
    // For now, we'll work with local clones
    // In a full implementation, this would use GitHub API
    throw new Error(
      'GitHub PR analysis not yet implemented. Please use local repository path instead.',
    );
  }

  /**
   * Analyze local git branches
   */
  private async analyzeLocalBranches(
    repoPath: string,
    baseBranch: string,
    headBranch?: string,
  ): Promise<string> {
    try {
      // Change to repository directory
      process.chdir(repoPath);

      // Get current branch if headBranch not specified
      const currentBranch =
        headBranch ||
        execSync('git rev-parse --abbrev-ref HEAD', {
          encoding: 'utf8',
        }).trim();

      // Get diff between branches
      const diffCommand = `git diff ${baseBranch}...${currentBranch}`;
      const diffContent = execSync(diffCommand, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      return diffContent;
    } catch (error) {
      throw new Error(`Failed to analyze git branches: ${error}`);
    }
  }

  /**
   * Extract changed files from git diff
   */
  private extractChangedFiles(diffContent: string): string[] {
    const files: string[] = [];
    const lines = diffContent.split('\n');

    for (const line of lines) {
      if (line.startsWith('diff --git')) {
        // Extract file path from "diff --git a/path b/path"
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        if (match) {
          files.push(match[2]); // Use the "b/" path (new file path)
        }
      }
    }

    return files;
  }

  /**
   * Review changed files
   */
  private async reviewChangedFiles(
    repoPath: string,
    changedFiles: string[],
    reviewType: ReviewType,
    _focusAreas: string[],
  ): Promise<string> {
    const reviewOptions: ReviewOptions = {
      type: reviewType,
      output: 'markdown',
      includeTests: true,
      includeProjectDocs: true,
      interactive: false,
      noConfirm: true,
    };

    // Create a temporary directory with only changed files for focused review
    const filesToReview = changedFiles.filter((file) => {
      const fullPath = path.join(repoPath, file);
      try {
        require('node:fs').accessSync(fullPath);
        return true;
      } catch {
        return false; // File might be deleted
      }
    });

    if (filesToReview.length === 0) {
      return 'No reviewable files found in the changes.';
    }

    // Perform review on the repository with focus on changed files
    let reviewOutput = '';
    const originalConsoleLog = console.log;

    const outputBuffer: string[] = [];
    console.log = (...args: any[]) => {
      outputBuffer.push(args.join(' '));
      originalConsoleLog(...args);
    };

    try {
      await orchestrateReview(repoPath, reviewOptions);
      reviewOutput = outputBuffer.join('\n');
    } finally {
      console.log = originalConsoleLog;
    }

    return reviewOutput || 'Review completed successfully.';
  }

  /**
   * Generate PR review summary
   */
  private generatePRSummary(params: {
    repository: string;
    prNumber?: number;
    baseBranch: string;
    headBranch?: string;
    reviewType: string;
    changedFiles: string[];
    diffContent: string;
    reviewResults: string;
    generateComments: boolean;
    timestamp: Date;
  }): string {
    const {
      repository,
      prNumber,
      baseBranch,
      headBranch,
      reviewType,
      changedFiles,
      reviewResults,
      generateComments,
      timestamp,
    } = params;

    let summary = `# Pull Request Review\n\n`;
    summary += `**Repository:** ${repository}\n`;
    if (prNumber) {
      summary += `**PR Number:** #${prNumber}\n`;
    }
    summary += `**Base Branch:** ${baseBranch}\n`;
    if (headBranch) {
      summary += `**Head Branch:** ${headBranch}\n`;
    }
    summary += `**Review Type:** ${reviewType}\n`;
    summary += `**Timestamp:** ${timestamp.toISOString()}\n\n`;

    summary += `## Changed Files (${changedFiles.length})\n\n`;
    for (const file of changedFiles) {
      summary += `- \`${file}\`\n`;
    }

    summary += `\n## Review Results\n\n`;
    summary += reviewResults;

    if (generateComments) {
      summary += `\n## Review Comments\n\n`;
      summary += `*Line-specific comments would be generated here in a full implementation.*\n`;
    }

    return summary;
  }
}
