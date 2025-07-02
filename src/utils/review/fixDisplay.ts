/**
 * @fileoverview Utilities for displaying code review fixes
 *
 * This module provides functions for displaying code review fix suggestions
 * in a user-friendly manner, with colored output and formatting based on priority.
 */

import { FixPriority, type FixSuggestion } from './types';

/**
 * Display a concise summary of fix suggestions without prompting for interaction
 * @param suggestions Array of fix suggestions
 * @param priority Priority level of the suggestions
 */
export function displayFixSuggestions(suggestions: FixSuggestion[], priority: FixPriority): void {
  if (suggestions.length === 0) {
    return;
  }

  const priorityColor = {
    [FixPriority.HIGH]: '\x1b[31m', // Red
    [FixPriority.MEDIUM]: '\x1b[33m', // Yellow
    [FixPriority.LOW]: '\x1b[32m', // Green
  };

  const priorityEmoji = {
    [FixPriority.HIGH]: '🟥',
    [FixPriority.MEDIUM]: '🟧',
    [FixPriority.LOW]: '🟩',
  };

  const priorityLabel = {
    [FixPriority.HIGH]: 'HIGH',
    [FixPriority.MEDIUM]: 'MEDIUM',
    [FixPriority.LOW]: 'LOW',
  };

  console.log(
    `\n${priorityColor[priority]}${priorityEmoji[priority]} ${priorityLabel[priority]} PRIORITY ISSUES (${suggestions.length})\x1b[0m`,
  );

  suggestions.forEach((suggestion, index) => {
    console.log(`${index + 1}. ${suggestion.description}`);
    console.log(`   File: ${suggestion.file}`);
    if (suggestion.lineNumbers) {
      console.log(`   Lines: ${suggestion.lineNumbers.start}-${suggestion.lineNumbers.end}`);
    }
  });
}

/**
 * Display detailed information about a specific fix suggestion
 * @param suggestion The fix suggestion to display
 * @param index Index of the suggestion in its priority group
 * @param priority Priority level of the suggestion
 */
export function displayDetailedFixSuggestion(
  suggestion: FixSuggestion,
  index: number,
  priority: FixPriority,
): void {
  const priorityColor = {
    [FixPriority.HIGH]: '\x1b[31m', // Red
    [FixPriority.MEDIUM]: '\x1b[33m', // Yellow
    [FixPriority.LOW]: '\x1b[32m', // Green
  };

  const priorityEmoji = {
    [FixPriority.HIGH]: '🟥',
    [FixPriority.MEDIUM]: '🟧',
    [FixPriority.LOW]: '🟩',
  };

  const priorityLabel = {
    [FixPriority.HIGH]: 'HIGH',
    [FixPriority.MEDIUM]: 'MEDIUM',
    [FixPriority.LOW]: 'LOW',
  };

  console.log(
    `\n${priorityColor[priority]}${priorityEmoji[priority]} ${priorityLabel[priority]} PRIORITY ISSUE #${index + 1}\x1b[0m`,
  );
  console.log(`Description: ${suggestion.description}`);
  console.log(`File: ${suggestion.file}`);
  if (suggestion.lineNumbers) {
    console.log(`Lines: ${suggestion.lineNumbers.start}-${suggestion.lineNumbers.end}`);
  }

  if (suggestion.currentCode && suggestion.suggestedCode) {
    console.log('\nCurrent code:');
    console.log('```');
    console.log(suggestion.currentCode);
    console.log('```');

    console.log('\nSuggested code:');
    console.log('```');
    console.log(suggestion.suggestedCode);
    console.log('```');
  }
}
