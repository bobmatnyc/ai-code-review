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
import {
  type ConfidenceLevel,
  cleanCodeSnippet,
  cleanFilePath,
  filterByConfidence,
  formatElementType,
  formatLocation,
  groupByFile,
  indentSnippet,
  MARKDOWN_CONFIDENCE_HEADERS,
  sortByLineDescending,
} from './unusedCodeFormatterUtils';

/**
 * Format a code tracing unused code review as markdown
 * @param review The review to format
 * @returns Formatted markdown
 */
export function formatCodeTracingUnusedCodeReviewAsMarkdown(
  review: CodeTracingUnusedCodeReview,
): string {
  let markdown = '# Code Tracing Unused Code Detection Report\n\n';

  markdown += formatSummarySection(review);
  markdown += formatMethodologySection(review);
  markdown += formatUnusedElementsSection('Unused Files', review.unusedFiles);
  markdown += formatUnusedElementsSection('Unused Functions', review.unusedFunctions);
  markdown += formatUnusedElementsSection('Unused Classes', review.unusedClasses);
  markdown += formatUnusedElementsSection(
    'Unused Types and Interfaces',
    review.unusedTypesAndInterfaces,
  );
  markdown += formatUnusedElementsSection('Dead Code Branches', review.deadCodeBranches);
  markdown += formatUnusedElementsSection(
    'Unused Variables and Imports',
    review.unusedVariablesAndImports,
  );

  return markdown;
}

/**
 * Format the summary section
 */
function formatSummarySection(review: CodeTracingUnusedCodeReview): string {
  let markdown = '## Summary\n\n';
  markdown += `- **Total unused elements**: ${review.summary.totalUnusedElements}\n`;
  markdown += `- **High-confidence findings**: ${review.summary.highConfidenceCount}\n`;
  markdown += `- **Files with unused code**: ${review.summary.filesWithUnusedCode}\n`;
  markdown += `- **Potential code reduction**: ${review.summary.potentialCodeReduction}\n\n`;
  return markdown;
}

/**
 * Format the methodology section
 */
function formatMethodologySection(review: CodeTracingUnusedCodeReview): string {
  let markdown = '## Analysis Methodology\n\n';
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

  return markdown;
}

/**
 * Format a section of unused elements grouped by confidence
 */
function formatUnusedElementsSection(title: string, elements: TracedUnusedElement[]): string {
  if (elements.length === 0) {
    return '';
  }

  const descriptions: Record<string, string> = {
    'Unused Files': 'never imported or used anywhere in the codebase and can be safely removed',
    'Unused Functions': 'never called in the codebase and can be safely removed',
    'Unused Classes': 'never instantiated in the codebase and can be safely removed',
    'Unused Types and Interfaces': 'never used in the codebase and can be safely removed',
    'Dead Code Branches': 'can never execute and can be safely removed',
    'Unused Variables and Imports': 'never used in the codebase and can be safely removed',
  };

  let markdown = `## ${title}\n\n`;
  markdown += `The following ${title.toLowerCase()} are ${descriptions[title] || 'unused'}:\n\n`;

  const confidenceLevels: ConfidenceLevel[] = ['high', 'medium', 'low'];
  for (const confidence of confidenceLevels) {
    const filtered = filterByConfidence(elements, confidence, (e) => e.confidence);
    if (filtered.length > 0) {
      markdown += MARKDOWN_CONFIDENCE_HEADERS[confidence];
      markdown += formatTracedElementsAsChecklist(filtered);
    }
  }

  return markdown;
}

/**
 * Clean an element's file path
 */
function cleanElement(element: TracedUnusedElement): TracedUnusedElement {
  return { ...element, filePath: cleanFilePath(element.filePath) };
}

/**
 * Format traced elements as a markdown checklist
 * @param elements Elements to format
 * @returns Formatted markdown checklist
 */
function formatTracedElementsAsChecklist(elements: TracedUnusedElement[]): string {
  let markdown = '';

  // Clean and group elements by file
  const cleanedElements = elements.map(cleanElement);
  const elementsByFile = groupByFile(cleanedElements, (e) => e.filePath);

  // Format elements by file
  for (const [filePath, fileElements] of Object.entries(elementsByFile)) {
    markdown += `### ${filePath}\n\n`;

    for (const element of fileElements) {
      markdown += formatElement(element);
    }
  }

  return markdown;
}

/**
 * Format a single traced element
 */
