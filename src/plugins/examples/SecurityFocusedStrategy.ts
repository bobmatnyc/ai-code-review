/**
 * @fileoverview Example security-focused review strategy plugin.
 *
 * This is an example plugin that demonstrates how to create a custom review strategy
 * that focuses specifically on security issues.
 */

import {
  BaseReviewStrategy,
  IReviewStrategy
} from '../../strategies/ReviewStrategy';
import {
  FileInfo,
  ReviewOptions,
  ReviewResult,
  ReviewType
} from '../../types/review';
import { ProjectDocs } from '../../utils/projectDocs';
import { ApiClientConfig } from '../../core/ApiClientSelector';
import { generateReview } from '../../core/ReviewGenerator';
import logger from '../../utils/logger';
import { PluginManager } from '../PluginManager';
import { PluginRegistration } from '../PluginInterface';

/**
 * Security-focused review strategy
 */
class SecurityFocusedStrategy extends BaseReviewStrategy {
  /**
   * Create a new security-focused review strategy
   */
  constructor() {
    super('security');
  }

  /**
   * Execute the security-focused review strategy
   * @param files Files to review
   * @param projectName Project name
   * @param projectDocs Project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the review result
   */
  async execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig
  ): Promise<ReviewResult> {
    logger.info('Executing security-focused review strategy...');

    // Override the review type to ensure we're using the security review type
    const securityOptions = {
      ...options,
      type: 'security' as ReviewType
    };

    // Generate the review using the selected API client
    return generateReview(
      files,
      projectName,
      this.reviewType,
      projectDocs,
      securityOptions,
      apiClientConfig
    );
  }
}

/**
 * Plugin definition
 */
const SecurityFocusedPlugin = {
  /**
   * Register the plugin with the plugin manager
   * @param pluginManager The plugin manager instance
   */
  register: (pluginManager: PluginManager): void => {
    const registration: PluginRegistration = {
      name: 'security-focused',
      description:
        'A review strategy that focuses specifically on security issues',
      strategy: new SecurityFocusedStrategy()
    };

    pluginManager.registerPlugin(registration);
  },

  /**
   * Get information about the plugin
   * @returns Plugin information
   */
  getInfo: () => ({
    name: 'security-focused',
    description:
      'A review strategy that focuses specifically on security issues',
    version: '1.0.0',
    author: 'AI Code Review Team'
  })
};

export default SecurityFocusedPlugin;
