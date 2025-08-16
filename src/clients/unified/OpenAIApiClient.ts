/**
 * @fileoverview Unified OpenAI API Client
 * 
 * This client implements the IApiClient interface for OpenAI's GPT models,
 * providing a clean, consistent interface without wrapper classes.
 */

import type {
  FileInfo,
  ReviewOptions,
  ReviewResult,
  ReviewType,
} from '../../types/review';
import logger from '../../utils/logger';
import type { ProjectDocs } from '../../utils/projectDocs';
import { BaseApiClient } from '../BaseApiClient';
import type { ApiClientConfig, ModelSupportInfo } from '../IApiClient';
import { ApiClientError } from '../IApiClient';

/**
 * OpenAI API client implementing the unified IApiClient interface
 */
export class OpenAIApiClient extends BaseApiClient {
  private openai: any; // OpenAI SDK instance

  constructor(config: ApiClientConfig) {
    super(config);
  }

  /**
   * Check if this client supports the given model
   */
  isModelSupported(modelName: string): ModelSupportInfo {
    const cleanedModel = modelName.replace(/['"``]/g, '').trim();
    const parts = cleanedModel.split(':');
    
    let provider = '';
    let model = '';
    
    if (parts.length === 2) {
      provider = parts[0].toLowerCase();
      model = parts[1];
    } else {
      model = cleanedModel;
      // Detect if this looks like an OpenAI model
      if (this.isOpenAIModel(model)) {
        provider = 'openai';
      }
    }

    const isSupported = provider === 'openai' || this.isOpenAIModel(model);
    
    return {
      isSupported,
      provider: isSupported ? 'openai' : provider,
      modelName: model,
    };
  }

  /**
   * Perform provider-specific initialization
   */
  protected async performInitialization(): Promise<void> {
    try {
      // Dynamically import OpenAI SDK
      let OpenAI: any;
      try {
        // Use eval to avoid TypeScript compile-time resolution
        const importOpenAI = new Function('return import("openai")');
        const openaiModule = await importOpenAI();
        OpenAI = openaiModule.OpenAI || openaiModule.default;

        if (!OpenAI) {
          throw new Error('OpenAI class not found in openai module');
        }
      } catch (importError) {
        throw new Error('OpenAI SDK not installed. Please run: npm install openai');
      }

      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl,
        timeout: this.config.timeout || 30000,
      });

      logger.debug('OpenAI client initialized successfully');
    } catch (error) {
      throw new Error(`Failed to initialize OpenAI SDK: ${error}`);
    }
  }

  /**
   * Perform a connection test
   */
  protected async performConnectionTest(): Promise<boolean> {
    try {
      // Test with a simple completion request
      const response = await this.openai.chat.completions.create({
        model: this.config.modelName,
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5,
        temperature: 0,
      });

      return !!response.choices?.[0]?.message?.content;
    } catch (error) {
      logger.debug(`OpenAI connection test failed: ${error}`);
      return false;
    }
  }

  /**
   * Generate a review for a single file
   */
  async generateReview(
    fileContent: string,
    filePath: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult> {
    if (!this.initialized) {
      throw new ApiClientError('Client not initialized', 'openai');
    }

    try {
      const prompt = this.buildSingleFilePrompt(fileContent, filePath, reviewType, projectDocs, options);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.modelName,
        messages: [
          { role: 'system', content: this.getSystemPrompt(reviewType) },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 4000,
      });

      const content = response.choices?.[0]?.message?.content || '';
      
      // Calculate cost information
      const costInfo = this.calculateCostFromUsage(response.usage);
      this.lastCostInfo = costInfo;

      return {
        content,
        filePath,
        reviewType,
        timestamp: new Date().toISOString(),
        modelUsed: this.config.modelName,
        costInfo,
        files: [{ path: filePath, relativePath: filePath, content: fileContent }],
      };

    } catch (error) {
      this.handleApiError(error, 'generating single file review', filePath);
    }
  }

  /**
   * Generate a consolidated review for multiple files
   */
  async generateConsolidatedReview(
    fileInfos: FileInfo[],
    projectName: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): Promise<ReviewResult> {
    if (!this.initialized) {
      throw new ApiClientError('Client not initialized', 'openai');
    }

    try {
      const prompt = this.buildConsolidatedPrompt(fileInfos, projectName, reviewType, projectDocs, options);
      
      const response = await this.openai.chat.completions.create({
        model: this.config.modelName,
        messages: [
          { role: 'system', content: this.getSystemPrompt(reviewType) },
          { role: 'user', content: prompt },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      });

      const content = response.choices?.[0]?.message?.content || '';
      
      // Calculate cost information
      const costInfo = this.calculateCostFromUsage(response.usage);
      this.lastCostInfo = costInfo;

      return {
        content,
        filePath: projectName,
        reviewType,
        timestamp: new Date().toISOString(),
        modelUsed: this.config.modelName,
        costInfo,
        files: fileInfos,
        projectName,
      };

    } catch (error) {
      this.handleApiError(error, 'generating consolidated review', projectName);
    }
  }

  /**
   * Calculate cost based on token usage
   */
  protected calculateCost(inputTokens: number, outputTokens: number): number {
    // OpenAI pricing (approximate, should be updated with current rates)
    const modelPricing: Record<string, { input: number; output: number }> = {
      'gpt-4': { input: 0.03, output: 0.06 }, // per 1K tokens
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
      'o1-preview': { input: 0.015, output: 0.06 },
      'o1-mini': { input: 0.003, output: 0.012 },
    };

    const pricing = modelPricing[this.config.modelName] || modelPricing['gpt-4'];
    return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
  }

  /**
   * Calculate cost from OpenAI usage object
   */
  private calculateCostFromUsage(usage: any): any {
    if (!usage) {
      return undefined;
    }

    const inputTokens = usage.prompt_tokens || 0;
    const outputTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || inputTokens + outputTokens;
    const estimatedCost = this.calculateCost(inputTokens, outputTokens);

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      estimatedCost,
      cost: estimatedCost, // Alias for backward compatibility
      formattedCost: `$${estimatedCost.toFixed(6)} USD`,
    };
  }

