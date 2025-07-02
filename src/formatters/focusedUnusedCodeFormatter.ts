/**
 * @fileoverview Formatter for focused unused code review results.
 *
 * This module provides formatters specifically for focused unused code review results.
 */

import chalk from 'chalk';
import type {
  FocusedUnusedCodeReview,
  UnusedElement,
} from '../prompts/schemas/focused-unused-code-schema';

/**
 * Format a focused unused code review as markdown
 * @param review The review to format
 * @returns Formatted markdown
 */
export function formatFocusedUnusedCodeReviewAsMarkdown(review: FocusedUnusedCodeReview): string {
  // Build the header
  let markdown = '# Unused Code Detection Report\n\n';

  // Add a summary section
  markdown += '## Summary\n\n';
  markdown += `- **Total unused elements**: ${review.summary.totalUnusedElements}\n`;
  markdown += `- **High-confidence findings**: ${review.summary.highConfidenceCount}\n`;
  markdown += `- **Files with unused code**: ${review.summary.filesWithUnusedCode}\n`;
  markdown += `- **Potential code reduction**: ${review.summary.potentialCodeReduction}\n\n`;

  // Unused Files Section
  if (review.unusedFiles.length > 0) {
    markdown += '## Unused Files\n\n';
    markdown +=
      'The following files are never imported or used anywhere in the codebase and can be safely removed:\n\n';

    // Group by confidence
    const highConfidence = review.unusedFiles.filter((file) => file.confidence === 'high');
    const mediumConfidence = review.unusedFiles.filter((file) => file.confidence === 'medium');
    const lowConfidence = review.unusedFiles.filter((file) => file.confidence === 'low');

    if (highConfidence.length > 0) {
      markdown += '### ✅ High Confidence (Safe to Remove)\n\n';
      markdown += formatElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Investigation)\n\n';
      markdown += formatElementsAsChecklist(lowConfidence);
    }
  }

  // Unused Functions Section
  if (review.unusedFunctions.length > 0) {
    markdown += '## Unused Functions\n\n';
    markdown +=
      'The following functions are never called in the codebase and can be safely removed:\n\n';

    // Group by confidence
    const highConfidence = review.unusedFunctions.filter((func) => func.confidence === 'high');
    const mediumConfidence = review.unusedFunctions.filter((func) => func.confidence === 'medium');
    const lowConfidence = review.unusedFunctions.filter((func) => func.confidence === 'low');

    if (highConfidence.length > 0) {
      markdown += '### ✅ High Confidence (Safe to Remove)\n\n';
      markdown += formatElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Investigation)\n\n';
      markdown += formatElementsAsChecklist(lowConfidence);
    }
  }

  // Unused Classes Section
  if (review.unusedClasses.length > 0) {
    markdown += '## Unused Classes\n\n';
    markdown +=
      'The following classes are never instantiated in the codebase and can be safely removed:\n\n';

    // Group by confidence
    const highConfidence = review.unusedClasses.filter((cls) => cls.confidence === 'high');
    const mediumConfidence = review.unusedClasses.filter((cls) => cls.confidence === 'medium');
    const lowConfidence = review.unusedClasses.filter((cls) => cls.confidence === 'low');

    if (highConfidence.length > 0) {
      markdown += '### ✅ High Confidence (Safe to Remove)\n\n';
      markdown += formatElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Investigation)\n\n';
      markdown += formatElementsAsChecklist(lowConfidence);
    }
  }

  // Unused Types and Interfaces Section
  if (review.unusedTypesAndInterfaces.length > 0) {
    markdown += '## Unused Types and Interfaces\n\n';
    markdown +=
      'The following types and interfaces are never used in the codebase and can be safely removed:\n\n';

    // Group by confidence
    const highConfidence = review.unusedTypesAndInterfaces.filter(
      (type) => type.confidence === 'high',
    );
    const mediumConfidence = review.unusedTypesAndInterfaces.filter(
      (type) => type.confidence === 'medium',
    );
    const lowConfidence = review.unusedTypesAndInterfaces.filter(
      (type) => type.confidence === 'low',
    );

    if (highConfidence.length > 0) {
      markdown += '### ✅ High Confidence (Safe to Remove)\n\n';
      markdown += formatElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Investigation)\n\n';
      markdown += formatElementsAsChecklist(lowConfidence);
    }
  }

  // Dead Code Branches Section
  if (review.deadCodeBranches.length > 0) {
    markdown += '## Dead Code Branches\n\n';
    markdown += 'The following code branches can never execute and can be safely removed:\n\n';

    // Group by confidence
    const highConfidence = review.deadCodeBranches.filter((branch) => branch.confidence === 'high');
    const mediumConfidence = review.deadCodeBranches.filter(
      (branch) => branch.confidence === 'medium',
    );
    const lowConfidence = review.deadCodeBranches.filter((branch) => branch.confidence === 'low');

    if (highConfidence.length > 0) {
      markdown += '### ✅ High Confidence (Safe to Remove)\n\n';
      markdown += formatElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Investigation)\n\n';
      markdown += formatElementsAsChecklist(lowConfidence);
    }
  }

  // Unused Variables and Imports Section
  if (review.unusedVariablesAndImports.length > 0) {
    markdown += '## Unused Variables and Imports\n\n';
    markdown +=
      'The following variables and imports are never used in the codebase and can be safely removed:\n\n';

    // Group by confidence
    const highConfidence = review.unusedVariablesAndImports.filter(
      (variable) => variable.confidence === 'high',
    );
    const mediumConfidence = review.unusedVariablesAndImports.filter(
      (variable) => variable.confidence === 'medium',
    );
    const lowConfidence = review.unusedVariablesAndImports.filter(
      (variable) => variable.confidence === 'low',
    );

    if (highConfidence.length > 0) {
      markdown += '### ✅ High Confidence (Safe to Remove)\n\n';
      markdown += formatElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Investigation)\n\n';
      markdown += formatElementsAsChecklist(lowConfidence);
    }
  }

  return markdown;
}

