/**
 * @fileoverview Formatter for unused code review results.
 *
 * This module provides formatters for unused code review results, focusing on
 * creating a practical list of code that can be safely removed.
 */

import chalk from 'chalk';
import type {
  ImprovedUnusedCodeIssue,
  ImprovedUnusedCodeReview,
  UnusedCodeCategory,
} from '../prompts/schemas/improved-unused-code-schema';
import {
  type ConfidenceLevel,
  filterByConfidence,
  formatByConfidence,
  groupByFile,
  MARKDOWN_CONFIDENCE_HEADERS,
  sortByLineDescending,
  TERMINAL_CONFIDENCE_HEADERS,
} from './unusedCodeFormatterUtils';

/**
 * Configuration for formatting a category section
 */
interface CategorySectionConfig {
  title: string;
  description: string;
  issues: ImprovedUnusedCodeIssue[];
}

/**
 * Format a category section with confidence-based grouping
 * @param config Section configuration
 * @returns Formatted markdown section
 */
function formatCategorySection(config: CategorySectionConfig): string {
  if (config.issues.length === 0) {
    return '';
  }

  let markdown = `## ${config.title}\n\n`;
  markdown += `_${config.description}_\n\n`;

  markdown += formatByConfidence(
    {
      elements: config.issues,
      getConfidence: (issue) => issue.assessment.confidence as ConfidenceLevel,
      formatElements: (issues) => formatIssuesAsChecklist(issues),
    },
    MARKDOWN_CONFIDENCE_HEADERS,
  );

  return markdown;
}

/**
 * Format recommended tools section
 * @param review The review containing recommended tools
 * @returns Formatted recommended tools section
 */
function formatRecommendedTools(review: ImprovedUnusedCodeReview): string {
  if (!review.recommendedTools || review.recommendedTools.length === 0) {
    return '';
  }

  let markdown = '## Recommended Tools\n\n';
  markdown += '_Tools that can help automate the detection of unused code:_\n\n';

  for (const tool of review.recommendedTools) {
    markdown += `### ${tool.tool}\n\n`;
    markdown += `${tool.description}\n\n`;

    if (tool.configuration) {
      markdown += '```\n';
      markdown += tool.configuration;
      markdown += '\n```\n\n';
    }
  }

  return markdown;
}

/**
 * Format general recommendations section
 * @param recommendations List of recommendations
 * @returns Formatted recommendations section
 */
function formatRecommendations(recommendations: string[]): string {
  let markdown = '## General Recommendations\n\n';

  for (const recommendation of recommendations) {
    markdown += `- ${recommendation}\n`;
  }

  return markdown;
}

/**
 * Format an unused code review as markdown
 * @param review The review to format
 * @returns Formatted markdown
 */
export function formatUnusedCodeReviewAsMarkdown(review: ImprovedUnusedCodeReview): string {
  let markdown = '# Unused Code Review: Files & Functions That Can Be Safely Removed\n\n';
  markdown += '## Summary\n\n';
  markdown += `${review.summary}\n\n`;

  // Define category sections
  const sections: CategorySectionConfig[] = [
    {
      title: 'Unused Files',
      description:
        'The following files are not imported or used anywhere and can be safely removed:',
      issues: getAllIssuesByCategory(review, 'unusedFile'),
    },
    {
      title: 'Unused Functions',
      description: 'The following functions are never called and can be safely removed:',
      issues: getAllIssuesByCategory(review, 'unusedFunction'),
    },
    {
      title: 'Unused Classes',
      description:
        'The following classes are never instantiated or extended and can be safely removed:',
      issues: getAllIssuesByCategory(review, 'unusedClass'),
    },
    {
      title: 'Unused Modules',
      description: 'The following modules are never imported or used and can be safely removed:',
      issues: getAllIssuesByCategory(review, 'unusedModule'),
    },
    {
      title: 'Other Unused Code',
      description: 'The following code elements can be safely removed:',
      issues: getAllIssuesByCategory(review, null, true),
    },
  ];

  // Format each section
  for (const section of sections) {
    markdown += formatCategorySection(section);
  }

  // Add recommended tools and recommendations
  markdown += formatRecommendedTools(review);
  markdown += formatRecommendations(review.recommendations);

  return markdown;
}

/**
 * Get all issues from a review by category
 * @param review The review to extract issues from
 * @param category The category to filter by (null for no filter)
 * @param excludeMainCategories Whether to exclude main categories (unused files, functions, classes, modules)
 * @returns Array of issues matching the category
 */
