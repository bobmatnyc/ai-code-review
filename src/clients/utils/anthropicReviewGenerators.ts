/**
 * @fileoverview Review generators for Anthropic models.
 *
 * This module provides functions for generating different types of code reviews
 * using Anthropic's Claude models. It includes logic for single file reviews,
 * consolidated reviews across multiple files, and architectural reviews.
 */

import type {
  CostInfo,
  FileInfo,
  ReviewOptions,
  ReviewResult,
  ReviewType,
} from '../../types/review';
import { ApiError } from '../../utils/apiErrorHandler';
import logger from '../../utils/logger';
import type { ProjectDocs } from '../../utils/projectDocs';
import {
  formatConsolidatedReviewPrompt,
  formatSingleFileReviewPrompt,
  loadPromptTemplate,
} from '../utils';
import { getCostInfoFromText } from '../utils/tokenCounter';
import { makeAnthropicRequest } from './anthropicApiClient';
import {
  getApiModelName,
  initializeAnthropicClient,
  isAnthropicModel,
  parseJsonResponse,
} from './anthropicModelHelpers';

/**
 * System prompt for structured review output
 */
const STRUCTURED_REVIEW_SYSTEM_PROMPT = `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.

IMPORTANT: Your response MUST be in the following JSON format:

{
  "summary": "A brief summary of the code review",
  "issues": [
    {
      "title": "Issue title",
      "priority": "high|medium|low",
      "type": "bug|security|performance|maintainability|readability|architecture|best-practice|documentation|testing|other",
      "filePath": "Path to the file",
      "lineNumbers": "Line number or range (e.g., 10 or 10-15)",
      "description": "Detailed description of the issue",
      "codeSnippet": "Relevant code snippet",
      "suggestedFix": "Suggested code fix",
      "impact": "Impact of the issue"
    }
  ],
  "recommendations": [
    "General recommendation 1",
    "General recommendation 2"
  ],
  "positiveAspects": [
    "Positive aspect 1",
    "Positive aspect 2"
  ]
}

Ensure your response is valid JSON. Do not include any text outside the JSON structure.`;

/**
 * Generate a code review for a single file using the Anthropic API
 * @param fileContent Content of the file to review
 * @param filePath Path to the file
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateAnthropicReview(
  fileContent: string,
  filePath: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions,
): Promise<ReviewResult> {
  const { isCorrect, adapter, modelName } = isAnthropicModel();

  // With the improved client selection logic, this function should only be called
  // with Anthropic models. If not, something went wrong with the client selection.
  if (!isCorrect) {
    throw new Error(
      `Anthropic client was called with an invalid model: ${adapter ? `${adapter}:${modelName}` : 'none specified'}. ` +
        `This is likely a bug in the client selection logic.`,
    );
  }

  try {
    await initializeAnthropicClient();

    // Get API key from environment variables
    const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

    let content: string;
    let cost: CostInfo | undefined;
    let structuredData: any = null;

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType, options);

    // Format the user prompt using the utility function
    const userPrompt = formatSingleFileReviewPrompt(
      promptTemplate,
      fileContent,
      filePath,
      projectDocs,
    );

    try {
      logger.info(`Generating review with Anthropic ${modelName}...`);

      // Get the API model name
      const apiModelName = await getApiModelName(modelName);

      // Make the API request (null check handled by validateApiKey)
      if (!apiKey) {
        throw new Error('Anthropic API key is missing');
      }

      const data = await makeAnthropicRequest(
        apiKey,
        apiModelName,
        STRUCTURED_REVIEW_SYSTEM_PROMPT,
        userPrompt,
      );

      if (data.content && data.content.length > 0) {
        content = data.content[0].text;
        logger.info(`Successfully generated review with Anthropic ${modelName}`);
      } else {
        throw new ApiError(`Invalid response format from Anthropic ${modelName}`);
      }

      // Calculate cost information
      try {
        cost = getCostInfoFromText(content, `anthropic:${modelName}`);
      } catch (error) {
        logger.warn(
          `Failed to calculate cost information: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      // Try to parse the response as JSON
      structuredData = parseJsonResponse(content);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error; // Already has context
      }
      throw new ApiError(
        `Failed to generate review with Anthropic ${modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // Return the review result
    return {
      content,
      cost,
      costInfo: cost, // Add costInfo property for consistent access
      modelUsed: `anthropic:${modelName}`,
      filePath,
      reviewType,
      timestamp: new Date().toISOString(),
      structuredData,
    };
  } catch (error) {
    logger.error(
      `Error generating review for ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );

    throw error;
  }
}

/**
 * Generate a consolidated review for multiple files
 * @param files Array of file information objects
 * @param projectName Name of the project
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateAnthropicConsolidatedReview(
  files: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions,
): Promise<ReviewResult> {
  const { isCorrect, adapter, modelName } = isAnthropicModel();

  // With the improved client selection logic, this function should only be called
  // with Anthropic models. If not, something went wrong with the client selection.
  if (!isCorrect) {
    throw new Error(
      `Anthropic client was called with an invalid model: ${adapter ? `${adapter}:${modelName}` : 'none specified'}. ` +
        `This is likely a bug in the client selection logic.`,
    );
  }

  try {
    await initializeAnthropicClient();

    // Get API key from environment variables
    const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

    let content: string;
    let cost: CostInfo | undefined;
    let structuredData: any = null;

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType, options);

    // Prepare file summaries for the consolidated review
    const fileInfos = files.map((file) => ({
      relativePath: file.relativePath,
      content:
        file.content.substring(0, 1000) + (file.content.length > 1000 ? '\n... (truncated)' : ''),
      sizeInBytes: file.content.length,
    }));

    // Format the user prompt using the utility function
    const userPrompt = formatConsolidatedReviewPrompt(
      promptTemplate,
      projectName,
      fileInfos,
      projectDocs,
    );

    try {
      logger.info(`Generating consolidated review with Anthropic ${modelName}...`);

      // Make the API request
      const apiModelName = await getApiModelName(modelName);

      // Ensure API key is present
      if (!apiKey) {
        throw new Error('Anthropic API key is missing');
      }

      const data = await makeAnthropicRequest(
        apiKey,
        apiModelName,
        STRUCTURED_REVIEW_SYSTEM_PROMPT,
        userPrompt,
      );

      if (data.content && data.content.length > 0) {
        content = data.content[0].text;
        logger.info(`Successfully generated review with Anthropic ${modelName}`);
      } else {
        throw new Error(`Invalid response format from Anthropic ${modelName}`);
      }

      // Calculate cost information
      try {
        cost = getCostInfoFromText(content, `anthropic:${modelName}`);
      } catch (error) {
        logger.warn(
          `Failed to calculate cost information: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      // Try to parse the response as JSON
      structuredData = parseJsonResponse(content);
    } catch (error) {
      throw new Error(
        `Failed to generate consolidated review with Anthropic ${modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // Return the review result
    return {
      content,
      cost,
      costInfo: cost, // Add costInfo property for consistent access
      modelUsed: `anthropic:${modelName}`,
      filePath: 'consolidated',
      reviewType,
      timestamp: new Date().toISOString(),
      structuredData,
    };
  } catch (error) {
    logger.error(
      `Error generating consolidated review: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    throw error;
  }
}
