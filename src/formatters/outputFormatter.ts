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
export function formatReviewOutput(
  review: ReviewResult,
  format: string
): string {
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
  let modelVendor = 'Google';
  let modelName = 'Gemini AI';

  // Extract model information
  if (review.modelUsed) {
    if (review.modelUsed.startsWith('openrouter:')) {
      modelVendor = 'OpenRouter';
      modelName = review.modelUsed.substring('openrouter:'.length);
      modelInfo = `OpenRouter (${modelName})`;
    } else if (review.modelUsed.startsWith('anthropic:')) {
      modelVendor = 'Anthropic';
      modelName = review.modelUsed.substring('anthropic:'.length);
      modelInfo = `Anthropic (${modelName})`;
    } else if (review.modelUsed.startsWith('openai:')) {
      modelVendor = 'OpenAI';
      modelName = review.modelUsed.substring('openai:'.length);
      modelInfo = `OpenAI (${modelName})`;
    } else if (review.modelUsed.startsWith('gemini:')) {
      modelVendor = 'Google';
      modelName = review.modelUsed.substring('gemini:'.length);
      modelInfo = `Google Gemini AI (${modelName})`;
    } else {
      modelVendor = 'Google';
      modelName = review.modelUsed;
      modelInfo = `Google Gemini AI (${modelName})`;
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

  // Parse additional metadata if available
  let additionalMetadata = {};
  if (review.metadata) {
    try {
      additionalMetadata = typeof review.metadata === 'string' 
        ? JSON.parse(review.metadata) 
        : review.metadata;
    } catch (error) {
      // Silently continue if metadata parsing fails
    }
  }

  // Format path for display
  let displayPath = review.filePath;
  if (review.filePath === review.reviewType || review.filePath === 'consolidated') {
    displayPath = process.cwd() + ' (Current Directory)';
  }

  // Create enhanced metadata
  const enhancedMetadata = {
    model: {
      provider: modelVendor,
      name: modelName,
      fullName: modelInfo
    },
    review: {
      type: review.reviewType,
      path: displayPath,
      generatedAt: new Date(review.timestamp).toISOString(),
      formattedDate: new Date(review.timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      })
    },
    cost: review.cost || null,
    tool: {
      version: review.toolVersion || process.env.npm_package_version || '2.1.1',
      commandOptions: review.commandOptions || null,
      ...additionalMetadata
    }
  };

  // Create a copy of the review with enhanced metadata
  const reviewWithMeta = {
    ...review,
    content: sanitizedContent,
    structuredData: parsedStructuredData,
    meta: enhancedMetadata,
    // Legacy metadata field for backward compatibility
    metadata: {
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
  const { filePath, reviewType, content, timestamp, cost, structuredData } =
    review;

  // Determine model information
  let modelInfo = 'Google Gemini AI';

  // Add specific model information if available
  let modelVendor = 'Google';
  let modelName = 'Gemini AI';
  
  if (review.modelUsed) {
    if (review.modelUsed.startsWith('openrouter:')) {
      modelVendor = 'OpenRouter';
      modelName = review.modelUsed.substring('openrouter:'.length);
      modelInfo = `OpenRouter (${modelName})`;
    } else if (review.modelUsed.startsWith('anthropic:')) {
      modelVendor = 'Anthropic';
      modelName = review.modelUsed.substring('anthropic:'.length);
      modelInfo = `Anthropic (${modelName})`;
    } else if (review.modelUsed.startsWith('openai:')) {
      modelVendor = 'OpenAI';
      modelName = review.modelUsed.substring('openai:'.length);
      modelInfo = `OpenAI (${modelName})`;
    } else if (review.modelUsed.startsWith('gemini:')) {
      modelVendor = 'Google';
      modelName = review.modelUsed.substring('gemini:'.length);
      modelInfo = `Google Gemini AI (${modelName})`;
    } else {
      modelVendor = 'Google';
      modelName = review.modelUsed;
      modelInfo = `Google Gemini AI (${modelName})`;
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
      const structuredReview =
        typeof structuredData === 'string'
          ? (JSON.parse(structuredData) as StructuredReview)
          : (structuredData as StructuredReview);

      return formatStructuredReviewAsMarkdown(
        structuredReview,
        filePath,
        reviewType,
        timestamp,
        costInfo,
        modelInfo
      );
    } catch (error) {
      console.error('Error parsing structured review data:', error);
      // Fall back to unstructured format
    }
  }

  // Sanitize the content to prevent XSS attacks
  const sanitizedContent = sanitizeContent(content);

  // Use the actual file path for the review title and the reviewed field
  // If filePath is the same as reviewType or is 'consolidated', show the current directory path
  let displayPath = filePath;
  
  if (filePath === reviewType || filePath === 'consolidated') {
    // For consolidated reviews, show the full target directory path
    displayPath = process.cwd() + ' (Current Directory)';
  }
  
  // Format metadata
  const formattedDate = new Date(timestamp).toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  // Create comprehensive metadata section
  let metadataSection = `## Metadata
| Property | Value |
|----------|-------|
| Review Type | ${reviewType} |
| Generated At | ${formattedDate} |
| Model Provider | ${modelVendor} |
| Model Name | ${modelName} |`;

  // Add cost information if available
  if (cost) {
    metadataSection += `
| Input Tokens | ${cost.inputTokens.toLocaleString()} |
| Output Tokens | ${cost.outputTokens.toLocaleString()} |
| Total Tokens | ${cost.totalTokens.toLocaleString()} |
| Estimated Cost | ${cost.formattedCost} |`;
  }

  // Add tool version from the review result or fallback to package.json
  if (review.toolVersion) {
    metadataSection += `
| Tool Version | ${review.toolVersion} |`;
  }

  // Add command options if available
  if (review.commandOptions) {
    metadataSection += `
| Command Options | \`${review.commandOptions}\` |`;
  }

  // If we have additional metadata from the review, include it
  if (review.metadata) {
    try {
      const metadata = typeof review.metadata === 'string' ? JSON.parse(review.metadata) : review.metadata;
      
      // Add any additional metadata fields that weren't already added
      if (metadata.commandLineOptions && !review.commandOptions) {
        metadataSection += `
| Command Options | \`${metadata.commandLineOptions}\` |`;
      }
      
      if (metadata.version && !review.toolVersion) {
        metadataSection += `
| Tool Version | ${metadata.version} |`;
      }
    } catch (error) {
      // Silently continue if metadata parsing fails
    }
  }

  // Close the metadata table
  metadataSection += `
`;

  return `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Generated**: ${new Date(timestamp).toLocaleString()}
> **Reviewed**: ${displayPath}

---

${metadataSection}

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
 * @param metadataSection Optional metadata section to include
 * @returns Markdown string
 */
function formatStructuredReviewAsMarkdown(
  structuredReview: StructuredReview,
  filePath: string,
  reviewType: string,
  timestamp: string,
  costInfo: string,
  modelInfo: string,
  metadataSection?: string
): string {
  const { summary, issues, recommendations, positiveAspects } =
    structuredReview;

  // Group issues by priority
  const highPriorityIssues = issues.filter(issue => issue.priority === 'high');
  const mediumPriorityIssues = issues.filter(
    issue => issue.priority === 'medium'
  );
  const lowPriorityIssues = issues.filter(issue => issue.priority === 'low');

  // Format issues by priority
  let issuesMarkdown = '';

  if (highPriorityIssues.length > 0) {
    issuesMarkdown += '### High Priority\n\n';
    issuesMarkdown += highPriorityIssues
      .map(issue => formatIssue(issue))
      .join('\n\n');
    issuesMarkdown += '\n\n';
  }

  if (mediumPriorityIssues.length > 0) {
    issuesMarkdown += '### Medium Priority\n\n';
    issuesMarkdown += mediumPriorityIssues
      .map(issue => formatIssue(issue))
      .join('\n\n');
    issuesMarkdown += '\n\n';
  }

  if (lowPriorityIssues.length > 0) {
    issuesMarkdown += '### Low Priority\n\n';
    issuesMarkdown += lowPriorityIssues
      .map(issue => formatIssue(issue))
      .join('\n\n');
    issuesMarkdown += '\n\n';
  }

  // Format recommendations
  let recommendationsMarkdown = '';
  if (recommendations && recommendations.length > 0) {
    recommendationsMarkdown = '## General Recommendations\n\n';
    recommendationsMarkdown += recommendations
      .map(rec => `- ${rec}`)
      .join('\n');
    recommendationsMarkdown += '\n\n';
  }

  // Format positive aspects
  let positiveAspectsMarkdown = '';
  if (positiveAspects && positiveAspects.length > 0) {
    positiveAspectsMarkdown = '## Positive Aspects\n\n';
    positiveAspectsMarkdown += positiveAspects
      .map(aspect => `- ${aspect}`)
      .join('\n');
    positiveAspectsMarkdown += '\n\n';
  }

  // Use the actual file path for the review title and the reviewed field
  // If filePath is the same as reviewType or is 'consolidated', show the current directory path
  let displayPath = filePath;
  
  if (filePath === reviewType || filePath === 'consolidated') {
    // For consolidated reviews, show the full target directory path
    displayPath = process.cwd() + ' (Current Directory)';
  }

  // Include metadata section if available
  const metadataContent = metadataSection ? `${metadataSection}\n` : '';

  return `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Generated**: ${new Date(timestamp).toLocaleString()}
> **Reviewed**: ${displayPath}

---

${metadataContent}## Summary

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
  const {
    title,
    type,
    filePath,
    lineNumbers,
    description,
    codeSnippet,
    suggestedFix,
    impact
  } = issue;

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
