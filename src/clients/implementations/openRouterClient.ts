/**
 * @fileoverview OpenRouter client implementation using the abstract client interface.
 *
 * This module implements the OpenRouter client using the abstract client base class.
 * It provides functionality for interacting with OpenRouter's API, which gives access
 * to a variety of AI models from different providers.
 */

import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../../types/review';
import logger from '../../utils/logger';
import type { ProjectDocs } from '../../utils/projectDocs';
import {
  AbstractClient,
  createStandardReviewResult,
  detectModelProvider,
  fetchWithRetry,
  handleApiError,
  validateApiKey,
} from '../base';
import {
  formatConsolidatedReviewPrompt,
  formatSingleFileReviewPrompt,
} from '../utils/promptFormatter';
import { loadPromptTemplate } from '../utils/promptLoader';

// import { getLanguageFromExtension } from '../utils/languageDetection'; // Not used in this implementation

const MAX_TOKENS_PER_REQUEST = 4000;

/**
 * OpenRouter client implementation
 */
export class OpenRouterClient extends AbstractClient {
  protected apiKey: string | undefined;

  /**
   * Initialize with default values
   */
  constructor() {
    super();
    this.modelName = '';
    this.isInitialized = false;
    this.apiKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY;
  }

  /**
   * Check if the provided model name is supported by this client
   * @param modelName The full model name (potentially with provider prefix)
   * @returns Object indicating if this is the correct client for the model
   */
  public isModelSupported(modelName: string): {
    isCorrect: boolean;
    adapter: string;
    modelName: string;
  } {
    return detectModelProvider('openrouter', modelName);
  }

  /**
   * Get the provider name for this client
   * @returns The provider name
   */
  protected getProviderName(): string {
    return 'openrouter';
  }

