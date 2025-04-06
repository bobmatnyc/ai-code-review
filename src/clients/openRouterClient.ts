/**
 * @fileoverview Client for interacting with the OpenRouter API.
 *
 * This module provides a client for interacting with OpenRouter's AI models.
 * It handles API key management, request formatting, response processing,
 * rate limiting, error handling, and cost estimation for code reviews.
 *
 * Key features:
 * - Support for various OpenRouter models
 * - Streaming and non-streaming responses
 * - Robust error handling and rate limit management
 * - Mock response generation for testing without an API key
 * - Cost estimation for API usage
 * - Support for different review types
 */

import fetch from 'node-fetch';
import { globalRateLimiter } from '../utils/rateLimiter';
import { ReviewType, ReviewResult, FileInfo, ReviewCost, ReviewOptions } from '../types/review';
import { StreamHandler } from '../utils/streamHandler';
import { getCostInfo } from '../utils/tokenCounter';
import { ProjectDocs, formatProjectDocs } from '../utils/projectDocs';

// Get the preferred model from environment variables
const selectedModel = process.env.AI_CODE_REVIEW_MODEL || process.env.CODE_REVIEW_MODEL || 'gemini:gemini-1.5-pro';
const [adapter, modelName] = selectedModel.includes(':') ? selectedModel.split(':') : ['gemini', selectedModel];
const preferredModel = adapter === 'openrouter' ? modelName : 'anthropic/claude-3-opus';

// Default OpenRouter models to try in order of preference
const DEFAULT_OPENROUTER_MODELS = [
  // First try the user's preferred model
  `openrouter-${preferredModel}`,
  // Fallback models if the preferred one doesn't work
  'openrouter-anthropic/claude-3-opus',
  'openrouter-anthropic/claude-3-sonnet',
  'openrouter-openai/gpt-4-turbo',
  'openrouter-openai/gpt-4o',
  'openrouter-anthropic/claude-2.1',
  'openrouter-google/gemini-pro'
];

// Track if we've initialized a model successfully
let modelInitialized = false;
let currentModel: string | null = null;
let useMockResponses = false;

// Get API key from environment variables
const apiKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY || process.env.CODE_REVIEW_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

/**
 * Get the language name from a file extension
 * @param extension File extension
 * @returns Language name
 */
function getLanguageFromExtension(extension: string): string {
  const extensionMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    go: 'go',
    rs: 'rust',
    php: 'php',
    cs: 'csharp',
    cpp: 'cpp',
    c: 'c',
    h: 'c',
    hpp: 'cpp',
    swift: 'swift',
    kt: 'kotlin',
    md: 'markdown',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sql: 'sql'
  };

  return extensionMap[extension.toLowerCase()] || extension;
}

/**
 * Initialize the OpenRouter client with the specified model
 * @param modelName Name of the model to use
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
async function initializeOpenRouterModel(modelName: string): Promise<boolean> {
  if (!apiKey) {
    console.warn('No OpenRouter API key found. Will use mock responses.');
    useMockResponses = true;
    return false;
  }

  try {
    console.log(`Trying to initialize ${modelName}...`);

    // Extract the actual model name from the openrouter- prefix
    const actualModelName = modelName.startsWith('openrouter-')
      ? modelName.substring('openrouter-'.length)
      : modelName;

    // Make a simple test request to verify the model works
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
        'X-Title': 'AI Code Review Tool'
      },
      body: JSON.stringify({
        model: actualModelName,
        messages: [
          { role: 'user', content: 'Hello, are you available for a code review task?' }
        ],
        max_tokens: 50,
        temperature: 0.2,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error initializing ${modelName}:`, errorData);
      return false;
    }

    const data = await response.json() as any;
    if (data.choices && data.choices.length > 0) {
      console.log(`Successfully initialized ${modelName}`);
      currentModel = modelName;
      modelInitialized = true;
      return true;
    }

    console.error(`Unexpected response format from ${modelName}`);
    return false;
  } catch (error) {
    console.error(`Error initializing ${modelName}:`, error);
    return false;
  }
}

/**
 * Try to initialize any available OpenRouter model
 * @param preferredModels Array of model names to try in order of preference
 * @returns Promise resolving to a boolean indicating if any model was initialized
 */
