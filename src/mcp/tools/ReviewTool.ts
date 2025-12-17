/**
 * @fileoverview Unified Review MCP Tool
 *
 * This module implements a unified review tool that can handle both file-level
 * and PR-level reviews through a single interface.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { orchestrateReview } from '../../core/reviewOrchestrator';
import type { ReviewOptions, ReviewType } from '../../types/review';
import logger from '../../utils/logger';
import { getApiKey, loadProjectConfig, toLegacyConfig } from '../../utils/projectConfigManager';
import type { McpRequestContext } from '../types';
import { BaseTool } from './BaseTool';

/**
 * Review tool input schema
 */
export interface ReviewToolInput {
  /** Target to review: file path, directory, or PR reference */
  target: string;
  /** Additional context (e.g., 'pre-commit', 'pr-review') */
  context?: string;
  /** Review type */
  reviewType?: ReviewType;
  /** Output format */
  outputFormat?: 'markdown' | 'json';
  /** Additional options */
  options?: Record<string, any>;
}

/**
 * Structured review result
 */
export interface ReviewResult {
  /** Review status */
  status: 'pass' | 'warning' | 'fail';
  /** List of issues found */
  issues: Array<{
    severity: 'error' | 'warning' | 'info';
    location: string;
    message: string;
    suggestion?: string;
  }>;
  /** Overall review summary */
  summary: string;
  /** Recommendation */
  recommendation: 'approve' | 'request_changes' | 'comment';
  /** Raw review output (if available) */
  rawOutput?: string;
}

/**
 * Unified Review Tool for MCP
 *
 * This tool provides a single interface for reviewing both files and PRs.
 * It automatically detects the type of target and routes to the appropriate
 * review implementation.
 */
