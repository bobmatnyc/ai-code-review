/**
 * @fileoverview Client for interacting with the Anthropic API.
 *
 * This module provides a client for interacting with Anthropic's Claude models.
 * It handles API key management, request formatting, response processing,
 * rate limiting, error handling, and cost estimation for code reviews.
 *
 * Key features:
 * - Support for various Claude models (Claude 3 Opus, Sonnet, Haiku)
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
import { getCostInfo, getCostInfoFromText } from '../utils/tokenCounter';
import { ProjectDocs, formatProjectDocs } from '../utils/projectDocs';

// Get the model from environment variables
const selectedModel = process.env.AI_CODE_REVIEW_MODEL || '';

// Parse the model name
const [adapter, modelName] = selectedModel.includes(':') ? selectedModel.split(':') : ['anthropic', selectedModel];

// Skip initialization if this is not the selected adapter
if (adapter !== 'anthropic') {
  // We'll handle this in the reviewCode.ts file
  // This allows multiple clients to coexist without errors
}

// Get API key from environment variables
const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

// Track if we've initialized a model successfully
let modelInitialized = false;
let useMockResponses = false;

// Default Anthropic models to try in order of preference
const DEFAULT_ANTHROPIC_MODELS = [
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
];

// Only validate the model name if this adapter is selected
if (adapter === 'anthropic' && modelName) {
  // Validate that the model name is one of the supported models
  if (!DEFAULT_ANTHROPIC_MODELS.includes(modelName) &&
      !modelName.startsWith('claude-3-opus') &&
      !modelName.startsWith('claude-3-sonnet') &&
      !modelName.startsWith('claude-3-haiku')) {
    console.warn(`Warning: Model ${modelName} may not be a valid Anthropic model.`);
    console.warn(`Supported models: ${DEFAULT_ANTHROPIC_MODELS.join(', ')}`);
  }
}

/**
 * Get the language name from a file extension
 * @param extension File extension
 * @returns Language name
 */
function getLanguageFromExtension(extension: string): string {
  const extensionMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    py: 'python',
    rb: 'ruby',
    java: 'java',
    go: 'go',
    rs: 'rust',
    php: 'php',
    cs: 'csharp',
    swift: 'swift',
    kt: 'kotlin'
  };

  return extensionMap[extension.toLowerCase()] || 'plaintext';
}

/**
 * Initialize the Anthropic client with the specified model
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
async function initializeAnthropicModel(): Promise<boolean> {
  if (!apiKey) {
    console.error('No Anthropic API key found.');
    console.error('Please add the following to your .env.local file:');
    console.error('- AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here');
    process.exit(1);
  }

  try {
    console.log(`Initializing Anthropic model: ${modelName}...`);

    // Make a simple test request to verify the model works
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'user', content: 'Hello, are you available for a code review task?' }
        ],
        max_tokens: 50
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Error initializing Anthropic model ${modelName}:`, errorData);
      return false;
    }

    const data = await response.json() as any;
    if (data.content && data.content.length > 0) {
      console.log(`Successfully initialized Anthropic model: ${modelName}`);
      modelInitialized = true;
      return true;
    }

    console.error(`Unexpected response format from Anthropic model ${modelName}`);
    return false;
  } catch (error) {
    console.error(`Error initializing Anthropic model ${modelName}:`, error);
    return false;
  }
}

/**
 * Try to initialize the Anthropic model
 * @returns Promise resolving to a boolean indicating if the model was initialized
 */
export async function initializeAnthropicClient(): Promise<boolean> {
  // If we've already initialized a model, return true
  if (modelInitialized) {
    return true;
  }

  // If no API key is available, exit with error
  if (!apiKey) {
    console.error('No Anthropic API key found.');
    console.error('Please add the following to your .env.local file:');
    console.error('- AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here');
    process.exit(1);
  }

  // Log API key status
  const isDebugMode = process.argv.includes('--debug');
  if (isDebugMode) {
    console.log('Anthropic API key found: AI_CODE_REVIEW_ANTHROPIC_API_KEY');
  }

  // Try to initialize the model
  const success = await initializeAnthropicModel();
  if (success) {
    return true;
  }

  console.error(`Failed to initialize Anthropic model: ${modelName}`);
  process.exit(1);
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

  return `# Mock ${reviewType.toUpperCase()} Review for ${filePath} (Anthropic)

This is a mock review generated for testing purposes since no Anthropic API key was provided.

## Summary

This file appears to be a ${language} file. In a real review, this would contain detailed feedback based on the review type.

## Recommendations

1. Add proper documentation
2. Ensure consistent code style
3. Follow best practices for ${language}

*This is a mock response. To get real reviews, please set AI_CODE_REVIEW_ANTHROPIC_API_KEY environment variable in your .env.local file.*`;
}

