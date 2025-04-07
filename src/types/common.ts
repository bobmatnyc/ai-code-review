/**
 * @fileoverview Common type definitions used throughout the application.
 *
 * This module defines common types, enums, and constants used across the application.
 * Centralizing these definitions ensures consistency and type safety.
 */

import { ReviewType } from './review';

/**
 * Output format options for the review results
 */
export type OutputFormat = 'markdown' | 'json';

/**
 * Supported programming languages for code reviews
 */
export type ProgrammingLanguage = 'typescript' | 'javascript' | 'python' | 'java' | 'go' | 'rust' | 'c' | 'cpp' | 'csharp' | 'php' | 'ruby' | 'swift' | 'kotlin';

/**
 * Default programming language
 */
export const DEFAULT_LANGUAGE: ProgrammingLanguage = 'typescript';

/**
 * Valid programming languages array for validation
 */
export const VALID_LANGUAGES: ProgrammingLanguage[] = [
  'typescript',
  'javascript',
  'python',
  'java',
  'go',
  'rust',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'swift',
  'kotlin'
];

/**
 * Valid output formats array for validation
 */
export const VALID_OUTPUT_FORMATS: OutputFormat[] = ['markdown', 'json'];

/**
 * Priority filter options for interactive mode
 */
export type PriorityFilter = 'h' | 'm' | 'l' | 'a';

/**
 * Valid priority filters array for validation
 */
export const VALID_PRIORITY_FILTERS: PriorityFilter[] = ['h', 'm', 'l', 'a'];

/**
 * Priority filter descriptions
 */
export const PRIORITY_FILTER_DESCRIPTIONS: Record<PriorityFilter, string> = {
  h: 'High priority issues only',
  m: 'Medium priority issues only',
  l: 'Low priority issues only',
  a: 'All issues'
};

/**
 * Valid review types array for validation
 */
export const VALID_REVIEW_TYPES: ReviewType[] = [
  'architectural',
  'quick-fixes',
  'security',
  'performance',
  'consolidated'
];

/**
 * Review type descriptions
 */
export const REVIEW_TYPE_DESCRIPTIONS: Record<Exclude<ReviewType, 'consolidated'>, string> = {
  architectural: 'Architectural review focusing on design patterns and structure',
  'quick-fixes': 'Quick fixes review focusing on common issues and best practices',
  security: 'Security review focusing on vulnerabilities and security best practices',
  performance: 'Performance review focusing on optimization opportunities'
};
