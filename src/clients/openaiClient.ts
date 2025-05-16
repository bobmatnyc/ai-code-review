/**
 * @fileoverview Client for interacting with the OpenAI API.
 *
 * This module provides a client for interacting with OpenAI's GPT models.
 * It handles API key management, request formatting, response processing,
 * rate limiting, error handling, and cost estimation for code reviews.
 *
 * Key features:
 * - Support for various GPT models (GPT-4, GPT-4o, GPT-3.5-Turbo)
 * - Streaming and non-streaming responses
 * - Robust error handling and rate limit management
 * - Cost estimation for API usage
 * - Support for different review types
 * - Tool calling capabilities for enhanced reviews
 */

import {
  ReviewType,
  ReviewResult,
  FileInfo,
  ReviewCost,
  ReviewOptions
} from '../types/review';
import { getConfig } from '../utils/config';
import { ProjectDocs } from '../utils/projectDocs';
import logger from '../utils/logger';
import {
  // generateDirectoryStructure, // Not used in this file
  validateOpenAIApiKey,
  isDebugMode
} from './utils';
import {
  formatSingleFileReviewPrompt,
  formatConsolidatedReviewPrompt
} from './utils/promptFormatter';
import { getCostInfoFromText } from './utils/tokenCounter';
import { loadPromptTemplate } from './utils/promptLoader';
import { ApiError } from '../utils/apiErrorHandler';
// import { getLanguageFromExtension } from './utils/languageDetection'; // Not used in this file
import { /* supportsToolCalling as supportsToolCallingFn, */ getModelMapping } from './utils/modelMaps'; // supportsToolCallingFn not used
import { ALL_TOOLS } from './utils/toolCalling';
import { openAIToolCallingHandler } from './utils/openAIToolCallingHandler';
import { executeToolCall } from './utils/toolExecutor';
import { extractPackageInfo } from '../utils/dependencies/packageAnalyzer';

const MAX_TOKENS_PER_REQUEST = 4000;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, options);
    if (res.ok) return res;
    if (res.status === 429 || res.status >= 500) {
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    } else {
      break;
    }
  }
  throw new Error('Failed after retries');
}

// Track if we've initialized a model successfully
let modelInitialized = false;

// Helper function to check if this is the correct client for the selected model
function isOpenAIModel(): {
  isCorrect: boolean;
  adapter: string;
  modelName: string;
} {
  // Get the model from configuration (CLI override or env)
  const selectedModel = getConfig().selectedModel || '';

  // Parse the model name
  const [adapter, modelName] = selectedModel.includes(':')
    ? selectedModel.split(':')
    : ['openai', selectedModel];

  return {
    isCorrect: adapter === 'openai',
    adapter,
    modelName
  };
}

// This function was removed as it's no longer needed with the improved client selection logic

/**
 * Initialize the OpenAI client
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
export async function initializeAnyOpenAIModel(): Promise<boolean> {
  const { isCorrect, modelName } = isOpenAIModel();

  // If this is not an OpenAI model, just return true without initializing
  if (!isCorrect) {
    return true;
  }

  // If we've already initialized, return true
  if (modelInitialized) {
    return true;
  }

  // Use the imported dependencies

  // Get API key from environment variables
  const apiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;

  // Validate the API key
  if (!validateOpenAIApiKey(apiKey, isDebugMode())) {
    process.exit(1);
  }

  try {
    logger.info(`Initializing OpenAI model: ${modelName}...`);

    // Mark as initialized
    modelInitialized = true;
    logger.info(`Successfully initialized OpenAI model: ${modelName}`);
    return true;
  } catch (error) {
    logger.error(
      `Error initializing OpenAI model ${modelName}: ${error instanceof Error ? error.message : String(error)}`
    );
    return false;
  }
}

/**
 * Generate a code review using the OpenAI API
 * @param fileContent Content of the file to review
 * @param filePath Path to the file
 * @param reviewType Type of review to perform
 * @param projectDocs Optional project documentation
 * @param options Review options
 * @returns Promise resolving to the review result
 */