/**
 * Generate a code review using the Anthropic API
 * @param fileContent Content of the file to review
 * @param filePath Path to the file
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateAnthropicReview(
  fileContent: string,
  filePath: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Initialize the model if we haven't already
    if (!modelInitialized && !useMockResponses) {
      await initializeAnthropicClient();
    }

    let content: string;
    let cost: ReviewCost | undefined;
    let isMock = false;

    if (useMockResponses) {
      // Generate mock response for testing
      content = await generateMockResponse(reviewType, filePath);
      // Add a note that this is a mock response
      content = `> **Note**: This is a mock response because no Anthropic API key was provided.\n\n${content}`;
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

      // Get file extension and language
      const fileExtension = filePath.split('.').pop() || '';
      const language = getLanguageFromExtension(fileExtension);

      // Format the code block with language
      const codeBlock = `\`\`\`${language}
${fileContent}
\`\`\``;

      // Prepare the system prompt based on review type
      let systemPrompt = '';
      switch (reviewType) {
        case 'architectural':
          systemPrompt = `You are a senior software engineer performing an architectural code review. Focus on code organization, API design, component relationships, and overall structure. Provide specific, actionable recommendations for improving the architecture.`;
          break;
        case 'security':
          systemPrompt = `You are a security expert performing a security-focused code review. Look for security vulnerabilities, potential exploits, and security best practices. Provide specific, actionable recommendations for improving security.`;
          break;
        case 'performance':
          systemPrompt = `You are a performance optimization expert performing a performance-focused code review. Look for performance bottlenecks, inefficient algorithms, and optimization opportunities. Provide specific, actionable recommendations for improving performance.`;
          break;
        case 'quick-fixes':
        default:
          systemPrompt = `You are a senior software engineer performing a code review focused on quick fixes and improvements. Look for common bugs, code style issues, and simple improvements. Provide specific, actionable recommendations that can be implemented quickly.`;
          break;
      }

      // Add instructions for formatting the response
      systemPrompt += `\n\nFormat your review with the following sections:
1. Summary - A brief overview of the code and its purpose
2. High Priority Issues - Critical problems that should be fixed immediately
3. Medium Priority Issues - Important improvements that should be addressed soon
4. Low Priority Issues - Minor suggestions for improvement
5. Positive Aspects - Things that are well-implemented

For each issue, include:
- A clear description of the problem
- The specific location in the code (line numbers if possible)
- A concrete suggestion for how to fix it
- Code examples where appropriate

Use markdown formatting for clarity. Be specific, actionable, and constructive.`;

      // Prepare the user prompt with the code and project context
      const userPrompt = `${projectContext ? `# Project Context\n${projectContext}\n\n` : ''}# File to Review: ${filePath}\n\n${codeBlock}\n\nPlease review this code and provide feedback according to the instructions.`;

      try {
        console.log(`Generating review with Anthropic ${modelName}...`);

        // Make the API request
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey || '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: modelName,
            system: systemPrompt,
            messages: [
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 4000
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Anthropic API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json() as any;
        if (data.content && data.content.length > 0) {
          content = data.content[0].text;
          console.log(`Successfully generated review with Anthropic ${modelName}`);
        } else {
          throw new Error(`Invalid response format from Anthropic ${modelName}`);
        }

        // Calculate cost information
        cost = getCostInfoFromText(userPrompt, content, modelName);
      } catch (error) {
        console.error(`Error generating review with Anthropic ${modelName}:`, error);
        throw error;
      }
    }

    return {
      filePath: filePath,
      reviewType,
      content,
      timestamp: new Date().toISOString(),
      cost,
      isMock,
      modelUsed: `anthropic:${modelName}`
    };
  } catch (error) {
    console.error('Error generating review:', error);
    throw new Error(`Failed to generate review for ${filePath}`);
  }
}

/**
 * Generate a mock architectural review for testing
 * @param files Array of file information objects
 * @param projectName Name of the project being reviewed
 * @returns Mock review content
 */
async function generateMockArchitecturalResponse(
  files: FileInfo[],
  projectName: string
): Promise<string> {
  // Create a directory structure representation
  const directoryStructure = files
    .map(file => file.relativePath)
    .sort()
    .join('\n');

  // Count files by type
  const fileTypes: Record<string, number> = {};
  files.forEach(file => {
    const ext = file.path.split('.').pop() || 'unknown';
    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
  });

  const fileTypeSummary = Object.entries(fileTypes)
    .map(([ext, count]) => `- ${ext}: ${count} files`)
    .join('\n');

  return `# Mock ARCHITECTURAL Review for ${projectName} (Anthropic)

This is a mock architectural review generated for testing purposes since no Anthropic API key was provided.

## Project Structure

\`\`\`
${directoryStructure}
\`\`\`

## File Types

${fileTypeSummary}

## Architecture Summary

This project contains ${files.length} files. In a real review, this would contain a detailed analysis of the project architecture, including:

- Code organization and modularity
- API design patterns
- Package dependencies
- Component relationships
- Data flow

## Recommendations

1. Ensure consistent code organization
2. Follow best practices for API design
3. Minimize external dependencies
4. Implement clear separation of concerns

*This is a mock response. To get real reviews, please set AI_CODE_REVIEW_ANTHROPIC_API_KEY environment variable in your .env.local file.*`;
}

