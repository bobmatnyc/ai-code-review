/**
 * @fileoverview Utilities for interactive processing of code review fixes
 *
 * This module provides functions for interactively processing code review
 * fixes, either by displaying them for manual implementation or by
 * implementing them automatically with user confirmation.
 */

import { FixPriority, FixSuggestion, SuggestionSummary, FixSummary } from './types';
import { extractFixSuggestions } from './reviewExtraction';
import { displayFixSuggestions, displayDetailedFixSuggestion } from './fixDisplay';
import { applyFixToFile, promptForConfirmation } from './fixImplementation';
import { parseReviewJson, displayStructuredReview } from '../reviewParser';
import logger from '../logger';

/**
 * Process review results in non-interactive mode, just displaying recommendations
 * @param reviewContent Content of the review
 * @param projectPath Base path of the project
 * @param priorityFilter Optional filter to show only specific priority issues (h, m, l, or a for all)
 * @returns Summary of suggestions found
 */
export async function displayReviewResults(
  reviewContent: string,
  projectPath: string,
  priorityFilter?: 'h' | 'm' | 'l' | 'a'
): Promise<SuggestionSummary> {
  // First try to parse the review content as structured JSON
  const parsedReview = parseReviewJson(reviewContent);

  if (parsedReview) {
    // If we have a structured review, display it using the structured format
    displayStructuredReview(parsedReview);

    // Convert the structured review to FixSuggestion format for compatibility
    const highPrioritySuggestions: FixSuggestion[] = [];
    const mediumPrioritySuggestions: FixSuggestion[] = [];
    const lowPrioritySuggestions: FixSuggestion[] = [];

    // Process each file and issue
    parsedReview.review.files.forEach(file => {
      file.issues.forEach(issue => {
        const suggestion: FixSuggestion = {
          priority:
            issue.priority === 'HIGH'
              ? FixPriority.HIGH
              : issue.priority === 'MEDIUM'
                ? FixPriority.MEDIUM
                : FixPriority.LOW,
          file: file.filePath,
          description: issue.description,
          currentCode: issue.currentCode,
          suggestedCode: issue.suggestedCode,
          lineNumbers: issue.location
            ? {
                start: issue.location.startLine,
                end: issue.location.endLine
              }
            : undefined
        };

        // Add to the appropriate array based on priority
        if (suggestion.priority === FixPriority.HIGH) {
          highPrioritySuggestions.push(suggestion);
        } else if (suggestion.priority === FixPriority.MEDIUM) {
          mediumPrioritySuggestions.push(suggestion);
        } else {
          lowPrioritySuggestions.push(suggestion);
        }
      });
    });

    const totalSuggestions =
      highPrioritySuggestions.length +
      mediumPrioritySuggestions.length +
      lowPrioritySuggestions.length;

    return {
      highPrioritySuggestions,
      mediumPrioritySuggestions,
      lowPrioritySuggestions,
      totalSuggestions
    };
  } else {
    // Fall back to the original extraction method if parsing fails
    logger.info(
      'Using legacy format for review results (no structured schema detected)'
    );

    // Extract all suggestions
    const highPrioritySuggestions = await extractFixSuggestions(
      reviewContent,
      projectPath,
      FixPriority.HIGH
    );
    const mediumPrioritySuggestions = await extractFixSuggestions(
      reviewContent,
      projectPath,
      FixPriority.MEDIUM
    );
    const lowPrioritySuggestions = await extractFixSuggestions(
      reviewContent,
      projectPath,
      FixPriority.LOW
    );

    const totalSuggestions =
      highPrioritySuggestions.length +
      mediumPrioritySuggestions.length +
      lowPrioritySuggestions.length;

    // Display summary of all suggestions
    logger.info('\n=== CODE REVIEW RECOMMENDATIONS ===');
    logger.info(`Total issues found: ${totalSuggestions}`);
    logger.info(`🟥 High priority: ${highPrioritySuggestions.length}`);
    logger.info(`🟧 Medium priority: ${mediumPrioritySuggestions.length}`);
    logger.info(`🟩 Low priority: ${lowPrioritySuggestions.length}`);

    // Display instructions for interactive mode
    logger.info(
      '\nShowing ALL issues by default. To filter by priority, use these options:'
    );
    logger.info('  (h) High priority issues only');
    logger.info('  (m) Medium priority issues only');
    logger.info('  (l) Low priority issues only');
    logger.info('  (a) All issues (default)');
    logger.info('\nExample: ai-code-review src --interactive h');

    // Display suggestions based on priority filter
    // If no filter is provided, show all issues by default
    if (!priorityFilter || priorityFilter.toLowerCase() === 'a') {
      // Show all issues
      displayFixSuggestions(highPrioritySuggestions, FixPriority.HIGH);
      displayFixSuggestions(mediumPrioritySuggestions, FixPriority.MEDIUM);
      displayFixSuggestions(lowPrioritySuggestions, FixPriority.LOW);
    } else {
      // Show issues based on the specified filter
      switch (priorityFilter.toLowerCase()) {
        case 'h':
          displayFixSuggestions(highPrioritySuggestions, FixPriority.HIGH);
          break;
        case 'm':
          displayFixSuggestions(mediumPrioritySuggestions, FixPriority.MEDIUM);
          break;
        case 'l':
          displayFixSuggestions(lowPrioritySuggestions, FixPriority.LOW);
          break;
        default:
          logger.warn('Invalid priority filter. Use h, m, l, or a.');
          // Show all issues if the filter is invalid
          displayFixSuggestions(highPrioritySuggestions, FixPriority.HIGH);
          displayFixSuggestions(mediumPrioritySuggestions, FixPriority.MEDIUM);
          displayFixSuggestions(lowPrioritySuggestions, FixPriority.LOW);
      }
    }

    return {
      highPrioritySuggestions,
      mediumPrioritySuggestions,
      lowPrioritySuggestions,
      totalSuggestions
    };
  }
}

