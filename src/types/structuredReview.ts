/**
 * @fileoverview Type definitions for structured code review output.
 *
 * This module defines the structured output format for code reviews,
 * providing a consistent schema that can be easily parsed and rendered
 * programmatically.
 */

/**
 * Priority levels for code review issues
 */
export type IssuePriority = 'high' | 'medium' | 'low';

/**
 * Types of code review issues
 */
export type IssueType =
  | 'bug'
  | 'security'
  | 'performance'
  | 'maintainability'
  | 'readability'
  | 'architecture'
  | 'best-practice'
  | 'documentation'
  | 'testing'
  | 'other';

/**
 * A single code review issue
 */
export interface ReviewIssue {
  /**
   * Title of the issue
   */
  title: string;

  /**
   * Priority level of the issue
   */
  priority: IssuePriority;

  /**
   * Type of issue
   */
  type: IssueType;

  /**
   * File path where the issue was found
   */
  filePath: string;

  /**
   * Line number(s) where the issue was found
   * Can be a single line number or a range (e.g., "10-15")
   */
  lineNumbers?: string;

  /**
   * Description of the issue
   */
  description: string;

  /**
   * Code snippet showing the issue
   */
  codeSnippet?: string;

  /**
   * Suggested fix for the issue
   */
  suggestedFix?: string;

  /**
   * Impact of the issue
   */
  impact?: string;
}

/**
 * Structured code review output
 */
export interface StructuredReview {
  /**
   * Summary of the code review
   */
  summary: string;

  /**
   * List of issues found in the code review
   */
  issues: ReviewIssue[];

  /**
   * General recommendations that don't fit into specific issues
   */
  recommendations?: string[];

  /**
   * Positive aspects of the code
   */
  positiveAspects?: string[];
}
