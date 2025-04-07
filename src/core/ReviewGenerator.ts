/**
 * @fileoverview Review generator module.
 *
 * This module is responsible for generating code reviews using the appropriate
 * API client based on the selected client type. It centralizes the logic for
 * generating reviews across different AI providers.
 */

import { ApiClientConfig } from './ApiClientSelector';
import { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';
import { generateConsolidatedReview } from '../clients/geminiClient';
import { generateOpenRouterConsolidatedReview } from '../clients/openRouterClient';
import { generateAnthropicConsolidatedReview } from '../clients/anthropicClient';
import { generateOpenAIConsolidatedReview } from '../clients/openaiClient';
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
  // Use the appropriate API client based on the client type
  switch (apiClientConfig.clientType) {
    case 'OpenRouter':
      return generateOpenRouterConsolidatedReview(
        fileInfos,
        project,
        reviewType,
        projectDocs,
        options
      );
    case 'Google':
      return generateConsolidatedReview(
        fileInfos,
        project,
        reviewType,
        projectDocs,
        options
      );
    case 'Anthropic':
      return generateAnthropicConsolidatedReview(
        fileInfos,
        project,
        reviewType,
        projectDocs,
        options
      );
    case 'OpenAI':
      return generateOpenAIConsolidatedReview(
        fileInfos,
        project,
        reviewType,
        projectDocs,
        options
      );
    case 'None':
    default:
      // Fallback to Gemini client with mock responses
      logger.warn('No API client available. Using mock responses.');
      return generateConsolidatedReview(
        fileInfos,
        project,
        reviewType,
        projectDocs,
        options
      );
  }
}
