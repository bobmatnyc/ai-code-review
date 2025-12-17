/**
 * @fileoverview Shared utilities for unused code formatters.
 *
 * This module provides common utilities used by all unused code formatters
 * to reduce code duplication and complexity.
 */

/**
 * Confidence levels for unused code elements
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Configuration for formatting a section with confidence-based grouping
 */
export interface ConfidenceSectionConfig<T> {
  elements: T[];
  getConfidence: (element: T) => ConfidenceLevel;
  formatElements: (elements: T[], confidence: ConfidenceLevel) => string;
}

/**
 * Confidence section headers for markdown output
 */
export const MARKDOWN_CONFIDENCE_HEADERS: Record<ConfidenceLevel, string> = {
  high: '### ✅ High Confidence (Safe to Remove)\n\n',
  medium: '### ⚠️ Medium Confidence (Verify Before Removing)\n\n',
  low: '### ❓ Low Confidence (Needs Investigation)\n\n',
};

/**
 * Confidence section headers for terminal output
 */
export const TERMINAL_CONFIDENCE_HEADERS: Record<ConfidenceLevel, string> = {
  high: 'HIGH CONFIDENCE (SAFE TO REMOVE)\n\n',
  medium: 'MEDIUM CONFIDENCE (VERIFY BEFORE REMOVING)\n\n',
  low: 'LOW CONFIDENCE (NEEDS INVESTIGATION)\n\n',
};

/**
 * Filter elements by confidence level
 * @param elements Elements to filter
 * @param confidence Confidence level to filter by
 * @param getConfidence Function to extract confidence from element
 * @returns Filtered elements
 */
export function filterByConfidence<T>(
  elements: T[],
  confidence: ConfidenceLevel,
  getConfidence: (element: T) => ConfidenceLevel,
): T[] {
  return elements.filter((element) => getConfidence(element) === confidence);
}

/**
 * Format elements grouped by confidence level
 * @param config Configuration for the section
 * @param headers Headers to use (markdown or terminal)
 * @returns Formatted string
 */
export function formatByConfidence<T>(
  config: ConfidenceSectionConfig<T>,
  headers: Record<ConfidenceLevel, string>,
): string {
  let output = '';
  const confidenceLevels: ConfidenceLevel[] = ['high', 'medium', 'low'];

  for (const confidence of confidenceLevels) {
    const filtered = filterByConfidence(config.elements, confidence, config.getConfidence);
    if (filtered.length > 0) {
      output += headers[confidence];
      output += config.formatElements(filtered, confidence);
    }
  }

  return output;
}

/**
 * Group elements by file path
 * @param elements Elements to group
 * @param getFilePath Function to extract file path from element
 * @returns Elements grouped by file path
 */
export function groupByFile<T>(
  elements: T[],
  getFilePath: (element: T) => string,
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  for (const element of elements) {
    const filePath = getFilePath(element);
    if (!grouped[filePath]) {
      grouped[filePath] = [];
    }
    grouped[filePath].push(element);
  }

  return grouped;
}

/**
 * Clean file path by removing problematic patterns
 * @param filePath File path to clean
 * @returns Cleaned file path
 */
export function cleanFilePath(filePath: string): string {
  // Remove ":N/A" suffixes
  let cleaned = filePath.replace(/\s*:\s*N\/A\s*/g, '');

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/g, '');

  // Handle ending slash edge case
  if (cleaned.endsWith('/')) {
    cleaned = cleaned.slice(0, -1);
  }

  return cleaned;
}

/**
 * Element type display mapping
 */
export const ELEMENT_TYPE_DISPLAY: Record<string, string> = {
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

/**
 * Format element type for display
 * @param elementType Raw element type
 * @returns Formatted display name
 */
export function formatElementType(elementType: string): string {
  return ELEMENT_TYPE_DISPLAY[elementType] || elementType;
}

/**
 * Sort elements by line number in descending order
 * @param elements Elements to sort
 * @param getStartLine Function to extract start line from element
 * @returns Sorted elements
 */
export function sortByLineDescending<T>(
  elements: T[],
  getStartLine: (element: T) => number | undefined,
): T[] {
  return [...elements].sort((a, b) => {
    const aStart = getStartLine(a) || 0;
    const bStart = getStartLine(b) || 0;
    return bStart - aStart;
  });
}

/**
 * Format location string from line numbers
 * @param startLine Start line number
 * @param endLine End line number (optional)
 * @returns Formatted location string
 */
export function formatLocation(startLine?: number, endLine?: number): string {
  if (!startLine || startLine <= 0) {
    return '';
  }

  if (endLine && endLine > 0 && endLine !== startLine) {
    return `(lines ${startLine}-${endLine})`;
  }

  return `(line ${startLine})`;
}

/**
 * Clean code snippet by removing improper markdown
 * @param snippet Raw code snippet
 * @returns Cleaned code snippet
 */
export function cleanCodeSnippet(snippet: string): string {
  let cleaned = snippet.trim();

  // If the snippet already contains markdown code blocks, extract just the code
  if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.substring(cleaned.indexOf('\n') + 1, cleaned.lastIndexOf('```')).trim();
  }

  return cleaned;
}

/**
 * Indent code snippet for markdown
 * @param snippet Code snippet to indent
 * @param indent Indentation string (default: '  ')
 * @returns Indented code snippet
 */
export function indentSnippet(snippet: string, indent = '  '): string {
  return snippet
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
}