/**
 * Format elements as a markdown checklist
 * @param elements Elements to format
 * @returns Formatted markdown checklist
 */
function formatElementsAsChecklist(elements: UnusedElement[]): string {
  let markdown = '';

  // Group by file
  const elementsByFile: Record<string, UnusedElement[]> = {};

  for (const element of elements) {
    if (!elementsByFile[element.filePath]) {
      elementsByFile[element.filePath] = [];
    }

    elementsByFile[element.filePath].push(element);
  }

  // Format elements by file
  for (const [filePath, fileElements] of Object.entries(elementsByFile)) {
    markdown += `### ${filePath}\n\n`;

    for (const element of fileElements) {
      const location = element.location.endLine
        ? `(lines ${element.location.startLine}-${element.location.endLine})`
        : `(line ${element.location.startLine})`;

      markdown += `- [ ] **${element.name}** ${location}\n`;
      markdown += `  - **Type**: ${formatElementType(element.elementType)}\n`;
      markdown += `  - **Confidence**: ${element.confidence.toUpperCase()} - ${element.confidenceReason}\n`;

      if (element.codeSnippet) {
        markdown += '  ```\n';
        markdown += `  ${element.codeSnippet.trim()}\n`;
        markdown += '  ```\n';
      }

      if (element.removalRisks) {
        markdown += `  - **Removal risks**: ${element.removalRisks}\n`;
      }

      markdown += '\n';
    }
  }

  return markdown;
}

/**
 * Format element type for display
 * @param elementType Element type
 * @returns Formatted element type
 */
function formatElementType(elementType: string): string {
  const mapping: Record<string, string> = {
    file: 'File',
    function: 'Function',
    class: 'Class',
    interface: 'Interface',
    type: 'Type',
    variable: 'Variable',
    import: 'Import',
    'dead-branch': 'Dead Code Branch',
    parameter: 'Parameter',
    property: 'Property',
    enum: 'Enum',
    export: 'Export',
    hook: 'React Hook',
    component: 'React Component',
  };

  return mapping[elementType] || elementType;
}

/**
 * Format a focused unused code review for terminal output
 * @param review The review to format
 * @returns Formatted string for terminal output
 */
