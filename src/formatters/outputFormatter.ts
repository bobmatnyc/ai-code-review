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

import { ReviewResult } from '../types/review';
import { StructuredReview, ReviewIssue } from '../types/structuredReview';
import { sanitizeContent } from '../utils/parsing/sanitizer';

/**
 * Format the review output based on the specified format
 * @param review Review result to format
 * @param format Output format (markdown or json)
 * @returns Formatted review output
 */
export function formatReviewOutput(review: ReviewResult, format: string): string {
  if (format === 'json') {
    return formatAsJson(review);
  }

  return formatAsMarkdown(review);
}

/**
 * Format the review as JSON
 * @param review Review result to format
 * @returns JSON string
 */
function formatAsJson(review: ReviewResult): string {
  // Determine model information
  let modelInfo = 'Google Gemini AI';
  if (review.modelUsed) {
    if (review.modelUsed.startsWith('openrouter:')) {
      modelInfo = `OpenRouter (${review.modelUsed.substring('openrouter:'.length)})`;
    } else if (review.modelUsed.startsWith('anthropic:')) {
      modelInfo = `Anthropic (${review.modelUsed.substring('anthropic:'.length)})`;
    } else if (review.modelUsed.startsWith('openai:')) {
      modelInfo = `OpenAI (${review.modelUsed.substring('openai:'.length)})`;
    } else if (review.modelUsed.startsWith('gemini:')) {
      modelInfo = `Google Gemini AI (${review.modelUsed.substring('gemini:'.length)})`;
    } else {
      modelInfo = `Google Gemini AI (${review.modelUsed})`;
    }
  }

  // Sanitize the content to prevent XSS attacks
  const sanitizedContent = sanitizeContent(review.content);

  // Parse structured data if available
  let parsedStructuredData = review.structuredData;
  if (typeof review.structuredData === 'string') {
    try {
      parsedStructuredData = JSON.parse(review.structuredData);
    } catch (error) {
      console.error('Error parsing structured review data:', error);
    }
  }

  // Create a copy of the review with additional metadata
  const reviewWithMeta = {
    ...review,
    content: sanitizedContent,
    structuredData: parsedStructuredData,
    meta: {
      model: modelInfo,
      generatedAt: new Date(review.timestamp).toISOString(),
      costEstimation: review.cost
    }
  };

  return JSON.stringify(reviewWithMeta, null, 2);
}

/**
 * Format the review as Markdown
 * @param review Review result to format
 * @returns Markdown string
 */
function formatAsMarkdown(review: ReviewResult): string {
  const { filePath, reviewType, content, timestamp, cost, structuredData } = review;

  // Determine model information
  let modelInfo = 'Google Gemini AI';

  // Add specific model information if available
  if (review.modelUsed) {
    if (review.modelUsed.startsWith('openrouter:')) {
      modelInfo = `OpenRouter (${review.modelUsed.substring('openrouter:'.length)})`;
    } else if (review.modelUsed.startsWith('anthropic:')) {
      modelInfo = `Anthropic (${review.modelUsed.substring('anthropic:'.length)})`;
    } else if (review.modelUsed.startsWith('openai:')) {
      modelInfo = `OpenAI (${review.modelUsed.substring('openai:'.length)})`;
    } else if (review.modelUsed.startsWith('gemini:')) {
      modelInfo = `Google Gemini AI (${review.modelUsed.substring('gemini:'.length)})`;
    } else {
      modelInfo = `Google Gemini AI (${review.modelUsed})`;
    }
  }

  // Format cost information if available
  let costInfo = '';
  if (cost) {
    costInfo = `

## Cost Information
- Input tokens: ${cost.inputTokens.toLocaleString()}
- Output tokens: ${cost.outputTokens.toLocaleString()}
- Total tokens: ${cost.totalTokens.toLocaleString()}
- Estimated cost: ${cost.formattedCost}`;
  }

  // If we have structured data, format it as Markdown
  if (structuredData) {
    try {
      const structuredReview = typeof structuredData === 'string'
        ? JSON.parse(structuredData) as StructuredReview
        : structuredData as StructuredReview;

      return formatStructuredReviewAsMarkdown(structuredReview, filePath, reviewType, timestamp, costInfo, modelInfo);
    } catch (error) {
      console.error('Error parsing structured review data:', error);
      // Fall back to unstructured format
    }
  }

  // Sanitize the content to prevent XSS attacks
  const sanitizedContent = sanitizeContent(content);

  // Use the actual file path for the review title and the reviewed field
  // If filePath is the same as reviewType, it means we're reviewing the current directory
  const displayPath = filePath === reviewType ?
    (process.cwd() + ' (Current Directory)') :
    filePath;

  return `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Generated**: ${new Date(timestamp).toLocaleString()}
> **Reviewed**: ${displayPath}

---

${sanitizedContent}

---${costInfo}

*Generated by Code Review Tool using ${modelInfo}*`;
}