  /**
   * Check if a model name looks like an OpenAI model
   */
  private isOpenAIModel(modelName: string): boolean {
    const openaiPatterns = [
      /^gpt-/i,
      /^o1-/i,
      /^o3-/i,
      /^text-/i,
      /^davinci/i,
      /^curie/i,
      /^babbage/i,
      /^ada/i,
    ];

    return openaiPatterns.some(pattern => pattern.test(modelName));
  }

  /**
   * Get system prompt for the review type
   */
  private getSystemPrompt(reviewType: ReviewType): string {
    const basePrompt = 'You are an expert code reviewer. Analyze the provided code and provide detailed, actionable feedback.';
    
    const typeSpecificPrompts: Record<ReviewType, string> = {
      'quick-fixes': `${basePrompt} Focus on identifying bugs, syntax errors, and quick improvements.`,
      'architectural': `${basePrompt} Focus on code architecture, design patterns, and structural improvements.`,
      'security': `${basePrompt} Focus on security vulnerabilities, potential exploits, and security best practices.`,
      'performance': `${basePrompt} Focus on performance optimizations, efficiency improvements, and resource usage.`,
      'unused-code': `${basePrompt} Focus on identifying unused code, dead code, and unnecessary dependencies.`,
      'focused-unused-code': `${basePrompt} Focus specifically on unused imports, variables, and functions.`,
      'code-tracing-unused-code': `${basePrompt} Trace code execution paths to identify truly unused code.`,
      'consolidated': `${basePrompt} Provide a comprehensive review covering all aspects of code quality.`,
      'best-practices': `${basePrompt} Focus on coding best practices, conventions, and maintainability.`,
      'evaluation': `${basePrompt} Provide a detailed evaluation with grades and scoring.`,
      'extract-patterns': `${basePrompt} Identify and extract common patterns, anti-patterns, and design decisions.`,
      'coding-test': `${basePrompt} Evaluate as a coding test submission with detailed scoring.`,
      'ai-integration': `${basePrompt} Focus on AI/LLM integration patterns, prompt engineering, and AI safety.`,
      'cloud-native': `${basePrompt} Focus on cloud-native architecture, Kubernetes, and scalability patterns.`,
      'developer-experience': `${basePrompt} Focus on developer productivity, tooling, and workflow optimization.`,
    };

    return typeSpecificPrompts[reviewType] || basePrompt;
  }

  /**
   * Build prompt for single file review
   */
  private buildSingleFilePrompt(
    fileContent: string,
    filePath: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): string {
    let prompt = `Please review the following ${filePath} file:\n\n`;
    
    if (projectDocs?.readme) {
      prompt += `Project Context:\n${projectDocs.readme}\n\n`;
    }

    prompt += `File: ${filePath}\n\`\`\`\n${fileContent}\n\`\`\`\n\n`;
    prompt += `Please provide a detailed ${reviewType} review of this file.`;

    return prompt;
  }

  /**
   * Build prompt for consolidated review
   */
  private buildConsolidatedPrompt(
    fileInfos: FileInfo[],
    projectName: string,
    reviewType: ReviewType,
    projectDocs?: ProjectDocs | null,
    options?: ReviewOptions,
  ): string {
    let prompt = `Please review the following ${projectName} project:\n\n`;
    
    if (projectDocs?.readme) {
      prompt += `Project Context:\n${projectDocs.readme}\n\n`;
    }

    prompt += 'Files to review:\n\n';
    
    for (const file of fileInfos) {
      prompt += `File: ${file.relativePath || file.path}\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
    }

    prompt += `Please provide a comprehensive ${reviewType} review of this project.`;

    return prompt;
  }

  /**
   * Get the provider name for this client
   * @returns The provider name
   */
  getProviderName(): string {
    return 'openai';
  }

  /**
   * Get the list of models supported by this client
   * @returns Array of supported model names
   */
  getSupportedModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-0125-preview',
      'gpt-4-1106-preview',
      'gpt-4-vision-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-1106',
      'gpt-3.5-turbo-0125',
      'gpt-4o',
      'gpt-4o-mini',
      'o1-preview',
      'o1-mini',
    ];
  }
}