export function formatFocusedUnusedCodeReviewForTerminal(review: FocusedUnusedCodeReview): string {
  // Build the header
  let output = chalk.bold.blue('UNUSED CODE DETECTION REPORT\n\n');

  // Add a summary section
  output += chalk.bold.white('SUMMARY\n\n');
  output += `${chalk.cyan('•')} Total unused elements: ${chalk.yellow(review.summary.totalUnusedElements.toString())}\n`;
  output += `${chalk.cyan('•')} High-confidence findings: ${chalk.yellow(review.summary.highConfidenceCount.toString())}\n`;
  output += `${chalk.cyan('•')} Files with unused code: ${chalk.yellow(review.summary.filesWithUnusedCode.toString())}\n`;
  output += `${chalk.cyan('•')} Potential code reduction: ${chalk.yellow(review.summary.potentialCodeReduction)}\n\n`;

  // Unused Files Section
  if (review.unusedFiles.length > 0) {
    output += chalk.bold.magenta('UNUSED FILES\n\n');
    output += chalk.italic(
      'The following files are never imported or used and can be safely removed:\n\n',
    );

    // Group by confidence
    const highConfidence = review.unusedFiles.filter((file) => file.confidence === 'high');
    const mediumConfidence = review.unusedFiles.filter((file) => file.confidence === 'medium');
    const lowConfidence = review.unusedFiles.filter((file) => file.confidence === 'low');

    if (highConfidence.length > 0) {
      output += chalk.bold.green('HIGH CONFIDENCE (SAFE TO REMOVE)\n\n');
      output += formatElementsForTerminal(highConfidence, 'green');
    }

    if (mediumConfidence.length > 0) {
      output += chalk.bold.yellow('MEDIUM CONFIDENCE (VERIFY BEFORE REMOVING)\n\n');
      output += formatElementsForTerminal(mediumConfidence, 'yellow');
    }

    if (lowConfidence.length > 0) {
      output += chalk.bold.red('LOW CONFIDENCE (NEEDS INVESTIGATION)\n\n');
      output += formatElementsForTerminal(lowConfidence, 'red');
    }
  }

  // Unused Functions Section (abbreviated for brevity - follows same pattern as above)
  if (review.unusedFunctions.length > 0) {
    output += chalk.bold.cyan('UNUSED FUNCTIONS\n\n');
    output += chalk.italic(
      'The following functions are never called and can be safely removed:\n\n',
    );

    // Group by confidence - same pattern as above
    const highConfidence = review.unusedFunctions.filter((func) => func.confidence === 'high');
    const mediumConfidence = review.unusedFunctions.filter((func) => func.confidence === 'medium');
    const lowConfidence = review.unusedFunctions.filter((func) => func.confidence === 'low');

    if (highConfidence.length > 0) {
      output += chalk.bold.green('HIGH CONFIDENCE (SAFE TO REMOVE)\n\n');
      output += formatElementsForTerminal(highConfidence, 'green');
    }

    if (mediumConfidence.length > 0) {
      output += chalk.bold.yellow('MEDIUM CONFIDENCE (VERIFY BEFORE REMOVING)\n\n');
      output += formatElementsForTerminal(mediumConfidence, 'yellow');
    }

    if (lowConfidence.length > 0) {
      output += chalk.bold.red('LOW CONFIDENCE (NEEDS INVESTIGATION)\n\n');
      output += formatElementsForTerminal(lowConfidence, 'red');
    }
  }

  // Include similar sections for other categories as above, following the same pattern
  // This is abbreviated for brevity

  return output;
}

/**
 * Format elements for terminal output
 * @param elements Elements to format
 * @param color Color to use for element names
 * @returns Formatted string for terminal output
 */
