/**
 * @fileoverview Factory for creating review strategy instances.
 *
 * This module provides a factory for creating the appropriate review strategy
 * based on the review options. It handles strategy selection, instantiation,
 * and customization.
 */

import type { ApiClientConfig } from '../../core/ApiClientSelector';
import { PluginManager } from '../../plugins/PluginManager';
import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../../types/review';
import logger from '../../utils/logger';
import type { ProjectDocs } from '../../utils/projectDocs';
import { AbstractStrategy } from '../base';
import { ArchitecturalReviewStrategy, ConsolidatedReviewStrategy } from '../implementations';
import type { IReviewStrategy } from '../ReviewStrategy';

/**
 * Adapter that converts an IReviewStrategy to an AbstractStrategy
 */
class StrategyAdapter extends AbstractStrategy {
  private strategy: IReviewStrategy;

  /**
   * Create a new adapter
   * @param strategy The IReviewStrategy to adapt
   * @param reviewType The review type
   */
  constructor(strategy: IReviewStrategy, reviewType: ReviewType) {
    super(reviewType);
    this.strategy = strategy;
  }

  /**
   * Execute the strategy
   * @param files Array of file information objects
   * @param projectName Name of the project
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the review result
   */
  public async execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig,
  ): Promise<ReviewResult> {
    this.logExecutionStart(files, projectName);

    try {
      if (!this.validateInput(files, projectName)) {
        throw new Error('Invalid input for review');
      }

      const result = await this.strategy.execute(
        files,
        projectName,
        projectDocs,
        options,
        apiClientConfig,
      );

      this.logExecutionCompletion(result);
      return result;
    } catch (error) {
      return this.handleError(error, 'execution');
    }
  }
}

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
        // Create an adapter that wraps the IReviewStrategy with AbstractStrategy
        return new StrategyAdapter(customStrategy, options.type || 'quick-fixes');
      }

      logger.warn(
        `Custom strategy '${options.strategy}' not found, falling back to default strategy`,
      );
    }

    // Check if this is an architectural review
    if (options.type === 'architectural') {
      logger.info('Creating architectural review strategy');
      return new ArchitecturalReviewStrategy();
    }

    // Default to consolidated review strategy
    logger.info(`Creating consolidated review strategy for type: ${options.type}`);
    return new ConsolidatedReviewStrategy(options.type);
  }
}
