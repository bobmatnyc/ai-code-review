/**
 * @fileoverview Abstract base client for interacting with various AI APIs.
 *
 * This module defines an abstract base class that encapsulates common functionality
 * across different AI client implementations (OpenAI, Anthropic, Google, etc.).
 * It provides a unified interface for model detection, initialization, review generation,
 * and other shared operations.
 */

import type {
  CostInfo,
  FileInfo,
  ReviewOptions,
  ReviewResult,
  ReviewType,
} from '../../types/review';
import type { StructuredReview } from '../../types/structuredReview';
import logger from '../../utils/logger';
import type { ProjectDocs } from '../../utils/projectDocs';

/**
 * Abstract base class for AI model clients
 */
export abstract class AbstractClient {
  protected modelName = '';
  protected isInitialized = false;

  /**
   * Check if the client is initialized
   * @returns True if initialized, false otherwise
   */
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if the provided model name is supported by this client
   * @param modelName The full model name (potentially with provider prefix)
   * @returns Object indicating if this is the correct client for the model, and parsed model info
   */
  public abstract isModelSupported(modelName: string): {
    isCorrect: boolean;
    adapter: string;
    modelName: string;
  };

  /**
   * Initialize the client with the appropriate configuration
   * @returns Promise resolving to a boolean indicating success
   */
  public abstract initialize(): Promise<boolean>;

  /**
   * Generate a review for a single file
   * @param fileContent Content of the file to review
   * @param filePath Path to the file
   * @param reviewType Type of review to perform
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @returns Promise resolving to the review result
   */
  public abstract generateReview(
    fileContent: string,
    filePath: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult>;

  /**
   * Generate a consolidated review for multiple files
   * @param files Array of file information objects
   * @param projectName Name of the project
   * @param reviewType Type of review to perform
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @returns Promise resolving to the review result
   */
  public abstract generateConsolidatedReview(
    files: FileInfo[],
    projectName: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult>;

  /**
   * Generate an architectural review for a project
   * @param files Array of file information objects
   * @param projectName Name of the project
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @returns Promise resolving to the review result
   */
  public abstract generateArchitecturalReview(
    files: FileInfo[],
    projectName: string,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult>;

  /**
   * Process the response and extract structured data if possible
   * @param content The response content to process
   * @returns The processed structured data or null
   */
  protected processResponseForStructuredData(content: string): unknown | null {
    try {
      // First, check if the response is wrapped in a code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;

      // Check if the content is valid JSON
      const structuredData = JSON.parse(jsonContent);

      // Validate that it has the expected structure
      if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
        logger.warn('Response is valid JSON but does not have the expected structure');
      }

      return structuredData;
    } catch (parseError) {
      logger.warn(
        `Response is not valid JSON: ${
          parseError instanceof Error ? parseError.message : String(parseError)
        }`,
      );
      // Return null for non-JSON content
      return null;
    }
  }

  /**
   * Create a standard review result object
   * @param content The review content
   * @param filePath The file path or identifier
   * @param reviewType The type of review
   * @param cost Optional cost information
   * @returns The standardized review result object
   */
  protected createReviewResult(
    content: string,
    filePath: string,
    reviewType: ReviewType,
    cost?: CostInfo,
  ): ReviewResult {
    const structuredData = this.processResponseForStructuredData(content);

    return {
      content,
      cost,
      modelUsed: this.getFullModelName(),
      filePath,
      reviewType,
      timestamp: new Date().toISOString(),
      structuredData: structuredData as StructuredReview | undefined,
    };
  }

  /**
   * Get the full model name including provider prefix
   * @returns The full model name
   */
  protected getFullModelName(): string {
    const modelParts = this.modelName.split(':');
    if (modelParts.length === 2) {
      return this.modelName; // Already has provider prefix
    }
    return `${this.getProviderName()}:${this.modelName}`;
  }

  /**
   * Get the provider name for this client
   * @returns The provider name (e.g., "openai", "anthropic", "gemini")
   */
  protected abstract getProviderName(): string;

  /**
   * Handle common error cases in API interactions
   * @param error The error that occurred
   * @param operation The operation that was being performed
   * @param filePath The file path or identifier related to the error
   * @throws The processed error
   */
  protected handleApiError(error: unknown, operation: string, filePath: string): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error ${operation} for ${filePath}: ${errorMessage}`);
    throw error;
  }
}