function formatElement(element: TracedUnusedElement): string {
  let markdown = '';
  const location = formatLocation(element.location.startLine, element.location.endLine);

  markdown += `- [ ] **${element.name}**${location ? ` ${location}` : ''}\n`;
  markdown += `  - **Type**: ${formatElementType(element.elementType)}\n`;
  markdown += `  - **Confidence**: ${element.confidence.toUpperCase()} - ${element.confidenceReason}\n`;

  if (element.codeSnippet?.trim()) {
    markdown += formatCodeSnippetSection(element.codeSnippet);
  }

  markdown += formatEvidenceSection(element);

  if (element.removalRisks) {
    markdown += `  - **Removal Risks**: ${element.removalRisks}\n`;
  }

  markdown += '\n';

  return markdown;
}

/**
 * Format code snippet section
 */
function formatCodeSnippetSection(codeSnippet: string): string {
  const cleaned = cleanCodeSnippet(codeSnippet);
  const indented = indentSnippet(cleaned);

  return `  \`\`\`\n${indented}\n  \`\`\`\n`;
}

/**
 * Format evidence section
 */
function formatEvidenceSection(element: TracedUnusedElement): string {
  let markdown = '  - **Evidence of Non-Use**:\n';

  markdown += formatDefinitionEvidence(element.evidence.definition);
  markdown += formatExportsEvidence(element.evidence.exports);
  markdown += formatSearchEvidence('Import', element.evidence.importSearch);
  markdown += formatSearchEvidence('Reference', element.evidence.referenceSearch);
  markdown += formatEdgeCasesEvidence(element.evidence.edgeCasesConsidered);

  if (element.evidence.additionalEvidence) {
    markdown += `    - **Additional Evidence**: ${element.evidence.additionalEvidence}\n`;
  }

  return markdown;
}

/**
 * Format definition evidence
 */
function formatDefinitionEvidence(definition: { file: string; line?: number }): string {
  const defLine = definition.line && definition.line > 0 ? `:${definition.line}` : '';
  return `    - **Definition**: ${definition.file}${defLine}\n`;
}

/**
 * Format exports evidence
 */
function formatExportsEvidence(
  exports?: Array<{ file: string; line?: number; exportType: string }>,
): string {
  if (!exports || exports.length === 0) {
    return '';
  }

  let markdown = '    - **Exports**:\n';
  for (const exportInfo of exports) {
    const exportLine = exportInfo.line && exportInfo.line > 0 ? `:${exportInfo.line}` : '';
    markdown += `      - ${exportInfo.exportType} export in ${exportInfo.file}${exportLine}\n`;
  }
  return markdown;
}

/**
 * Format search evidence (import or reference)
 */
function formatSearchEvidence(
  type: 'Import' | 'Reference',
  search: {
    searchedIn: string[];
    noImportsFound?: boolean;
    noReferencesFound?: boolean;
    searchMethod: string;
  },
): string {
  let markdown = `    - **${type} Search**:\n`;
  for (const searchArea of search.searchedIn) {
    markdown += `      - Searched in ${searchArea}\n`;
  }

  const noFound = type === 'Import' ? search.noImportsFound : search.noReferencesFound;
  markdown += `      - Result: ${noFound ? 'No references found' : 'References found'}\n`;
  markdown += `      - Method: ${search.searchMethod}\n`;

  return markdown;
}

/**
 * Format edge cases evidence
 */
function formatEdgeCasesEvidence(edgeCases: Array<{ case: string; verification: string }>): string {
  let markdown = '    - **Edge Cases Considered**:\n';
  for (const edgeCase of edgeCases) {
    markdown += `      - ${edgeCase.case}: ${edgeCase.verification}\n`;
  }
  return markdown;
}

/**
 * Generate a shell script for removing unused code
 * @param review The review to format
 * @returns Shell script for removing unused code
 */
export function generateCodeTracingRemovalScript(review: CodeTracingUnusedCodeReview): string {
  let script = generateScriptHeader();

  const highConfidenceFiles = getHighConfidenceElements(review.unusedFiles);
  script += generateFileRemovalCommands(highConfidenceFiles);

  const highConfidenceElements = collectHighConfidenceElements(review);
  script += generateElementRemovalCommands(highConfidenceElements, highConfidenceFiles);

  script += generateScriptFooter();

  return script;
}

/**
 * Generate script header
 */
function generateScriptHeader(): string {
  let script = '#!/bin/bash\n\n';
  script +=
    '# Script generated by AI Code Review to remove unused code identified through code tracing\n';
  script += '# WARNING: This script should be carefully reviewed before execution\n';
  script += '# RECOMMENDED: Create a git branch before running this script\n\n';
  script += 'echo "This script will remove unused code identified through deep code tracing."\n\n';
  return script;
}

/**
 * Generate script footer
 */
function generateScriptFooter(): string {
  return 'echo "Code removal complete. Please review the changes and run tests to ensure functionality."\n';
}

/**
 * Get high confidence elements with cleaned paths
 */