export async function initializeAnyOpenRouterModel(
  preferredModels: string[] = DEFAULT_OPENROUTER_MODELS
): Promise<boolean> {
  // If we've already initialized a model, return true
  if (modelInitialized && currentModel) {
    return true;
  }

  // If no API key is available, use mock responses
  if (!apiKey) {
    console.warn('No OpenRouter API key found. Will use mock responses.');
    console.warn('Please add one of the following to your .env.local file:');
    console.warn('- AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here');
    console.warn('- CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here (legacy)');
    console.warn('- OPENROUTER_API_KEY=your_openrouter_api_key_here (legacy)');
    useMockResponses = true;
    return false;
  }

  // Try each model in order until one works
  for (const model of preferredModels) {
    const success = await initializeOpenRouterModel(model);
    if (success) {
      return true;
    }
  }

  console.error('Failed to initialize any OpenRouter model. Using mock responses.');
  useMockResponses = true;
  return false;
}

/**
 * Generate a mock response for testing
 * @param reviewType Type of review to perform
 * @param filePath Path to the file being reviewed
 * @returns Mock review content
 */
async function generateMockResponse(
  reviewType: ReviewType,
  filePath: string
): Promise<string> {
  const fileExtension = filePath.split('.').pop() || '';
  const language = getLanguageFromExtension(fileExtension);

  return `# Mock ${reviewType.toUpperCase()} Review for ${filePath} (OpenRouter)

This is a mock review generated for testing purposes since no OpenRouter API key was provided.

## Summary

This file appears to be a ${language} file. In a real review, this would contain detailed feedback based on the review type.

## Recommendations

1. Add proper documentation
2. Ensure consistent code style
3. Follow best practices for ${language}

*This is a mock response. To get real reviews, please set AI_CODE_REVIEW_OPENROUTER_API_KEY environment variable in your .env.local file.*`;
}

