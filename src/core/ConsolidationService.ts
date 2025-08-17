/**
 * @fileoverview Consolidation Service for Multi-Pass Reviews
 *
 * This service handles the consolidation of multi-pass review results into
 * a single cohesive report. It manages both AI-powered consolidation and
 * fallback consolidation when AI services are unavailable.
 */

import type { ReviewResult } from '../types/review';
import logger from '../utils/logger';
import { consolidateReview } from '../utils/review/consolidateReview';
import type { ApiClientConfig } from './ApiClientSelector';

/**
 * Service for consolidating multi-pass review results
 */
export class ConsolidationService {
  /**
   * Generate a consolidated report from multi-pass review results
   * @param multiPassResult Combined result from all passes
   * @param apiClientConfig API client configuration
   * @param options Consolidation options
   * @returns Promise resolving to consolidated content
   */
  async generateConsolidatedReport(
    multiPassResult: ReviewResult,
    apiClientConfig: ApiClientConfig,
    options: {
      projectName: string;
      modelName: string;
      totalPasses: number;
      passResults: ReviewResult[];
    },
  ): Promise<string> {
    const { projectName, modelName, totalPasses, passResults } = options;

    try {
      logger.info(`Generating consolidated report for ${projectName} using ${modelName}...`);

      // Attempt AI-powered consolidation
      const consolidatedContent = await this.attemptAiConsolidation(
        multiPassResult,
        apiClientConfig,
        options,
      );

      if (consolidatedContent) {
        logger.info('Successfully generated AI-powered consolidated report');
        return consolidatedContent;
      }

      // Fall back to manual consolidation
      logger.warn('AI consolidation failed, falling back to enhanced manual consolidation');
      return this.createEnhancedFallbackConsolidation(multiPassResult, modelName, options);
    } catch (error) {
      logger.error('Error during consolidation:', error);
      logger.info('Creating fallback consolidation due to error');
      return this.createFallbackConsolidation(multiPassResult, modelName);
    }
  }

  /**
   * Attempt AI-powered consolidation
   * @param multiPassResult Combined result from all passes
   * @param apiClientConfig API client configuration
   * @param options Consolidation options
   * @returns Promise resolving to consolidated content or null if failed
   */
  private async attemptAiConsolidation(
    multiPassResult: ReviewResult,
    apiClientConfig: ApiClientConfig,
    options: {
      projectName: string;
      modelName: string;
      totalPasses: number;
      passResults: ReviewResult[];
    },
  ): Promise<string | null> {
    try {
      // Set the project name in the result for consolidation
      const reviewForConsolidation = {
        ...multiPassResult,
        projectName: options.projectName,
      };

      const consolidationResult = await consolidateReview(reviewForConsolidation);

      if (consolidationResult && consolidationResult.trim() !== '') {
        return consolidationResult;
      }

      logger.warn('AI consolidation returned empty content');
      return null;
    } catch (error) {
      logger.error('AI consolidation failed:', error);
      return null;
    }
  }

  /**
   * Creates an enhanced fallback consolidation with better error handling
   * @param multiPassResult The combined result from all passes
   * @param modelName The model name used for the review
   * @param options Additional consolidation options
   * @returns Enhanced fallback consolidation content
   */
  private createEnhancedFallbackConsolidation(
    multiPassResult: ReviewResult,
    modelName: string,
    options: {
      projectName: string;
      totalPasses: number;
      passResults: ReviewResult[];
    },
  ): string {
    logger.info('Creating enhanced fallback consolidation from multi-pass results...');

    const { projectName, totalPasses, passResults } = options;
    const timestamp = new Date().toISOString();

    // Extract findings from all passes
    const findings = this.extractFindingsFromPasses(passResults);

    // Calculate grades and recommendations
    const overallGrade = this.calculateOverallGrade(findings);
    const recommendations = this.generateRecommendations(findings, false);

    // Build the consolidated report
    const sections = [
      `# Code Review: ${projectName}`,
      '',
      `**Review Type:** Multi-Pass Analysis (${totalPasses} passes)`,
      `**Model:** ${modelName}`,
      `**Generated:** ${timestamp}`,
      '',
      '## Executive Summary',
      '',
      `This multi-pass review analyzed the ${projectName} codebase across ${totalPasses} passes, ` +
        `identifying ${findings.high.size + findings.medium.size + findings.low.size} total issues.`,
      '',
      `**Overall Grade:** ${overallGrade}`,
      '',
      '## Key Findings',
      '',
      this.formatFindings(findings),
      '',
      '## Recommendations',
      '',
      ...recommendations.map((rec) => `- ${rec}`),
      '',
      '## Pass Summary',
      '',
      this.generatePassSummary(passResults),
      '',
      '---',
      '',
      '*This report was generated using enhanced fallback consolidation due to AI service limitations.*',
    ];

    return sections.join('\n');
  }