export async function generateOpenAIReview(
  fileContent: string,
  filePath: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  const { isCorrect, adapter, modelName } = isOpenAIModel();

  // With the improved client selection logic, this function should only be called
  // with OpenAI models. If not, something went wrong with the client selection.
  if (!isCorrect) {
    throw new Error(
      `OpenAI client was called with an invalid model: ${adapter ? adapter + ':' + modelName : 'none specified'}. ` +
        `This is likely a bug in the client selection logic.`
    );
  }

  try {
    // Initialize the model if we haven't already
    if (!modelInitialized) {
      await initializeAnyOpenAIModel();
    }

    // Dependencies are now imported at the top of the file

    // Get API key from environment variables
    const apiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;

    let content: string;
    let cost: ReviewCost | undefined;

    // Get the language from the file extension
    // const language = getLanguageFromExtension(filePath); // Currently unused

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType, options);

    // Format the prompt
    const prompt = formatSingleFileReviewPrompt(
      promptTemplate,
      fileContent,
      filePath,
      projectDocs
    );

    try {
      logger.info(`Generating review with OpenAI ${modelName}...`);

      // Make the API request
      const response = await fetchWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: 'system',
                content: `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.

IMPORTANT: Your response MUST be in the following JSON format:

{
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

Ensure your response is valid JSON. Do not include any text outside the JSON structure.`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.2,
            max_tokens: MAX_TOKENS_PER_REQUEST
          })
        }
      );

      const data = await response.json();
      if (!Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
        throw new Error(`Invalid response format from OpenAI ${modelName}`);
      }
      content = data.choices[0].message.content;
      logger.info(`Successfully generated review with OpenAI ${modelName}`);

      // Calculate cost information
      try {
        cost = getCostInfoFromText(prompt, content, `openai:${modelName}`);
      } catch (error) {
        logger.warn(
          `Failed to calculate cost information: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } catch (error) {
      throw new ApiError(
        `Failed to generate review with OpenAI ${modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Try to parse the response as JSON
    let structuredData = null;
    try {
      // First, check if the response is wrapped in a code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;

      // Check if the content is valid JSON
      structuredData = JSON.parse(jsonContent);

      // Validate that it has the expected structure
      if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
        logger.warn(
          'Response is valid JSON but does not have the expected structure'
        );
      }
    } catch (parseError) {
      logger.warn(
        `Response is not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
      // Keep the original response as content
    }

    // Return the review result
    return {
      content,
      cost,
      modelUsed: `openai:${modelName}`,
      filePath,
      reviewType,
      timestamp: new Date().toISOString(),
      structuredData
    };
  } catch (error) {
    logger.error(
      `Error generating review for ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
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
export async function generateOpenAIConsolidatedReview(
  files: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  const { isCorrect, adapter, modelName } = isOpenAIModel();

  // With the improved client selection logic, this function should only be called
  // with OpenAI models. If not, something went wrong with the client selection.
  if (!isCorrect) {
    throw new Error(
      `OpenAI client was called with an invalid model: ${adapter ? adapter + ':' + modelName : 'none specified'}. ` +
        `This is likely a bug in the client selection logic.`
    );
  }

  try {
    // Initialize the model if we haven't already
    if (!modelInitialized) {
      await initializeAnyOpenAIModel();
    }

    // Dependencies are now imported at the top of the file

    // Get API key from environment variables
    const apiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;

    let content: string;
    let cost: ReviewCost | undefined;

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reviewType, options);

    // Format the prompt
    const prompt = formatConsolidatedReviewPrompt(
      promptTemplate,
      projectName,
      files.map(file => ({
        relativePath: file.relativePath || '',
        content: file.content,
        sizeInBytes: file.content.length
      })),
      projectDocs
    );

    try {
      logger.info(`Generating consolidated review with OpenAI ${modelName}...`);

      // Make the API request
      const response = await fetchWithRetry(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelName,
            messages: [
              {
                role: 'system',
                content: `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.

IMPORTANT: Your response MUST be in the following JSON format:

{
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

Ensure your response is valid JSON. Do not include any text outside the JSON structure.`
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.2,
            max_tokens: MAX_TOKENS_PER_REQUEST
          })
        }
      );

      const data = await response.json();
      if (!Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
        throw new Error(`Invalid response format from OpenAI ${modelName}`);
      }
      content = data.choices[0].message.content;
      logger.info(`Successfully generated review with OpenAI ${modelName}`);

      // Calculate cost information
      try {
        cost = getCostInfoFromText(prompt, content, `openai:${modelName}`);
      } catch (error) {
        logger.warn(
          `Failed to calculate cost information: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } catch (error) {
      throw new ApiError(
        `Failed to generate consolidated review with OpenAI ${modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Try to parse the response as JSON
    let structuredData = null;
    try {
      // First, check if the response is wrapped in a code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;

      // Check if the content is valid JSON
      structuredData = JSON.parse(jsonContent);

      // Validate that it has the expected structure
      if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
        logger.warn(
          'Response is valid JSON but does not have the expected structure'
        );
      }
    } catch (parseError) {
      logger.warn(
        `Response is not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
      // Keep the original response as content
    }

    // Return the review result
    return {
      content,
      cost,
      modelUsed: `openai:${modelName}`,
      filePath: 'consolidated',
      reviewType,
      timestamp: new Date().toISOString(),
      structuredData
    };
  } catch (error) {
    logger.error(
      `Error generating consolidated review: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
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
export async function generateOpenAIArchitecturalReview(
  files: FileInfo[],
  projectName: string,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  const { isCorrect, adapter, modelName } = isOpenAIModel();

  // With the improved client selection logic, this function should only be called
  // with OpenAI models. If not, something went wrong with the client selection.
  if (!isCorrect) {
    throw new Error(
      `OpenAI client was called with an invalid model: ${adapter ? adapter + ':' + modelName : 'none specified'}. ` +
      `This is likely a bug in the client selection logic.`
    );
  }

  try {
    // Initialize the model if we haven't already
    if (!modelInitialized) {
      await initializeAnyOpenAIModel();
    }

    // Dependencies are now imported at the top of the file

    // Get API key from environment variables
    const apiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;

    let content: string;
    let cost: ReviewCost | undefined;

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate('architectural', options);

    // Format the prompt
    const prompt = formatConsolidatedReviewPrompt(
      promptTemplate,
      projectName,
      files.map(file => ({
        relativePath: file.relativePath || '',
        content: file.content,
        sizeInBytes: file.content.length
      })),
      projectDocs
    );

    // Check if this model supports tool calling and we're doing an architectural review
    const supportsToolCalling = getModelMapping(`openai:${modelName}`)?.supportsToolCalling || false;
    const serpApiConfigured = !!process.env.SERPAPI_KEY;

    try {
      logger.info(`Generating architectural review with OpenAI ${modelName}...`);

      let response;
      
      // Check if we should use tool calling
      if (supportsToolCalling && serpApiConfigured && options?.type === 'architectural') {
        // Always extract package information for architectural reviews to analyze dependencies
        // Even if includeDependencyAnalysis is not explicitly set
        const packageResults = await extractPackageInfo(process.cwd());
        
        // Include package information in the prompt
        const packageInfo = packageResults.length > 0 
          ? `\n\n## Dependencies\nThe project uses the following dependencies:\n\n${
              packageResults.map(result => {
                let pkgInfo = '';
                if (result.npm && result.npm.length > 0) {
                  pkgInfo += `### NPM (JavaScript/TypeScript) Dependencies\n`;
                  result.npm.forEach(pkg => {
                    pkgInfo += `- ${pkg.name}${pkg.version ? ` (${pkg.version})` : ''}${pkg.devDependency ? ' (dev)' : ''}\n`;
                  });
                }
                if (result.composer && result.composer.length > 0) {
                  pkgInfo += `### Composer (PHP) Dependencies\n`;
                  result.composer.forEach(pkg => {
                    pkgInfo += `- ${pkg.name}${pkg.constraint ? ` (${pkg.constraint})` : ''}${pkg.devDependency ? ' (dev)' : ''}\n`;
                  });
                }
                if (result.python && result.python.length > 0) {
                  pkgInfo += `### Python Dependencies\n`;
                  result.python.forEach(pkg => {
                    pkgInfo += `- ${pkg.name}${pkg.constraint ? ` (${pkg.constraint})` : ''}${pkg.version ? ` (${pkg.version})` : ''}\n`;
                  });
                }
                if (result.ruby && result.ruby.length > 0) {
                  pkgInfo += `### Ruby Dependencies\n`;
                  result.ruby.forEach(pkg => {
                    pkgInfo += `- ${pkg.name}${pkg.version ? ` (${pkg.version})` : ''}\n`;
                  });
                }
                return pkgInfo;
              }).join('\n')
            }`
          : '';
        
        // Prepare the prompt with package information
        const promptWithPackages = prompt + packageInfo;
        
        // Prepare the tools
        const tools = openAIToolCallingHandler.prepareTools(ALL_TOOLS);
          
        // Make the initial request with tools
        response = await fetchWithRetry(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: modelName,
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

Always include a dedicated "Dependency Security Analysis" section in your review that summarizes the findings from your dependency security checks. This is a critical part of the architectural review.`
                },
                {
                  role: 'user',
                  content: promptWithPackages
                }
              ],
              tools,
              tool_choice: 'auto',
              temperature: 0.2,
              max_tokens: MAX_TOKENS_PER_REQUEST
            })
          }
        );

        const data = await response.json();
        
        // Check if there are tool calls
        const { toolCalls, responseMessage } = openAIToolCallingHandler.processToolCallsFromResponse(data);
        
        if (toolCalls.length > 0) {
          logger.info(`Found ${toolCalls.length} tool calls in the response`);
          
          // Execute the tool calls
          const toolResults = [];
          for (const toolCall of toolCalls) {
            const result = await executeToolCall(toolCall.name, toolCall.arguments);
            toolResults.push({
              toolName: toolCall.name,
              result
            });
          }
          
          // Create the conversation with tool results
          const conversation = [
            {
              role: 'system',
              content: `You are an expert code reviewer specialized in architectural analysis. Your task is to analyze code architecture, identify issues, and provide recommendations.
              
ESSENTIAL TASK: Include a dedicated "Dependency Security Analysis" section in your review that summarizes the findings from the dependency security checks. This is a critical part of the architectural review.`
            },
            {
              role: 'user',
              content: promptWithPackages
            },
            {
              role: 'assistant',
              content: responseMessage || null,
              tool_calls: data.choices[0].message.tool_calls
            }
          ];
          
          // Add the tool results
          const conversationWithResults = openAIToolCallingHandler.createToolResultsRequest(
            conversation,
            toolResults
          );
          
          // Make the final request
          const finalResponse = await fetchWithRetry(
            'https://api.openai.com/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: modelName,
                messages: conversationWithResults,
                temperature: 0.2,
                max_tokens: MAX_TOKENS_PER_REQUEST
              })
            }
          );
          
          const finalData = await finalResponse.json();
          if (!Array.isArray(finalData.choices) || !finalData.choices[0]?.message?.content) {
            throw new Error(`Invalid response format from OpenAI ${modelName}`);
          }
          
          content = finalData.choices[0].message.content;
        } else {
          // If no tool calls, use the original response
          if (!Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
            throw new Error(`Invalid response format from OpenAI ${modelName}`);
          }
          content = data.choices[0].message.content;
        }
      } else {
        // Regular non-tool calling flow
        response = await fetchWithRetry(
          'https://api.openai.com/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: modelName,
              messages: [
                {
                  role: 'system',
                  content: `You are an expert code reviewer specialized in architectural analysis. Your task is to analyze code architecture, identify issues, and provide recommendations.`
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              temperature: 0.2,
              max_tokens: MAX_TOKENS_PER_REQUEST
            })
          }
        );
        
        const data = await response.json();
        if (!Array.isArray(data.choices) || !data.choices[0]?.message?.content) {
          throw new Error(`Invalid response format from OpenAI ${modelName}`);
        }
        content = data.choices[0].message.content;
      }
      
      logger.info(`Successfully generated architectural review with OpenAI ${modelName}`);

      // Calculate cost information
      try {
        cost = getCostInfoFromText(prompt, content, `openai:${modelName}`);
      } catch (error) {
        logger.warn(
          `Failed to calculate cost information: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } catch (error) {
      throw new ApiError(
        `Failed to generate architectural review with OpenAI ${modelName}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Try to parse the response as JSON
    let structuredData = null;
    try {
      // First, check if the response is wrapped in a code block
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonContent = jsonMatch ? jsonMatch[1] : content;

      // Check if the content is valid JSON
      structuredData = JSON.parse(jsonContent);

      // Validate that it has the expected structure
      if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
        logger.warn(
          'Response is valid JSON but does not have the expected structure'
        );
      }
    } catch (parseError) {
      logger.warn(
        `Response is not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
      );
      // Keep the original response as content
    }

    // Return the review result
    return {
      content,
      cost,
      modelUsed: `openai:${modelName}`,
      filePath: 'architectural',
      reviewType: 'architectural',
      timestamp: new Date().toISOString(),
      structuredData
    };
  } catch (error) {
    logger.error(
      `Error generating architectural review: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  }
}
