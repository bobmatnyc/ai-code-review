/**
 * @fileoverview Base API Client Implementation
 *
 * This class provides common functionality for all API clients,
 * implementing the IApiClient interface with shared logic that
 * can be reused across different providers.
 */

import type { CostInfo, FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import type {
  GradeLevel,
  IssuePriority,
  ReviewIssue,
  StructuredReview,
} from '../types/structuredReview';
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
import type { ApiClientConfig, IApiClient, ModelSupportInfo } from './IApiClient';
import { ApiClientError, InitializationError, parseModelName } from './IApiClient';

/**
 * Base implementation of the IApiClient interface
 *
 * This class provides common functionality that can be shared across
 * all API client implementations, reducing code duplication and
 * ensuring consistent behavior.
 */
export abstract class BaseApiClient implements IApiClient {
  protected config: ApiClientConfig;
  protected initialized = false;
  protected lastCostInfo?: CostInfo;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  /**
   * Check if this client supports the given model
   * Subclasses should override this method to provide provider-specific logic
   */
  abstract isModelSupported(modelName: string): ModelSupportInfo;

  /**
   * Initialize the client with the appropriate configuration
   * Subclasses should override this method to provide provider-specific initialization
   */
  async initialize(modelName?: string): Promise<boolean> {
    try {
      if (modelName) {
        this.config.modelName = modelName;
      }

      // Validate configuration
      this.validateConfig();

      // Perform provider-specific initialization
      await this.performInitialization();

      this.initialized = true;
      logger.debug(`${this.getProviderName()} client initialized successfully`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to initialize ${this.getProviderName()} client: ${errorMessage}`);
      throw new InitializationError(this.getProviderName(), errorMessage);
    }
  }

  /**
   * Check if the client is initialized and ready to use
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Generate a review for a single file
   * Subclasses should override this method to provide provider-specific implementation
   */
  abstract generateReview(
    fileContent: string,
    filePath: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult>;

  /**
   * Generate a consolidated review for multiple files
   * Subclasses should override this method to provide provider-specific implementation
   */
  abstract generateConsolidatedReview(
    fileInfos: FileInfo[],
    projectName: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult>;

  /**
   * Generate an architectural review with optional diagram generation
   * Default implementation delegates to generateConsolidatedReview
   */
  async generateArchitecturalReview(
    fileInfos: FileInfo[],
    projectName: string,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult> {
    // Default implementation - subclasses can override for specialized behavior
    return this.generateConsolidatedReview(
      fileInfos,
      projectName,
      'architectural',
      projectDocs,
      options,
    );
  }

  /**
   * Generate a structured review with specific format requirements
   * Default implementation converts ReviewResult to StructuredReview
   */
  async generateStructuredReview(
    fileInfos: FileInfo[],
    projectName: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<StructuredReview> {
    const result = await this.generateConsolidatedReview(
      fileInfos,
      projectName,
      reviewType,
      projectDocs,
      options,
    );

    // Convert ReviewResult to StructuredReview
    return this.convertToStructuredReview(result);
  }

  /**
   * Test the API connection and model availability
   * Subclasses should override this method to provide provider-specific testing
   */
  async testConnection(modelName?: string): Promise<boolean> {
    try {
      if (!this.initialized) {
        await this.initialize(modelName);
      }

      // Perform a simple test request
      return await this.performConnectionTest();
    } catch (error) {
      logger.debug(`Connection test failed for ${this.getProviderName()}: ${error}`);
      return false;
    }
  }

  /**
   * Get the provider name for this client
   */
  getProviderName(): string {
    return this.config.provider;
  }

  /**
   * Get the current model name being used
   */
  getModelName(): string {
    return this.config.modelName;
  }

  /**
   * Get cost information for the last operation
   */
  getLastCostInfo(): CostInfo | undefined {
    return this.lastCostInfo;
  }

  /**
   * Estimate the cost for a given operation without executing it
   * Default implementation returns a basic estimate
   */
  async estimateCost(
    fileInfos: FileInfo[],
    reviewType: ReviewType,
    options?: ReviewOptions,
  ): Promise<CostInfo> {
    // Calculate total content length
    const totalContent = fileInfos.reduce((sum, file) => sum + file.content.length, 0);

    // Basic estimation - subclasses should override for more accurate estimates
    const estimatedInputTokens = Math.ceil(totalContent / 4); // Rough estimate: 4 chars per token
    const estimatedOutputTokens = Math.ceil(estimatedInputTokens * 0.1); // Assume 10% output ratio

    const cost = this.calculateCost(estimatedInputTokens, estimatedOutputTokens);
    return {
      inputTokens: estimatedInputTokens,
      outputTokens: estimatedOutputTokens,
      totalTokens: estimatedInputTokens + estimatedOutputTokens,
      estimatedCost: cost,
      cost, // Alias for backward compatibility
      formattedCost: `$${cost.toFixed(6)} USD`,
    };
  }

  /**
   * Validate the client configuration
   * @throws Error if configuration is invalid
   */
  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error('API key is required');
    }
    if (!this.config.modelName) {
      throw new Error('Model name is required');
    }
    if (!this.config.provider) {
      throw new Error('Provider name is required');
    }
  }

  /**
   * Perform provider-specific initialization
   * Subclasses should override this method
   */
  protected abstract performInitialization(): Promise<void>;

  /**
   * Perform a connection test
   * Subclasses should override this method
   */
  protected abstract performConnectionTest(): Promise<boolean>;

  /**
   * Calculate cost based on token usage
   * Subclasses should override this method with provider-specific pricing
   */
  protected calculateCost(inputTokens: number, outputTokens: number): number {
    // Default pricing - subclasses should override
    const inputCostPer1K = 0.001; // $0.001 per 1K input tokens
    const outputCostPer1K = 0.002; // $0.002 per 1K output tokens

    return (inputTokens / 1000) * inputCostPer1K + (outputTokens / 1000) * outputCostPer1K;
  }

  /**
   * Convert ReviewResult to StructuredReview
   */
  protected convertToStructuredReview(result: ReviewResult): StructuredReview {
    return {
      summary: this.extractSummary(result.content),
      issues: this.extractIssues(result.content),
      recommendations: this.extractRecommendations(result.content),
      grade: this.extractGrade(result.content),
    };
  }

  /**
   * Extract summary from review content
   */
  protected extractSummary(content: string): string {
    const summaryMatch = content.match(/## (?:Executive )?Summary\s*\n([\s\S]*?)(?=\n## |$)/i);
    return summaryMatch ? summaryMatch[1].trim() : 'No summary available';
  }

  /**
   * Extract issues from review content
   */
  protected extractIssues(content: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];

    // Extract high priority issues
    const highPriorityMatch = content.match(
      /## (?:Critical|High Priority) Issues?\s*\n([\s\S]*?)(?=\n## |$)/i,
    );
    if (highPriorityMatch) {
      const highIssues = this.parseIssueList(highPriorityMatch[1], 'high');
      issues.push(...highIssues);
    }

    // Extract medium priority issues
    const mediumPriorityMatch = content.match(
      /## (?:Important|Medium Priority) Issues?\s*\n([\s\S]*?)(?=\n## |$)/i,
    );
    if (mediumPriorityMatch) {
      const mediumIssues = this.parseIssueList(mediumPriorityMatch[1], 'medium');
      issues.push(...mediumIssues);
    }

    // Extract low priority issues
    const lowPriorityMatch = content.match(
      /## (?:Minor|Low Priority) Issues?\s*\n([\s\S]*?)(?=\n## |$)/i,
    );
    if (lowPriorityMatch) {
      const lowIssues = this.parseIssueList(lowPriorityMatch[1], 'low');
      issues.push(...lowIssues);
    }

    return issues;
  }

  /**
   * Parse issue list from content
   */
  protected parseIssueList(content: string, severity: string): ReviewIssue[] {
    const issues: ReviewIssue[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const description = trimmed.substring(2).trim();
        if (description) {
          issues.push({
            title: description.split(':')[0] || description,
            description,
            priority: severity as IssuePriority,
            type: 'other',
            filePath: 'unknown',
          });
        }
      }
    }

    return issues;
  }

  /**
   * Extract recommendations from review content
   */
  protected extractRecommendations(content: string): string[] {
    const recommendationsMatch = content.match(/## Recommendations?\s*\n([\s\S]*?)(?=\n## |$)/i);
    if (!recommendationsMatch) return [];

    const recommendations: string[] = [];
    const lines = recommendationsMatch[1].split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed)) {
        const recommendation = trimmed.replace(/^[-*\d.]\s*/, '').trim();
        if (recommendation) {
          recommendations.push(recommendation);
        }
      }
    }

    return recommendations;
  }

  /**
   * Extract grade from review content
   */
  protected extractGrade(content: string): GradeLevel | undefined {
    const gradeMatch = content.match(/(?:Overall )?Grade:?\s*([A-F][+-]?)/i);
    if (gradeMatch) {
      const grade = gradeMatch[1].toUpperCase();
      // Validate that it's a valid GradeLevel
      if (/^[A-F][+-]?$/.test(grade)) {
        return grade as GradeLevel;
      }
    }
    return undefined;
  }

  /**
   * Handle API errors consistently
   */
  protected handleApiError(error: unknown, operation: string, context?: string): never {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullMessage = context
      ? `${operation} for ${context}: ${errorMessage}`
      : `${operation}: ${errorMessage}`;

    logger.error(fullMessage);

    if (error instanceof ApiClientError) {
      throw error;
    }

    throw new ApiClientError(fullMessage, this.getProviderName());
  }

  /**
   * Get the list of models supported by this client
   * @returns Array of supported model names
   */
  abstract getSupportedModels(): string[];

  /**
   * Check if this client supports a specific model
   * @param modelName The model name to check
   * @returns True if the model is supported, false otherwise
   */
  supportsModel(modelName: string): boolean {
    return this.getSupportedModels().includes(modelName);
  }

  /**
   * Get detailed model support information
   * @param modelName The model name to check
   * @returns Detailed support information
   */
  getModelSupportInfo(modelName: string): {
    supported: boolean;
    confidence: number;
    features: string[];
  } {
    const supported = this.supportsModel(modelName);
    return {
      supported,
      confidence: supported ? 1.0 : 0,
      features: supported ? ['text-generation', 'code-review'] : [],
    };
  }
}
