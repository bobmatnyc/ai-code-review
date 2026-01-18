/**
 * @fileoverview Example of using AI Code Review as a library in web applications
 *
 * This example shows how to integrate AI Code Review into a web application,
 * such as the Next.js web dashboard.
 */

import {
  performCodeReview,
  testModelConnection,
  getAvailableModels,
  validateLibraryConfig,
  type ReviewRequest,
  type ReviewResult,
  type LibraryConfig
} from '../src/lib/index';

/**
 * Example: Basic code review for a web API endpoint
 */
export async function reviewCodeForAPI(
  target: string,
  userConfig: {
    model: string;
    reviewType: string;
    apiKey: string;
    provider: 'openrouter' | 'anthropic' | 'openai' | 'google';
  }
): Promise<ReviewResult> {

  // Build library configuration
  const config: LibraryConfig = {
    model: userConfig.model,
    reviewType: userConfig.reviewType,
    apiKeys: {
      [userConfig.provider]: userConfig.apiKey
    },
    outputFormat: 'json',
    includeTests: true,
    includeProjectDocs: false,
    debug: false
  };

  // Validate configuration
  const validation = validateLibraryConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  // Test model connection first
  const testResult = await testModelConnection(config.model);
  if (!testResult.success) {
    throw new Error(`Model connection failed: ${testResult.error}`);
  }

  // Perform the review
  const request: ReviewRequest = {
    target,
    config,
    options: {
      maxFiles: 100,
      maxTokens: 100000,
      onProgress: (progress) => {
        console.log(`Review progress: ${progress.stage} - ${progress.progress}%`);
      }
    }
  };

  return await performCodeReview(request);
}

/**
 * Example: GitHub PR review integration
 */
export async function reviewGitHubPR(
  repoPath: string,
  prNumber: number,
  config: LibraryConfig
): Promise<{
  success: boolean;
  review?: ReviewResult;
  error?: string;
}> {
  try {
    // In a real implementation, you would:
    // 1. Fetch PR diff from GitHub API
    // 2. Create temporary directory with changed files
    // 3. Run review on changed files only
    // 4. Format results for GitHub PR comments

    const result = await performCodeReview({
      target: repoPath,
      config: {
        ...config,
        reviewType: 'security', // Focus on security for PRs
        includeTests: false, // Skip tests for PR reviews
        consolidated: true, // Single consolidated review
      },
      options: {
        maxFiles: 50, // Limit for PR reviews
        additionalContext: `This is a review for PR #${prNumber}. Focus on the changes and potential issues.`
      }
    });

    return {
      success: true,
      review: result
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Example: Batch review for multiple repositories
 */
export async function batchReviewRepositories(
  repositories: Array<{
    path: string;
    name: string;
    config: LibraryConfig;
  }>
): Promise<Array<{
  repository: string;
  success: boolean;
  result?: ReviewResult;
  error?: string;
}>> {

  const results = [];

  for (const repo of repositories) {
    try {
      console.log(`Reviewing repository: ${repo.name}`);

      const result = await performCodeReview({
        target: repo.path,
        config: repo.config,
        options: {
          onProgress: (progress) => {
            console.log(`${repo.name}: ${progress.stage} - ${progress.progress}%`);
          }
        }
      });

      results.push({
        repository: repo.name,
        success: true,
        result
      });

    } catch (error) {
      results.push({
        repository: repo.name,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return results;
}

/**
 * Example: Model testing and selection
 */
export async function findBestModel(
  apiKeys: Record<string, string>
): Promise<{
  bestModel: string;
  testResults: Array<{
    model: string;
    success: boolean;
    responseTime?: number;
    error?: string;
  }>;
}> {

  const models = getAvailableModels();
  const testResults = [];
  let bestModel = '';
  let bestResponseTime = Infinity;

  for (const model of models) {
    // Check if we have the required API key
    const provider = model.provider.toLowerCase();
    const hasKey = apiKeys[provider] || apiKeys[provider.replace(' (via OpenRouter)', '')];

    if (!hasKey) {
      testResults.push({
        model: model.id,
        success: false,
        error: 'No API key available'
      });
      continue;
    }

    try {
      const startTime = Date.now();
      const result = await testModelConnection(model.id);
      const responseTime = Date.now() - startTime;

      testResults.push({
        model: model.id,
        success: result.success,
        responseTime,
        error: result.error
      });

      if (result.success && responseTime < bestResponseTime) {
        bestModel = model.id;
        bestResponseTime = responseTime;
      }

    } catch (error) {
      testResults.push({
        model: model.id,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    bestModel,
    testResults
  };
}

/**
 * Example: Custom review with specific focus
 */
export async function performCustomReview(
  target: string,
  focus: 'security' | 'performance' | 'maintainability',
  config: LibraryConfig
): Promise<ReviewResult> {

  // Customize configuration based on focus
  const customConfig: LibraryConfig = {
    ...config,
    reviewType: focus === 'security' ? 'security' :
                focus === 'performance' ? 'performance' :
                'architectural',
    includeTests: focus === 'maintainability',
    traceCode: focus === 'performance',
    consolidated: true
  };

  // Add custom context based on focus
  let additionalContext = '';
  switch (focus) {
    case 'security':
      additionalContext = 'Focus on security vulnerabilities, injection attacks, authentication issues, and data validation problems.';
      break;
    case 'performance':
      additionalContext = 'Focus on performance bottlenecks, inefficient algorithms, memory leaks, and optimization opportunities.';
      break;
    case 'maintainability':
      additionalContext = 'Focus on code organization, readability, documentation, test coverage, and maintainability issues.';
      break;
  }

  return await performCodeReview({
    target,
    config: customConfig,
    options: {
      additionalContext,
      maxFiles: 200,
      onProgress: (progress) => {
        console.log(`${focus} review: ${progress.message}`);
      }
    }
  });
}

// Export utility functions for web applications
export {
  getAvailableModels,
  testModelConnection,
  validateLibraryConfig
};
