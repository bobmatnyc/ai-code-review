/**
 * @fileoverview Unified API Client Interface
 *
 * This interface defines a unified contract that all API clients must implement.
 * It replaces the complex inheritance hierarchy and wrapper classes with a
 * simple, consistent interface that all providers can implement directly.
 */

import type { CostInfo, FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import type { StructuredReview } from '../types/structuredReview';
import type { ProjectDocs } from '../utils/projectDocs';

/**
 * Model support information returned by isModelSupported
 */
export interface ModelSupportInfo {
  /** Whether this client supports the given model */
  isSupported: boolean;
  /** The provider/adapter name (e.g., "openai", "anthropic", "gemini") */
  provider: string;
  /** The cleaned model name without provider prefix */
  modelName: string;
}

/**
 * Unified interface that all API clients must implement
 *
 * This interface provides a consistent contract for all AI providers,
 * eliminating the need for wrapper classes and complex inheritance.
 */
export interface IApiClient {
  /**
   * Check if this client supports the given model
   * @param modelName The full model name (potentially with provider prefix)
   * @returns Model support information
   */
  isModelSupported(modelName: string): ModelSupportInfo;

  /**
   * Initialize the client with the appropriate configuration
   * @param modelName Optional model name to initialize with
   * @returns Promise resolving to a boolean indicating success
   */
  initialize(modelName?: string): Promise<boolean>;

  /**
   * Check if the client is initialized and ready to use
   * @returns True if initialized, false otherwise
   */
  isInitialized(): boolean;

  /**
   * Generate a review for a single file
   * @param fileContent Content of the file to review
   * @param filePath Path to the file
   * @param reviewType Type of review to perform
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @returns Promise resolving to the review result
   */
  generateReview(
    fileContent: string,
    filePath: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult>;

  /**
   * Generate a consolidated review for multiple files
   * @param fileInfos Array of file information objects
   * @param projectName Name of the project
   * @param reviewType Type of review to perform
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @returns Promise resolving to the review result
   */
  generateConsolidatedReview(
    fileInfos: FileInfo[],
    projectName: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult>;

  /**
   * Generate an architectural review with optional diagram generation
   * @param fileInfos Array of file information objects
   * @param projectName Name of the project
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @returns Promise resolving to the review result
   */
  generateArchitecturalReview(
    fileInfos: FileInfo[],
    projectName: string,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult>;

  /**
   * Generate a structured review with specific format requirements
   * @param fileInfos Array of file information objects
   * @param projectName Name of the project
   * @param reviewType Type of review to perform
   * @param projectDocs Optional project documentation
   * @param options Review options
   * @returns Promise resolving to the structured review result
   */
  generateStructuredReview(
    fileInfos: FileInfo[],
    projectName: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<StructuredReview>;

  /**
   * Test the API connection and model availability
   * @param modelName Optional specific model to test
   * @returns Promise resolving to a boolean indicating if the test was successful
   */
  testConnection(modelName?: string): Promise<boolean>;

  /**
   * Get the provider name for this client
   * @returns The provider name (e.g., "openai", "anthropic", "gemini", "openrouter")
   */
  getProviderName(): string;

  /**
   * Get the current model name being used
   * @returns The model name
   */
  getModelName(): string;

  /**
   * Get cost information for the last operation
   * @returns Cost information or undefined if not available
   */
  getLastCostInfo(): CostInfo | undefined;

  /**
   * Estimate the cost for a given operation without executing it
   * @param fileInfos Array of file information objects
   * @param reviewType Type of review to perform
   * @param options Review options
   * @returns Promise resolving to estimated cost information
   */
  estimateCost(
    fileInfos: FileInfo[],
    reviewType: ReviewType,
    options?: ReviewOptions,
  ): Promise<CostInfo>;

  /**
   * Get the list of models supported by this client
   * @returns Array of supported model names
   */
  getSupportedModels(): string[];

  /**
   * Check if this client supports a specific model
   * @param modelName The model name to check
   * @returns True if the model is supported, false otherwise
   */
  supportsModel(modelName: string): boolean;

  /**
   * Get detailed model support information
   * @param modelName The model name to check
   * @returns Detailed support information
   */
  getModelSupportInfo(modelName: string): {
    supported: boolean;
    confidence: number;
    features: string[];
  };
}

/**
 * Base configuration interface for all API clients
 */
export interface ApiClientConfig {
  /** API key for the provider */
  apiKey: string;
  /** Model name to use */
  modelName: string;
  /** Provider name */
  provider: string;
  /** Optional base URL for custom endpoints */
  baseUrl?: string;
  /** Optional timeout in milliseconds */
  timeout?: number;
  /** Optional rate limiting configuration */
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

/**
 * Factory function type for creating API clients
 */
export type ApiClientFactory = (config: ApiClientConfig) => IApiClient;

/**
 * Registry of available API client factories
 */
export interface ApiClientRegistry {
  [provider: string]: ApiClientFactory;
}

/**
 * Error types that API clients can throw
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly code?: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class ModelNotSupportedError extends ApiClientError {
  constructor(modelName: string, provider: string) {
    super(
      `Model "${modelName}" is not supported by provider "${provider}"`,
      provider,
      'MODEL_NOT_SUPPORTED',
    );
    this.name = 'ModelNotSupportedError';
  }
}

export class InitializationError extends ApiClientError {
  constructor(provider: string, reason: string) {
    super(`Failed to initialize ${provider} client: ${reason}`, provider, 'INITIALIZATION_FAILED');
    this.name = 'InitializationError';
  }
}

export class RateLimitError extends ApiClientError {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for ${provider}${retryAfter ? `, retry after ${retryAfter}s` : ''}`,
      provider,
      'RATE_LIMIT_EXCEEDED',
      429,
    );
    this.name = 'RateLimitError';
  }
}

export class QuotaExceededError extends ApiClientError {
  constructor(provider: string) {
    super(`Quota exceeded for ${provider}`, provider, 'QUOTA_EXCEEDED', 429);
    this.name = 'QuotaExceededError';
  }
}

/**
 * Utility function to check if an error is an API client error
 * @param error The error to check
 * @returns True if the error is an ApiClientError
 */
export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

/**
 * Utility function to extract provider from model name
 * @param modelName The full model name (potentially with provider prefix)
 * @returns Object with provider and model name
 */
export function parseModelName(modelName: string): { provider: string; model: string } {
  const parts = modelName.split(':');
  if (parts.length === 2) {
    return { provider: parts[0], model: parts[1] };
  }

  // Try to detect provider from model name patterns
  const lowerModel = modelName.toLowerCase();
  if (
    lowerModel.startsWith('gpt-') ||
    lowerModel.startsWith('o1-') ||
    lowerModel.startsWith('o3-')
  ) {
    return { provider: 'openai', model: modelName };
  }
  if (lowerModel.startsWith('claude-')) {
    return { provider: 'anthropic', model: modelName };
  }
  if (lowerModel.startsWith('gemini-') || lowerModel.includes('gemini')) {
    return { provider: 'gemini', model: modelName };
  }

  // Default to openai if no provider detected
  return { provider: 'openai', model: modelName };
}