  /**
   * Creates a basic fallback consolidation when AI consolidation fails
   * @param multiPassResult The combined result from all passes
   * @param modelName The model name used for the review
   * @returns Basic fallback consolidation content
   */
  private createFallbackConsolidation(multiPassResult: ReviewResult, modelName: string): string {
    logger.info('Creating basic fallback consolidation from multi-pass results...');

    const timestamp = new Date().toISOString();
    const content = multiPassResult.content || 'No content available';

    return [
      `# Multi-Pass Code Review`,
      '',
      `**Model:** ${modelName}`,
      `**Generated:** ${timestamp}`,
      `**Note:** This is a fallback consolidation due to service limitations.`,
      '',
      '## Review Content',
      '',
      content,
      '',
      '---',
      '',
      '*This report was generated using basic fallback consolidation.*',
    ].join('\n');
  }

  /**
   * Extract findings from valid passes
   * @param passResults Array of pass results
   * @returns Categorized findings
   */
  private extractFindingsFromPasses(passResults: Array<{ content: string }>) {
    const highPriorityFindings = new Set<string>();
    const mediumPriorityFindings = new Set<string>();
    const lowPriorityFindings = new Set<string>();

    for (const pass of passResults) {
      if (!pass.content) continue;

      const content = pass.content.toLowerCase();
      const issueTexts = this.extractIssueTexts(pass.content);

      for (const issue of issueTexts) {
        const lowerIssue = issue.toLowerCase();

        // Categorize by priority keywords
        if (this.isHighPriority(lowerIssue)) {
          highPriorityFindings.add(issue);
        } else if (this.isMediumPriority(lowerIssue)) {
          mediumPriorityFindings.add(issue);
        } else {
          lowPriorityFindings.add(issue);
        }
      }
    }

    return {
      high: highPriorityFindings,
      medium: mediumPriorityFindings,
      low: lowPriorityFindings,
    };
  }

  /**
   * Extract individual issue texts from content
   * @param content Review content
   * @returns Array of issue descriptions
   */
  private extractIssueTexts(content: string): string[] {
    const issues: string[] = [];

    // Extract bullet points and numbered items
    const bulletRegex = /^[\s]*[-*•]\s+(.+)$/gm;
    const numberedRegex = /^[\s]*\d+\.\s+(.+)$/gm;

    let match;
    while ((match = bulletRegex.exec(content)) !== null) {
      issues.push(match[1].trim());
    }

    while ((match = numberedRegex.exec(content)) !== null) {
      issues.push(match[1].trim());
    }

    return issues;
  }

  /**
   * Check if an issue is high priority
   * @param issue Issue text (lowercase)
   * @returns True if high priority
   */
  private isHighPriority(issue: string): boolean {
    const highPriorityKeywords = [
      'security',
      'vulnerability',
      'critical',
      'error',
      'bug',
      'crash',
      'memory leak',
      'performance',
      'sql injection',
      'xss',
    ];
    return highPriorityKeywords.some((keyword) => issue.includes(keyword));
  }

