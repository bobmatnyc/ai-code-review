/**
 * @fileoverview Interactive display manager module.
 *
 * This module is responsible for handling the interactive display of review results.
 * It centralizes the logic for displaying review results and handling user interaction.
 */

import fs from 'node:fs/promises';
import type { ReviewOptions } from '../types/review';
import logger from '../utils/logger';
import { displayReviewResults } from '../utils/reviewActionHandler';

/**
 * Priority filter type for interactive mode
 */
export type PriorityFilter = 'h' | 'm' | 'l' | 'a';

/**
 * Display review results in interactive mode
 * @param reviewPath Path to the review file
 * @param projectPath Path to the project
 * @param options Review options
 * @returns Promise resolving when the display is complete
 */
export async function displayReviewInteractively(
  reviewPath: string,
  projectPath: string,
  options: ReviewOptions,
): Promise<void> {
  try {
    logger.info('\nDisplaying review results in interactive mode...');

    // Read the review content
    const reviewContent = await fs.readFile(reviewPath, 'utf-8');

    // Get the priority filter from the options
    const priorityFilter = getPriorityFilterFromOptions(options);

    // Display the review results
    const results = await displayReviewResults(reviewContent, projectPath, priorityFilter);

    // Print summary
    logger.info('\n--- Review Summary ---');
    logger.info(`Total issues found: ${results.totalSuggestions}`);
    logger.info(`High priority issues: ${results.highPrioritySuggestions.length}`);
    logger.info(`Medium priority issues: ${results.mediumPrioritySuggestions.length}`);
    logger.info(`Low priority issues: ${results.lowPrioritySuggestions.length}`);
    logger.info('----------------------');
  } catch (error) {
    logger.error(
      `Error displaying review results: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Get the priority filter from review options
 * @param options Review options that may contain the priority filter
 * @returns The priority filter (h, m, l, or a) or undefined if not specified
 */
export function getPriorityFilterFromOptions(options?: ReviewOptions): PriorityFilter | undefined {
  // First check if the interactive option is a string (priority filter)
  if (
    options &&
    typeof options.interactive === 'string' &&
    ['h', 'm', 'l', 'a'].includes(options.interactive)
  ) {
    return options.interactive as PriorityFilter;
  }

  // Otherwise check if there's a priority filter argument after --interactive
  const args = process.argv;
  const interactiveIndex = args.findIndex((arg) => arg === '--interactive' || arg === '-i');

  if (interactiveIndex !== -1 && interactiveIndex < args.length - 1) {
    const nextArg = args[interactiveIndex + 1];
    // Check if the next argument is a priority filter and not another option
    if (['h', 'm', 'l', 'a'].includes(nextArg) && !nextArg.startsWith('-')) {
      return nextArg as PriorityFilter;
    }
  }

  return undefined;
}
