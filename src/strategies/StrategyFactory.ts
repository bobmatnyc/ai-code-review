/**
 * @fileoverview Strategy factory for creating review strategies.
 *
 * This module provides a factory for creating the appropriate review strategy
 * based on the review options.
 */

import { PluginManager } from '../plugins/PluginManager';
import type { ReviewOptions, ReviewType } from '../types/review';
import logger from '../utils/logger';
import { ArchitecturalReviewStrategy } from './ArchitecturalReviewStrategy';
import { CodeTracingUnusedCodeReviewStrategy } from './CodeTracingUnusedCodeReviewStrategy';
import { CodingTestReviewStrategy } from './CodingTestReviewStrategy';
import { ConsolidatedReviewStrategy } from './ConsolidatedReviewStrategy';
import { ExtractPatternsReviewStrategy } from './ExtractPatternsReviewStrategy';
import { FocusedUnusedCodeReviewStrategy } from './FocusedUnusedCodeReviewStrategy';
import { ImprovedQuickFixesReviewStrategy } from './ImprovedQuickFixesReviewStrategy';
import { MultiPassReviewStrategy } from './MultiPassReviewStrategy';
import type { IReviewStrategy } from './ReviewStrategy';
import { UnusedCodeReviewStrategy } from './UnusedCodeReviewStrategy';

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
      }
      logger.warn(
        `Custom strategy "${options.strategy}" not found. Falling back to default strategy.`,
      );
    }

    // Use default strategies if no custom strategy is specified or if the custom strategy is not found
    const reviewType = options.type as ReviewType;

    // Debug logging for strategy selection
    logger.debug(`StrategyFactory.createStrategy: reviewType = "${reviewType}"`);

    // Check if multi-pass mode is explicitly requested
    if (options.multiPass) {
      logger.info('Using Multi-Pass Review Strategy');
      return new MultiPassReviewStrategy(reviewType);
    }

    if (reviewType === 'architectural') {
      logger.debug('Creating ArchitecturalReviewStrategy');
      return new ArchitecturalReviewStrategy();
    }
    if (reviewType === 'extract-patterns') {
      logger.debug('Creating ExtractPatternsReviewStrategy');
      return new ExtractPatternsReviewStrategy();
    }
    if (reviewType === 'coding-test') {
      logger.debug('Creating CodingTestReviewStrategy');
      return new CodingTestReviewStrategy();
    }
    if (reviewType === 'unused-code') {
      // Use code tracing strategy if the traceCode option is set
      if (options.traceCode) {
        logger.info('Using Code Tracing Unused Code Review Strategy');
        return new CodeTracingUnusedCodeReviewStrategy();
      }

      // Use the focused strategy if the focused option is set or when using LangChain
      const useFocused = options.focused || options.promptStrategy === 'langchain';
      logger.debug(
        `Creating ${useFocused ? 'FocusedUnusedCodeReviewStrategy' : 'UnusedCodeReviewStrategy'}`,
      );
      return useFocused ? new FocusedUnusedCodeReviewStrategy() : new UnusedCodeReviewStrategy();
    }
    // Use ImprovedQuickFixesReviewStrategy for quick-fixes when using langchain
    // This handles both 'quick-fixes' and the aliased 'improved-quick-fixes'
    if (reviewType === 'quick-fixes' && options.promptStrategy === 'langchain') {
      logger.debug('Creating ImprovedQuickFixesReviewStrategy');
      return new ImprovedQuickFixesReviewStrategy();
    }
    logger.debug(`Creating ConsolidatedReviewStrategy for reviewType: "${reviewType}"`);
    return new ConsolidatedReviewStrategy(reviewType);
  }
}