function getAllIssuesByCategory(
  review: ImprovedUnusedCodeReview,
  category: UnusedCodeCategory | null,
  excludeMainCategories = false,
): ImprovedUnusedCodeIssue[] {
  // Gather all issues
  const allIssues = [
    ...review.highImpactIssues,
    ...review.mediumImpactIssues,
    ...review.lowImpactIssues,
  ];

  // If no category is provided, return all issues
  if (category === null) {
    if (excludeMainCategories) {
      // Exclude the main categories (unused files, functions, classes, modules)
      return allIssues.filter(
        (issue) =>
          issue.category !== 'unusedFile' &&
          issue.category !== 'unusedFunction' &&
          issue.category !== 'unusedClass' &&
          issue.category !== 'unusedModule',
      );
    }
    return allIssues;
  }

  // Filter issues by category
  return allIssues.filter((issue) => issue.category === category);
}

/**
 * Format a single issue as checklist item
 * @param issue Issue to format
 * @returns Formatted markdown for the issue
 */
function formatSingleIssue(issue: ImprovedUnusedCodeIssue): string {
  let markdown = '';

  const lines =
    issue.location.lineStart && issue.location.lineEnd
      ? `(lines ${issue.location.lineStart}-${issue.location.lineEnd})`
      : '';

  const isCompleteElement = issue.isCompleteElement ? '**[COMPLETE ELEMENT]** ' : '';

  markdown += `- [ ] ${isCompleteElement}${issue.title} ${lines}\n`;
  markdown += `  - **Description**: ${issue.description}\n`;

  if (issue.location.codeSnippet) {
    markdown += '  ```\n';
    markdown += `  ${issue.location.codeSnippet}\n`;
    markdown += '  ```\n';
  }

  markdown += `  - **Confidence**: ${issue.assessment.confidence.toUpperCase()} - ${issue.assessment.reasoning}\n`;
  markdown += `  - **Suggested Action**: ${issue.suggestedAction.explanation}\n`;

  if (issue.relatedChecks && issue.relatedChecks.length > 0) {
    markdown += '  - **Related Checks**:\n';
    for (const check of issue.relatedChecks) {
      markdown += `    - ${check}\n`;
    }
  }

  markdown += '\n';
  return markdown;
}

/**
 * Format a list of issues as a checklist
 * @param issues Issues to format
 * @returns Formatted markdown checklist
 */
function formatIssuesAsChecklist(issues: ImprovedUnusedCodeIssue[]): string {
  let markdown = '';

  const issuesByFile = groupByFile(issues, (issue) => issue.location.file || 'Unknown file');

  for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
    markdown += `### ${filePath}\n\n`;
    for (const issue of fileIssues) {
      markdown += formatSingleIssue(issue);
    }
  }

  return markdown;
}

/**
 * Terminal color type
 */
type TerminalColor = 'green' | 'yellow' | 'red';

/**
 * Configuration for terminal confidence headers
 */
const TERMINAL_CONFIDENCE_COLORS: Record<ConfidenceLevel, TerminalColor> = {
  high: 'green',
  medium: 'yellow',
  low: 'red',
};

/**
 * Format terminal category section
 * @param title Section title
 * @param description Section description
 * @param issues Issues to format
 * @param titleColor Color for title
 * @returns Formatted terminal output
 */
function formatTerminalCategorySection(
  title: string,
  description: string,
  issues: ImprovedUnusedCodeIssue[],
  titleColor: typeof chalk.bold.magenta,
): string {
  if (issues.length === 0) {
    return '';
  }

  let output = titleColor(`${title.toUpperCase()}\n\n`);
  output += chalk.italic(`${description}\n\n`);

  output += formatByConfidence(
    {
      elements: issues,
      getConfidence: (issue) => issue.assessment.confidence as ConfidenceLevel,
      formatElements: (filtered, confidence) => {
        const color = TERMINAL_CONFIDENCE_COLORS[confidence];
        const header = TERMINAL_CONFIDENCE_HEADERS[confidence];
        let result = chalk.bold[color](header);
        result += formatIssuesForTerminal(filtered, color);
        return result;
      },
    },
    {} as Record<ConfidenceLevel, string>, // We handle headers in formatElements
  );

  return output;
}

/**
 * Format an unused code review for terminal output
 * @param review The review to format
 * @returns Formatted string for terminal output
 */