  /**
   * Initialize the OpenRouter client
   * @returns Promise resolving to a boolean indicating success
   */
  public async initialize(): Promise<boolean> {
    // If already initialized, return true
    if (this.isInitialized) {
      return true;
    }

    // Get model information - clean the model name to handle malformed input
    const rawModel = process.env.AI_CODE_REVIEW_MODEL || '';
    const cleanedModel = rawModel.replace(/['"``]/g, '').trim();
    const { isCorrect, modelName } = this.isModelSupported(cleanedModel);

    // If this is not an OpenRouter model, just return true without initializing
    if (!isCorrect) {
      return true;
    }

    // Set the model name
    this.modelName = modelName;

    // Validate the API key
    if (!validateApiKey('openrouter', 'AI_CODE_REVIEW_OPENROUTER_API_KEY')) {
      process.exit(1);
    }

    try {
      logger.info(`Initializing OpenRouter model: ${this.modelName}...`);

      // Mark as initialized
      this.isInitialized = true;
      logger.info(`Successfully initialized OpenRouter model: ${this.modelName}`);
      return true;
    } catch (error) {
      logger.error(
        `Error initializing OpenRouter model ${this.modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  /**
   * Generate a review for a single file
   * @param fileContent Content of the file to review
   * @param filePath Path to the file
   * @param reviewType Type of review to perform
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @returns Promise resolving to the review result
   */
  public async generateReview(
    fileContent: string,
    filePath: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult> {
    // During consolidation, the model may have been overridden.
    // If we're already initialized with a valid model, trust that initialization was correct.
    // Only check the environment if we're not initialized.
    if (!this.isInitialized) {
      // If not initialized, check against the current environment variable
      const rawModel = process.env.AI_CODE_REVIEW_MODEL || '';
      // Clean the model name to handle malformed input (quotes, backticks, whitespace)
      const currentModel = rawModel.replace(/['"``]/g, '').trim();
      const { isCorrect } = this.isModelSupported(currentModel);

      // Make sure this is the correct client
      if (!isCorrect) {
        logger.error(
          `[OpenRouter] Invalid model for OpenRouter client: ${currentModel} (original: ${rawModel})`,
        );
        throw new Error(
          `OpenRouter client was called with an invalid model: ${currentModel}. This is likely a bug in the client selection logic.`,
        );
      }

      // Initialize if this is the correct client
      await this.initialize();
    }

    // At this point we should be initialized with a valid model
    if (!this.modelName) {
      logger.error(`[OpenRouter] Client is initialized but has no model name`);
      throw new Error(`OpenRouter client is in an invalid state: initialized but no model name`);
    }

    try {
      // Get the language from file extension
      // const language = getLanguageFromExtension(filePath); // Currently unused

      // Load the appropriate prompt template
      const promptTemplate = await loadPromptTemplate(reviewType, options);

      // Format the prompt
      const prompt = formatSingleFileReviewPrompt(
        promptTemplate,
        fileContent,
        filePath,
        projectDocs,
      );

      try {
        logger.info(`Generating review with OpenRouter ${this.modelName}...`);

        // Make the API request
        const response = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://ai-code-review.app', // Required by OpenRouter
            'X-Title': 'AI Code Review', // Optional for OpenRouter stats
          },
          body: JSON.stringify({
            model: this.modelName,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.2,
            // For consolidation, don't limit tokens to avoid truncation
            ...(options?.isConsolidation ? {} : { max_tokens: MAX_TOKENS_PER_REQUEST }),
          }),
        });

        const data = await response.json();
        if (!Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
          throw new Error(`Invalid response format from OpenRouter ${this.modelName}`);
        }

        const content = data.choices[0].message.content;

        // Check for truncated response
        const usage = data.usage;
        if (usage && usage.completion_tokens < 50) {
          logger.warn(
            `Response appears truncated - only ${usage.completion_tokens} output tokens generated. ` +
              `This may indicate an API issue with model ${this.modelName}.`,
          );

          // If response is truncated and appears to be incomplete JSON
          if (content.trim().startsWith('{') && !content.includes('}')) {
            const errorMessage =
              `The AI model response was truncated and incomplete. ` +
              `Only ${usage.completion_tokens} tokens were generated instead of the expected response. ` +
              `This is likely an issue with the OpenRouter API or the ${this.modelName} model. ` +
              `Please try again or use a different model.`;

            logger.error(`Truncated response detected: ${content.substring(0, 100)}...`);
            throw new Error(errorMessage);
          }
        }

        // Log response details for debugging
        if (usage) {
          logger.debug(
            `OpenRouter response stats - Input tokens: ${usage.prompt_tokens}, ` +
              `Output tokens: ${usage.completion_tokens}, Total: ${usage.total_tokens}`,
          );
        }

        logger.info(`Successfully generated review with OpenRouter ${this.modelName}`);

        // Create and return the review result
        return createStandardReviewResult(
          content,
          prompt,
          this.getFullModelName(),
          filePath,
          reviewType,
          options,
        );
      } catch (error) {
        throw handleApiError(error, 'generate review', this.getFullModelName());
      }
    } catch (error) {
      this.handleApiError(error, 'generating review', filePath);
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
  public async generateConsolidatedReview(
    files: FileInfo[],
    projectName: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult> {
    // During consolidation, the model may have been overridden. We should check if we're already initialized
    // with a valid model rather than checking the current environment variable.
    if (!this.isInitialized || !this.modelName) {
      // If not initialized, check against the current environment variable
      const { isCorrect } = this.isModelSupported(process.env.AI_CODE_REVIEW_MODEL || '');

      // Make sure this is the correct client
      if (!isCorrect) {
        throw new Error(
          `OpenRouter client was called with an invalid model. This is likely a bug in the client selection logic.`,
        );
      }
    }
    // If we're already initialized with a model, trust that initialization was correct

    try {
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Load the appropriate prompt template
      const promptTemplate = await loadPromptTemplate(reviewType, options);

      // Format the prompt
      const prompt = formatConsolidatedReviewPrompt(
        promptTemplate,
        projectName,
        files.map((file) => ({
          relativePath: file.relativePath || '',
          content: file.content,
          sizeInBytes: file.content.length,
        })),
        projectDocs,
      );

      try {
        logger.info(`Generating consolidated review with OpenRouter ${this.modelName}...`);

        // Make the API request
        const response = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://ai-code-review.app', // Required by OpenRouter
            'X-Title': 'AI Code Review', // Optional for OpenRouter stats
          },
          body: JSON.stringify({
            model: this.modelName,
            messages: [
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.2,
            // For consolidated reviews, don't limit tokens to avoid truncation
            // max_tokens is omitted to allow unlimited output
          }),
        });

        const data = await response.json();
        if (!Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
          throw new Error(`Invalid response format from OpenRouter ${this.modelName}`);
        }

        const content = data.choices[0].message.content;

        // Check for truncated response
        const usage = data.usage;
        if (usage && usage.completion_tokens < 50) {
          logger.warn(
            `Response appears truncated - only ${usage.completion_tokens} output tokens generated. ` +
              `This may indicate an API issue with model ${this.modelName}.`,
          );

          // If response is truncated and appears to be incomplete JSON
          if (content.trim().startsWith('{') && !content.includes('}')) {
            const errorMessage =
              `The AI model response was truncated and incomplete. ` +
              `Only ${usage.completion_tokens} tokens were generated instead of the expected response. ` +
              `This is likely an issue with the OpenRouter API or the ${this.modelName} model. ` +
              `Please try again or use a different model.`;

            logger.error(`Truncated response detected: ${content.substring(0, 100)}...`);
            throw new Error(errorMessage);
          }
        }

        // Log response details for debugging
        if (usage) {
          logger.debug(
            `OpenRouter response stats - Input tokens: ${usage.prompt_tokens}, ` +
              `Output tokens: ${usage.completion_tokens}, Total: ${usage.total_tokens}`,
          );
        }

        logger.info(`Successfully generated consolidated review with OpenRouter ${this.modelName}`);

        // Create and return the review result
        return createStandardReviewResult(
          content,
          prompt,
          this.getFullModelName(),
          'consolidated',
          reviewType,
          options,
        );
      } catch (error) {
        throw handleApiError(error, 'generate consolidated review', this.getFullModelName());
      }
    } catch (error) {
      this.handleApiError(error, 'generating consolidated review', projectName);
    }
  }

  /**
   * Generate an architectural review for a project
   * @param files Array of file information objects
   * @param projectName Name of the project
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @returns Promise resolving to the review result
   */
  public async generateArchitecturalReview(
    files: FileInfo[],
    projectName: string,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult> {
    // For OpenRouter, architectural reviews are handled by the consolidated review function
    // with the review type set to 'architectural'
    return this.generateConsolidatedReview(
      files,
      projectName,
      'architectural',
      projectDocs,
      options,
    );
  }
}
