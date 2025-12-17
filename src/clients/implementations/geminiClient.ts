/**
 * @fileoverview Gemini client implementation using the abstract client interface.
 *
 * This module implements the Gemini client using the abstract client base class.
 * It provides functionality for interacting with Google's Gemini models for code reviews.
 */

// import { getLanguageFromExtension } from '../utils/languageDetection'; // Not used in this implementation
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../../types/review';
import logger from '../../utils/logger';
import type { ProjectDocs } from '../../utils/projectDocs';
import { globalRateLimiter } from '../../utils/rateLimiter';
import {
  AbstractClient,
  createStandardReviewResult,
  detectModelProvider,
  handleApiError,
  validateApiKey,
  withRetry,
} from '../base';
import {
  formatConsolidatedReviewPrompt,
  formatSingleFileReviewPrompt,
} from '../utils/promptFormatter';
import { loadPromptTemplate } from '../utils/promptLoader';

/**
 * Default safety settings for Gemini API calls
 */
const DEFAULT_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const MAX_TOKENS_PER_REQUEST = 8192;

/**
 * Interface for custom model options
 */
interface CustomModel {
  name: string;
  displayName: string;
  useV1Beta?: boolean;
}

/**
 * Gemini client implementation
 */
export class GeminiClient extends AbstractClient {
  protected apiKey: string | undefined;
  protected genAI: GoogleGenerativeAI | null = null;
  protected customModel: CustomModel | null = null;

  /**
   * Initialize with default values
   */
  constructor() {
    super();
    this.modelName = '';
    this.isInitialized = false;
    this.apiKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;
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
    return detectModelProvider('gemini', modelName);
  }

  /**
   * Get the provider name for this client
   * @returns The provider name
   */
  protected getProviderName(): string {
    return 'gemini';
  }

