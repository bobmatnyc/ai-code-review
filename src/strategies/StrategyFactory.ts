/**
 * @fileoverview Strategy factory for creating review strategies.
 *
 * This module provides a factory for creating the appropriate review strategy
 * based on the review options.
 */

import { ReviewOptions, ReviewType } from '../types/review';
import { IReviewStrategy } from './ReviewStrategy';
import { ConsolidatedReviewStrategy } from './ConsolidatedReviewStrategy';
import { IndividualReviewStrategy } from './IndividualReviewStrategy';
import { ArchitecturalReviewStrategy } from './ArchitecturalReviewStrategy';
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
        logger.warn(`Custom strategy "${options.strategy}" not found. Falling back to default strategy.`);
      }
    }

    // Use default strategies if no custom strategy is specified or if the custom strategy is not found
    const reviewType = options.type as ReviewType;

    if (options.individual) {
      return new IndividualReviewStrategy(reviewType);
    } else if (reviewType === 'architectural') {
      return new ArchitecturalReviewStrategy();
    } else {
      return new ConsolidatedReviewStrategy(reviewType);
    }
  }
}
