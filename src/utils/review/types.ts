/**
 * @fileoverview Type definitions for review action modules
 *
 * This module provides shared types used across the review action modules.
 */

/**
 * Priority levels for code review fixes
 */
export enum FixPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Structure representing a code fix suggestion
 */
export interface FixSuggestion {
  priority: FixPriority;
  file: string;
  description: string;
  currentCode?: string;
  suggestedCode?: string;
  lineNumbers?: { start: number; end: number };
}

/**
 * Summary of fix actions taken
 */
export interface FixSummary {
  highPriorityFixed: number;
  mediumPriorityFixed: number;
  lowPriorityFixed: number;
  totalSuggestions: number;
}

/**
 * Summary of suggestions found
 */
export interface SuggestionSummary {
  highPrioritySuggestions: FixSuggestion[];
  mediumPrioritySuggestions: FixSuggestion[];
  lowPrioritySuggestions: FixSuggestion[];
  totalSuggestions: number;
}
