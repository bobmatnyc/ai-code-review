/**
 * @fileoverview Utilities for implementing code review fixes
 *
 * This module provides functions for applying fixes from code review suggestions
 * to the corresponding files. Currently it only provides a placeholder for future
 * implementation as automatic fixes are not fully supported.
 */

import readline from 'node:readline';
import type { FixSuggestion } from './types';

/**
 * Create a readline interface for user input
 */
export function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt the user for confirmation
 * @param message Message to display to the user
 * @returns Promise resolving to boolean indicating user's response
 */
export async function promptForConfirmation(message: string): Promise<boolean> {
  const rl = createReadlineInterface();

  return new Promise((resolve) => {
    rl.question(`${message} (y/n): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * This function is a placeholder for future functionality.
 * Currently, the AI code review tool does not automatically apply fixes.
 * It only provides suggestions that developers must review and implement manually.
 *
 * @param suggestion The fix suggestion to apply
 * @returns Always returns false as automatic fixes are not supported
 */
export async function applyFixToFile(suggestion: FixSuggestion): Promise<boolean> {
  console.log(`\n⚠️ Automatic fixes are not supported.`);
  console.log(
    `The AI code review tool only provides suggestions that you must implement manually.`,
  );
  console.log(`Review the suggested fix and apply it yourself if appropriate.`);

  if (suggestion.suggestedCode) {
    console.log(`\nSuggested code:`);
    console.log('```');
    console.log(suggestion.suggestedCode);
    console.log('```');
  }

  return false;
}
