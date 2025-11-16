/**
 * @fileoverview Library interface for AI Code Review
 *
 * This module exports the core functionality of AI Code Review as a library
 * that can be imported and used by other applications (like the web dashboard).
 *
 * The CLI tool remains purely CLI-focused, while this library interface
 * provides programmatic access to the code analysis functionality.
 */

export { performSemanticChunking } from '../analysis/semanticChunking';
// Analysis utilities
export { analyzeTokenUsage } from '../analysis/tokenAnalysis';
export type { AIClient } from '../clients/base/AIClient';
// AI clients
export { createAIClient } from '../clients/factory';
export type { ReviewOptions, ReviewResult } from '../core/reviewOrchestrator';
// Core review functionality
export { orchestrateReview } from '../core/reviewOrchestrator';
export { formatOutput } from '../formatters/factory';
// Plugin system
export { PluginManager } from '../plugins/PluginManager';
// Prompt management
export { PromptManager } from '../prompts/PromptManager';
export type { Config } from '../utils/config';
// Configuration management
export { getConfig, setConfig, validateConfigForSelectedModel } from '../utils/config';
// File processing
export { processFiles } from '../utils/fileProcessor';
export { getGitignorePatterns } from '../utils/gitignore';
// Utilities
export { detectFramework, detectLanguage } from '../utils/languageDetection';

// Types for external use
export interface LibraryConfig {
  // AI Configuration
  model?: string;
  writerModel?: string;
  apiKeys?: {
    google?: string;
    openrouter?: string;
    anthropic?: string;
    openai?: string;
  };

  // Review Configuration
  reviewType?: string;
  includeTests?: boolean;
  includeProjectDocs?: boolean;
  includeDependencyAnalysis?: boolean;
  consolidated?: boolean;
  traceCode?: boolean;

  // Output Configuration
  outputFormat?: string;
  outputDir?: string;

  // Behavior Configuration
  interactive?: boolean;
  autoFix?: boolean;
  debug?: boolean;
}

export interface ReviewRequest {
  // Target to review
  target: string;

  // Configuration
  config?: LibraryConfig;

  // Additional options
  options?: {
    // Override default file patterns
    includePatterns?: string[];
    excludePatterns?: string[];

    // Limit analysis scope
    maxFiles?: number;
    maxTokens?: number;

    // Custom context
    additionalContext?: string;

    // Callback for progress updates
    onProgress?: (progress: ReviewProgress) => void;
  };
}

export interface ReviewProgress {
  stage: 'analyzing' | 'chunking' | 'reviewing' | 'formatting' | 'complete';
  progress: number; // 0-100
  message: string;
  filesProcessed?: number;
  totalFiles?: number;
}

/**
 * Main library function for performing code reviews
 *
 * This is the primary entry point for external applications to use
 * AI Code Review functionality programmatically.
 */
export async function performCodeReview(request: ReviewRequest): Promise<ReviewResult> {
  const { target, config = {}, options = {} } = request;

  // Set up configuration
  if (config.apiKeys) {
    // Temporarily set API keys for this review
    const originalEnv = { ...process.env };

    if (config.apiKeys.google) {
      process.env.AI_CODE_REVIEW_GOOGLE_API_KEY = config.apiKeys.google;
    }
    if (config.apiKeys.openrouter) {
      process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY = config.apiKeys.openrouter;
    }
    if (config.apiKeys.anthropic) {
      process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY = config.apiKeys.anthropic;
    }
    if (config.apiKeys.openai) {
      process.env.AI_CODE_REVIEW_OPENAI_API_KEY = config.apiKeys.openai;
    }

    try {
      return await performReviewWithConfig(target, config, options);
    } finally {
      // Restore original environment
      process.env = originalEnv;
    }
  } else {
    return await performReviewWithConfig(target, config, options);
  }
}

/**
 * Internal function to perform review with configuration
 */
async function performReviewWithConfig(
  target: string,
  config: LibraryConfig,
  options: ReviewRequest['options'] = {},
): Promise<ReviewResult> {
  // Build review options
  const reviewOptions: ReviewOptions = {
    type: config.reviewType || 'quick-fixes',
    model: config.model,
    writerModel: config.writerModel,
    includeTests: config.includeTests ?? true,
    includeProjectDocs: config.includeProjectDocs ?? true,
    includeDependencyAnalysis: config.includeDependencyAnalysis ?? false,
    consolidated: config.consolidated ?? false,
    traceCode: config.traceCode ?? false,
    interactive: false, // Always false for library usage
    autoFix: config.autoFix ?? false,
    outputFormat: config.outputFormat || 'json',
    outputDir: config.outputDir,
    debug: config.debug ?? false,
    noConfirm: true, // Always true for library usage

    // Additional options
    includePatterns: options.includePatterns,
    excludePatterns: options.excludePatterns,
    maxFiles: options.maxFiles,
    maxTokens: options.maxTokens,
    additionalContext: options.additionalContext,
  };

  // Progress callback wrapper
  if (options.onProgress) {
    // TODO: Implement progress tracking in orchestrateReview
    // For now, just call with initial progress
    options.onProgress({
      stage: 'analyzing',
      progress: 0,
      message: 'Starting code review...',
    });
  }

  // Perform the review
  const result = await orchestrateReview(target, reviewOptions);

  // Final progress callback
  if (options.onProgress) {
    options.onProgress({
      stage: 'complete',
      progress: 100,
      message: 'Code review completed',
    });
  }

  return result;
}

/**
 * Test AI model connection
 */
export async function testModelConnection(model?: string): Promise<{
  success: boolean;
  model: string;
  error?: string;
}> {
  try {
    const config = getConfig();
    const testModel = model || config.selectedModel;

    const client = createAIClient(testModel);

    // Simple test prompt
    const _response = await client.generateResponse(
      'Respond with "OK" if you can read this message.',
      { maxTokens: 10 },
    );

    return {
      success: true,
      model: testModel,
    };
  } catch (error) {
    return {
      success: false,
      model: model || 'unknown',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get available models
 */
export function getAvailableModels(): Array<{
  id: string;
  name: string;
  provider: string;
  description?: string;
}> {
  // This would return the list of available models
  // For now, return a basic list
  return [
    {
      id: 'gemini:gemini-2.0-flash',
      name: 'Gemini 2.0 Flash',
      provider: 'Google',
      description: 'Fast and efficient model for code analysis',
    },
    {
      id: 'openrouter:anthropic/claude-3.5-sonnet',
      name: 'Claude 3.5 Sonnet',
      provider: 'Anthropic (via OpenRouter)',
      description: 'Excellent for code review and analysis',
    },
    {
      id: 'openrouter:openai/gpt-4o',
      name: 'GPT-4o',
      provider: 'OpenAI (via OpenRouter)',
      description: 'Advanced reasoning for complex code analysis',
    },
    // Add more models as needed
  ];
}

/**
 * Validate configuration
 */
export function validateLibraryConfig(config: LibraryConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check if at least one API key is provided
  if (!config.apiKeys || Object.keys(config.apiKeys).length === 0) {
    errors.push('At least one API key must be provided');
  }

  // Validate model format
  if (config.model && !config.model.includes(':')) {
    errors.push('Model must be in format "provider:model-name"');
  }

  // Validate review type
  const validReviewTypes = [
    'quick-fixes',
    'security',
    'performance',
    'architectural',
    'unused-code',
    'consolidated',
    'evaluation',
    'extract-patterns',
    'coding-test',
  ];

  if (config.reviewType && !validReviewTypes.includes(config.reviewType)) {
    errors.push(`Invalid review type. Must be one of: ${validReviewTypes.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
