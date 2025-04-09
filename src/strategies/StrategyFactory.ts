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
