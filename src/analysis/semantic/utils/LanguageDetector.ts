/**
 * @fileoverview Language detection utilities for semantic analysis
 *
 * This module provides functions to detect programming languages from file paths
 * and check if languages are supported for semantic analysis.
 */

/**
 * Detect programming language from file path
 * @param filePath Path to the file
 * @returns Detected language or 'unknown'
 */
export function detectLanguage(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();

  const extensionMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rb: 'ruby',
    php: 'php',
  };

  return extensionMap[extension || ''] || 'unknown';
}

/**
 * Check if language is supported for semantic analysis
 * @param language Language to check
 * @param enabledLanguages List of enabled languages
 * @param availableParsers Map of available parsers
 * @returns Whether the language is supported
 */
export function isLanguageSupported(
  language: string,
  enabledLanguages: string[],
  availableParsers: Set<string> | Map<string, unknown>,
): boolean {
  return (
    enabledLanguages.includes(language) &&
    (availableParsers instanceof Set
      ? availableParsers.has(language)
      : availableParsers.has(language))
  );
}

/**
 * Get language-specific TreeSitter parser configurations
 */
export const LANGUAGE_PARSERS = {
  typescript: 'TypeScript.typescript',
  javascript: 'TypeScript.typescript', // Use TypeScript parser for JavaScript
  tsx: 'TypeScript.tsx',
  jsx: 'TypeScript.tsx', // Use TSX parser for JSX
  python: 'Python',
  ruby: 'Ruby',
  php: 'PHP',
} as const;
