/**
 * @fileoverview OpenAI client implementation using the abstract client interface.
 *
 * This module implements the OpenAI client using the abstract client base class.
 * It provides functionality for interacting with OpenAI's GPT models for code reviews.
 */

import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../../types/review';
import { extractPackageInfo } from '../../utils/dependencies/packageAnalyzer';
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
import { buildModelRequestParams } from '../utils/modelConfigRegistry';
// import { getLanguageFromExtension } from '../utils/languageDetection'; // Not used in this implementation
import { /* supportsToolCalling, */ getModelMapping } from '../utils/modelMaps'; // supportsToolCalling not used
import { openAIToolCallingHandler } from '../utils/openAIToolCallingHandler';
import {
  formatConsolidatedReviewPrompt,
  formatSingleFileReviewPrompt,
} from '../utils/promptFormatter';
import { loadPromptTemplate } from '../utils/promptLoader';
import { ALL_TOOLS } from '../utils/toolCalling';
import { executeToolCall } from '../utils/toolExecutor';

const MAX_TOKENS_PER_REQUEST = 4000;

/**
 * OpenAI client implementation
 */
export class OpenAIClient extends AbstractClient {
  protected apiKey: string | undefined;

  /**
   * Initialize with default values
   */
  constructor() {
    super();
    this.modelName = '';
    this.isInitialized = false;
    this.apiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;
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
    return detectModelProvider('openai', modelName);
  }

  /**
   * Get the provider name for this client
   * @returns The provider name
   */
  protected getProviderName(): string {
    return 'openai';
  }

