/**
 * @fileoverview Formatter for code tracing unused code review results.
 *
 * This module provides formatters specifically for code tracing unused code review results
 * that include detailed evidence of why each element is considered unused.
 */

import type {
  CodeTracingUnusedCodeReview,
  TracedUnusedElement,
} from '../prompts/schemas/code-tracing-unused-code-schema';

/**
 * Format a code tracing unused code review as markdown
 * @param review The review to format
 * @returns Formatted markdown
 */
export function formatCodeTracingUnusedCodeReviewAsMarkdown(
  review: CodeTracingUnusedCodeReview,
): string {
  // Build the header
  let markdown = '# Code Tracing Unused Code Detection Report\n\n';

  // Add a summary section
  markdown += '## Summary\n\n';
  markdown += `- **Total unused elements**: ${review.summary.totalUnusedElements}\n`;
  markdown += `- **High-confidence findings**: ${review.summary.highConfidenceCount}\n`;
  markdown += `- **Files with unused code**: ${review.summary.filesWithUnusedCode}\n`;
  markdown += `- **Potential code reduction**: ${review.summary.potentialCodeReduction}\n\n`;

  // Add methodology section
  markdown += '## Analysis Methodology\n\n';
  markdown += '### Entry Points\n\n';
  for (const entryPoint of review.analysisMethodology.entryPoints) {
    markdown += `- ${entryPoint}\n`;
  }
  markdown += '\n';

  markdown += `### Module Resolution\n\n${review.analysisMethodology.moduleResolution}\n\n`;
  markdown += `### Reference Tracking\n\n${review.analysisMethodology.referenceTracking}\n\n`;

  markdown += '### Limitations\n\n';
  for (const limitation of review.analysisMethodology.limitations) {
    markdown += `- ${limitation}\n`;
  }
  markdown += '\n';

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
      markdown += formatTracedElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatTracedElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Further Investigation)\n\n';
      markdown += formatTracedElementsAsChecklist(lowConfidence);
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
      markdown += formatTracedElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatTracedElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Further Investigation)\n\n';
      markdown += formatTracedElementsAsChecklist(lowConfidence);
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
      markdown += formatTracedElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatTracedElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Further Investigation)\n\n';
      markdown += formatTracedElementsAsChecklist(lowConfidence);
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
      markdown += formatTracedElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatTracedElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Further Investigation)\n\n';
      markdown += formatTracedElementsAsChecklist(lowConfidence);
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
      markdown += formatTracedElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatTracedElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Further Investigation)\n\n';
      markdown += formatTracedElementsAsChecklist(lowConfidence);
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
      markdown += formatTracedElementsAsChecklist(highConfidence);
    }

    if (mediumConfidence.length > 0) {
      markdown += '### ⚠️ Medium Confidence (Verify Before Removing)\n\n';
      markdown += formatTracedElementsAsChecklist(mediumConfidence);
    }

    if (lowConfidence.length > 0) {
      markdown += '### ❓ Low Confidence (Needs Further Investigation)\n\n';
      markdown += formatTracedElementsAsChecklist(lowConfidence);
    }
  }

  return markdown;
}

/**
 * Format traced elements as a markdown checklist
 * @param elements Elements to format
 * @returns Formatted markdown checklist
 */