  /**
   * Initialize the Gemini client
   * @returns Promise resolving to a boolean indicating success
   */
  public async initialize(): Promise<boolean> {
    // If already initialized, return true
    if (this.isInitialized) {
      return true;
    }

    // Get the selected model from config
    const { getConfig } = await import('../../utils/config');
    const config = getConfig();
    const selectedModel = config.selectedModel;

    // Get model information
    const { isCorrect, modelName } = this.isModelSupported(selectedModel);

    // If this is not a Gemini model, just return true without initializing
    if (!isCorrect) {
      return true;
    }

    // Set the model name
    this.modelName = modelName;

    // Validate the API key
    if (!validateApiKey('gemini', 'AI_CODE_REVIEW_GOOGLE_API_KEY')) {
      process.exit(1);
    }

    try {
      // Get the proper API identifier from the model map
      const { getModelMapping } = await import('../utils/modelMaps');
      const modelMapping = getModelMapping(selectedModel);

      // Use the API identifier from the mapping
      const apiModelName = modelMapping?.apiIdentifier || this.modelName;
      const useV1Beta = modelMapping?.useV1Beta || false;

      logger.info(`Initializing Gemini model: ${this.modelName} (API: ${apiModelName})...`);

      // Initialize the Google Generative AI client
      this.genAI = new GoogleGenerativeAI(this.apiKey || '');

      // Set the custom model information with the proper API identifier
      this.customModel = {
        name: apiModelName, // Use the actual API identifier
        displayName: this.modelName,
        useV1Beta: useV1Beta,
      };

      // Mark as initialized
      this.isInitialized = true;
      logger.info(
        `Successfully initialized Gemini model: ${this.modelName} (API: ${apiModelName})`,
      );
      return true;
    } catch (error) {
      logger.error(
        `Error initializing Gemini model ${this.modelName}: ${
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
    // No need for additional validation - the client factory already ensures we're the right client

    try {
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Apply rate limiting
      await globalRateLimiter.acquire();

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
        logger.info(`Generating review with Gemini ${this.modelName}...`);

        // Generate the response
        const response = await this.generateGeminiResponse(prompt, options);

        logger.info(`Successfully generated review with Gemini ${this.modelName}`);

        // Create and return the review result
        return createStandardReviewResult(
          response,
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
    // No need for additional validation - the client factory already ensures we're the right client

    try {
      // Initialize if needed
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Apply rate limiting
      await globalRateLimiter.acquire();

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
        logger.info(`Generating consolidated review with Gemini ${this.modelName}...`);

        // Generate the response
        const response = await this.generateGeminiResponse(prompt, options);

        logger.info(`Successfully generated consolidated review with Gemini ${this.modelName}`);

        // Create and return the review result
        return createStandardReviewResult(
          response,
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
    // For Gemini, architectural reviews are handled by the consolidated review function
    // with the review type set to 'architectural'
    return this.generateConsolidatedReview(
      files,
      projectName,
      'architectural',
      projectDocs,
      options,
    );
  }

  /**
   * Build the output instruction prefix based on mode
   * @param isInteractiveMode Whether interactive mode is enabled
   * @returns The output instruction string
   */
  private buildOutputInstructions(isInteractiveMode: boolean): string {
    if (isInteractiveMode) {
      return this.getJsonOutputInstructions();
    }
    return this.getMarkdownOutputInstructions();
  }

  /**
   * Get JSON output instructions for interactive mode
   * @returns JSON format instructions
   */
  private getJsonOutputInstructions(): string {
    return `
You are a helpful AI assistant that provides code reviews. Focus on providing actionable feedback. Do not repeat the instructions in your response.

CRITICAL INSTRUCTION: Your response MUST be valid JSON that follows the exact schema below.
DO NOT include any text, markdown, or explanations outside of this JSON structure.
DO NOT use markdown code blocks. Return ONLY the raw JSON object.

IMPORTANT: DO NOT include comments in your JSON response. In the schema below, comments are shown for explanation, but your output must be valid JSON without comments.

The response must validate against this schema:
{
  "review": {
    "version": "1.0",
    "timestamp": "2024-05-15T12:00:00Z",
    "files": [
      {
        "filePath": "path/to/file.ts",
        "issues": [
          {
            "id": "ISSUE-1",
            "priority": "HIGH",
            "description": "A clear description of the issue",
            "location": {
              "startLine": 10,
              "endLine": 15
            },
            "currentCode": "function example() {\\n  // Problematic code here\\n}",
            "suggestedCode": "function example() {\\n  // Improved code here\\n}",
            "explanation": "Detailed explanation of why this change is recommended"
          }
        ]
      }
    ],
    "summary": {
      "highPriorityIssues": 1,
      "mediumPriorityIssues": 2,
      "lowPriorityIssues": 3,
      "totalIssues": 6
    }
  }
}

Guidelines for filling the schema:
1. Each issue must have a unique ID (e.g., "ISSUE-1", "ISSUE-2")
2. Priority must be exactly one of: "HIGH", "MEDIUM", "LOW" - use uppercase only
3. Location should include the start and end line numbers of the affected code
4. Current code should be the exact code snippet that needs to be changed
5. Suggested code should be the improved version of the code
6. Explanation should provide a detailed rationale for the suggested change
7. The summary should accurately count the number of issues by priority
8. Ensure counts are accurate - totalIssues should equal the sum of all priority counts
9. For string fields, ensure all quotes and backslashes are properly escaped
10. For code snippets, use double backslashes for newlines (\\n) and escape any quotes or backslashes

CRITICAL: YOUR OUTPUT MUST BE VALID JSON WITH NO TEXT OUTSIDE THE JSON STRUCTURE.
DO NOT USE COMMENTS IN YOUR FINAL JSON.
DO NOT USE MARKDOWN CODE BLOCKS.
DO NOT START WITH TRIPLE BACKTICKS OR END WITH TRIPLE BACKTICKS.
DO NOT EXPLAIN OR DESCRIBE YOUR RESPONSE.
`;
  }

  /**
   * Get Markdown output instructions for standard mode
   * @returns Markdown format instructions
   */
  private getMarkdownOutputInstructions(): string {
    return `
You are a helpful AI assistant that provides code reviews. Focus on providing actionable feedback. Do not repeat the instructions in your response.

IMPORTANT: Format your response as a well-structured Markdown document with the following sections:

# Code Review

## Summary
A brief summary of the code review.

## Issues

### High Priority
For each high priority issue:
- Issue title
- File path and line numbers
- Description of the issue
- Code snippet (if relevant)
- Suggested fix
- Impact of the issue

### Medium Priority
(Same format as high priority)

### Low Priority
(Same format as high priority)

## General Recommendations
- List of general recommendations

## Positive Aspects
- List of positive aspects of the code

Ensure your response is well-formatted Markdown with proper headings, bullet points, and code blocks.
`;
  }

  /**
   * Extract JSON from text response using multiple strategies
   * @param text The text to extract JSON from
   * @returns The extracted JSON string
   * @throws Error if JSON cannot be extracted
   */
  private extractJsonFromResponse(text: string): string {
    const trimmedText = text.trim();

    // Check if already valid JSON
    if (trimmedText.startsWith('{') && trimmedText.endsWith('}')) {
      return trimmedText;
    }

    logger.warn(
      'Response from Gemini is not properly formatted as JSON. Attempting to extract JSON...',
    );

    // Strategy 1: Extract JSON using regex
    const extractedJson = trimmedText.match(/({[\s\S]*})/);
    if (extractedJson) {
      return extractedJson[1];
    }

    // Strategy 2: Handle language identifiers before JSON
    const languageMatch = trimmedText.match(
      /^(?:typescript|javascript|json|ts|js)\s*\n?\s*({[\s\S]*})$/i,
    );
    if (languageMatch) {
      logger.info('Found JSON after language identifier, extracting...');
      return languageMatch[1];
    }

    // Strategy 3: Extract from code blocks
    const codeBlockMatch = trimmedText.match(/```(?:json|typescript|javascript)?\s*([^`]+)\s*```/i);
    if (codeBlockMatch) {
      const blockContent = codeBlockMatch[1].trim();
      const cleanContent = blockContent.replace(/^(?:typescript|javascript|json|ts|js)\s*\n?/i, '');
      if (cleanContent.startsWith('{')) {
        logger.info('Found JSON in code block, extracting...');
        return cleanContent;
      }
    }

    // Strategy 4: Remove prefix before first brace
    const braceIndex = trimmedText.indexOf('{');
    if (braceIndex > 0) {
      const jsonCandidate = trimmedText.substring(braceIndex);
      try {
        JSON.parse(jsonCandidate);
        logger.info('Successfully extracted JSON by removing prefix content');
        return jsonCandidate;
      } catch (_parseError) {
        // Continue to error
      }
    }

    logger.error('Failed to extract JSON from Gemini response');
    throw new Error('Gemini API returned a response that is not valid JSON');
  }

  /**
   * Validate and process JSON response for interactive mode
   * @param text The response text to validate
   * @returns The validated/extracted JSON string
   */
  private processInteractiveResponse(text: string): string {
    try {
      return this.extractJsonFromResponse(text);
    } catch (error) {
      logger.error('Error validating JSON response:', error);
      throw new Error('Gemini API returned a response that is not valid JSON');
    }
  }

  /**
   * Execute the API call to generate content
   * @param model The Gemini model instance
   * @param prompt The formatted prompt
   * @param isInteractiveMode Whether interactive mode is enabled
   * @returns Promise resolving to the API response text
   */
  private async executeGeminiCall(
    model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
    prompt: string,
    isInteractiveMode: boolean,
  ): Promise<string> {
    const temperature = isInteractiveMode ? 0.1 : 0.2;

    const result = await withRetry(() =>
      model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: MAX_TOKENS_PER_REQUEST,
        },
      }),
    );

    return result.response.text();
  }

  /**
   * Generate a response from the Gemini API
   * @param prompt The prompt to send to the API
   * @param options Review options
   * @returns Promise resolving to the response text
   */
  private async generateGeminiResponse(prompt: string, options?: ReviewOptions): Promise<string> {
    if (!this.genAI || !this.customModel) {
      throw new Error('Gemini client not initialized');
    }

    try {
      // Create model instance
      // Note: API versioning is handled internally by the SDK based on model name
      const model = this.genAI.getGenerativeModel({
        model: this.customModel.name,
        safetySettings: DEFAULT_SAFETY_SETTINGS,
      });

      // Determine mode and build prompt
      const isInteractiveMode = options?.interactive === true;
      const outputInstructions = this.buildOutputInstructions(isInteractiveMode);
      const modifiedPrompt = `${outputInstructions}\n\n${prompt}`;

      // Execute API call
      const text = await this.executeGeminiCall(model, modifiedPrompt, isInteractiveMode);

      // Process response based on mode
      if (isInteractiveMode) {
        return this.processInteractiveResponse(text);
      }

      return text;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
      }
      throw new Error(`Unknown Gemini API error: ${String(error)}`);
    }
  }
}