export function formatUnusedCodeReviewForTerminal(review: ImprovedUnusedCodeReview): string {
  let output = chalk.bold.blue(
    'UNUSED CODE REVIEW: FILES & FUNCTIONS THAT CAN BE SAFELY REMOVED\n\n',
  );

  output += chalk.bold.white('SUMMARY\n\n');
  output += `${review.summary}\n\n`;

  // Format files section
  output += formatTerminalCategorySection(
    'Unused Files',
    'The following files are not imported or used anywhere and can be safely removed:',
    getAllIssuesByCategory(review, 'unusedFile'),
    chalk.bold.magenta,
  );

  // Format functions section
  output += formatTerminalCategorySection(
    'Unused Functions',
    'The following functions are never called and can be safely removed:',
    getAllIssuesByCategory(review, 'unusedFunction'),
    chalk.bold.cyan,
  );

  // Format classes and modules section (combined)
  const classesAndModules = [
    ...getAllIssuesByCategory(review, 'unusedClass'),
    ...getAllIssuesByCategory(review, 'unusedModule'),
  ];

  if (classesAndModules.length > 0) {
    output += chalk.bold.blue('UNUSED CLASSES AND MODULES\n\n');
    output += chalk.italic('The following classes and modules are unused and can be removed:\n\n');

    const highConfidenceItems = filterByConfidence(
      classesAndModules,
      'high',
      (issue) => issue.assessment.confidence as ConfidenceLevel,
    );

    if (highConfidenceItems.length > 0) {
      output += chalk.bold.green('HIGH CONFIDENCE ITEMS:\n\n');
      output += formatIssuesForTerminal(highConfidenceItems, 'green');
    }

    const otherItems = classesAndModules.filter((issue) => issue.assessment.confidence !== 'high');

    if (otherItems.length > 0) {
      output += chalk.bold.yellow('OTHER ITEMS (VERIFICATION RECOMMENDED):\n\n');
      output += formatIssuesForTerminal(otherItems, 'yellow');
    }
  }

  // Add general recommendations
  output += chalk.bold.white('GENERAL RECOMMENDATIONS\n\n');

  for (const recommendation of review.recommendations) {
    output += `${chalk.blue('•')} ${recommendation}\n`;
  }

  return output;
}

/**
 * Format a single issue for terminal output
 * @param issue Issue to format
 * @param color Color to use for issue title
 * @returns Formatted terminal output
 */
function formatSingleIssueForTerminal(
  issue: ImprovedUnusedCodeIssue,
  color: TerminalColor,
): string {
  let output = '';

  const lines =
    issue.location.lineStart && issue.location.lineEnd
      ? `(lines ${issue.location.lineStart}-${issue.location.lineEnd})`
      : '';

  const isCompleteElement = issue.isCompleteElement
    ? chalk.bold.underline('[COMPLETE ELEMENT] ')
    : '';

  output += chalk[color](`• ${isCompleteElement}${issue.title} ${lines}\n`);
  output += `  ${chalk.italic('Description')}: ${issue.description}\n`;

  if (issue.location.codeSnippet) {
    output += chalk.gray(`  ${issue.location.codeSnippet.trim()}\n`);
  }

  output += `  ${chalk.italic('Confidence')}: ${issue.assessment.confidence.toUpperCase()} - ${issue.assessment.reasoning}\n`;
  output += `  ${chalk.italic('Suggested Action')}: ${issue.suggestedAction.explanation}\n`;

  if (issue.relatedChecks && issue.relatedChecks.length > 0) {
    output += `  ${chalk.italic('Related Checks')}:\n`;
    for (const check of issue.relatedChecks) {
      output += `    - ${check}\n`;
    }
  }

  output += '\n';
  return output;
}

/**
 * Format a list of issues for terminal output
 * @param issues Issues to format
 * @param color Color to use for issue titles
 * @returns Formatted string for terminal output
 */
function formatIssuesForTerminal(issues: ImprovedUnusedCodeIssue[], color: TerminalColor): string {
  let output = '';

  const issuesByFile = groupByFile(issues, (issue) => issue.location.file || 'Unknown file');

  for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
    output += chalk.bold.white(`${filePath}\n\n`);
    for (const issue of fileIssues) {
      output += formatSingleIssueForTerminal(issue, color);
    }
  }

  return output;
}

/**
 * Generate removal commands for issues grouped by file
 * @param issuesByFile Issues grouped by file path
 * @param sectionTitle Title for the section
 * @returns Shell script commands
 */