  /**
   * Check if an issue is medium priority
   * @param issue Issue text (lowercase)
   * @returns True if medium priority
   */
  private isMediumPriority(issue: string): boolean {
    const mediumPriorityKeywords = [
      'warning',
      'deprecated',
      'inefficient',
      'refactor',
      'improve',
      'optimization',
      'maintainability',
      'readability',
    ];
    return mediumPriorityKeywords.some((keyword) => issue.includes(keyword));
  }

  /**
   * Calculate overall grade based on findings
   * @param findings Categorized findings
   * @returns Overall grade string
   */
  private calculateOverallGrade(findings: {
    high: Set<string>;
    medium: Set<string>;
    low: Set<string>;
  }): string {
    const totalIssues = findings.high.size + findings.medium.size + findings.low.size;

    if (findings.high.size > 5) return 'D';
    if (findings.high.size > 2) return 'C';
    if (findings.medium.size > 10) return 'C+';
    if (findings.medium.size > 5) return 'B';
    if (totalIssues > 10) return 'B+';
    if (totalIssues > 5) return 'A-';
    if (totalIssues > 0) return 'A';
    return 'A+';
  }

  /**
   * Generate recommendations based on findings
   * @param findings Categorized findings
   * @param hasErrors Whether there are compilation errors
   * @returns Array of recommendation strings
   */
  private generateRecommendations(
    findings: { high: Set<string>; medium: Set<string>; low: Set<string> },
    hasErrors: boolean,
  ): string[] {
    const recommendations: string[] = [];

    if (hasErrors) {
      recommendations.push('Fix compilation errors before proceeding with other improvements');
    }

    if (findings.high.size > 0) {
      recommendations.push(
        `Address ${findings.high.size} high-priority security and critical issues immediately`,
      );
    }

    if (findings.medium.size > 5) {
      recommendations.push(
        `Review and address ${findings.medium.size} medium-priority maintainability issues`,
      );
    }

    if (findings.low.size > 10) {
      recommendations.push(
        `Consider addressing ${findings.low.size} low-priority style and minor issues`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Code quality is good. Continue following current best practices.');
    }

    return recommendations;
  }

  /**
   * Format findings for display
   * @param findings Categorized findings
   * @returns Formatted findings string
   */
  private formatFindings(findings: {
    high: Set<string>;
    medium: Set<string>;
    low: Set<string>;
  }): string {
    const sections: string[] = [];

    if (findings.high.size > 0) {
      sections.push(`**High Priority (${findings.high.size}):**`);
      sections.push(
        ...Array.from(findings.high)
          .slice(0, 5)
          .map((f) => `- ${f}`),
      );
      if (findings.high.size > 5) {
        sections.push(`- ... and ${findings.high.size - 5} more`);
      }
      sections.push('');
    }

    if (findings.medium.size > 0) {
      sections.push(`**Medium Priority (${findings.medium.size}):**`);
      sections.push(
        ...Array.from(findings.medium)
          .slice(0, 3)
          .map((f) => `- ${f}`),
      );
      if (findings.medium.size > 3) {
        sections.push(`- ... and ${findings.medium.size - 3} more`);
      }
      sections.push('');
    }

    if (findings.low.size > 0) {
      sections.push(`**Low Priority (${findings.low.size}):**`);
      sections.push(
        ...Array.from(findings.low)
          .slice(0, 2)
          .map((f) => `- ${f}`),
      );
      if (findings.low.size > 2) {
        sections.push(`- ... and ${findings.low.size - 2} more`);
      }
    }

    return sections.join('\n');
  }

  /**
   * Generate a summary of all passes
   * @param passResults Array of pass results
   * @returns Pass summary string
   */
  private generatePassSummary(passResults: ReviewResult[]): string {
    return passResults
      .map((result, index) => {
        const passNum = index + 1;
        const wordCount = result.content ? result.content.split(/\s+/).length : 0;
        return `**Pass ${passNum}:** ${wordCount} words of analysis`;
      })
      .join('\n');
  }
}