/**
 * Process review results and implement fixes
 * @param reviewContent Content of the review
 * @param projectPath Base path of the project
 * @param autoImplementHighPriority Whether to automatically implement high priority fixes
 * @param promptForMediumLow Whether to prompt for confirmation on medium and low priority fixes
 * @returns Summary of actions taken
 */
export async function processReviewResults(
  reviewContent: string,
  projectPath: string,
  autoImplementHighPriority: boolean = true,
  promptForMediumLow: boolean = true
): Promise<FixSummary> {
  // Initialize counters
  let highPriorityFixed = 0;
  let mediumPriorityFixed = 0;
  let lowPriorityFixed = 0;
  let totalSuggestions = 0;

  // Process high priority suggestions
  console.log('\nExtracting high priority issues...');
  const highPrioritySuggestions = await extractFixSuggestions(
    reviewContent,
    projectPath,
    FixPriority.HIGH
  );
  totalSuggestions += highPrioritySuggestions.length;

  if (highPrioritySuggestions.length > 0) {
    console.log(
      `Found ${highPrioritySuggestions.length} high priority issues.`
    );

    if (autoImplementHighPriority) {
      console.log('Automatically implementing high priority fixes...');

      for (const suggestion of highPrioritySuggestions) {
        console.log(`\nImplementing fix for: ${suggestion.description}`);
        console.log(`File: ${suggestion.file}`);

        const success = await applyFixToFile(suggestion);
        if (success) {
          console.log('✅ Fix applied successfully.');
          highPriorityFixed++;
        } else {
          console.log('❌ Could not apply fix automatically.');
        }
      }
    } else {
      console.log(
        'Skipping high priority fixes as auto-implementation is disabled.'
      );
    }
  } else {
    console.log('No high priority issues found.');
  }

  // Process medium priority suggestions
  console.log('\nExtracting medium priority issues...');
  const mediumPrioritySuggestions = await extractFixSuggestions(
    reviewContent,
    projectPath,
    FixPriority.MEDIUM
  );
  totalSuggestions += mediumPrioritySuggestions.length;

  if (mediumPrioritySuggestions.length > 0) {
    console.log(
      `Found ${mediumPrioritySuggestions.length} medium priority issues.`
    );

    if (promptForMediumLow) {
      for (const suggestion of mediumPrioritySuggestions) {
        displayDetailedFixSuggestion(suggestion, 0, FixPriority.MEDIUM);

        const shouldImplement = await promptForConfirmation(
          'Implement this fix?'
        );
        if (shouldImplement) {
          const success = await applyFixToFile(suggestion);
          if (success) {
            console.log('✅ Fix applied successfully.');
            mediumPriorityFixed++;
          } else {
            console.log('❌ Could not apply fix automatically.');
          }
        } else {
          console.log('Skipping this fix.');
        }
      }
    } else {
      console.log('Skipping medium priority fixes as prompting is disabled.');
    }
  } else {
    console.log('No medium priority issues found.');
  }

  // Process low priority suggestions
  console.log('\nExtracting low priority issues...');
  const lowPrioritySuggestions = await extractFixSuggestions(
    reviewContent,
    projectPath,
    FixPriority.LOW
  );
  totalSuggestions += lowPrioritySuggestions.length;

  if (lowPrioritySuggestions.length > 0) {
    console.log(`Found ${lowPrioritySuggestions.length} low priority issues.`);

    if (promptForMediumLow) {
      for (const suggestion of lowPrioritySuggestions) {
        displayDetailedFixSuggestion(suggestion, 0, FixPriority.LOW);

        const shouldImplement = await promptForConfirmation(
          'Implement this fix?'
        );
        if (shouldImplement) {
          const success = await applyFixToFile(suggestion);
          if (success) {
            console.log('✅ Fix applied successfully.');
            lowPriorityFixed++;
          } else {
            console.log('❌ Could not apply fix automatically.');
          }
        } else {
          console.log('Skipping this fix.');
        }
      }
    } else {
      console.log('Skipping low priority fixes as prompting is disabled.');
    }
  } else {
    console.log('No low priority issues found.');
  }

  // Return summary
  return {
    highPriorityFixed,
    mediumPriorityFixed,
    lowPriorityFixed,
    totalSuggestions
  };
}