function generateRemovalCommands(
  issuesByFile: Record<string, ImprovedUnusedCodeIssue[]>,
  sectionTitle: string,
): string {
  if (Object.keys(issuesByFile).length === 0) {
    return '';
  }

  let script = `echo "${sectionTitle}:"\n`;

  for (const [filePath, elements] of Object.entries(issuesByFile)) {
    script += `echo "Processing ${filePath}"\n`;

    for (const element of elements) {
      if (element.location.lineStart && element.location.lineEnd) {
        script += `sed -i '${element.location.lineStart},${element.location.lineEnd}d' "${filePath}"\n`;
        script += `echo "  Removed ${element.title} (lines ${element.location.lineStart}-${element.location.lineEnd})"\n`;
      }
    }

    script += '\n';
  }

  return script;
}

/**
 * Group and sort issues by file for removal
 * @param issues Issues to group
 * @returns Issues grouped by file, sorted by line descending
 */
function groupAndSortForRemoval(
  issues: ImprovedUnusedCodeIssue[],
): Record<string, ImprovedUnusedCodeIssue[]> {
  const grouped: Record<string, ImprovedUnusedCodeIssue[]> = {};

  for (const issue of issues) {
    const filePath = issue.location.file;
    if (!filePath || !issue.location.lineStart || !issue.location.lineEnd) continue;

    if (!grouped[filePath]) {
      grouped[filePath] = [];
    }

    grouped[filePath].push(issue);
  }

  // Sort by line number descending to avoid line number changes
  for (const filePath in grouped) {
    grouped[filePath] = sortByLineDescending(
      grouped[filePath],
      (issue) => issue.location.lineStart,
    );
  }

  return grouped;
}

/**
 * Generate a shell script for removing unused code
 * @param review The review to format
 * @returns Shell script for removing unused code
 */
export function generateRemovalScript(review: ImprovedUnusedCodeReview): string {
  let script = '#!/bin/bash\n\n';
  script += '# Script generated by AI Code Review to remove unused code\n';
  script += '# WARNING: This script should be carefully reviewed before execution\n';
  script += '# RECOMMENDED: Make a backup before running this script\n\n';

  script += 'echo "This script will remove unused code found in the codebase."\n\n';

  // Get high confidence unused files
  const unusedFiles = filterByConfidence(
    getAllIssuesByCategory(review, 'unusedFile'),
    'high',
    (issue) => issue.assessment.confidence as ConfidenceLevel,
  );

  // Remove entire files first
  if (unusedFiles.length > 0) {
    script += 'echo "REMOVING UNUSED FILES:"\n';

    for (const issue of unusedFiles) {
      if (issue.location.file) {
        script += `echo "  - ${issue.location.file}"\n`;
        script += `rm "${issue.location.file}"\n`;
      }
    }

    script += 'echo "Unused files removed successfully."\n\n';
  }

  // Get high confidence complete elements
  const completeElements = [
    ...filterByConfidence(
      getAllIssuesByCategory(review, 'unusedFunction'),
      'high',
      (issue) => issue.assessment.confidence as ConfidenceLevel,
    ).filter((issue) => issue.isCompleteElement),
    ...filterByConfidence(
      getAllIssuesByCategory(review, 'unusedClass'),
      'high',
      (issue) => issue.assessment.confidence as ConfidenceLevel,
    ).filter((issue) => issue.isCompleteElement),
    ...filterByConfidence(
      getAllIssuesByCategory(review, 'unusedModule'),
      'high',
      (issue) => issue.assessment.confidence as ConfidenceLevel,
    ),
    ...filterByConfidence(
      getAllIssuesByCategory(review, null, true),
      'high',
      (issue) => issue.assessment.confidence as ConfidenceLevel,
    ).filter((issue) => issue.isCompleteElement),
  ];

  // Generate removal commands for complete elements
  const completeElementsByFile = groupAndSortForRemoval(completeElements);
  script += generateRemovalCommands(completeElementsByFile, 'REMOVING COMPLETE CODE ELEMENTS');

  // Get partial issues
  const partialIssues = filterByConfidence(
    getAllIssuesByCategory(review, null, true),
    'high',
    (issue) => issue.assessment.confidence as ConfidenceLevel,
  ).filter((issue) => !issue.isCompleteElement);

  // Generate removal commands for partial issues
  const partialIssuesByFile = groupAndSortForRemoval(partialIssues);
  script += generateRemovalCommands(partialIssuesByFile, 'REMOVING PARTIAL CODE ELEMENTS');

  script += 'echo "Unused code removal complete. Please review the changes before committing."\n';

  return script;
}

export default {
  formatUnusedCodeReviewAsMarkdown,
  formatUnusedCodeReviewForTerminal,
  generateRemovalScript,
};