export class ReviewTool extends BaseTool {
  constructor() {
    super(
      'review',
      'Review code changes before commit. Accepts file paths, directories, or PR references. Automatically detects the type of target and performs appropriate analysis.',
      {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description:
              'File path, directory, or PR reference (e.g., "src/index.ts", "PR#123", "https://github.com/user/repo/pull/123")',
          },
          context: {
            type: 'string',
            description: 'Additional context (e.g., "pre-commit", "pr-review")',
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
              'comprehensive',
            ],
            description: 'Type of review to perform',
            default: 'quick-fixes',
          },
          outputFormat: {
            type: 'string',
            enum: ['markdown', 'json'],
            description: 'Output format',
            default: 'json',
          },
        },
        required: ['target'],
      },
    );
  }

  /**
   * Execute the review
   */
  protected async executeImpl(args: ReviewToolInput, context: McpRequestContext): Promise<string> {
    const { target, reviewType = 'quick-fixes', outputFormat = 'json', options = {} } = args;

    logger.info(`Starting review for: ${target}`);

    // Load project configuration
    const projectConfig = loadProjectConfig();

    // Detect target type
    const targetType = this.detectTargetType(target);
    logger.info(`Detected target type: ${targetType}`);

    // Resolve target path
    const targetPath = this.resolveTargetPath(target, targetType);

    // Convert to legacy format if needed
    const legacyConfig = projectConfig ? toLegacyConfig(projectConfig) : null;

    // Build review options
    const reviewOptions: ReviewOptions = {
      type: reviewType,
      output: outputFormat,
      includeTests: false,
      includeProjectDocs: true,
      interactive: false,
      noConfirm: true,
      // Use model from project config if available
      model: legacyConfig?.defaultModel,
      ...options,
    };

    // Load API keys from project config
    if (legacyConfig?.apiKeys) {
      const apiKeys: Record<string, string> = {};
      if (legacyConfig.apiKeys.openrouter) {
        apiKeys.openrouter = legacyConfig.apiKeys.openrouter;
      }
      if (legacyConfig.apiKeys.anthropic) {
        apiKeys.anthropic = legacyConfig.apiKeys.anthropic;
      }
      if (legacyConfig.apiKeys.google) {
        apiKeys.google = legacyConfig.apiKeys.google;
      }
      if (legacyConfig.apiKeys.openai) {
        apiKeys.openai = legacyConfig.apiKeys.openai;
      }

      // Set API keys in environment for the review
      Object.entries(apiKeys).forEach(([provider, key]) => {
        process.env[`AI_CODE_REVIEW_${provider.toUpperCase()}_API_KEY`] = key;
      });
    }

    try {
      // Perform the review based on target type
      let reviewOutput: string;

      if (targetType === 'pr') {
        reviewOutput = await this.reviewPR(target, reviewOptions);
      } else {
        reviewOutput = await this.reviewFile(targetPath, reviewOptions);
      }

      // Parse and structure the output
      const result = this.structureReviewOutput(reviewOutput, target);

      // Return formatted output based on requested format
      if (outputFormat === 'json') {
        return JSON.stringify(result, null, 2);
      }
      return this.formatMarkdownOutput(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Review failed for ${target}: ${errorMessage}`);

      // Return structured error
      const errorResult: ReviewResult = {
        status: 'fail',
        issues: [
          {
            severity: 'error',
            location: target,
            message: `Review failed: ${errorMessage}`,
          },
        ],
        summary: `Failed to complete review: ${errorMessage}`,
        recommendation: 'request_changes',
      };

      if (outputFormat === 'json') {
        return JSON.stringify(errorResult, null, 2);
      }
      return this.formatMarkdownOutput(errorResult);
    }
  }

  /**
   * Detect the type of target
   */
  private detectTargetType(target: string): 'file' | 'directory' | 'pr' {
    // Check if it's a PR reference
    if (
      target.match(/^PR[#\s]*\d+$/i) ||
      target.includes('github.com') ||
      target.includes('pull/')
    ) {
      return 'pr';
    }

    // Check if it's a file or directory
    const absolutePath = path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);

    if (fs.existsSync(absolutePath)) {
      const stats = fs.statSync(absolutePath);
      return stats.isDirectory() ? 'directory' : 'file';
    }

    // Default to file if doesn't exist yet (might be about to be created)
    return 'file';
  }

  /**
   * Resolve target path
   */
  private resolveTargetPath(target: string, targetType: 'file' | 'directory' | 'pr'): string {
    if (targetType === 'pr') {
      return target; // Keep PR references as-is
    }

    // Resolve relative paths
    return path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);
  }

  /**
   * Review a file or directory
   */
  private async reviewFile(targetPath: string, options: ReviewOptions): Promise<string> {
    logger.info(`Reviewing file/directory: ${targetPath}`);

    // Capture review output
    const outputBuffer: string[] = [];
    const originalConsoleLog = console.log;

    console.log = (...args: any[]) => {
      outputBuffer.push(args.join(' '));
      originalConsoleLog(...args);
    };

    try {
      await orchestrateReview(targetPath, options);
    } finally {
      console.log = originalConsoleLog;
    }

    return outputBuffer.join('\n');
  }

  /**
   * Review a pull request
   */
  private async reviewPR(prRef: string, options: ReviewOptions): Promise<string> {
    // Extract PR number from reference
    const prNumber = this.extractPRNumber(prRef);

    if (!prNumber) {
      throw new Error(`Invalid PR reference: ${prRef}`);
    }

    logger.info(`Reviewing PR #${prNumber}`);

    // For now, return a placeholder
    // TODO: Implement actual PR review logic
    return `PR #${prNumber} review not yet implemented. Use file-level reviews for now.`;
  }

  /**
   * Extract PR number from reference
   */
  private extractPRNumber(prRef: string): number | null {
    // Match patterns like: PR#123, PR 123, pull/123, /pull/123
    const match = prRef.match(/(?:PR[#\s]*|pull\/|\/pull\/)(\d+)/i);
    return match ? Number.parseInt(match[1], 10) : null;
  }

  /**
   * Structure review output into a standard format
   */
  private structureReviewOutput(output: string, target: string): ReviewResult {
    // Parse the review output to extract issues
    // This is a simplified parser - enhance based on actual output format
    const issues: ReviewResult['issues'] = [];

    // Look for common patterns in review output
    const lines = output.split('\n');
    let hasErrors = false;
    let hasWarnings = false;

    for (const line of lines) {
      // Detect error patterns
      if (line.match(/❌|ERROR|CRITICAL|SECURITY/i)) {
        hasErrors = true;
        issues.push({
          severity: 'error',
          location: target,
          message: line.trim(),
        });
      }
      // Detect warning patterns
      else if (line.match(/⚠️|WARNING|CAUTION/i)) {
        hasWarnings = true;
        issues.push({
          severity: 'warning',
          location: target,
          message: line.trim(),
        });
      }
      // Detect info patterns
      else if (line.match(/ℹ️|INFO|TIP|SUGGESTION/i)) {
        issues.push({
          severity: 'info',
          location: target,
          message: line.trim(),
        });
      }
    }

    // Determine status
    let status: ReviewResult['status'] = 'pass';
    if (hasErrors) {
      status = 'fail';
    } else if (hasWarnings) {
      status = 'warning';
    }

    // Determine recommendation
    let recommendation: ReviewResult['recommendation'] = 'approve';
    if (hasErrors) {
      recommendation = 'request_changes';
    } else if (hasWarnings) {
      recommendation = 'comment';
    }

    // Generate summary
    const summary =
      issues.length > 0
        ? `Found ${issues.length} issue(s): ${issues.filter((i) => i.severity === 'error').length} errors, ${issues.filter((i) => i.severity === 'warning').length} warnings`
        : 'No issues found';

    return {
      status,
      issues,
      summary,
      recommendation,
      rawOutput: output,
    };
  }

  /**
   * Format review result as markdown
   */
  private formatMarkdownOutput(result: ReviewResult): string {
    let output = `# Code Review Results\n\n`;
    output += `**Status:** ${result.status.toUpperCase()}\n`;
    output += `**Recommendation:** ${result.recommendation.replace('_', ' ').toUpperCase()}\n\n`;
    output += `## Summary\n\n${result.summary}\n\n`;

    if (result.issues.length > 0) {
      output += `## Issues\n\n`;

      const errors = result.issues.filter((i) => i.severity === 'error');
      const warnings = result.issues.filter((i) => i.severity === 'warning');
      const info = result.issues.filter((i) => i.severity === 'info');

      if (errors.length > 0) {
        output += `### Errors (${errors.length})\n\n`;
        for (const issue of errors) {
          output += `- **${issue.location}**: ${issue.message}\n`;
          if (issue.suggestion) {
            output += `  - *Suggestion:* ${issue.suggestion}\n`;
          }
        }
        output += `\n`;
      }

      if (warnings.length > 0) {
        output += `### Warnings (${warnings.length})\n\n`;
        for (const issue of warnings) {
          output += `- **${issue.location}**: ${issue.message}\n`;
          if (issue.suggestion) {
            output += `  - *Suggestion:* ${issue.suggestion}\n`;
          }
        }
        output += `\n`;
      }

      if (info.length > 0) {
        output += `### Information (${info.length})\n\n`;
        for (const issue of info) {
          output += `- **${issue.location}**: ${issue.message}\n`;
          if (issue.suggestion) {
            output += `  - *Suggestion:* ${issue.suggestion}\n`;
          }
        }
        output += `\n`;
      }
    }

    if (result.rawOutput) {
      output += `## Full Review Output\n\n\`\`\`\n${result.rawOutput}\n\`\`\`\n`;
    }

    return output;
  }
}
