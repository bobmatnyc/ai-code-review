/**
 * @fileoverview Code Review MCP Tool
 *
 * This module implements the code review tool for MCP, providing
 * comprehensive code analysis capabilities through the Model Context Protocol.
 */

import path from 'node:path';
import { orchestrateReview } from '../../core/reviewOrchestrator';
import type { ReviewOptions, ReviewType } from '../../types/review';
import logger from '../../utils/logger';
import type { CodeReviewToolInput, McpRequestContext } from '../types';
import { BaseTool } from './BaseTool';

/**
 * Code Review Tool for MCP
 *
 * Provides comprehensive code review capabilities including:
 * - Quick fixes and syntax improvements
 * - Architectural analysis
 * - Security vulnerability detection
 * - Performance optimization suggestions
 * - Best practices recommendations
 */
export class CodeReviewTool extends BaseTool {
  constructor() {
    super(
      'code-review',
      'Perform comprehensive code reviews using AI analysis. Supports multiple review types including quick fixes, architectural analysis, security scans, and performance optimization.',
      {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description:
              'Path to the file or directory to review (relative to current working directory)',
          },
          reviewType: {
            type: 'string',
            enum: [
              'quick-fixes',
              'architectural',
              'security',
              'performance',
              'unused-code',
              'consolidated',
              'best-practices',
              'evaluation',
              'extract-patterns',
              'coding-test',
              'comprehensive',
            ],
            description: 'Type of review to perform',
            default: 'quick-fixes',
          },
          outputFormat: {
            type: 'string',
            enum: ['markdown', 'json'],
            description: 'Output format for the review results',
            default: 'markdown',
          },
          model: {
            type: 'string',
            description:
              'AI model to use for the review (e.g., "gemini:gemini-2.5-pro", "anthropic:claude-4-sonnet")',
          },
          includeTests: {
            type: 'boolean',
            description: 'Whether to include test files in the review',
            default: false,
          },
          includeProjectDocs: {
            type: 'boolean',
            description: 'Whether to include project documentation in the review context',
            default: true,
          },
          language: {
            type: 'string',
            description: 'Programming language hint (auto-detected if not provided)',
          },
          framework: {
            type: 'string',
            description: 'Framework context (e.g., "react", "vue", "django", "rails")',
          },
        },
        required: ['target'],
      },
    );
  }

  /**
   * Execute the code review
   */
  protected async executeImpl(
    args: CodeReviewToolInput,
    context: McpRequestContext,
  ): Promise<string> {
    const {
      target,
      reviewType = 'quick-fixes',
      outputFormat = 'markdown',
      model,
      includeTests = false,
      includeProjectDocs = true,
      language,
      framework,
      options = {},
    } = args;

    logger.info(`Starting code review for: ${target}`);
    logger.info(`Review type: ${reviewType}`);

    // Resolve target path
    const targetPath = path.resolve(target);

    // Build review options
    const reviewOptions: ReviewOptions = {
      type: reviewType as ReviewType,
      output: outputFormat,
      includeTests,
      includeProjectDocs,
      language,
      framework,
      model,
      // MCP-specific options
      interactive: false, // Disable interactive mode for MCP
      noConfirm: true, // Skip confirmations
      ...options,
    };

    try {
      // Capture the review output
      let reviewOutput = '';
      const originalConsoleLog = console.log;
      const originalConsoleInfo = console.info;

      // Intercept console output to capture review results
      const outputBuffer: string[] = [];
      console.log = (...args: any[]) => {
        outputBuffer.push(args.join(' '));
        originalConsoleLog(...args);
      };
      console.info = (...args: any[]) => {
        outputBuffer.push(args.join(' '));
        originalConsoleInfo(...args);
      };

      // Execute the review
      await orchestrateReview(targetPath, reviewOptions);

      // Restore console methods
      console.log = originalConsoleLog;
      console.info = originalConsoleInfo;

      // Format the output
      reviewOutput = outputBuffer.join('\n');

      if (!reviewOutput.trim()) {
        reviewOutput = `Code review completed for ${target} using ${reviewType} analysis.`;
      }

      logger.info(`Code review completed for: ${target}`);

      return this.formatReviewOutput(reviewOutput, {
        target: targetPath,
        reviewType,
        model: reviewOptions.model,
        timestamp: context.timestamp,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Code review failed for ${target}: ${errorMessage}`);
      throw new Error(`Code review failed: ${errorMessage}`);
    }
  }

  /**
   * Format the review output for better presentation
   */
  private formatReviewOutput(
    output: string,
    metadata: {
      target: string;
      reviewType: string;
      model?: string;
      timestamp: Date;
    },
  ): string {
    const { target, reviewType, model, timestamp } = metadata;

    let formattedOutput = `# Code Review Results\n\n`;
    formattedOutput += `**Target:** \`${target}\`\n`;
    formattedOutput += `**Review Type:** ${reviewType}\n`;
    if (model) {
      formattedOutput += `**Model:** ${model}\n`;
    }
    formattedOutput += `**Timestamp:** ${timestamp.toISOString()}\n\n`;
    formattedOutput += `---\n\n`;
    formattedOutput += output;

    return formattedOutput;
  }
}
