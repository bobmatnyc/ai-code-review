/**
 * @fileoverview Common type definitions used throughout the application.
 *
 * This module defines common types, enums, and constants used across the application.
 * Centralizing these definitions ensures consistency and type safety.
 */

import type { ReviewType } from './review';

/**
 * Output format options for the review results
 */
export type OutputFormat = 'markdown' | 'json';

/**
 * Supported programming languages for code reviews
 */
export type ProgrammingLanguage =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'c'
  | 'cpp'
  | 'csharp'
  | 'php'
  | 'ruby'
  | 'swift'
  | 'kotlin';

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
  'kotlin',
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
  a: 'All issues',
};

/**
 * Valid review types array for validation
 */
export const VALID_REVIEW_TYPES: ReviewType[] = [
  'architectural',
  'quick-fixes',
  'security',
  'performance',
  'consolidated',
  'unused-code',
  'code-tracing-unused-code',
  'best-practices',
  'focused-unused-code',
  'evaluation',
  'extract-patterns',
  'coding-test',
  'ai-integration',
  'cloud-native',
  'developer-experience',
  'comprehensive',
];

/**
 * Review type descriptions
 */
export const REVIEW_TYPE_DESCRIPTIONS: Record<Exclude<ReviewType, 'consolidated'>, string> = {
  architectural: 'Architectural review focusing on design patterns and structure',
  'quick-fixes': 'Quick fixes review focusing on common issues and best practices',
  security: 'Security review focusing on vulnerabilities and security best practices',
  performance: 'Performance review focusing on optimization opportunities',
  'unused-code': 'Unused code review focusing on identifying and removing dead code',
  'code-tracing-unused-code': 'Deep code tracing for high-confidence unused code detection',
  'best-practices': 'Best practices review focusing on language-specific idioms and patterns',
  'focused-unused-code': 'Focused unused code review with targeted analysis',
  evaluation: 'Developer skill and AI assistance assessment without code improvement suggestions',
  'extract-patterns':
    'Extract detailed code patterns, architecture, and design decisions for creating exemplar project libraries',
  'coding-test':
    'Comprehensive coding test assessment against assignment requirements with structured scoring',
  'ai-integration':
    'AI/LLM integration review focusing on prompt engineering, AI safety, and modern AI workflows',
  'cloud-native':
    'Cloud-native architecture review focusing on Kubernetes, serverless, and scalability patterns',
  'developer-experience':
    'Developer experience review focusing on productivity, tooling, and workflow optimization',
  comprehensive:
    'Comprehensive review combining quick-fixes, security, performance, and architectural analysis in a single thorough assessment',
};
