/**
 * @fileoverview Strategy factory for creating review strategies.
 *
 * This module provides a factory for creating the appropriate review strategy
 * based on the review options.
 */

import { ReviewOptions, ReviewType } from '../types/review';
import { IReviewStrategy } from './ReviewStrategy';
import { ConsolidatedReviewStrategy } from './ConsolidatedReviewStrategy';
import { ArchitecturalReviewStrategy } from './ArchitecturalReviewStrategy';
import { UnusedCodeReviewStrategy } from './UnusedCodeReviewStrategy';
import { FocusedUnusedCodeReviewStrategy } from './FocusedUnusedCodeReviewStrategy';
import { CodeTracingUnusedCodeReviewStrategy } from './CodeTracingUnusedCodeReviewStrategy';
import { ImprovedQuickFixesReviewStrategy } from './ImprovedQuickFixesReviewStrategy';
import { MultiPassReviewStrategy } from './MultiPassReviewStrategy';
import { PluginManager } from '../plugins/PluginManager';
import logger from '../utils/logger';

/**
 * Factory for creating review strategies
 */
export class StrategyFactory {
  /**
   * Create a review strategy based on options
   * @param options Review options
   * @returns The appropriate review strategy
   */
  static createStrategy(options: ReviewOptions): IReviewStrategy {
    // Check if a custom strategy is specified
    if (options.strategy) {
      const pluginManager = PluginManager.getInstance();
      const customStrategy = pluginManager.getPlugin(options.strategy);

      if (customStrategy) {
        logger.info(`Using custom strategy: ${options.strategy}`);
        return customStrategy;
      } else {
        logger.warn(
          `Custom strategy "${options.strategy}" not found. Falling back to default strategy.`
        );
      }
    }

    // Use default strategies if no custom strategy is specified or if the custom strategy is not found
    const reviewType = options.type as ReviewType;

    // Check if multi-pass mode is explicitly requested
    if (options.multiPass) {
      logger.info('Using Multi-Pass Review Strategy');
      return new MultiPassReviewStrategy(reviewType);
    }
    
    if (reviewType === 'architectural') {
      return new ArchitecturalReviewStrategy();
    } else if (reviewType === 'unused-code') {
      // Use code tracing strategy if the traceCode option is set
      if (options.traceCode) {
        logger.info('Using Code Tracing Unused Code Review Strategy');
        return new CodeTracingUnusedCodeReviewStrategy();
      }

      // Use the focused strategy if the focused option is set or when using LangChain
      const useFocused =
        options.focused || options.promptStrategy === 'langchain';
      return useFocused
        ? new FocusedUnusedCodeReviewStrategy()
        : new UnusedCodeReviewStrategy();
    } else if (
      reviewType === 'quick-fixes' &&
      options.promptStrategy === 'langchain'
    ) {
      return new ImprovedQuickFixesReviewStrategy();
    } else {
      return new ConsolidatedReviewStrategy(reviewType);
    }
  }
}
