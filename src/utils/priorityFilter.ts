/**
 * @fileoverview Utility functions for handling priority filters.
 *
 * This module provides utility functions for working with priority filters
 * in interactive mode, including extracting priority filters from command line
 * arguments and review options.
 */

import type { ReviewOptions } from '../types/review';

/**
 * Get the priority filter from command line arguments or options
 *
 * This function extracts the priority filter from either:
 * 1. The options object (if the interactive property is a string)
 * 2. The command line arguments (if --interactive or -i is followed by a priority filter)
 *
 * Priority filters determine which issues to display in interactive mode:
 * - 'h': High priority issues only
 * - 'm': Medium and high priority issues
 * - 'l': Low, medium, and high priority issues
 * - 'a': All issues (including informational)
 *
 * @param options Review options that may contain the priority filter
 * @returns The priority filter (h, m, l, or a) or undefined if not specified
 * @example
 * // With options object
 * const filter = getPriorityFilterFromArgs({ interactive: 'h' });
 * // filter === 'h'
 *
 * // With command line arguments (if process.argv includes '--interactive h')
 * const filter = getPriorityFilterFromArgs();
 * // filter === 'h'
 */
export function getPriorityFilterFromArgs(
  options?: ReviewOptions,
): 'h' | 'm' | 'l' | 'a' | undefined {
  // First check if the interactive option is a string (priority filter)
  if (
    options &&
    typeof options.interactive === 'string' &&
    ['h', 'm', 'l', 'a'].includes(options.interactive)
  ) {
    return options.interactive as 'h' | 'm' | 'l' | 'a';
  }

  // Otherwise check if there's a priority filter argument after --interactive
  const args = process.argv;
  const interactiveIndex = args.findIndex((arg) => arg === '--interactive' || arg === '-i');

  if (interactiveIndex !== -1 && interactiveIndex < args.length - 1) {
    const nextArg = args[interactiveIndex + 1];
    // Check if the next argument is a priority filter and not another option
    if (['h', 'm', 'l', 'a'].includes(nextArg) && !nextArg.startsWith('-')) {
      return nextArg as 'h' | 'm' | 'l' | 'a';
    }
  }

  return undefined;
}