  /**
   * Initialize the OpenAI client
   * @returns Promise resolving to a boolean indicating success
   */
  public async initialize(): Promise<boolean> {
    // If already initialized, return true
    if (this.isInitialized) {
      return true;
    }

    // Get model information
    const { isCorrect, modelName } = this.isModelSupported(process.env.AI_CODE_REVIEW_MODEL || '');

    // If this is not an OpenAI model, just return true without initializing
    if (!isCorrect) {
      return true;
    }

    // Set the model name
    this.modelName = modelName;

    // Validate the API key
    if (!validateApiKey('openai')) {
      process.exit(1);
    }

    try {
      logger.info(`Initializing OpenAI model: ${this.modelName}...`);

      // Mark as initialized
      this.isInitialized = true;
      logger.info(`Successfully initialized OpenAI model: ${this.modelName}`);
      return true;
    } catch (error) {
      logger.error(
        `Error initializing OpenAI model ${this.modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  /**
   * Get the API model name to use for requests
   * @returns The actual model name to use in API requests
   */
  private getApiModelName(): string {
    // Use the model name as configured in the model registry
    logger.debug(`[O3 DEBUG] getApiModelName returning: ${this.modelName}`);
    return this.modelName;
  }

  /**
   * Add model-specific parameters using the model configuration registry
   * @param requestBody The request body to modify
   * @returns The modified request body
   */
  private applyModelConfiguration(requestBody: Record<string, unknown>): Record<string, unknown> {
    // Use the model configuration registry to build proper parameters
    const fullModelName = this.getFullModelName();
    const configuredParams = buildModelRequestParams(
      fullModelName,
      requestBody,
      MAX_TOKENS_PER_REQUEST,
    );

    logger.debug(
      `[Model Config] Applied configuration for ${fullModelName}: ${JSON.stringify(configuredParams, null, 2)}`,
    );
    return configuredParams;
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
          `OpenAI client was called with an invalid model. This is likely a bug in the client selection logic.`,
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
      const prompt = formatSingleFileReviewPrompt(
        promptTemplate,
        fileContent,
        filePath,
        projectDocs,
      );

      try {
        logger.info(`Generating review with OpenAI ${this.modelName}...`);

        // Prepare the API request body
        const baseRequestBody: Record<string, unknown> = {
          model: this.getApiModelName(),
          messages: [
            {
              role: 'system',
              content: `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.
              
IMPORTANT: Your response MUST be in the following JSON format:

{
  "grade": "A/B/C/D/F grade with optional + or - suffix (e.g., B+)",
  "gradeCategories": {
    "functionality": "Letter grade (e.g., B+)",
    "codeQuality": "Letter grade (e.g., B)",
    "documentation": "Letter grade (e.g., B-)",
    "testing": "Letter grade (e.g., C)",
    "maintainability": "Letter grade (e.g., B+)",
    "security": "Letter grade (e.g., B)",
    "performance": "Letter grade (e.g., B+)"
  },
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

Ensure your response is valid JSON. Do not include any text outside the JSON structure. 

REMEMBER TO ALWAYS INCLUDE THE "grade" AND "gradeCategories" FIELDS, which provide an overall assessment of the code quality.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
        };

        // Apply model configuration
        const requestBody = this.applyModelConfiguration(baseRequestBody);

        // Make the API request
        const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        if (!Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
          throw new Error(`Invalid response format from OpenAI ${this.modelName}`);
        }

        const content = data.choices[0].message.content;
        logger.info(`Successfully generated review with OpenAI ${this.modelName}`);

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
    logger.debug(`[O3 DEBUG] generateConsolidatedReview called with model: ${this.modelName}`);

    // During consolidation, the model may have been overridden. We should check if we're already initialized
    // with a valid model rather than checking the current environment variable.
    if (!this.isInitialized || !this.modelName) {
      // If not initialized, check against the current environment variable
      const { isCorrect } = this.isModelSupported(process.env.AI_CODE_REVIEW_MODEL || '');

      // Make sure this is the correct client
      if (!isCorrect) {
        throw new Error(
          `OpenAI client was called with an invalid model. This is likely a bug in the client selection logic.`,
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
        logger.info(`Generating consolidated review with OpenAI ${this.modelName}...`);
        logger.debug(`[O3 DEBUG] About to prepare API request body`);

        // Prepare the API request body
        const baseRequestBody: Record<string, unknown> = {
          model: this.getApiModelName(),
          messages: [
            {
              role: 'system',
              content: `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.
              
IMPORTANT: Your response MUST be in the following JSON format:

{
  "grade": "A/B/C/D/F grade with optional + or - suffix (e.g., B+)",
  "gradeCategories": {
    "functionality": "Letter grade (e.g., B+)",
    "codeQuality": "Letter grade (e.g., B)",
    "documentation": "Letter grade (e.g., B-)",
    "testing": "Letter grade (e.g., C)",
    "maintainability": "Letter grade (e.g., B+)",
    "security": "Letter grade (e.g., B)",
    "performance": "Letter grade (e.g., B+)"
  },
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

Ensure your response is valid JSON. Do not include any text outside the JSON structure. 

REMEMBER TO ALWAYS INCLUDE THE "grade" AND "gradeCategories" FIELDS, which provide an overall assessment of the code quality.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.2,
        };

        // Apply model configuration
        const requestBody = this.applyModelConfiguration(baseRequestBody);

        // Make the API request
        const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        if (!Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
          throw new Error(`Invalid response format from OpenAI ${this.modelName}`);
        }

        const content = data.choices[0].message.content;
        logger.info(`Successfully generated consolidated review with OpenAI ${this.modelName}`);

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
        logger.error(
          `[O3 DEBUG] Error in generateConsolidatedReview: ${error instanceof Error ? error.message : String(error)}`,
        );
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
    // During consolidation, the model may have been overridden. We should check if we're already initialized
    // with a valid model rather than checking the current environment variable.
    if (!this.isInitialized || !this.modelName) {
      // If not initialized, check against the current environment variable
      const { isCorrect } = this.isModelSupported(process.env.AI_CODE_REVIEW_MODEL || '');

      // Make sure this is the correct client
      if (!isCorrect) {
        throw new Error(
          `OpenAI client was called with an invalid model. This is likely a bug in the client selection logic.`,
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
      const promptTemplate = await loadPromptTemplate('architectural', options);

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

      // Check if this model supports tool calling
      const modelInfo = getModelMapping(this.getFullModelName());
      const supportsToolsCalling = modelInfo?.supportsToolCalling || false;
      const serpApiConfigured = !!process.env.SERPAPI_KEY;

      try {
        logger.info(`Generating architectural review with OpenAI ${this.modelName}...`);

        let response;
        let content: string;

        // Check if we should use tool calling
        if (supportsToolsCalling && serpApiConfigured && options?.type === 'architectural') {
          // Always extract package information for architectural reviews
          const packageResults = await extractPackageInfo(process.cwd());

          // Include package information in the prompt
          const packageInfo =
            packageResults.length > 0
              ? `\n\n## Dependencies\nThe project uses the following dependencies:\n\n${packageResults
                  .map((result) => {
                    let pkgInfo = '';
                    if (result.npm && result.npm.length > 0) {
                      pkgInfo += `### NPM (JavaScript/TypeScript) Dependencies\n`;
                      result.npm.forEach((pkg) => {
                        pkgInfo += `- ${pkg.name}${pkg.version ? ` (${pkg.version})` : ''}${pkg.devDependency ? ' (dev)' : ''}\n`;
                      });
                    }
                    // Include other dependency types as needed
                    return pkgInfo;
                  })
                  .join('\n')}`
              : '';

          // Prepare the prompt with package information
          const promptWithPackages = prompt + packageInfo;

          // Prepare the tools
          const tools = openAIToolCallingHandler.prepareTools(ALL_TOOLS);

          // Prepare initial request body
          const baseInitialRequestBody: Record<string, any> = {
            model: this.getApiModelName(),
            messages: [
              {
                role: 'system',
                content: `You are an expert code reviewer specialized in architectural analysis. Your task is to analyze code architecture, identify issues, and provide recommendations. 
                
ESSENTIAL TASK: For ALL major dependencies in the project, you MUST use the available tools to thoroughly check for:
1. Security vulnerabilities and CVEs
2. Version updates and recommendations 
3. Compatibility issues and breaking changes
4. Deprecation warnings
5. Maintenance status

Always include a dedicated "Dependency Security Analysis" section in your review that summarizes the findings from your dependency security checks. This is a critical part of the architectural review.`,
              },
              {
                role: 'user',
                content: promptWithPackages,
              },
            ],
            tools,
            tool_choice: 'auto',
            temperature: 0.2,
          };

          // Apply model configuration
          const initialRequestBody = this.applyModelConfiguration(baseInitialRequestBody);

          // Make the initial request with tools
          response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(initialRequestBody),
          });

          const data = await response.json();

          // Check if there are tool calls
          const { toolCalls, responseMessage } =
            openAIToolCallingHandler.processToolCallsFromResponse(data);

          if (toolCalls.length > 0) {
            logger.info(`Found ${toolCalls.length} tool calls in the response`);

            // Execute the tool calls
            const toolResults = [];
            for (const toolCall of toolCalls) {
              const result = await executeToolCall(toolCall.name, toolCall.arguments);
              toolResults.push({
                toolName: toolCall.name,
                result,
              });
            }

            // Create the conversation with tool results
            const conversation = [
              {
                role: 'system',
                content: `You are an expert code reviewer specialized in architectural analysis. Your task is to analyze code architecture, identify issues, and provide recommendations.
                
ESSENTIAL TASK: Include a dedicated "Dependency Security Analysis" section in your review that summarizes the findings from the dependency security checks. This is a critical part of the architectural review.`,
              },
              {
                role: 'user',
                content: promptWithPackages,
              },
              {
                role: 'assistant',
                content: responseMessage || null,
                tool_calls: data.choices[0].message.tool_calls,
              },
            ];

            // Add the tool results
            const conversationWithResults = openAIToolCallingHandler.createToolResultsRequest(
              conversation,
              toolResults,
            );

            // Prepare final request body
            const baseFinalRequestBody: Record<string, any> = {
              model: this.getApiModelName(),
              messages: conversationWithResults,
              temperature: 0.2,
            };

            // Apply model configuration
            const finalRequestBody = this.applyModelConfiguration(baseFinalRequestBody);

            // Make the final request
            const finalResponse = await fetchWithRetry(
              'https://api.openai.com/v1/chat/completions',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify(finalRequestBody),
              },
            );

            const finalData = await finalResponse.json();
            if (!Array.isArray(finalData.choices) || !finalData.choices[0]?.message?.content) {
              throw new Error(`Invalid response format from OpenAI ${this.modelName}`);
            }

            content = finalData.choices[0].message.content;
          } else {
            // If no tool calls, use the original response
            if (!Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
              throw new Error(`Invalid response format from OpenAI ${this.modelName}`);
            }
            content = data.choices[0].message.content;
          }
        } else {
          // Regular non-tool calling flow
          // Prepare request body
          const baseRequestBody: Record<string, unknown> = {
            model: this.getApiModelName(),
            messages: [
              {
                role: 'system',
                content: `You are an expert code reviewer specialized in architectural analysis. Your task is to analyze code architecture, identify issues, and provide recommendations.`,
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.2,
          };

          // Apply model configuration
          const requestBody = this.applyModelConfiguration(baseRequestBody);

          response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(requestBody),
          });

          const data = await response.json();
          if (!Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
            throw new Error(`Invalid response format from OpenAI ${this.modelName}`);
          }
          content = data.choices[0].message.content;
        }

        logger.info(`Successfully generated architectural review with OpenAI ${this.modelName}`);

        // Create and return the review result
        return createStandardReviewResult(
          content,
          prompt,
          this.getFullModelName(),
          'architectural',
          'architectural',
          options,
        );
      } catch (error) {
        throw handleApiError(error, 'generate architectural review', this.getFullModelName());
      }
    } catch (error) {
      this.handleApiError(error, 'generating architectural review', projectName);
    }
  }
}
