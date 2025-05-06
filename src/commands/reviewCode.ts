/**
 * @fileoverview Command handler for the code review functionality.
 *
 * This module serves as the main entry point for the code review command.
 * It delegates to specialized modules for argument parsing, file discovery,
 * and review orchestration, following the Single Responsibility Principle.
 *
 * Key responsibilities:
 * - Delegating to the argument parser for command-line argument handling
 * - Delegating to the review orchestrator for coordinating the review process
 * - Providing a simple interface for the CLI to invoke the review functionality
 *
 * The module is designed to be a thin wrapper around the core functionality,
 * making it easier to test and maintain the codebase.
 */

import { ReviewOptions } from '../types/review';
import { orchestrateReview } from '../core/reviewOrchestrator';

/**
 * Main entry point for the code review command
 * @param target Path to the file or directory to review
 * @param options Review options
 */
export async function reviewCode(
  target: string,
  options: ReviewOptions
): Promise<void> {
  try {
    // Handle prompt-file option if provided
    if ((options as any)['prompt-file']) {
      options.promptFile = (options as any)['prompt-file'] as string;
      delete (options as any)['prompt-file'];
    }

    // Handle prompt-fragment option if provided
    if ((options as any)['prompt-fragment']) {
      const fragment = (options as any)['prompt-fragment'] as string;
      const position = (options as any)['prompt-fragment-position'] || 'middle';

      options.promptFragments = [
        {
          content: fragment,
          position: position as 'start' | 'middle' | 'end'
        }
      ];

      delete (options as any)['prompt-fragment'];
      delete (options as any)['prompt-fragment-position'];
    }

    // Handle prompt-strategy option if provided
    if ((options as any)['prompt-strategy']) {
      options.promptStrategy = (options as any)['prompt-strategy'] as string;
      delete (options as any)['prompt-strategy'];
    }

    // Handle use-cache option if provided
    if ((options as any)['use-cache'] !== undefined) {
      options.useCache = (options as any)['use-cache'] as boolean;
      delete (options as any)['use-cache'];
    }
    
    // Handle include-dependency-analysis option if provided
    if ((options as any)['include-dependency-analysis'] !== undefined) {
      options.includeDependencyAnalysis = (options as any)['include-dependency-analysis'] as boolean;
      delete (options as any)['include-dependency-analysis'];
    }

    // Delegate to the review orchestrator
    await orchestrateReview(target, options);
  } catch (error) {
    // Any unhandled errors will be caught here
    // The orchestrator should handle most errors, but this is a safety net
    console.error(
      `Unhandled error in reviewCode: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
