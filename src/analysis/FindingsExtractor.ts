/**
 * @fileoverview Findings Extractor for Code Reviews
 *
 * This service extracts, categorizes, and analyzes findings from code review
 * results. It provides utilities for grading, recommendation generation,
 * and finding prioritization.
 */

import logger from '../utils/logger';

/**
 * Categorized findings from code review
 */
export interface CategorizedFindings {
  high: Set<string>;
  medium: Set<string>;
  low: Set<string>;
}

/**
 * Grade information with justification
 */
export interface GradeInfo {
  grade: string;
  justification: string;
}

/**
 * Service for extracting and analyzing findings from code reviews
 */
export class FindingsExtractor {
  /**
   * Extract findings from review passes
   * @param passes Array of review results with content
   * @returns Categorized findings
   */
  extractFindingsFromPasses(passes: Array<{ content: string }>): CategorizedFindings {
    const highPriorityFindings = new Set<string>();
    const mediumPriorityFindings = new Set<string>();
    const lowPriorityFindings = new Set<string>();

    for (const pass of passes) {
      if (!pass.content) continue;

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

    logger.debug(
      `Extracted findings: ${highPriorityFindings.size} high, ${mediumPriorityFindings.size} medium, ${lowPriorityFindings.size} low`,
    );

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
  extractIssueTexts(content: string): string[] {
    const issues: string[] = [];

    // Extract bullet points and numbered items
    const bulletRegex = /^[\s]*[-*•]\s+(.+)$/gm;
    const numberedRegex = /^[\s]*\d+\.\s+(.+)$/gm;
    const dashRegex = /^[\s]*-\s+(.+)$/gm;

    let match;

    // Extract bullet points
    while ((match = bulletRegex.exec(content)) !== null) {
      const issue = match[1].trim();
      if (issue.length > 10) {
        // Filter out very short items
        issues.push(issue);
      }
    }

    // Extract numbered items
    while ((match = numberedRegex.exec(content)) !== null) {
      const issue = match[1].trim();
      if (issue.length > 10) {
        issues.push(issue);
      }
    }

    // Extract dash items (alternative format)
    while ((match = dashRegex.exec(content)) !== null) {
      const issue = match[1].trim();
      if (issue.length > 10) {
        issues.push(issue);
      }
    }

    // Remove duplicates
    return [...new Set(issues)];
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
      'sql injection',
      'xss',
      'csrf',
      'injection',
      'authentication',
      'authorization',
      'privilege escalation',
      'data breach',
      'sensitive data',
      'password',
      'token',
      'deadlock',
      'race condition',
      'null pointer',
      'buffer overflow',
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
      'complexity',
      'duplication',
      'coupling',
      'cohesion',
      'design pattern',
      'architecture',
      'structure',
      'organization',
      'naming',
      'documentation',
      'comment',
      'test coverage',
      'error handling',
    ];
    return mediumPriorityKeywords.some((keyword) => issue.includes(keyword));
  }

  /**
   * Calculate grade based on findings for a specific category
   * @param findings Categorized findings
   * @param category Category name (for logging)
   * @returns Grade information
   */
  calculateGrade(findings: CategorizedFindings, category: string): GradeInfo {
    const totalIssues = findings.high.size + findings.medium.size + findings.low.size;

    let grade: string;
    let justification: string;

    if (findings.high.size > 5) {
      grade = 'D';
      justification = `Multiple critical issues (${findings.high.size}) require immediate attention`;
    } else if (findings.high.size > 2) {
      grade = 'C';
      justification = `Several critical issues (${findings.high.size}) need to be addressed`;
    } else if (findings.high.size > 0) {
      grade = 'C+';
      justification = `Some critical issues (${findings.high.size}) present`;
    } else if (findings.medium.size > 10) {
      grade = 'C+';
      justification = `Many medium-priority issues (${findings.medium.size}) affect code quality`;
    } else if (findings.medium.size > 5) {
      grade = 'B';
      justification = `Several medium-priority issues (${findings.medium.size}) could be improved`;
    } else if (findings.medium.size > 2) {
      grade = 'B+';
      justification = `Some medium-priority issues (${findings.medium.size}) noted`;
    } else if (totalIssues > 5) {
      grade = 'A-';
      justification = `Minor issues (${totalIssues}) but overall good quality`;
    } else if (totalIssues > 0) {
      grade = 'A';
      justification = `Very few issues (${totalIssues}), high quality code`;
    } else {
      grade = 'A+';
      justification = 'Excellent code quality with no significant issues';
    }

    logger.debug(`Grade for ${category}: ${grade} (${justification})`);
    return { grade, justification };
  }

  /**
   * Calculate overall grade based on findings
   * @param findings Categorized findings
   * @returns Overall grade string
   */
  calculateOverallGrade(findings: CategorizedFindings): string {
    const gradeInfo = this.calculateGrade(findings, 'overall');
    return gradeInfo.grade;
  }

  /**
   * Get justification for grade
   * @param findings Categorized findings
   * @param category Category name
   * @returns Grade justification string
   */
  getGradeJustification(findings: CategorizedFindings, category: string): string {
    const gradeInfo = this.calculateGrade(findings, category);
    return gradeInfo.justification;
  }

  /**
   * Generate recommendations based on findings
   * @param findings Categorized findings
   * @param hasErrors Whether there are compilation errors
   * @returns Array of recommendation strings
   */
  generateRecommendations(findings: CategorizedFindings, hasErrors: boolean): string[] {
    const recommendations: string[] = [];

    if (hasErrors) {
      recommendations.push('Fix compilation errors before proceeding with other improvements');
    }

    if (findings.high.size > 0) {
      recommendations.push(
        `Address ${findings.high.size} high-priority security and critical issues immediately`,
      );

      if (findings.high.size > 3) {
        recommendations.push(
          'Consider conducting a security audit given the number of critical issues',
        );
      }
    }

    if (findings.medium.size > 8) {
      recommendations.push(
        `Review and address ${findings.medium.size} medium-priority maintainability issues`,
      );
      recommendations.push('Consider refactoring to improve code structure and maintainability');
    } else if (findings.medium.size > 3) {
      recommendations.push(
        `Address ${findings.medium.size} medium-priority issues to improve code quality`,
      );
    }

    if (findings.low.size > 15) {
      recommendations.push(
        `Consider addressing ${findings.low.size} low-priority style and minor issues`,
      );
      recommendations.push('Implement automated linting and formatting tools');
    } else if (findings.low.size > 8) {
      recommendations.push(`Review ${findings.low.size} low-priority issues when time permits`);
    }

    // Add positive recommendations for good code
    if (findings.high.size === 0 && findings.medium.size < 3) {
      recommendations.push('Code quality is good. Continue following current best practices.');

      if (findings.low.size === 0) {
        recommendations.push(
          'Excellent code quality. Consider sharing best practices with the team.',
        );
      }
    }

    // Add specific recommendations based on issue types
    if (this.hasSecurityIssues(findings)) {
      recommendations.push('Implement security code review process and security testing');
    }

    if (this.hasPerformanceIssues(findings)) {
      recommendations.push('Consider performance profiling and optimization');
    }

    if (this.hasTestingIssues(findings)) {
      recommendations.push('Improve test coverage and add more comprehensive tests');
    }

    return recommendations;
  }

  /**
   * Check if findings contain security-related issues
   * @param findings Categorized findings
   * @returns True if security issues are present
   */
  private hasSecurityIssues(findings: CategorizedFindings): boolean {
    const allFindings = [...findings.high, ...findings.medium, ...findings.low];
    const securityKeywords = [
      'security',
      'vulnerability',
      'injection',
      'xss',
      'csrf',
      'authentication',
    ];

    return allFindings.some((finding) =>
      securityKeywords.some((keyword) => finding.toLowerCase().includes(keyword)),
    );
  }

  /**
   * Check if findings contain performance-related issues
   * @param findings Categorized findings
   * @returns True if performance issues are present
   */
  private hasPerformanceIssues(findings: CategorizedFindings): boolean {
    const allFindings = [...findings.high, ...findings.medium, ...findings.low];
    const performanceKeywords = [
      'performance',
      'slow',
      'inefficient',
      'optimization',
      'memory',
      'cpu',
    ];

    return allFindings.some((finding) =>
      performanceKeywords.some((keyword) => finding.toLowerCase().includes(keyword)),
    );
  }

  /**
   * Check if findings contain testing-related issues
   * @param findings Categorized findings
   * @returns True if testing issues are present
   */
  private hasTestingIssues(findings: CategorizedFindings): boolean {
    const allFindings = [...findings.high, ...findings.medium, ...findings.low];
    const testingKeywords = [
      'test',
      'coverage',
      'mock',
      'assertion',
      'unit test',
      'integration test',
    ];

    return allFindings.some((finding) =>
      testingKeywords.some((keyword) => finding.toLowerCase().includes(keyword)),
    );
  }

  /**
   * Format findings for display in reports
   * @param findings Categorized findings
   * @param maxPerCategory Maximum items to show per category
   * @returns Formatted findings string
   */
  formatFindings(findings: CategorizedFindings, maxPerCategory = 5): string {
    const sections: string[] = [];

    if (findings.high.size > 0) {
      sections.push(`**High Priority (${findings.high.size}):**`);
      sections.push(
        ...Array.from(findings.high)
          .slice(0, maxPerCategory)
          .map((f) => `- ${f}`),
      );
      if (findings.high.size > maxPerCategory) {
        sections.push(`- ... and ${findings.high.size - maxPerCategory} more`);
      }
      sections.push('');
    }

    if (findings.medium.size > 0) {
      sections.push(`**Medium Priority (${findings.medium.size}):**`);
      sections.push(
        ...Array.from(findings.medium)
          .slice(0, maxPerCategory)
          .map((f) => `- ${f}`),
      );
      if (findings.medium.size > maxPerCategory) {
        sections.push(`- ... and ${findings.medium.size - maxPerCategory} more`);
      }
      sections.push('');
    }

    if (findings.low.size > 0) {
      sections.push(`**Low Priority (${findings.low.size}):**`);
      sections.push(
        ...Array.from(findings.low)
          .slice(0, Math.min(maxPerCategory, 3))
          .map((f) => `- ${f}`),
      );
      if (findings.low.size > 3) {
        sections.push(`- ... and ${findings.low.size - 3} more`);
      }
    }

    return sections.join('\n');
  }
}