/**
 * Generate a consolidated review for multiple files
 * @param files Array of file information objects
 * @param projectName Name of the project being reviewed
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateAnthropicConsolidatedReview(
  files: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  try {
    // Initialize the model if we haven't already
    if (!modelInitialized && !useMockResponses) {
      await initializeAnthropicClient();
    }

    let content: string;
    let cost: ReviewCost | undefined;
    let isMock = false;

    if (useMockResponses) {
      // Generate mock response for testing
      content = await generateMockArchitecturalResponse(files, projectName);
      // Add a note that this is a mock response
      content = `> **Note**: This is a mock response because no Anthropic API key was provided.\n\n${content}`;
      isMock = true;

      // Add mock cost information for testing
      cost = {
        inputTokens: 5000,
        outputTokens: 2500,
        totalTokens: 7500,
        estimatedCost: 0.002,
        formattedCost: '$0.002 USD'
      };
    } else {
      // Format project documentation if available
      const projectContext = projectDocs ? formatProjectDocs(projectDocs) : '';

      // Prepare file summaries
      const fileSummaries = files
        .map(file => {
          const fileExtension = file.path.split('.').pop() || '';
          const language = getLanguageFromExtension(fileExtension);

          return `## File: ${file.relativePath}

\`\`\`${language}
${file.content.substring(0, 1000)}${file.content.length > 1000 ? '\n... (truncated)' : ''}\n\`\`\`\n`;
        })
        .join('\n');

      // Create a project structure summary
      const directoryStructure = files
        .map(file => file.relativePath)
        .sort()
        .join('\n');

      // Prepare the system prompt based on review type
      let systemPrompt = '';
      switch (reviewType) {
        case 'architectural':
          systemPrompt = `You are a senior software architect performing a comprehensive architectural review of a codebase. Focus on code organization, API design, component relationships, and overall structure. Provide specific, actionable recommendations for improving the architecture.`;
          break;
        case 'security':
          systemPrompt = `You are a security expert performing a comprehensive security review of a codebase. Look for security vulnerabilities, potential exploits, and security best practices across the entire project. Provide specific, actionable recommendations for improving security.`;
          break;
        case 'performance':
          systemPrompt = `You are a performance optimization expert performing a comprehensive performance review of a codebase. Look for performance bottlenecks, inefficient algorithms, and optimization opportunities across the entire project. Provide specific, actionable recommendations for improving performance.`;
          break;
        case 'quick-fixes':
        default:
          systemPrompt = `You are a senior software engineer performing a comprehensive code review focused on quick fixes and improvements. Look for common bugs, code style issues, and simple improvements across the entire project. Provide specific, actionable recommendations that can be implemented quickly.`;
          break;
      }

      // Add instructions for formatting the response
      systemPrompt += `\n\nFormat your review with the following sections:
1. Summary - A brief overview of the project and its architecture
2. High Priority Issues - Critical problems that should be fixed immediately
3. Medium Priority Issues - Important improvements that should be addressed soon
4. Low Priority Issues - Minor suggestions for improvement
5. Positive Aspects - Things that are well-implemented

For each issue, include:
- A clear description of the problem
- The specific location in the code (file and line numbers if possible)
- A concrete suggestion for how to fix it
- Code examples where appropriate

Use markdown formatting for clarity. Be specific, actionable, and constructive.`;

      // Prepare the user prompt with the code and project context
      const userPrompt = `${projectContext ? `# Project Context\n${projectContext}\n\n` : ''}# Project: ${projectName}

## Directory Structure
\`\`\`
${directoryStructure}
\`\`\`

## File Summaries (truncated for brevity)
${fileSummaries}

Please review this codebase and provide feedback according to the instructions.`;

      try {
        console.log(`Generating consolidated review with Anthropic ${modelName}...`);

        // Make the API request
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey || '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: modelName,
            system: systemPrompt,
            messages: [
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2,
            max_tokens: 4000
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Anthropic API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json() as any;
        if (data.content && data.content.length > 0) {
          content = data.content[0].text;
          console.log(`Successfully generated review with Anthropic ${modelName}`);
        } else {
          throw new Error(`Invalid response format from Anthropic ${modelName}`);
        }

        // Calculate cost information
        cost = getCostInfoFromText(userPrompt, content, modelName);
      } catch (error) {
        console.error(`Error generating review with Anthropic ${modelName}:`, error);
        throw error;
      }
    }

    return {
      filePath: `${reviewType}`,
      reviewType,
      content,
      timestamp: new Date().toISOString(),
      cost,
      isMock,
      modelUsed: `anthropic:${modelName}`
    };
  } catch (error) {
    console.error('Error generating consolidated review:', error);
    throw error;
  }
}
