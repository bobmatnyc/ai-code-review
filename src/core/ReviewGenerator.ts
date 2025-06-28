/**
 * @fileoverview Review generator module.
 *
 * This module is responsible for generating code reviews using the appropriate
 * API client based on the selected client type. It centralizes the logic for
 * generating reviews across different AI providers.
 */

import { ApiClientConfig } from './ApiClientSelector';
import {
  FileInfo,
  ReviewOptions,
  ReviewResult,
  ReviewType
} from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';
// Import the new client factory
import { ClientFactory } from '../clients/factory/clientFactory';
// Import legacy clients for backward compatibility
import {
  generateAnthropicConsolidatedReview,
  initializeAnthropicClient
} from '../clients/anthropicClientWrapper';
import {
  generateOpenAIConsolidatedReview,
  initializeAnyOpenAIModel
} from '../clients/openaiClientWrapper';
import {
  generateOpenRouterConsolidatedReview,
  initializeAnyOpenRouterModel
} from '../clients/openRouterClientWrapper';
import { generateConsolidatedReview } from '../clients/geminiClient';

// Other imports
import logger from '../utils/logger';

/**
 * Generate a code review using the appropriate API client
 * @param fileInfos Array of file information objects
 * @param project Project name
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @param apiClientConfig API client configuration
 * @returns Promise resolving to the review result
 */
export async function generateReview(
  fileInfos: FileInfo[],
  project: string,
  reviewType: ReviewType,
  projectDocs: ProjectDocs | null,
  options: ReviewOptions,
  apiClientConfig: ApiClientConfig
): Promise<ReviewResult> {
  logger.debug('generateReview called');
  logger.debug(`generateReview: apiClientConfig=${JSON.stringify(apiClientConfig)}`);

  // Use the appropriate API client based on the client type
  let result: Promise<ReviewResult>;

  if (apiClientConfig.clientType === 'OpenRouter') {
    logger.debug('generateReview: Using OpenRouter client');
    // Use the imported OpenRouter client wrapper

    // Initialize the OpenRouter client before using it
    await initializeAnyOpenRouterModel();

    result = generateOpenRouterConsolidatedReview(
      fileInfos,
      project,
      reviewType,
      projectDocs,
      options
    );
  } else if (apiClientConfig.clientType === 'Google') {
    logger.debug('generateReview: Using Gemini client via factory');
    // Use the new client factory for Gemini
    const client = ClientFactory.createClient(apiClientConfig.modelName);
    await client.initialize();

    result = client.generateConsolidatedReview(
      fileInfos,
      project,
      reviewType,
      projectDocs,
      options
    );
  } else if (apiClientConfig.clientType === 'Anthropic') {
    // Use the imported Anthropic client wrapper

    // Initialize the Anthropic client before using it
    await initializeAnthropicClient();

    result = generateAnthropicConsolidatedReview(
      fileInfos,
      project,
      reviewType,
      projectDocs,
      options
    );
  } else if (apiClientConfig.clientType === 'OpenAI') {
    // Use the imported OpenAI client wrapper

    // Initialize the OpenAI client before using it
    await initializeAnyOpenAIModel();

    result = generateOpenAIConsolidatedReview(
      fileInfos,
      project,
      reviewType,
      projectDocs,
      options
    );
  } else {
    // Fallback to Gemini client with mock responses
    logger.warn('No API client available. Using mock responses.');
    result = generateConsolidatedReview(
      fileInfos,
      project,
      reviewType,
      projectDocs,
      options
    );
  }

  // Add metadata to the review result
  const reviewResult = await result;
  
  // Get package version from process.env or hardcoded value
  const packageVersion = process.env.npm_package_version || '2.1.1';
  
  // Create a string representation of the command-line options
  const commandOptions = Object.entries(options)
    .filter(([key, value]) => {
      // Filter out internal options and undefined values
      if (key.startsWith('_') || value === undefined) return false;
      
      // Filter out ciData which can be very large
      if (key === 'ciData') return false;
      
      // Filter out empty arrays and objects
      if (Array.isArray(value) && value.length === 0) return false;
      if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) return false;
      
      return true;
    })
    .map(([key, value]) => {
      // Format boolean options as flags without values
      if (typeof value === 'boolean') {
        return value ? `--${key}` : '';
      }
      
      // Format arrays and objects as JSON strings
      if (typeof value === 'object' && value !== null) {
        return `--${key}='${JSON.stringify(value)}'`;
      }
      
      // Format other values normally
      return `--${key}=${value}`;
    })
    .filter(Boolean) // Remove empty strings
    .join(' ');

  // Add metadata to the review result
  reviewResult.toolVersion = packageVersion;
  reviewResult.commandOptions = commandOptions;
  
  // Ensure costInfo is set if only cost is available
  if (reviewResult.cost && !reviewResult.costInfo) {
    reviewResult.costInfo = reviewResult.cost;
  }
  
  // Ensure required fields are set to avoid undefined values in output
  if (!reviewResult.filePath) {
    logger.warn('Review result has no filePath. Setting to default value.');
    reviewResult.filePath = reviewType;
  }
  
  if (!reviewResult.modelUsed) {
    logger.warn('Review result has no modelUsed. Setting to default value.');
    reviewResult.modelUsed = apiClientConfig.clientType + ':' + apiClientConfig.modelName;
  }
  
  return reviewResult;
}
