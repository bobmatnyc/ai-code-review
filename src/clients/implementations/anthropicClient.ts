/**
 * @fileoverview Anthropic client implementation using the abstract client interface.
 *
 * This module implements the Anthropic client using the abstract client base class.
 * It provides functionality for interacting with Anthropic's Claude models for code reviews.
 */

import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../../types/review';
import logger from '../../utils/logger';
import type { ProjectDocs } from '../../utils/projectDocs';
import {
  AbstractClient,
  createStandardReviewResult,
  detectModelProvider,
  handleApiError,
  validateApiKey,
} from '../base';
// import { getLanguageFromExtension } from '../utils/languageDetection'; // Not used in this implementation
import {
  makeAnthropicRequest,
  // AnthropicResponse, // Not used in this implementation
  // MAX_TOKENS_PER_REQUEST // Not used in this implementation
} from '../utils/anthropicApiClient';
import {
  // parseJsonResponse, // Not used in this implementation
  testAnthropicApiAccess,
} from '../utils/anthropicModelHelpers';
import {
  formatConsolidatedReviewPrompt,
  formatSingleFileReviewPrompt,
} from '../utils/promptFormatter';
import { loadPromptTemplate } from '../utils/promptLoader';

/**
 * Anthropic client implementation
 */
export class AnthropicClient extends AbstractClient {
  protected apiKey = '';

  /**
   * Initialize with default values
   */
  constructor() {
    super();
    this.modelName = '';
    this.isInitialized = false;
    this.apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY || '';
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
    return detectModelProvider('anthropic', modelName);
  }

  /**
   * Get the provider name for this client
   * @returns The provider name
   */
  protected getProviderName(): string {
    return 'anthropic';
  }

  /**
   * Initialize the Anthropic client
   * @returns Promise resolving to a boolean indicating success
   */
  public async initialize(): Promise<boolean> {
    // If already initialized, return true
    if (this.isInitialized) {
      return true;
    }

    // Get model information
    const { isCorrect, modelName } = this.isModelSupported(process.env.AI_CODE_REVIEW_MODEL || '');

    // If this is not an Anthropic model, just return true without initializing
    if (!isCorrect) {
      return true;
    }

    // Set the model name
    this.modelName = modelName;

    // Validate the API key
    if (!validateApiKey('anthropic', 'AI_CODE_REVIEW_ANTHROPIC_API_KEY')) {
      process.exit(1);
    }

    try {
      logger.info(`Initializing Anthropic model: ${this.modelName}...`);

      // Test API access with the specified model
      const success = await testAnthropicApiAccess(this.apiKey, this.modelName);

      if (success) {
        this.isInitialized = true;
        logger.info(`Successfully initialized Anthropic model: ${this.modelName}`);
        return true;
      }

      logger.error(`Failed to initialize Anthropic model: ${this.modelName}`);
      return false;
    } catch (error) {
      logger.error(
        `Error initializing Anthropic model ${this.modelName}: ${
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
    // During consolidation, the model may have been overridden. We should check if we're already initialized
    // with a valid model rather than checking the current environment variable.
    if (!this.isInitialized || !this.modelName) {
      // If not initialized, check against the current environment variable
      const { isCorrect } = this.isModelSupported(process.env.AI_CODE_REVIEW_MODEL || '');

      // Make sure this is the correct client
      if (!isCorrect) {
        throw new Error(
          `Anthropic client was called with an invalid model. This is likely a bug in the client selection logic.`,
        );
      }
    }
    // If we're already initialized with a model, trust that initialization was correct

    try {
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

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
        logger.info(`Generating review with Anthropic ${this.modelName}...`);

        // Define a system prompt to guide the model's response
        const systemPrompt = `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.

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

        // Make the API request
        const response = await makeAnthropicRequest(
          this.apiKey,
          this.modelName,
          systemPrompt,
          prompt,
          0.2,
        );

        // Extract response content
        const content = response.content[0]?.text || '';

        if (!content) {
          throw new Error(`Empty response from Anthropic ${this.modelName}`);
        }

        logger.info(`Successfully generated review with Anthropic ${this.modelName}`);

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
          `Anthropic client was called with an invalid model. This is likely a bug in the client selection logic.`,
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
        logger.info(`Generating consolidated review with Anthropic ${this.modelName}...`);

        // Define a system prompt to guide the model's response
        const systemPrompt = `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.

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

        // Make the API request
        const response = await makeAnthropicRequest(
          this.apiKey,
          this.modelName,
          systemPrompt,
          prompt,
          0.2,
        );

        // Extract response content
        const content = response.content[0]?.text || '';

        if (!content) {
          throw new Error(`Empty response from Anthropic ${this.modelName}`);
        }

        logger.info(`Successfully generated consolidated review with Anthropic ${this.modelName}`);

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
    // For Anthropic, architectural reviews are handled by the consolidated review function
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
