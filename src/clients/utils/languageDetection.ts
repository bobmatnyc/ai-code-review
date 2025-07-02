/**
 * @fileoverview Utilities for detecting programming languages from file extensions.
 *
 * This module provides functions for mapping file extensions to programming languages,
 * which is useful for formatting code snippets and providing language-specific hints
 * to AI models.
 */

/**
 * Get the language name from a file extension
 * @param extension File extension
 * @returns Language name
 */
export function getLanguageFromExtension(extension: string): string {
  const extensionMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    go: 'go',
    rs: 'rust',
    php: 'php',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    swift: 'swift',
    kt: 'kotlin',
    md: 'markdown',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sql: 'sql',
  };

  return extensionMap[extension.toLowerCase()] || extension;
}