function getHighConfidenceElements(elements: TracedUnusedElement[]): TracedUnusedElement[] {
  return filterByConfidence(elements, 'high', (e) => e.confidence).map(cleanElement);
}

/**
 * Collect all high confidence elements from review
 */
function collectHighConfidenceElements(
  review: CodeTracingUnusedCodeReview,
): Record<string, TracedUnusedElement[]> {
  const allElements = [
    ...getHighConfidenceElements(review.unusedFunctions),
    ...getHighConfidenceElements(review.unusedClasses),
    ...getHighConfidenceElements(review.unusedTypesAndInterfaces),
    ...getHighConfidenceElements(review.deadCodeBranches),
  ];

  const elementsByFile = groupByFile(allElements, (e) => e.filePath);

  // Sort elements within each file by line number (descending)
  for (const filePath in elementsByFile) {
    elementsByFile[filePath] = sortByLineDescending(
      elementsByFile[filePath],
      (e) => e.location.startLine,
    );
  }

  return elementsByFile;
}

/**
 * Generate file removal commands
 */
function generateFileRemovalCommands(files: TracedUnusedElement[]): string {
  if (files.length === 0) {
    return '';
  }

  let script = 'echo "REMOVING UNUSED FILES:"\n';
  for (const file of files) {
    script += `echo "  - ${file.filePath} (${file.confidence.toUpperCase()} confidence)"\n`;
    script += `rm "${file.filePath}"\n`;
  }
  script += 'echo "Unused files removed successfully."\n\n';

  return script;
}

/**
 * Generate element removal commands
 */
function generateElementRemovalCommands(
  elementsByFile: Record<string, TracedUnusedElement[]>,
  highConfidenceFiles: TracedUnusedElement[],
): string {
  if (Object.keys(elementsByFile).length === 0) {
    return '';
  }

  let script = 'echo "REMOVING UNUSED CODE ELEMENTS:"\n\n';

  for (const [filePath, elements] of Object.entries(elementsByFile)) {
    if (shouldSkipFile(filePath, highConfidenceFiles)) {
      continue;
    }

    script += `echo "Processing ${filePath}"\n`;
    script += generateFileElementRemovalCommands(filePath, elements);
    script += '\n';
  }

  return script;
}

/**
 * Check if file should be skipped (will be removed entirely)
 */
function shouldSkipFile(filePath: string, highConfidenceFiles: TracedUnusedElement[]): boolean {
  const cleanPath = cleanFilePath(filePath);
  return highConfidenceFiles.some((file) => file.filePath === cleanPath);
}

/**
 * Generate removal commands for elements in a file
 */
function generateFileElementRemovalCommands(
  filePath: string,
  elements: TracedUnusedElement[],
): string {
  let script = '';

  for (const element of elements) {
    script += generateSingleElementRemovalCommand(filePath, element);
  }

  return script;
}

/**
 * Generate removal command for a single element
 */
function generateSingleElementRemovalCommand(
  filePath: string,
  element: TracedUnusedElement,
): string {
  const startLine = element.location.startLine;
  const endLine = element.location.endLine;

  if (!startLine || startLine <= 0) {
    return generateManualRemovalNote(element, filePath);
  }

  if (endLine && endLine > 0) {
    return generateLineRangeRemovalCommand(filePath, element, startLine, endLine);
  }

  return generateSingleLineRemovalCommand(filePath, element, startLine);
}

/**
 * Generate manual removal note
 */
function generateManualRemovalNote(element: TracedUnusedElement, filePath: string): string {
  let script = '';
  script += `echo "  Note: Could not generate removal command for ${element.name} (${formatElementType(element.elementType)}) - no line numbers available"\n`;
  script += `echo "  Please manually remove this element from ${filePath}"\n`;
  return script;
}

/**
 * Generate line range removal command
 */
function generateLineRangeRemovalCommand(
  filePath: string,
  element: TracedUnusedElement,
  startLine: number,
  endLine: number,
): string {
  let script = '';
  script += `sed -i '${startLine},${endLine}d' "${filePath}"\n`;
  script += `echo "  Removed ${element.name} (${formatElementType(element.elementType)}, lines ${startLine}-${endLine})"\n`;
  return script;
}

/**
 * Generate single line removal command
 */
function generateSingleLineRemovalCommand(
  filePath: string,
  element: TracedUnusedElement,
  startLine: number,
): string {
  let script = '';
  script += `sed -i '${startLine}d' "${filePath}"\n`;
  script += `echo "  Removed ${element.name} (${formatElementType(element.elementType)}, line ${startLine})"\n`;
  return script;
}

export default {
  formatCodeTracingUnusedCodeReviewAsMarkdown,
  generateCodeTracingRemovalScript,
};
