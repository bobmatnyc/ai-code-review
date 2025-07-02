/**
 * @fileoverview Index file for review action modules
 *
 * This module re-exports all the functionality from the review action modules
 * to provide a clean interface for the main reviewActionHandler.
 */

// Export consolidation utilities
export { consolidateReview } from './consolidateReview';
// Export fix display utilities
export {
  displayDetailedFixSuggestion,
  displayFixSuggestions,
} from './fixDisplay';

// Export fix implementation utilities
export {
  applyFixToFile,
  createReadlineInterface,
  promptForConfirmation,
} from './fixImplementation';
// Export interactive processing utilities
export {
  displayReviewResults,
  processReviewResults,
} from './interactiveProcessing';
// Export progress tracking utilities for multi-pass reviews
export { MultiPassProgressTracker } from './progressTracker';
// Export review extraction utilities
export {
  extractFixSuggestions,
  extractSection,
  parseSuggestions,
} from './reviewExtraction';
// Export types
export * from './types';