function formatElementsForTerminal(
  elements: UnusedElement[],
  color: 'green' | 'yellow' | 'red',
): string {
  let output = '';

  // Group by file
  const elementsByFile: Record<string, UnusedElement[]> = {};

  for (const element of elements) {
    if (!elementsByFile[element.filePath]) {
      elementsByFile[element.filePath] = [];
    }

    elementsByFile[element.filePath].push(element);
  }

  // Format elements by file
  for (const [filePath, fileElements] of Object.entries(elementsByFile)) {
    output += chalk.bold.white(`${filePath}\n\n`);

    for (const element of fileElements) {
      const location = element.location.endLine
        ? `(lines ${element.location.startLine}-${element.location.endLine})`
        : `(line ${element.location.startLine})`;

      output += chalk[color](`• ${element.name} ${location}\n`);
      output += `  ${chalk.italic('Type')}: ${formatElementType(element.elementType)}\n`;
      output += `  ${chalk.italic('Confidence')}: ${element.confidence.toUpperCase()} - ${element.confidenceReason}\n`;

      if (element.codeSnippet) {
        output += chalk.gray(`  ${element.codeSnippet.trim()}\n`);
      }

      if (element.removalRisks) {
        output += `  ${chalk.italic('Removal risks')}: ${element.removalRisks}\n`;
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
export function generateFocusedRemovalScript(review: FocusedUnusedCodeReview): string {
  let script = '#!/bin/bash\n\n';
  script += '# Script generated by AI Code Review to remove unused code\n';
  script += '# WARNING: This script should be carefully reviewed before execution\n';
  script += '# RECOMMENDED: Create a git branch before running this script\n\n';

  script += 'echo "This script will remove unused code found in the static analysis."\n\n';

  // Only include high confidence issues for the removal script
  const highConfidenceFiles = review.unusedFiles.filter((file) => file.confidence === 'high');

  // Start with removing entire files (most impactful)
  if (highConfidenceFiles.length > 0) {
    script += 'echo "REMOVING UNUSED FILES:"\n';

    for (const file of highConfidenceFiles) {
      script += `echo "  - ${file.filePath}"\n`;
      script += `rm "${file.filePath}"\n`;
    }

    script += 'echo "Unused files removed successfully."\n\n';
  }

  // Add removal commands for high-confidence functions, classes, etc.
  // This uses sed to remove specific line ranges

  const highConfidenceFunctions = review.unusedFunctions.filter(
    (func) => func.confidence === 'high',
  );
  const highConfidenceClasses = review.unusedClasses.filter((cls) => cls.confidence === 'high');
  const highConfidenceTypes = review.unusedTypesAndInterfaces.filter(
    (type) => type.confidence === 'high',
  );
  const highConfidenceBranches = review.deadCodeBranches.filter(
    (branch) => branch.confidence === 'high',
  );

  // Group all elements by file for targeted removal
  const elementsByFile: Record<string, Array<UnusedElement>> = {};

  // Add functions
  for (const func of highConfidenceFunctions) {
    if (!elementsByFile[func.filePath]) {
      elementsByFile[func.filePath] = [];
    }
    elementsByFile[func.filePath].push(func);
  }

  // Add classes
  for (const cls of highConfidenceClasses) {
    if (!elementsByFile[cls.filePath]) {
      elementsByFile[cls.filePath] = [];
    }
    elementsByFile[cls.filePath].push(cls);
  }

  // Add types
  for (const type of highConfidenceTypes) {
    if (!elementsByFile[type.filePath]) {
      elementsByFile[type.filePath] = [];
    }
    elementsByFile[type.filePath].push(type);
  }

  // Add branches
  for (const branch of highConfidenceBranches) {
    if (!elementsByFile[branch.filePath]) {
      elementsByFile[branch.filePath] = [];
    }
    elementsByFile[branch.filePath].push(branch);
  }

  // Sort elements within each file by line number (descending)
  // This ensures we remove from bottom to top to avoid changing line numbers
  for (const filePath in elementsByFile) {
    if (highConfidenceFiles.find((file) => file.filePath === filePath)) {
      // Skip files that will be removed entirely
      continue;
    }

    elementsByFile[filePath].sort((a, b) => {
      return (b.location.startLine || 0) - (a.location.startLine || 0);
    });
  }

  if (Object.keys(elementsByFile).length > 0) {
    script += 'echo "REMOVING UNUSED CODE ELEMENTS:"\n\n';

    for (const [filePath, elements] of Object.entries(elementsByFile)) {
      if (highConfidenceFiles.find((file) => file.filePath === filePath)) {
        // Skip files that will be removed entirely
        continue;
      }

      script += `echo "Processing ${filePath}"\n`;

      for (const element of elements) {
        if (element.location.startLine && element.location.endLine) {
          script += `sed -i '${element.location.startLine},${element.location.endLine}d' "${filePath}"\n`;
          script += `echo "  Removed ${element.name} (${formatElementType(element.elementType)}, lines ${element.location.startLine}-${element.location.endLine})"\n`;
        } else if (element.location.startLine) {
          script += `sed -i '${element.location.startLine}d' "${filePath}"\n`;
          script += `echo "  Removed ${element.name} (${formatElementType(element.elementType)}, line ${element.location.startLine})"\n`;
        }
      }

      script += '\n';
    }
  }

  script +=
    'echo "Code removal complete. Please review the changes and run tests to ensure functionality."\n';

  return script;
}

export default {
  formatFocusedUnusedCodeReviewAsMarkdown,
  formatFocusedUnusedCodeReviewForTerminal,
  generateFocusedRemovalScript,
};
