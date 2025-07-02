/**
 * @fileoverview Utilities for parsing and acting on code review results.
 *
 * This module provides functions for parsing code review results and automatically
 * implementing suggested fixes based on priority levels. It can extract code snippets,
 * identify file locations, and apply changes to the codebase.
 *
 * Key responsibilities:
 * - Parsing review results to extract actionable items
 * - Categorizing fixes by priority (high, medium, low)
 * - Implementing high priority fixes automatically
 * - Prompting for confirmation on medium and low priority fixes
 * - Tracking changes made to files
 * - Providing summary reports of actions taken
 */

// Re-export all functionality from the review modules
export * from './review';
