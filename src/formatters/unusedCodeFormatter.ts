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

/**
 * Format an unused code review as markdown
 * @param review The review to format
 * @returns Formatted markdown
 */
export function formatUnusedCodeReviewAsMarkdown(review: ImprovedUnusedCodeReview): string {
  // Build the header
  let markdown = '# Unused Code Review: Files & Functions That Can Be Safely Removed\n\n';

  // Add a summary section
  markdown += '## Summary\n\n';
  markdown += `${review.summary}\n\n`;

  // Create collections of specific unused elements
  const unusedFiles = getAllIssuesByCategory(review, 'unusedFile');
  const unusedFunctions = getAllIssuesByCategory(review, 'unusedFunction');
  const unusedClasses = getAllIssuesByCategory(review, 'unusedClass');
  const unusedModules = getAllIssuesByCategory(review, 'unusedModule');
  const otherUnusedElements = getAllIssuesByCategory(review, null, true);

  // Special section for completely unused files
  if (unusedFiles.length > 0) {
    markdown += '## Unused Files\n\n';
    markdown +=
      '_The following files are not imported or used anywhere and can be safely removed:_\n\n';

    const highConfidenceFiles = unusedFiles.filter(
      (issue) => issue.assessment.confidence === 'high',
    );
    const mediumConfidenceFiles = unusedFiles.filter(
      (issue) => issue.assessment.confidence === 'medium',
    );
    const lowConfidenceFiles = unusedFiles.filter((issue) => issue.assessment.confidence === 'low');

    if (highConfidenceFiles.length > 0) {
      markdown += '### High Confidence (Safe to Remove)\n\n';
      markdown += formatIssuesAsChecklist(highConfidenceFiles);
    }

    if (mediumConfidenceFiles.length > 0) {
      markdown += '### Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatIssuesAsChecklist(mediumConfidenceFiles);
    }

    if (lowConfidenceFiles.length > 0) {
      markdown += '### Low Confidence (Thorough Verification Required)\n\n';
      markdown += formatIssuesAsChecklist(lowConfidenceFiles);
    }
  }

  // Special section for unused functions
  if (unusedFunctions.length > 0) {
    markdown += '## Unused Functions\n\n';
    markdown += '_The following functions are never called and can be safely removed:_\n\n';

    const highConfidenceFunctions = unusedFunctions.filter(
      (issue) => issue.assessment.confidence === 'high',
    );
    const mediumConfidenceFunctions = unusedFunctions.filter(
      (issue) => issue.assessment.confidence === 'medium',
    );
    const lowConfidenceFunctions = unusedFunctions.filter(
      (issue) => issue.assessment.confidence === 'low',
    );

    if (highConfidenceFunctions.length > 0) {
      markdown += '### High Confidence (Safe to Remove)\n\n';
      markdown += formatIssuesAsChecklist(highConfidenceFunctions);
    }

    if (mediumConfidenceFunctions.length > 0) {
      markdown += '### Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatIssuesAsChecklist(mediumConfidenceFunctions);
    }

    if (lowConfidenceFunctions.length > 0) {
      markdown += '### Low Confidence (Thorough Verification Required)\n\n';
      markdown += formatIssuesAsChecklist(lowConfidenceFunctions);
    }
  }

  // Special section for unused classes
  if (unusedClasses.length > 0) {
    markdown += '## Unused Classes\n\n';
    markdown +=
      '_The following classes are never instantiated or extended and can be safely removed:_\n\n';

    const highConfidenceClasses = unusedClasses.filter(
      (issue) => issue.assessment.confidence === 'high',
    );
    const mediumConfidenceClasses = unusedClasses.filter(
      (issue) => issue.assessment.confidence === 'medium',
    );
    const lowConfidenceClasses = unusedClasses.filter(
      (issue) => issue.assessment.confidence === 'low',
    );

    if (highConfidenceClasses.length > 0) {
      markdown += '### High Confidence (Safe to Remove)\n\n';
      markdown += formatIssuesAsChecklist(highConfidenceClasses);
    }

    if (mediumConfidenceClasses.length > 0) {
      markdown += '### Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatIssuesAsChecklist(mediumConfidenceClasses);
    }

    if (lowConfidenceClasses.length > 0) {
      markdown += '### Low Confidence (Thorough Verification Required)\n\n';
      markdown += formatIssuesAsChecklist(lowConfidenceClasses);
    }
  }

  // Special section for unused modules
  if (unusedModules.length > 0) {
    markdown += '## Unused Modules\n\n';
    markdown += '_The following modules are never imported or used and can be safely removed:_\n\n';

    const highConfidenceModules = unusedModules.filter(
      (issue) => issue.assessment.confidence === 'high',
    );
    const mediumConfidenceModules = unusedModules.filter(
      (issue) => issue.assessment.confidence === 'medium',
    );
    const lowConfidenceModules = unusedModules.filter(
      (issue) => issue.assessment.confidence === 'low',
    );

    if (highConfidenceModules.length > 0) {
      markdown += '### High Confidence (Safe to Remove)\n\n';
      markdown += formatIssuesAsChecklist(highConfidenceModules);
    }

    if (mediumConfidenceModules.length > 0) {
      markdown += '### Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatIssuesAsChecklist(mediumConfidenceModules);
    }

    if (lowConfidenceModules.length > 0) {
      markdown += '### Low Confidence (Thorough Verification Required)\n\n';
      markdown += formatIssuesAsChecklist(lowConfidenceModules);
    }
  }

  // Add a section for other unused code elements
  if (otherUnusedElements.length > 0) {
    markdown += '## Other Unused Code\n\n';
    markdown += '_The following code elements can be safely removed:_\n\n';

    const highConfidenceOther = otherUnusedElements.filter(
      (issue) => issue.assessment.confidence === 'high',
    );
    const mediumConfidenceOther = otherUnusedElements.filter(
      (issue) => issue.assessment.confidence === 'medium',
    );
    const lowConfidenceOther = otherUnusedElements.filter(
      (issue) => issue.assessment.confidence === 'low',
    );

    if (highConfidenceOther.length > 0) {
      markdown += '### High Confidence (Safe to Remove)\n\n';
      markdown += formatIssuesAsChecklist(highConfidenceOther);
    }

    if (mediumConfidenceOther.length > 0) {
      markdown += '### Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatIssuesAsChecklist(mediumConfidenceOther);
    }

    if (lowConfidenceOther.length > 0) {
      markdown += '### Low Confidence (Thorough Verification Required)\n\n';
      markdown += formatIssuesAsChecklist(lowConfidenceOther);
    }
  }

  // Add a section for recommended tools
  if (review.recommendedTools && review.recommendedTools.length > 0) {
    markdown += '## Recommended Tools\n\n';
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
  }

  // Add general recommendations
  markdown += '## General Recommendations\n\n';

  for (const recommendation of review.recommendations) {
    markdown += `- ${recommendation}\n`;
  }

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
 * Format a list of issues as a checklist
 * @param issues Issues to format
 * @returns Formatted markdown checklist
 */
function formatIssuesAsChecklist(issues: ImprovedUnusedCodeIssue[]): string {
  let markdown = '';

  // Group issues by file
  const issuesByFile: Record<string, ImprovedUnusedCodeIssue[]> = {};

  for (const issue of issues) {
    const filePath = issue.location.file || 'Unknown file';

    if (!issuesByFile[filePath]) {
      issuesByFile[filePath] = [];
    }

    issuesByFile[filePath].push(issue);
  }

  // Format issues by file
  for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
    markdown += `### ${filePath}\n\n`;

    for (const issue of fileIssues) {
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

      // Add related checks if available
      if (issue.relatedChecks && issue.relatedChecks.length > 0) {
        markdown += '  - **Related Checks**:\n';
        for (const check of issue.relatedChecks) {
          markdown += `    - ${check}\n`;
        }
      }

      markdown += '\n';
    }
  }

  return markdown;
}

