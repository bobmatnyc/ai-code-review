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
// Import all clients directly
import { generateConsolidatedReview } from '../clients/geminiClient';
import { generateAnthropicConsolidatedReview, initializeAnthropicClient } from '../clients/anthropicClientWrapper';
import { generateOpenAIConsolidatedReview, initializeAnyOpenAIModel } from '../clients/openaiClientWrapper';
import { generateOpenRouterConsolidatedReview, initializeAnyOpenRouterModel } from '../clients/openRouterClientWrapper';

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
  console.log('[DEBUG] generateReview called');
  console.log(`[DEBUG] generateReview: apiClientConfig=${JSON.stringify(apiClientConfig)}`);

  // Use the appropriate API client based on the client type
  let result: Promise<ReviewResult>;

  if (apiClientConfig.clientType === 'OpenRouter') {
    console.log('[DEBUG] generateReview: Using OpenRouter client');
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
    result = generateConsolidatedReview(
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

  return result;
}
