/**
 * @fileoverview Formatter for code review output in different formats.
 *
 * This module provides formatting utilities for code review results, supporting
 * multiple output formats including Markdown and JSON. It handles the transformation
 * of raw review data into well-structured, readable formats suitable for different
 * consumption patterns.
 *
 * Key responsibilities:
 * - Converting review results to Markdown format with proper headings and sections
 * - Converting review results to JSON format for programmatic consumption
 * - Sanitizing content to prevent rendering issues
 * - Adding metadata like review date, model used, and cost information
 * - Formatting code snippets and recommendations consistently
 *
 * The formatter ensures that review outputs are consistent, readable, and properly
 * structured regardless of the review type or content.
 */

import type { ReviewResult } from '../types/review';
import { formatAsJson } from './utils/JsonFormatter';
import { formatAsMarkdown } from './utils/MarkdownFormatters';

/**
 * Format the review output based on the specified format
 * @param review Review result to format
 * @param format Output format (markdown or json)
 * @returns Formatted review output
 */
export function formatReviewOutput(review: ReviewResult, format: string): string {
  // Debug logging to help diagnose issues with missing fields
  if (!review.filePath) {
    console.warn('Warning: filePath is undefined or empty in ReviewResult');
  }
  if (!review.modelUsed) {
    console.warn('Warning: modelUsed is undefined or empty in ReviewResult');
  }

  // Ensure costInfo is set if only cost is available
  if (review.cost && !review.costInfo) {
    review.costInfo = review.cost;
  }

  if (format === 'json') {
    return formatAsJson(review);
  }

  return formatAsMarkdown(review);
}

export { formatIssue, formatSchemaIssue } from './utils/IssueFormatters';
export { formatAsJson } from './utils/JsonFormatter';
// Re-export utility functions for use by other modules
export { formatAsMarkdown } from './utils/MarkdownFormatters';
export {
  createEnhancedMetadata,
  formatCostInfo,
  formatMetadataSection,
  parseCostInfo,
  parseMetadata,
} from './utils/MetadataFormatter';
export { extractModelInfo, extractModelInfoFromString } from './utils/ModelInfoExtractor';
