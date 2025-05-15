/**
 * @fileoverview Index file for review action modules
 * 
 * This module re-exports all the functionality from the review action modules
 * to provide a clean interface for the main reviewActionHandler.
 */

// Export types
export * from './types';

// Export review extraction utilities
export {
  extractFixSuggestions,
  extractSection,
  parseSuggestions
} from './reviewExtraction';

// Export fix implementation utilities
export {
  applyFixToFile,
  promptForConfirmation,
  createReadlineInterface
} from './fixImplementation';

// Export fix display utilities
export {
  displayFixSuggestions,
  displayDetailedFixSuggestion
} from './fixDisplay';

// Export interactive processing utilities
export {
  displayReviewResults,
  processReviewResults
} from './interactiveProcessing';

// Export progress tracking utilities for multi-pass reviews
export {
  MultiPassProgressTracker
} from './progressTracker';

// Export consolidation utilities
export {
  consolidateReview
} from './consolidateReview';