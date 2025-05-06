/**
 * @fileoverview Factory for creating review strategy instances.
 * 
 * This module provides a factory for creating the appropriate review strategy
 * based on the review options. It handles strategy selection, instantiation,
 * and customization.
 */

import { AbstractStrategy } from '../base';
import {
  ArchitecturalReviewStrategy,
  ConsolidatedReviewStrategy,
  IndividualReviewStrategy
} from '../implementations';
import { ReviewOptions } from '../../types/review';
import { PluginManager } from '../../plugins/PluginManager';
import logger from '../../utils/logger';

/**
 * Factory for creating review strategies
 */
export class StrategyFactory {
  /**
   * Create a strategy instance based on review options
   * @param options Review options
   * @returns The appropriate strategy instance
   */
  public static createStrategy(options: ReviewOptions): AbstractStrategy {
    // Check if a custom strategy is specified
    if (options.strategy) {
      logger.info(`Using custom strategy: ${options.strategy}`);
      
      // Try to get the strategy from the plugin manager
      const pluginManager = PluginManager.getInstance();
      const customStrategy = pluginManager.getPlugin(options.strategy);
      
      if (customStrategy) {
        return customStrategy;
      }
      
      logger.warn(`Custom strategy '${options.strategy}' not found, falling back to default strategy`);
    }
    
    // Check if this is an architectural review
    if (options.type === 'architectural') {
      logger.info('Creating architectural review strategy');
      return new ArchitecturalReviewStrategy();
    }
    
    // Check if this is an individual file review
    if (options.individual) {
      logger.info(`Creating individual review strategy for type: ${options.type}`);
      return new IndividualReviewStrategy(options.type);
    }
    
    // Default to consolidated review strategy
    logger.info(`Creating consolidated review strategy for type: ${options.type}`);
    return new ConsolidatedReviewStrategy(options.type);
  }
}