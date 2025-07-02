/**
 * @fileoverview Formatters for review issues in different formats.
 *
 * This module provides functions to format review issues in different formats,
 * including structured issues and schema-based issues.
 */

import type { ReviewIssue } from '../../types/structuredReview';

/**
 * Format a single issue from the schema format
 * @param issue Issue object from schema
 * @param index Issue number
 * @returns Formatted issue string
 */
export function formatSchemaIssue(issue: any, index: number): string {
  let issueMarkdown = `### ${index}. ${issue.description}\n\n`;

  if (issue.filePath) {
    issueMarkdown += `**File**: \`${issue.filePath}\`\n`;
  }

  if (issue.location) {
    issueMarkdown += `**Location**: Lines ${issue.location.startLine}-${issue.location.endLine}\n\n`;
  }

  if (issue.currentCode) {
    issueMarkdown += `**Current Code**:\n\`\`\`\n${issue.currentCode}\n\`\`\`\n\n`;
  }

  if (issue.suggestedCode) {
    issueMarkdown += `**Suggested Fix**:\n\`\`\`\n${issue.suggestedCode}\n\`\`\`\n\n`;
  }

  if (issue.explanation) {
    issueMarkdown += `**Explanation**: ${issue.explanation}\n\n`;
  }

  issueMarkdown += `---\n\n`;

  return issueMarkdown;
}

/**
 * Format a single issue as Markdown
 * @param issue Review issue
 * @returns Markdown string
 */
export function formatIssue(issue: ReviewIssue): string {
  // Guard against null or undefined issues
  if (!issue) {
    return '#### [Error: Issue data missing]';
  }

  const { title, type, filePath, lineNumbers, description, codeSnippet, suggestedFix, impact } =
    issue;

  let issueMarkdown = `#### ${title || '[Untitled Issue]'}\n`;

  if (filePath) {
    issueMarkdown += `- **Location**: \`${filePath}${lineNumbers ? `:${lineNumbers}` : ''}\`\n`;
  }

  if (type) {
    issueMarkdown += `- **Type**: ${type}\n`;
  }

  issueMarkdown += `- **Description**: ${description || 'No description provided'}\n`;

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