function formatTracedElementsAsChecklist(elements: TracedUnusedElement[]): string {
  let markdown = '';

  // Group by file
  const elementsByFile: Record<string, TracedUnusedElement[]> = {};

  for (const element of elements) {
    // Clean filePath - remove any ":N/A" suffixes or patterns that might appear
    let cleanFilePath = element.filePath;

    // Handle various problematic path formats
    cleanFilePath = cleanFilePath.replace(/\s*:\s*N\/A\s*/g, '');

    // Remove any trailing slashes for consistency
    cleanFilePath = cleanFilePath.replace(/\/+$/g, '');

    // If path is just a directory without specific file, ensure it doesn't look like a broken path
    if (cleanFilePath.endsWith('/')) {
      cleanFilePath = cleanFilePath.slice(0, -1);
    }

    if (!elementsByFile[cleanFilePath]) {
      elementsByFile[cleanFilePath] = [];
    }

    // Create a copy of the element with the cleaned filePath
    const elementCopy = { ...element, filePath: cleanFilePath };
    elementsByFile[cleanFilePath].push(elementCopy);
  }

  // Format elements by file
  for (const [filePath, fileElements] of Object.entries(elementsByFile)) {
    markdown += `### ${filePath}\n\n`;

    for (const element of fileElements) {
      // Format location correctly, handling missing line numbers
      let location = '';
      if (element.location.startLine && element.location.startLine > 0) {
        location =
          element.location.endLine && element.location.endLine > 0
            ? `(lines ${element.location.startLine}-${element.location.endLine})`
            : `(line ${element.location.startLine})`;
      }

      markdown += `- [ ] **${element.name}**${location ? ' ' + location : ''}\n`;
      markdown += `  - **Type**: ${formatElementType(element.elementType)}\n`;
      markdown += `  - **Confidence**: ${element.confidence.toUpperCase()} - ${element.confidenceReason}\n`;

      if (element.codeSnippet && element.codeSnippet.trim()) {
        // Clean code snippet - handle improper markdown in the code snippet
        let snippet = element.codeSnippet.trim();

        // If the snippet already contains markdown code blocks, extract just the code
        if (snippet.startsWith('```') && snippet.endsWith('```')) {
          // Extract the code between the markdown code block delimiters
          snippet = snippet.substring(snippet.indexOf('\n') + 1, snippet.lastIndexOf('```')).trim();
        }

        // Ensure proper indentation for markdown
        snippet = snippet
          .split('\n')
          .map((line) => `  ${line}`)
          .join('\n');

        markdown += '  ```\n';
        markdown += `${snippet}\n`;
        markdown += '  ```\n';
      }

      // Add evidence section
      markdown += '  - **Evidence of Non-Use**:\n';

      // Format definition location with proper handling for missing line numbers
      const defLine =
        element.evidence.definition.line && element.evidence.definition.line > 0
          ? `:${element.evidence.definition.line}`
          : '';
      markdown += `    - **Definition**: ${element.evidence.definition.file}${defLine}\n`;

      if (element.evidence.exports && element.evidence.exports.length > 0) {
        markdown += '    - **Exports**:\n';
        for (const exportInfo of element.evidence.exports) {
          // Format export location with proper handling for missing line numbers
          const exportLine = exportInfo.line && exportInfo.line > 0 ? `:${exportInfo.line}` : '';
          markdown += `      - ${exportInfo.exportType} export in ${exportInfo.file}${exportLine}\n`;
        }
      }

      markdown += '    - **Import Search**:\n';
      for (const searchArea of element.evidence.importSearch.searchedIn) {
        markdown += `      - Searched in ${searchArea}\n`;
      }
      markdown += `      - Result: ${element.evidence.importSearch.noImportsFound ? 'No imports found' : 'Imports found'}\n`;
      markdown += `      - Method: ${element.evidence.importSearch.searchMethod}\n`;

      markdown += '    - **Reference Search**:\n';
      for (const searchArea of element.evidence.referenceSearch.searchedIn) {
        markdown += `      - Searched in ${searchArea}\n`;
      }
      markdown += `      - Result: ${element.evidence.referenceSearch.noReferencesFound ? 'No references found' : 'References found'}\n`;
      markdown += `      - Method: ${element.evidence.referenceSearch.searchMethod}\n`;

      markdown += '    - **Edge Cases Considered**:\n';
      for (const edgeCase of element.evidence.edgeCasesConsidered) {
        markdown += `      - ${edgeCase.case}: ${edgeCase.verification}\n`;
      }

      if (element.evidence.additionalEvidence) {
        markdown += `    - **Additional Evidence**: ${element.evidence.additionalEvidence}\n`;
      }

      if (element.removalRisks) {
        markdown += `  - **Removal Risks**: ${element.removalRisks}\n`;
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
 * Generate a shell script for removing unused code
 * @param review The review to format
 * @returns Shell script for removing unused code
 */
export function generateCodeTracingRemovalScript(review: CodeTracingUnusedCodeReview): string {
  let script = '#!/bin/bash\n\n';
  script +=
    '# Script generated by AI Code Review to remove unused code identified through code tracing\n';
  script += '# WARNING: This script should be carefully reviewed before execution\n';
  script += '# RECOMMENDED: Create a git branch before running this script\n\n';

  script += 'echo "This script will remove unused code identified through deep code tracing."\n\n';

  // Only include high confidence issues for the removal script
  const highConfidenceFiles = review.unusedFiles
    .filter((file) => file.confidence === 'high')
    .map((file) => {
      // Clean filePath - remove any ":N/A" suffixes or patterns that might appear
      let cleanFilePath = file.filePath;

      // Handle various problematic path formats
      cleanFilePath = cleanFilePath.replace(/\s*:\s*N\/A\s*/g, '');

      // Remove any trailing slashes for consistency
      cleanFilePath = cleanFilePath.replace(/\/+$/g, '');

      // If path is just a directory without specific file, ensure it doesn't look like a broken path
      if (cleanFilePath.endsWith('/')) {
        cleanFilePath = cleanFilePath.slice(0, -1);
      }
      return { ...file, filePath: cleanFilePath };
    });

  // Start with removing entire files (most impactful)
  if (highConfidenceFiles.length > 0) {
    script += 'echo "REMOVING UNUSED FILES:"\n';

    for (const file of highConfidenceFiles) {
      script += `echo "  - ${file.filePath} (${file.confidence.toUpperCase()} confidence)"\n`;
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
  const elementsByFile: Record<string, Array<TracedUnusedElement>> = {};

  // Helper function to add elements to the file mapping with clean paths
  const addElementToFile = (element: TracedUnusedElement) => {
    // Clean filePath - remove any ":N/A" suffixes or patterns that might appear
    let cleanFilePath = element.filePath;

    // Handle various problematic path formats
    cleanFilePath = cleanFilePath.replace(/\s*:\s*N\/A\s*/g, '');

    // Remove any trailing slashes for consistency
    cleanFilePath = cleanFilePath.replace(/\/+$/g, '');

    // If path is just a directory without specific file, ensure it doesn't look like a broken path
    if (cleanFilePath.endsWith('/')) {
      cleanFilePath = cleanFilePath.slice(0, -1);
    }

    if (!elementsByFile[cleanFilePath]) {
      elementsByFile[cleanFilePath] = [];
    }

    // Create a copy of the element with the cleaned filePath
    const elementCopy = { ...element, filePath: cleanFilePath };
    elementsByFile[cleanFilePath].push(elementCopy);
  };

  // Add functions
  for (const func of highConfidenceFunctions) {
    addElementToFile(func);
  }

  // Add classes
  for (const cls of highConfidenceClasses) {
    addElementToFile(cls);
  }

  // Add types
  for (const type of highConfidenceTypes) {
    addElementToFile(type);
  }

  // Add branches
  for (const branch of highConfidenceBranches) {
    addElementToFile(branch);
  }

  // Sort elements within each file by line number (descending)
  // This ensures we remove from bottom to top to avoid changing line numbers
  for (const filePath in elementsByFile) {
    // Clean the file path for comparison
    const cleanPath = filePath.endsWith(':N/A') ? filePath.replace(':N/A', '') : filePath;

    if (highConfidenceFiles.find((file) => file.filePath === cleanPath)) {
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
      // Clean the file path for comparison
      const cleanPath = filePath.endsWith(':N/A') ? filePath.replace(':N/A', '') : filePath;

      if (highConfidenceFiles.find((file) => file.filePath === cleanPath)) {
        // Skip files that will be removed entirely
        continue;
      }

      script += `echo "Processing ${filePath}"\n`;

      for (const element of elements) {
        // Only include elements with valid line numbers in the removal script
        if (element.location.startLine && element.location.startLine > 0) {
          if (element.location.endLine && element.location.endLine > 0) {
            script += `sed -i '${element.location.startLine},${element.location.endLine}d' "${filePath}"\n`;
            script += `echo "  Removed ${element.name} (${formatElementType(element.elementType)}, lines ${element.location.startLine}-${element.location.endLine})"\n`;
          } else {
            script += `sed -i '${element.location.startLine}d' "${filePath}"\n`;
            script += `echo "  Removed ${element.name} (${formatElementType(element.elementType)}, line ${element.location.startLine})"\n`;
          }
        } else {
          // For elements without line numbers, just add a comment
          script += `echo "  Note: Could not generate removal command for ${element.name} (${formatElementType(element.elementType)}) - no line numbers available"\n`;
          script += `echo "  Please manually remove this element from ${filePath}"\n`;
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
  formatCodeTracingUnusedCodeReviewAsMarkdown,
  generateCodeTracingRemovalScript,
};