/**
 * Format a structured review as Markdown
 * @param structuredReview Structured review data
 * @param filePath Path to the reviewed file
 * @param reviewType Type of review performed
 * @param timestamp Timestamp of when the review was generated
 * @param costInfo Cost information formatted as Markdown
 * @param modelInfo Model information
 * @returns Markdown string
 */
function formatStructuredReviewAsMarkdown(
  structuredReview: StructuredReview,
  filePath: string,
  reviewType: string,
  timestamp: string,
  costInfo: string,
  modelInfo: string
): string {
  const { summary, issues, recommendations, positiveAspects } = structuredReview;

  // Group issues by priority
  const highPriorityIssues = issues.filter(issue => issue.priority === 'high');
  const mediumPriorityIssues = issues.filter(issue => issue.priority === 'medium');
  const lowPriorityIssues = issues.filter(issue => issue.priority === 'low');

  // Format issues by priority
  let issuesMarkdown = '';

  if (highPriorityIssues.length > 0) {
    issuesMarkdown += '### High Priority\n\n';
    issuesMarkdown += highPriorityIssues.map(issue => formatIssue(issue)).join('\n\n');
    issuesMarkdown += '\n\n';
  }

  if (mediumPriorityIssues.length > 0) {
    issuesMarkdown += '### Medium Priority\n\n';
    issuesMarkdown += mediumPriorityIssues.map(issue => formatIssue(issue)).join('\n\n');
    issuesMarkdown += '\n\n';
  }

  if (lowPriorityIssues.length > 0) {
    issuesMarkdown += '### Low Priority\n\n';
    issuesMarkdown += lowPriorityIssues.map(issue => formatIssue(issue)).join('\n\n');
    issuesMarkdown += '\n\n';
  }

  // Format recommendations
  let recommendationsMarkdown = '';
  if (recommendations && recommendations.length > 0) {
    recommendationsMarkdown = '## General Recommendations\n\n';
    recommendationsMarkdown += recommendations.map(rec => `- ${rec}`).join('\n');
    recommendationsMarkdown += '\n\n';
  }

  // Format positive aspects
  let positiveAspectsMarkdown = '';
  if (positiveAspects && positiveAspects.length > 0) {
    positiveAspectsMarkdown = '## Positive Aspects\n\n';
    positiveAspectsMarkdown += positiveAspects.map(aspect => `- ${aspect}`).join('\n');
    positiveAspectsMarkdown += '\n\n';
  }

  // Use the actual file path for the review title and the reviewed field
  // If filePath is the same as reviewType, it means we're reviewing the current directory
  const displayPath = filePath === reviewType ?
    (process.cwd() + ' (Current Directory)') :
    filePath;

  return `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Generated**: ${new Date(timestamp).toLocaleString()}
> **Reviewed**: ${displayPath}

---

## Summary

${summary}

## Issues

${issuesMarkdown}
${recommendationsMarkdown}${positiveAspectsMarkdown}---${costInfo}

*Generated by Code Review Tool using ${modelInfo}*`;
}

/**
 * Format a single issue as Markdown
 * @param issue Review issue
 * @returns Markdown string
 */
function formatIssue(issue: ReviewIssue): string {
  const { title, type, filePath, lineNumbers, description, codeSnippet, suggestedFix, impact } = issue;

  let issueMarkdown = `#### ${title}\n`;

  if (filePath) {
    issueMarkdown += `- **Location**: \`${filePath}${lineNumbers ? `:${lineNumbers}` : ''}\`\n`;
  }

  if (type) {
    issueMarkdown += `- **Type**: ${type}\n`;
  }

  issueMarkdown += `- **Description**: ${description}\n`;

  if (codeSnippet) {
    issueMarkdown += `- **Code**:\n\`\`\`\n${codeSnippet}\n\`\`\`\n`;
  }

  if (suggestedFix) {
    issueMarkdown += `- **Suggested Fix**:\n\`\`\`\n${suggestedFix}\n\`\`\`\n`;
  }

  if (impact) {
    issueMarkdown += `- **Impact**: ${impact}\n`;
  }

  return issueMarkdown;
}