/**
 * Format an unused code review for terminal output
 * @param review The review to format
 * @returns Formatted string for terminal output
 */
export function formatUnusedCodeReviewForTerminal(review: ImprovedUnusedCodeReview): string {
  // Build the header
  let output = chalk.bold.blue(
    'UNUSED CODE REVIEW: FILES & FUNCTIONS THAT CAN BE SAFELY REMOVED\n\n',
  );

  // Add a summary section
  output += chalk.bold.white('SUMMARY\n\n');
  output += `${review.summary}\n\n`;

  // Create collections of specific unused elements
  const unusedFiles = getAllIssuesByCategory(review, 'unusedFile');
  const unusedFunctions = getAllIssuesByCategory(review, 'unusedFunction');
  const unusedClasses = getAllIssuesByCategory(review, 'unusedClass');
  const unusedModules = getAllIssuesByCategory(review, 'unusedModule');

  // Special section for completely unused files
  if (unusedFiles.length > 0) {
    output += chalk.bold.magenta('UNUSED FILES\n\n');
    output += chalk.italic(
      'The following files are not imported or used anywhere and can be safely removed:\n\n',
    );

    const highConfidenceFiles = unusedFiles.filter(
      (issue) => issue.assessment.confidence === 'high',
    );
    if (highConfidenceFiles.length > 0) {
      output += chalk.bold.green('HIGH CONFIDENCE (SAFE TO REMOVE)\n\n');
      output += formatIssuesForTerminal(highConfidenceFiles, 'green');
    }

    const mediumConfidenceFiles = unusedFiles.filter(
      (issue) => issue.assessment.confidence === 'medium',
    );
    if (mediumConfidenceFiles.length > 0) {
      output += chalk.bold.yellow('MEDIUM CONFIDENCE (VERIFY BEFORE REMOVING)\n\n');
      output += formatIssuesForTerminal(mediumConfidenceFiles, 'yellow');
    }

    const lowConfidenceFiles = unusedFiles.filter((issue) => issue.assessment.confidence === 'low');
    if (lowConfidenceFiles.length > 0) {
      output += chalk.bold.red('LOW CONFIDENCE (THOROUGH VERIFICATION REQUIRED)\n\n');
      output += formatIssuesForTerminal(lowConfidenceFiles, 'red');
    }
  }

  // Special section for unused functions
  if (unusedFunctions.length > 0) {
    output += chalk.bold.cyan('UNUSED FUNCTIONS\n\n');
    output += chalk.italic(
      'The following functions are never called and can be safely removed:\n\n',
    );

    const highConfidenceFunctions = unusedFunctions.filter(
      (issue) => issue.assessment.confidence === 'high',
    );
    if (highConfidenceFunctions.length > 0) {
      output += chalk.bold.green('HIGH CONFIDENCE (SAFE TO REMOVE)\n\n');
      output += formatIssuesForTerminal(highConfidenceFunctions, 'green');
    }

    const mediumConfidenceFunctions = unusedFunctions.filter(
      (issue) => issue.assessment.confidence === 'medium',
    );
    if (mediumConfidenceFunctions.length > 0) {
      output += chalk.bold.yellow('MEDIUM CONFIDENCE (VERIFY BEFORE REMOVING)\n\n');
      output += formatIssuesForTerminal(mediumConfidenceFunctions, 'yellow');
    }

    const lowConfidenceFunctions = unusedFunctions.filter(
      (issue) => issue.assessment.confidence === 'low',
    );
    if (lowConfidenceFunctions.length > 0) {
      output += chalk.bold.red('LOW CONFIDENCE (THOROUGH VERIFICATION REQUIRED)\n\n');
      output += formatIssuesForTerminal(lowConfidenceFunctions, 'red');
    }
  }

  // Special section for unused classes and modules (collapsed for brevity)
  if (unusedClasses.length > 0 || unusedModules.length > 0) {
    output += chalk.bold.blue('UNUSED CLASSES AND MODULES\n\n');
    output += chalk.italic('The following classes and modules are unused and can be removed:\n\n');

    const highConfidenceItems = [
      ...unusedClasses.filter((issue) => issue.assessment.confidence === 'high'),
      ...unusedModules.filter((issue) => issue.assessment.confidence === 'high'),
    ];

    if (highConfidenceItems.length > 0) {
      output += chalk.bold.green('HIGH CONFIDENCE ITEMS:\n\n');
      output += formatIssuesForTerminal(highConfidenceItems, 'green');
    }

    const otherItems = [
      ...unusedClasses.filter((issue) => issue.assessment.confidence !== 'high'),
      ...unusedModules.filter((issue) => issue.assessment.confidence !== 'high'),
    ];

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
 * Format a list of issues for terminal output
 * @param issues Issues to format
 * @param color Color to use for issue titles
 * @returns Formatted string for terminal output
 */
function formatIssuesForTerminal(
  issues: ImprovedUnusedCodeIssue[],
  color: 'green' | 'yellow' | 'red',
): string {
  let output = '';

  // Group issues by file
  const issuesByFile: Record<string, ImprovedUnusedCodeIssue[]> = {};

  for (const issue of issues) {
    const filePath = issue.location.file || 'Unknown file';

    if (!issuesByFile[filePath]) {
      issuesByFile[filePath] = [];
    }

    issuesByFile[filePath].push(issue);
  }

  // Format issues by file
  for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
    output += chalk.bold.white(`${filePath}\n\n`);

    for (const issue of fileIssues) {
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

      // Add related checks if available
      if (issue.relatedChecks && issue.relatedChecks.length > 0) {
        output += `  ${chalk.italic('Related Checks')}:\n`;
        for (const check of issue.relatedChecks) {
          output += `    - ${check}\n`;
        }
      }

      output += '\n';
    }
  }

  return output;
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

  // Create collections of specific unused elements
  const unusedFiles = getAllIssuesByCategory(review, 'unusedFile').filter(
    (issue) => issue.assessment.confidence === 'high',
  );

  const unusedFunctions = getAllIssuesByCategory(review, 'unusedFunction').filter(
    (issue) => issue.assessment.confidence === 'high' && issue.isCompleteElement,
  );

  const unusedClasses = getAllIssuesByCategory(review, 'unusedClass').filter(
    (issue) => issue.assessment.confidence === 'high' && issue.isCompleteElement,
  );

  const unusedModules = getAllIssuesByCategory(review, 'unusedModule').filter(
    (issue) => issue.assessment.confidence === 'high',
  );

  const otherHighConfidenceIssues = getAllIssuesByCategory(review, null, true).filter(
    (issue) => issue.assessment.confidence === 'high',
  );

  // Start with removing entire files (most impactful)
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

  // Handle complete functions, classes, and modules that should be removed
  const completeElements = [
    ...unusedFunctions,
    ...unusedClasses,
    ...unusedModules,
    ...otherHighConfidenceIssues.filter((issue) => issue.isCompleteElement),
  ];

  if (completeElements.length > 0) {
    script += 'echo "REMOVING COMPLETE CODE ELEMENTS:"\n';

    // Group by file
    const elementsByFile: Record<string, ImprovedUnusedCodeIssue[]> = {};

    for (const element of completeElements) {
      const filePath = element.location.file;
      if (!filePath || !element.location.lineStart || !element.location.lineEnd) continue;

      if (!elementsByFile[filePath]) {
        elementsByFile[filePath] = [];
      }

      elementsByFile[filePath].push(element);
    }

    // Sort elements within each file by line number (descending)
    // This ensures we remove from bottom to top to avoid changing line numbers
    for (const filePath in elementsByFile) {
      elementsByFile[filePath].sort((a, b) => {
        const aStart = a.location.lineStart || 0;
        const bStart = b.location.lineStart || 0;
        return bStart - aStart;
      });
    }

    // Generate commands for each file
    for (const [filePath, elements] of Object.entries(elementsByFile)) {
      script += `echo "Processing ${filePath}"\n`;

      for (const element of elements) {
        if (element.location.lineStart && element.location.lineEnd) {
          script += `sed -i '${element.location.lineStart},${element.location.lineEnd}d' "${filePath}"\n`;
          script += `echo "  Removed ${element.title} (lines ${element.location.lineStart}-${element.location.lineEnd})"\n`;
        }
      }

      script += '\n';
    }
  }

  // Other high confidence issues (partial code removal)
  const partialIssues = otherHighConfidenceIssues.filter((issue) => !issue.isCompleteElement);

  if (partialIssues.length > 0) {
    script += 'echo "REMOVING PARTIAL CODE ELEMENTS:"\n';

    // Group by file
    const issuesByFile: Record<string, ImprovedUnusedCodeIssue[]> = {};

    for (const issue of partialIssues) {
      const filePath = issue.location.file;
      if (!filePath || !issue.location.lineStart || !issue.location.lineEnd) continue;

      if (!issuesByFile[filePath]) {
        issuesByFile[filePath] = [];
      }

      issuesByFile[filePath].push(issue);
    }

    // Sort issues within each file by line number (descending)
    for (const filePath in issuesByFile) {
      issuesByFile[filePath].sort((a, b) => {
        const aStart = a.location.lineStart || 0;
        const bStart = b.location.lineStart || 0;
        return bStart - aStart;
      });
    }

    // Generate commands for each file
    for (const [filePath, fileIssues] of Object.entries(issuesByFile)) {
      script += `echo "Processing ${filePath}"\n`;

      for (const issue of fileIssues) {
        if (issue.location.lineStart && issue.location.lineEnd) {
          script += `sed -i '${issue.location.lineStart},${issue.location.lineEnd}d' "${filePath}"\n`;
          script += `echo "  Removed ${issue.title} (lines ${issue.location.lineStart}-${issue.location.lineEnd})"\n`;
        }
      }

      script += '\n';
    }
  }

  script += 'echo "Unused code removal complete. Please review the changes before committing."\n';

  return script;
}

export default {
  formatUnusedCodeReviewAsMarkdown,
  formatUnusedCodeReviewForTerminal,
  generateRemovalScript,
};
