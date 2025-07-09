/**
 * @fileoverview Formatters for Markdown output of code reviews.
 *
 * This module provides functions to format code review results as Markdown,
 * including different formats for structured and unstructured reviews.
 */

import type { ReviewResult } from '../../types/review';
import type { StructuredReview } from '../../types/structuredReview';
import logger from '../../utils/logger';
import { sanitizeContent } from '../../utils/sanitizer';
import { formatIssue, formatSchemaIssue } from './IssueFormatters';
import { formatCostInfo, formatMetadataSection, parseCostInfo } from './MetadataFormatter';
import { extractModelInfo, extractModelInfoFromString } from './ModelInfoExtractor';

/**
 * Format the review as Markdown
 * @param review Review result to format
 * @returns Markdown string
 */
export function formatAsMarkdown(review: ReviewResult): string {
  const { filePath, reviewType, content, timestamp, structuredData } = review;
  // Use costInfo if available, fallback to cost
  const cost = review.costInfo || review.cost;

  // Extract model information
  const { modelInfo } = extractModelInfo(review.modelUsed);

  // Format cost information if available
  const costInfo = formatCostInfo(cost);

  // Check if the content is JSON that should be formatted as structured data
  let actualStructuredData = structuredData;
  if (!actualStructuredData && content && typeof content === 'string') {
    // Improved JSON detection - check for both raw JSON and code blocks
    const trimmedContent = content.trim();

    // First, try to extract JSON from code blocks with improved regex
    // This regex matches code blocks with or without the json language specifier
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
    const jsonBlocks = [...trimmedContent.matchAll(jsonBlockRegex)];

    if (jsonBlocks.length > 0) {
      // Try each code block until we find valid JSON
      for (const match of jsonBlocks) {
        try {
          const jsonContent = match[1].trim();
          if (jsonContent) {
            actualStructuredData = JSON.parse(jsonContent);
            logger.debug('Successfully parsed JSON from code block');
            break;
          }
        } catch (e) {
          logger.debug(
            `Failed to parse JSON from code block: ${e instanceof Error ? e.message : String(e)}`,
          );
          // Continue to next block
        }
      }
    }

    // If no valid JSON found in code blocks, try the entire content if it looks like JSON
    if (!actualStructuredData && trimmedContent.startsWith('{') && trimmedContent.endsWith('}')) {
      try {
        actualStructuredData = JSON.parse(trimmedContent);
        logger.debug('Successfully parsed JSON from full content');
      } catch (e) {
        logger.debug(
          `Failed to parse content as JSON: ${e instanceof Error ? e.message : String(e)}`,
        );
        // Not valid JSON, continue with regular formatting
      }
    }
  }

  // If we have structured data, format it as Markdown
  if (actualStructuredData) {
    try {
      let structuredReview: any;

      if (typeof actualStructuredData === 'string') {
        try {
          structuredReview = JSON.parse(actualStructuredData);
          logger.debug('Successfully parsed structured data string as JSON');
        } catch (parseError) {
          logger.warn(
            `Failed to parse structured data as JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          );
          // If it's not valid JSON, treat it as plain text
          return formatSimpleMarkdown(
            content,
            filePath || '',
            reviewType,
            timestamp,
            costInfo,
            modelInfo,
          );
        }
      } else {
        structuredReview = actualStructuredData;
      }

      // Check if the data has a 'review' property (our JSON structure)
      if (structuredReview?.review) {
        return formatSchemaBasedReviewAsMarkdown(
          structuredReview,
          filePath || '',
          reviewType,
          timestamp,
          costInfo,
          modelInfo,
        );
      }

      // Validate the parsed data has expected structure
      if (typeof structuredReview === 'object' && structuredReview !== null) {
        return formatStructuredReviewAsMarkdown(
          structuredReview,
          filePath || '',
          reviewType,
          timestamp,
          costInfo,
          modelInfo,
        );
      }
      logger.warn('Structured data is not an object:', typeof structuredReview);
      // If the data doesn't have the right structure, fall back to plain text
      return formatSimpleMarkdown(
        content,
        filePath || '',
        reviewType,
        timestamp,
        costInfo,
        modelInfo,
      );
    } catch (error) {
      logger.error(
        `Error processing structured review data: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Fall back to unstructured format
      return formatSimpleMarkdown(
        content,
        filePath || '',
        reviewType,
        timestamp,
        costInfo,
        modelInfo,
      );
    }
  }

  // Sanitize the content to prevent XSS attacks
  const sanitizedContent = sanitizeContent(content);

  // Use the actual file path for the review title and the reviewed field
  // If filePath is the same as reviewType, is 'consolidated', or is undefined/empty, show the current directory path
  let displayPath = filePath || '';

  if (!displayPath || displayPath === reviewType || displayPath === 'consolidated') {
    // For consolidated reviews, show the full target directory path
    displayPath = `${process.cwd()} (Current Directory)`;
  }

  // Extract model vendor and name from modelInfo (currently unused but may be needed for future features)
  // const { modelVendor, modelName } = extractModelInfoFromString(modelInfo);

  // Create metadata section
  const metadataSection = formatMetadataSection(
    reviewType,
    timestamp,
    modelInfo,
    cost,
    review.toolVersion,
    review.commandOptions,
    review.detectedLanguage,
    review.detectedFramework,
    review.frameworkVersion,
    review.cssFrameworks,
  );

  return `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Model**: ${modelInfo}
> **Generated**: ${new Date(timestamp).toLocaleString()}

---

${metadataSection}

${sanitizedContent}

---${costInfo}

*Generated by [AI Code Review Tool](https://www.npmjs.com/package/@bobmatnyc/ai-code-review) using ${modelInfo}*`;
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
export function formatStructuredReviewAsMarkdown(
  structuredReview: StructuredReview,
  filePath: string,
  reviewType: string,
  timestamp: string,
  costInfo: string,
  modelInfo: string,
  metadataSection?: string,
): string {
  // Check if the structuredReview has required properties
  if (!structuredReview || typeof structuredReview !== 'object') {
    console.warn('Invalid structured review data, falling back to simple format');
    return formatSimpleMarkdown(
      'No structured data available. The review may be in an unsupported format.',
      filePath,
      reviewType,
      timestamp,
      costInfo,
      modelInfo,
      metadataSection,
    );
  }

  // Extract properties with fallbacks for missing properties
  const summary = structuredReview.summary || 'No summary provided';
  const issues = Array.isArray(structuredReview.issues) ? structuredReview.issues : [];
  const recommendations = Array.isArray(structuredReview.recommendations)
    ? structuredReview.recommendations
    : [];
  const positiveAspects = Array.isArray(structuredReview.positiveAspects)
    ? structuredReview.positiveAspects
    : [];

  // Extract grade information if available
  const grade = structuredReview.grade;
  const gradeCategories = structuredReview.gradeCategories;

  // Group issues by priority
  const highPriorityIssues = issues.filter((issue) => issue && issue.priority === 'high');
  const mediumPriorityIssues = issues.filter((issue) => issue && issue.priority === 'medium');
  const lowPriorityIssues = issues.filter((issue) => issue && issue.priority === 'low');

  // Format issues by priority
  let issuesMarkdown = '';

  if (highPriorityIssues.length > 0) {
    issuesMarkdown += '### High Priority\n\n';
    issuesMarkdown += highPriorityIssues.map((issue) => formatIssue(issue)).join('\n\n');
    issuesMarkdown += '\n\n';
  }

  if (mediumPriorityIssues.length > 0) {
    issuesMarkdown += '### Medium Priority\n\n';
    issuesMarkdown += mediumPriorityIssues.map((issue) => formatIssue(issue)).join('\n\n');
    issuesMarkdown += '\n\n';
  }

  if (lowPriorityIssues.length > 0) {
    issuesMarkdown += '### Low Priority\n\n';
    issuesMarkdown += lowPriorityIssues.map((issue) => formatIssue(issue)).join('\n\n');
    issuesMarkdown += '\n\n';
  }

  // Format recommendations
  let recommendationsMarkdown = '';
  if (recommendations && recommendations.length > 0) {
    recommendationsMarkdown = '## General Recommendations\n\n';
    recommendationsMarkdown += recommendations.map((rec) => `- ${rec}`).join('\n');
    recommendationsMarkdown += '\n\n';
  }

  // Format positive aspects
  let positiveAspectsMarkdown = '';
  if (positiveAspects && positiveAspects.length > 0) {
    positiveAspectsMarkdown = '## Positive Aspects\n\n';
    positiveAspectsMarkdown += positiveAspects.map((aspect) => `- ${aspect}`).join('\n');
    positiveAspectsMarkdown += '\n\n';
  }

  // Use the actual file path for the review title and the reviewed field
  // If filePath is the same as reviewType, is 'consolidated', or is undefined/empty, show the current directory path
  let displayPath = filePath || '';

  if (!displayPath || displayPath === reviewType || displayPath === 'consolidated') {
    // For consolidated reviews, show the full target directory path
    displayPath = `${process.cwd()} (Current Directory)`;
  }

  // Include metadata section if available
  const metadataContent = metadataSection ? `${metadataSection}\n` : '';

  // Format grade section if available
  let gradeMarkdown = '';
  if (grade) {
    gradeMarkdown = `## Grade: ${grade}\n\n`;

    // Add grade categories if available
    if (gradeCategories) {
      if (gradeCategories.functionality)
        gradeMarkdown += `- **Functionality**: ${gradeCategories.functionality}\n`;
      if (gradeCategories.codeQuality)
        gradeMarkdown += `- **Code Quality**: ${gradeCategories.codeQuality}\n`;
      if (gradeCategories.documentation)
        gradeMarkdown += `- **Documentation**: ${gradeCategories.documentation}\n`;
      if (gradeCategories.testing) gradeMarkdown += `- **Testing**: ${gradeCategories.testing}\n`;
      if (gradeCategories.maintainability)
        gradeMarkdown += `- **Maintainability**: ${gradeCategories.maintainability}\n`;
      if (gradeCategories.security)
        gradeMarkdown += `- **Security**: ${gradeCategories.security}\n`;
      if (gradeCategories.performance)
        gradeMarkdown += `- **Performance**: ${gradeCategories.performance}\n`;
      gradeMarkdown += '\n';
    }
  }

  return `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Model**: ${modelInfo}
> **Generated**: ${new Date(timestamp).toLocaleString()}

---

${metadataContent}${gradeMarkdown}## Summary

${summary}

## Issues

${issuesMarkdown}
${recommendationsMarkdown}${positiveAspectsMarkdown}---${costInfo}

*Generated by [AI Code Review Tool](https://www.npmjs.com/package/@bobmatnyc/ai-code-review) using ${modelInfo}*`;
}

/**
 * Format a simple markdown document with just the content
 * Used as fallback when structured data isn't available
 * @param content Content to include in the document
 * @param filePath Path to the reviewed file
 * @param reviewType Type of review performed
 * @param timestamp Timestamp of when the review was generated
 * @param costInfo Cost information formatted as Markdown
 * @param modelInfo Model information
 * @param metadataSection Optional metadata section to include
 * @returns Markdown string
 */
export function formatSimpleMarkdown(
  content: string,
  filePath: string,
  reviewType: string,
  timestamp: string,
  costInfo: string,
  modelInfo: string,
  metadataSection?: string,
): string {
  // Sanitize the content
  const sanitizedContent = sanitizeContent(content);

  // Use the actual file path for the review title and the reviewed field
  let displayPath = filePath || '';

  if (!displayPath || displayPath === reviewType || displayPath === 'consolidated') {
    // For consolidated reviews, show the full target directory path
    displayPath = `${process.cwd()} (Current Directory)`;
  }

  // Extract model vendor and name from modelInfo
  const { modelVendor, modelName } = extractModelInfoFromString(modelInfo);

  // Parse cost information if it's available in string form
  const cost = parseCostInfo(costInfo);

  // Include metadata section if available
  const metadataContent = metadataSection ? `${metadataSection}\n` : '';

  // Generate a metadata section with model information if not provided
  const modelMetadata = !metadataSection
    ? `## Metadata
| Property | Value |
|----------|-------|
| Review Type | ${reviewType} |
| Generated At | ${new Date(timestamp).toLocaleString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short',
      })} |
| Model Provider | ${modelVendor} |
| Model Name | ${modelName} |${
        cost
          ? `
| Input Tokens | ${cost.inputTokens.toLocaleString()} |
| Output Tokens | ${cost.outputTokens.toLocaleString()} |
| Total Tokens | ${cost.totalTokens.toLocaleString()} |
| Estimated Cost | ${cost.formattedCost} |`
          : ''
      }${
        cost?.passCount
          ? `
| Multi-pass Review | ${cost.passCount} passes |`
          : ''
      }
`
    : '';

  // Include this metadata section in all formats for consistency
  const fullMetadataContent = metadataContent || modelMetadata;

  return `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Model**: ${modelInfo}
> **Generated**: ${new Date(timestamp).toLocaleString()}

---

${fullMetadataContent}

${sanitizedContent}

---${costInfo}

*Generated by [AI Code Review Tool](https://www.npmjs.com/package/@bobmatnyc/ai-code-review) using ${modelInfo}*`;
}

/**
 * Format a schema-based review (with 'review' property) as Markdown
 * @param schemaReview Schema-based review object
 * @param filePath Path to the reviewed file
 * @param reviewType Type of review
 * @param timestamp Timestamp of the review
 * @param costInfo Cost information string
 * @param modelInfo Model information string
 * @param metadataSection Optional metadata section
 * @returns Formatted markdown string
 */
export function formatSchemaBasedReviewAsMarkdown(
  schemaReview: any,
  filePath: string,
  reviewType: string,
  timestamp: string,
  costInfo: string,
  modelInfo: string,
  metadataSection?: string,
): string {
  // Extract the review object
  const review = schemaReview.review;
  if (!review || typeof review !== 'object') {
    return formatSimpleMarkdown(
      JSON.stringify(schemaReview, null, 2),
      filePath,
      reviewType,
      timestamp,
      costInfo,
      modelInfo,
      metadataSection,
    );
  }

  // Extract files and issues
  const files = review.files || [];
  const summary = review.summary || {};

  // Create issues sections by priority
  const highPriorityIssues: any[] = [];
  const mediumPriorityIssues: any[] = [];
  const lowPriorityIssues: any[] = [];

  // Collect all issues from all files
  files.forEach((file: any) => {
    const issues = file.issues || [];
    issues.forEach((issue: any) => {
      // Add file path to issue for context
      const issueWithFile = { ...issue, filePath: file.filePath };

      if (issue.priority === 'HIGH') {
        highPriorityIssues.push(issueWithFile);
      } else if (issue.priority === 'MEDIUM') {
        mediumPriorityIssues.push(issueWithFile);
      } else if (issue.priority === 'LOW') {
        lowPriorityIssues.push(issueWithFile);
      }
    });
  });

  // Format the metadata section
  let displayPath = filePath || '';
  if (!displayPath || displayPath === reviewType || displayPath === 'consolidated') {
    displayPath = `${process.cwd()} (Current Directory)`;
  }

  // Extract model vendor and name from modelInfo
  const { modelVendor, modelName } = extractModelInfoFromString(modelInfo);

  // Build the metadata section if not provided
  if (!metadataSection) {
    const formattedDate = new Date(timestamp).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short',
    });

    metadataSection = `## Metadata
| Property | Value |
|----------|-------|
| Review Type | ${reviewType} |
| Generated At | ${formattedDate} |
| Model Provider | ${modelVendor} |
| Model Name | ${modelName} |`;
  }

  let output = `# Code Review: ${displayPath}

> **Review Type**: ${reviewType}
> **Model**: ${modelInfo}
> **Generated**: ${new Date(timestamp).toLocaleString()}

---

${metadataSection}

## Review Summary

`;

  // Add summary counts
  if (summary.totalIssues > 0) {
    output += `Total issues found: **${summary.totalIssues}**
- High Priority: ${summary.highPriorityIssues || 0}
- Medium Priority: ${summary.mediumPriorityIssues || 0}
- Low Priority: ${summary.lowPriorityIssues || 0}

`;
  } else {
    output += `No issues found. The code looks good!\n\n`;
  }

  // Add issues by priority
  if (highPriorityIssues.length > 0) {
    output += `## High Priority Issues\n\n`;
    highPriorityIssues.forEach((issue, index) => {
      output += formatSchemaIssue(issue, index + 1);
    });
  }

  if (mediumPriorityIssues.length > 0) {
    output += `## Medium Priority Issues\n\n`;
    mediumPriorityIssues.forEach((issue, index) => {
      output += formatSchemaIssue(issue, index + 1);
    });
  }

  if (lowPriorityIssues.length > 0) {
    output += `## Low Priority Issues\n\n`;
    lowPriorityIssues.forEach((issue, index) => {
      output += formatSchemaIssue(issue, index + 1);
    });
  }

  // Add cost information at the end
  if (costInfo) {
    output += `\n${costInfo}\n`;
  }

  // Add footer with tool information
  output += `\n*Generated by [AI Code Review Tool](https://www.npmjs.com/package/@bobmatnyc/ai-code-review) using ${modelInfo}*`;

  return output;
}