/**
 * Generate a code review using the OpenRouter API
 * @param fileContent Content of the file to review
 * @param filePath Path to the file
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenRouterReview(
  fileContent: string,
  filePath: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Initialize a model if we haven't already
    if (!modelInitialized && !useMockResponses) {
      await initializeAnyOpenRouterModel();
    }

    // Get file extension and language
    const fileExtension = filePath.split('.').pop() || '';
    const language = getLanguageFromExtension(fileExtension);

    let content: string;
    let cost: ReviewCost | undefined;
    let isMock = false;

    if (useMockResponses) {
      // Generate mock response for testing
      content = await generateMockResponse(reviewType, filePath);
      // Add a note that this is a mock response
      content = `> **Note**: This is a mock response because no OpenRouter API key was provided.\n\n${content}`;
      isMock = true;

      // Add mock cost information for testing
      cost = {
        inputTokens: 1250,
        outputTokens: 750,
        totalTokens: 2000,
        estimatedCost: 0.000625,
        formattedCost: '$0.000625 USD'
      };
    } else {
      // Format the code block with language
      const codeBlock = `\`\`\`${language}
${fileContent}
\`\`\``;

      // Format project documentation if available
      const projectContext = projectDocs ? formatProjectDocs(projectDocs) : '';

      // Prepare the system prompt based on review type
      let systemPrompt = '';
      switch (reviewType) {
        case 'architectural':
          systemPrompt = `You are a senior software architect specializing in code architecture review. Analyze the code for architectural patterns, component organization, and overall structure.`;
          break;
        case 'security':
          systemPrompt = `You are a security expert specializing in code security review. Analyze the code for security vulnerabilities, potential exploits, and security best practices.`;
          break;
        case 'performance':
          systemPrompt = `You are a performance optimization expert. Analyze the code for performance bottlenecks, inefficient algorithms, and optimization opportunities.`;
          break;
        case 'quick-fixes':
        default:
          systemPrompt = `You are a senior software developer specializing in code review. Analyze the code for bugs, code smells, and quick improvements.`;
          break;
      }

      // Prepare the user prompt
      const userPrompt = `
I need a ${reviewType} review of the following code file: ${filePath}

${projectContext ? `\n## Project Context\n${projectContext}\n` : ''}

## Code to Review
${codeBlock}

Please provide a detailed review focusing on ${reviewType} aspects. Organize your review with:

1. A brief summary of the code
2. High priority issues (critical bugs, security vulnerabilities, major architectural problems)
3. Medium priority issues (code smells, potential bugs, performance concerns)
4. Low priority issues (style improvements, minor optimizations)

For each issue, include:
- Clear description of the problem
- Code snippets showing the issue
- Suggested fixes with code examples
- Explanation of why the fix is important

Format your response in Markdown.
`;

      // Use rate limiter to avoid hitting API limits
      await globalRateLimiter.acquire();

      try {
        // Extract the actual model name from the openrouter- prefix
        const actualModelName = currentModel && currentModel.startsWith('openrouter-')
          ? currentModel.substring('openrouter-'.length)
          : (currentModel || DEFAULT_OPENROUTER_MODELS[0].substring('openrouter-'.length));

        // Make the API request
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
            'X-Title': 'AI Code Review Tool'
          },
          body: JSON.stringify({
            model: actualModelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            stream: false
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json() as any;

        // Extract the response content
        content = data.choices[0].message.content;

        // Calculate cost information
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const totalTokens = data.usage?.total_tokens || 0;

        // Estimate cost (this is approximate and depends on the model)
        const estimatedCost = getCostInfo(promptTokens, completionTokens, actualModelName);
        cost = {
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          totalTokens: totalTokens,
          estimatedCost: estimatedCost.cost,
          formattedCost: estimatedCost.formattedCost
        };

        // Add model information to the content
        content += `\n\n*Generated by Code Review Tool using OpenRouter (${actualModelName})*`;
      } finally {
        // Release the rate limiter
        globalRateLimiter.release();
      }
    }

    // Return the review result
    return {
      content,
      filePath,
      reviewType,
      timestamp: new Date().toISOString(),
      cost,
      isMock,
      modelUsed: currentModel ? currentModel.replace('openrouter-', 'openrouter:') : undefined
    };
  } catch (error) {
    console.error('Error generating review with OpenRouter:', error);
    throw error;
  }
}

/**
 * Generate a consolidated review for multiple files using OpenRouter
 * @param files Array of file information
 * @param projectName Name of the project
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenRouterConsolidatedReview(
  files: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Initialize a model if we haven't already
    if (!modelInitialized && !useMockResponses) {
      await initializeAnyOpenRouterModel();
    }

    let content: string;
    let cost: ReviewCost | undefined;
    let isMock = false;

    if (useMockResponses) {
      // Generate mock response for testing
      content = `# Mock ${reviewType.toUpperCase()} Consolidated Review for ${projectName} (OpenRouter)

This is a mock consolidated review generated for testing purposes since no OpenRouter API key was provided.

## Files Reviewed
${files.map(file => `- ${file.relativePath}`).join('\n')}

## Summary

This is a mock review of ${files.length} files. In a real review, this would contain detailed feedback based on the review type.

## Recommendations

1. Add proper documentation
2. Ensure consistent code style
3. Follow best practices for the project

*This is a mock response. To get real reviews, please set AI_CODE_REVIEW_OPENROUTER_API_KEY environment variable in your .env.local file.*`;

      // Add a note that this is a mock response
      content = `> **Note**: This is a mock response because no OpenRouter API key was provided.\n\n${content}`;
      isMock = true;

      // Add mock cost information for testing
      cost = {
        inputTokens: 2500,
        outputTokens: 1500,
        totalTokens: 4000,
        estimatedCost: 0.00125,
        formattedCost: '$0.00125 USD'
      };
    } else {
      // Format project documentation if available
      const projectContext = projectDocs ? formatProjectDocs(projectDocs) : '';

      // Prepare the system prompt based on review type
      let systemPrompt = '';
      switch (reviewType) {
        case 'architectural':
          systemPrompt = `You are a senior software architect specializing in code architecture review. Analyze the code for architectural patterns, component organization, and overall structure.`;
          break;
        case 'security':
          systemPrompt = `You are a security expert specializing in code security review. Analyze the code for security vulnerabilities, potential exploits, and security best practices.`;
          break;
        case 'performance':
          systemPrompt = `You are a performance optimization expert. Analyze the code for performance bottlenecks, inefficient algorithms, and optimization opportunities.`;
          break;
        case 'quick-fixes':
        default:
          systemPrompt = `You are a senior software developer specializing in code review. Analyze the code for bugs, code smells, and quick improvements.`;
          break;
      }

      // Prepare the file content sections
      const fileContentSections = files.map(file => {
        const fileExtension = file.relativePath.split('.').pop() || '';
        const language = getLanguageFromExtension(fileExtension);

        return `## File: ${file.relativePath}
\`\`\`${language}
${file.content}
\`\`\`
`;
      }).join('\n\n');

      // Prepare the user prompt
      const userPrompt = `
I need a consolidated ${reviewType} review of the following code files from the ${projectName} project:

${projectContext ? `\n## Project Context\n${projectContext}\n` : ''}

## Files to Review
${fileContentSections}

Please provide a detailed consolidated review focusing on ${reviewType} aspects. Organize your review with:

1. A brief summary of the codebase
2. High priority issues (critical bugs, security vulnerabilities, major architectural problems)
3. Medium priority issues (code smells, potential bugs, performance concerns)
4. Low priority issues (style improvements, minor optimizations)

For each issue, include:
- Clear description of the problem
- File name and location
- Code snippets showing the issue
- Suggested fixes with code examples
- Explanation of why the fix is important

Format your response in Markdown.
`;

      // Use rate limiter to avoid hitting API limits
      await globalRateLimiter.acquire();

      try {
        // Extract the actual model name from the openrouter- prefix
        const actualModelName = currentModel && currentModel.startsWith('openrouter-')
          ? currentModel.substring('openrouter-'.length)
          : (currentModel || DEFAULT_OPENROUTER_MODELS[0].substring('openrouter-'.length));

        console.log(`Trying to generate consolidated review with ${actualModelName}...`);

        // Make the API request
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
            'X-Title': 'AI Code Review Tool'
          },
          body: JSON.stringify({
            model: actualModelName,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            stream: false
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`OpenRouter API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json() as any;

        // Extract the response content
        content = data.choices[0].message.content;

        // Calculate cost information
        const promptTokens = data.usage?.prompt_tokens || 0;
        const completionTokens = data.usage?.completion_tokens || 0;
        const totalTokens = data.usage?.total_tokens || 0;

        // Estimate cost (this is approximate and depends on the model)
        const estimatedCost = getCostInfo(promptTokens, completionTokens, actualModelName);
        cost = {
          inputTokens: promptTokens,
          outputTokens: completionTokens,
          totalTokens: totalTokens,
          estimatedCost: estimatedCost.cost,
          formattedCost: estimatedCost.formattedCost
        };

        console.log(`Successfully generated consolidated review with ${actualModelName}`);

        // Add model information to the content
        content += `\n\n*Generated by Code Review Tool using OpenRouter (${actualModelName})*`;
      } finally {
        // Release the rate limiter
        globalRateLimiter.release();
      }
    }

    // Return the review result
    return {
      content,
      filePath: `${projectName} (${files.length} files)`,
      reviewType,
      timestamp: new Date().toISOString(),
      cost,
      isMock,
      modelUsed: currentModel ? currentModel.replace('openrouter-', 'openrouter:') : undefined
    };
  } catch (error) {
    console.error('Error generating consolidated review with OpenRouter:', error);
    throw error;
  }
}
