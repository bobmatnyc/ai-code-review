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
 * - Cost estimation for API usage
 * - Support for different review types
 * - Tool calling capabilities for enhanced reviews
 */

import { getCostInfoFromText } from './utils/tokenCounter';
import { getApiNameFromKey, getModelMapping, supportsToolCalling } from './utils/modelMaps';
import {
  ReviewType,
  ReviewOptions,
  ReviewResult,
  ReviewCost,
  FileInfo
} from '../types/review';
import {
  handleFetchResponse,
  safeJsonParse,
  ApiError,
  logApiError
} from '../utils/apiErrorHandler';
import logger from '../utils/logger';
import { ProjectDocs } from '../utils/projectDocs';
import {
  validateAnthropicApiKey,
  isDebugMode,
  loadPromptTemplate,
  formatSingleFileReviewPrompt,
  formatConsolidatedReviewPrompt
} from './utils';
import { ALL_TOOLS } from './utils/toolCalling';
import { anthropicToolCallingHandler } from './utils/anthropicToolCallingHandler';
import { executeToolCall } from './utils/toolExecutor';
import { extractPackageInfo } from '../utils/dependencies/packageAnalyzer';

const MAX_TOKENS_PER_REQUEST = 4000;

interface AnthropicResponse {
  content: Array<{ text: string }>;
}

/**
 * Get the API model name from the model map
 * @param modelName The model name
 * @returns The API model name
 */
async function getApiModelName(modelName: string): Promise<string> {
  // Use the imported getApiNameFromKey function
  const apiModelName = getApiNameFromKey(`anthropic:${modelName}`) || modelName;
  console.log(`[DEBUG] API model name: ${apiModelName}`);
  return apiModelName;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[DEBUG] Anthropic API request attempt ${i + 1}/${retries}`);
      const res = await fetch(url, options);
      console.log(`[DEBUG] Anthropic API response status: ${res.status}`);

      if (res.ok) return res;

      // Try to get more detailed error information
      try {
        const errorText = await res.text();
        console.log(`[DEBUG] Anthropic API error response: ${errorText}`);
      } catch (readError) {
        console.log(`[DEBUG] Could not read error response: ${readError}`);
      }

      if (res.status === 429 || res.status >= 500) {
        console.log(`[DEBUG] Retrying after ${1000 * (i + 1)}ms delay...`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      } else {
        console.log(`[DEBUG] Non-retryable error status: ${res.status}`);
        throw new Error(
          `Anthropic API request failed with status ${res.status}`
        );
      }
    } catch (error) {
      console.log(`[DEBUG] Fetch error: ${error}`);
      if (i === retries - 1) throw error;
      console.log(`[DEBUG] Retrying after ${1000 * (i + 1)}ms delay...`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Anthropic API request failed after all retry attempts');
}

/**
 * Determines if the current model is an Anthropic model and extracts adapter and model name.
 */
function isAnthropicModel(): {
  isCorrect: boolean;
  adapter: string;
  modelName: string;
} {
  // Get the model from environment variables
  const selectedModel = process.env.AI_CODE_REVIEW_MODEL || '';

  console.log(
    `[DEBUG] isAnthropicModel called with AI_CODE_REVIEW_MODEL=${selectedModel}`
  );

  // If the model is empty, this is not an Anthropic model
  if (!selectedModel) {
    console.log('[DEBUG] isAnthropicModel: No model selected, returning false');
    return {
      isCorrect: false,
      adapter: '',
      modelName: ''
    };
  }

  // Parse the model name
  const [adapter, modelName] = selectedModel.includes(':')
    ? selectedModel.split(':')
    : ['anthropic', selectedModel];

  console.log(
    `[DEBUG] isAnthropicModel: Parsed adapter=${adapter}, modelName=${modelName}`
  );
  console.log(`[DEBUG] isAnthropicModel: isCorrect=${adapter === 'anthropic'}`);

  return {
    isCorrect: adapter === 'anthropic',
    adapter,
    modelName
  };
}

// This function was removed as it's no longer needed with the improved client selection logic

// Track if we've initialized a model successfully
let modelInitialized = false;

/**
 * Initialize the Anthropic client
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
export async function initializeAnthropicClient(): Promise<boolean> {
  console.log('[DEBUG] initializeAnthropicClient called');

  const { isCorrect, adapter, modelName } = isAnthropicModel();
  console.log(
    `[DEBUG] initializeAnthropicClient: isCorrect=${isCorrect}, adapter=${adapter}, modelName=${modelName}`
  );

  // If this is not an Anthropic model, just return true without initializing
  if (!isCorrect) {
    console.log(
      '[DEBUG] initializeAnthropicClient: Not an Anthropic model, returning true without initializing'
    );
    return true;
  }

  // If we've already initialized, return true
  if (modelInitialized) {
    console.log(
      '[DEBUG] initializeAnthropicClient: Already initialized, returning true'
    );
    return true;
  }

  console.log(
    '[DEBUG] initializeAnthropicClient: Proceeding with initialization'
  );

  // Use the imported dependencies

  // Get API key from environment variables
  const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

  // Validate the API key
  if (!validateAnthropicApiKey(apiKey, isDebugMode())) {
    process.exit(1);
  }

  try {
    logger.info(`Initializing Anthropic model: ${modelName}...`);

    // Make a simple test request to verify the model works
    console.log(`[DEBUG] Testing Anthropic model: ${modelName}`);
    console.log(
      `[DEBUG] API key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'not set'}`
    );

    // Get the API name from the model map
    // Use the imported getApiNameFromKey function
    const fullModelKey = `anthropic:${modelName}`;
    const apiModelName = getApiNameFromKey(fullModelKey);
    console.log(`[DEBUG] Full model key: ${fullModelKey}`);
    console.log(`[DEBUG] API model name: ${apiModelName}`);

    // Prepare the request body
    const requestBody = {
      model: apiModelName,
      system: 'You are a helpful AI assistant.',
      messages: [
        {
          role: 'user',
          content: 'Hello, are you available for a code review task?'
        }
      ],
      max_tokens: 100
    };

    console.log(
      `[DEBUG] Request body: ${JSON.stringify(requestBody, null, 2)}`
    );

    const response = await fetchWithRetry(
      'https://api.anthropic.com/v1/messages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(requestBody)
      }
    );

    // Try to parse the response
    try {
      console.log(`[DEBUG] Response status: ${response.status}`);
      const responseText = await response.text();
      console.log(`[DEBUG] Response text: ${responseText}`);

      if (!response.ok) {
        logger.error(
          `Error initializing Anthropic model ${modelName}: ${responseText}`
        );
        return false;
      }

      try {
        const data = JSON.parse(responseText);
        console.log(
          `[DEBUG] Parsed response: ${JSON.stringify(data, null, 2)}`
        );

        if (data.content && data.content.length > 0) {
          logger.info(`Successfully initialized Anthropic model: ${modelName}`);
          modelInitialized = true;
          return true;
        }

        logger.error(
          `Unexpected response format from Anthropic model ${modelName}: ${JSON.stringify(data)}`
        );
        return false;
      } catch (parseError) {
        logger.error(`Error parsing JSON response: ${parseError}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error reading response: ${error}`);
      return false;
    }
  } catch (error) {
    logger.error(`Error initializing Anthropic model ${modelName}`);
    return false;
  }
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
  const { isCorrect, adapter, modelName } = isAnthropicModel();

  // With the improved client selection logic, this function should only be called
  // with Anthropic models. If not, something went wrong with the client selection.
  if (!isCorrect) {
    throw new Error(
      `Anthropic client was called with an invalid model: ${adapter ? adapter + ':' + modelName : 'none specified'}. ` +
        `This is likely a bug in the client selection logic.`
    );
  }

  try {
    await initializeAnthropicClient();

    // Use the imported dependencies

    // Get API key from environment variables
    const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

    let content: string;
    let cost: ReviewCost | undefined;

    {
      // Load the appropriate prompt template
      const promptTemplate = await loadPromptTemplate(reviewType, options);

      // Prepare the system prompt with structured output instructions
      const systemPrompt = `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.

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

Ensure your response is valid JSON. Do not include any text outside the JSON structure.`;

      // Format the user prompt using the utility function
      const userPrompt = formatSingleFileReviewPrompt(
        promptTemplate,
        fileContent,
        filePath,
        projectDocs
      );

      try {
        logger.info(`Generating review with Anthropic ${modelName}...`);

        try {
          // Make the API request
          console.log(
            `[DEBUG] Anthropic API request: model=${modelName}, apiKey=${apiKey ? 'set' : 'not set'}`
          );
          const apiModelName = await getApiModelName(modelName);
          const requestBody = {
            model: apiModelName,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
            temperature: 0.2,
            max_tokens: MAX_TOKENS_PER_REQUEST
          };
          console.log(
            `[DEBUG] Anthropic API request body: ${JSON.stringify(requestBody, null, 2)}`
          );
          const response = await fetchWithRetry(
            'https://api.anthropic.com/v1/messages',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey || '',
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify(requestBody)
            }
          );

          // Handle response errors
          console.log(
            `[DEBUG] Anthropic API response status: ${response.status}`
          );
          try {
            const responseText = await response.text();
            console.log(`[DEBUG] Anthropic API response: ${responseText}`);
          } catch (error) {
            console.log(`[DEBUG] Error reading response text: ${error}`);
          }
          await handleFetchResponse(response, 'Anthropic');

          // Parse the response safely
          const data = await safeJsonParse<AnthropicResponse>(
            response,
            'Anthropic'
          );

          if (data.content && data.content.length > 0) {
            content = data.content[0].text;
            logger.info(
              `Successfully generated review with Anthropic ${modelName}`
            );
          } else {
            throw new ApiError(
              `Invalid response format from Anthropic ${modelName}`
            );
          }
        } catch (apiError) {
          logApiError(apiError, {
            operation: 'generateReview',
            apiName: 'Anthropic'
          });
          throw apiError;
        }

        // Calculate cost information
        try {
          cost = getCostInfoFromText(content, `anthropic:${modelName}`);
        } catch (error) {
          logger.warn(
            `Failed to calculate cost information: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } catch (error) {
        if (error instanceof ApiError) {
          throw error; // Already has context
        } else {
          throw new ApiError(
            `Failed to generate review with Anthropic ${modelName}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
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
      modelUsed: `anthropic:${modelName}`,
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
export async function generateAnthropicConsolidatedReview(
  files: FileInfo[],
  projectName: string,
  reviewType: ReviewType,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  const { isCorrect, adapter, modelName } = isAnthropicModel();

  // With the improved client selection logic, this function should only be called
  // with Anthropic models. If not, something went wrong with the client selection.
  if (!isCorrect) {
    throw new Error(
      `Anthropic client was called with an invalid model: ${adapter ? adapter + ':' + modelName : 'none specified'}. ` +
        `This is likely a bug in the client selection logic.`
    );
  }

  try {
    await initializeAnthropicClient();

    // Use the imported dependencies

    // Get API key from environment variables
    const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

    let content: string;
    let cost: ReviewCost | undefined;

    {
      // Load the appropriate prompt template
      const promptTemplate = await loadPromptTemplate(reviewType, options);

      // Prepare the system prompt with structured output instructions
      const systemPrompt = `You are an expert code reviewer. Focus on providing actionable feedback. IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE CODE REVIEW CONTENT.

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

Ensure your response is valid JSON. Do not include any text outside the JSON structure.`;

      // Prepare file summaries for the consolidated review
      const fileInfos = files.map(file => ({
        relativePath: file.relativePath,
        content:
          file.content.substring(0, 1000) +
          (file.content.length > 1000 ? '\n... (truncated)' : ''),
        sizeInBytes: file.content.length
      }));

      // Format the user prompt using the utility function
      const userPrompt = formatConsolidatedReviewPrompt(
        promptTemplate,
        projectName,
        fileInfos,
        projectDocs
      );

      try {
        logger.info(
          `Generating consolidated review with Anthropic ${modelName}...`
        );

        // Make the API request
        const response = await fetchWithRetry(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey || '',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: await getApiModelName(modelName),
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }],
              temperature: 0.2,
              max_tokens: MAX_TOKENS_PER_REQUEST
            })
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          logger.error(`
            Error generating consolidated review with Anthropic ${modelName}`);
          throw new Error(`Anthropic API error: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        if (data.content && data.content.length > 0) {
          content = data.content[0].text;
          logger.info(
            `Successfully generated review with Anthropic ${modelName}`
          );
        } else {
          throw new Error(
            `Invalid response format from Anthropic ${modelName}`
          );
        }

        // Calculate cost information
        try {
          cost = getCostInfoFromText(content, `anthropic:${modelName}`);
        } catch (error) {
          logger.warn(
            `Failed to calculate cost information: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } catch (error) {
        throw new Error(
          `Failed to generate consolidated review with Anthropic ${modelName}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
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
      modelUsed: `anthropic:${modelName}`,
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
export async function generateArchitecturalAnthropicReview(
  files: FileInfo[],
  projectName: string,
  projectDocs?: ProjectDocs | null,
  options?: ReviewOptions
): Promise<ReviewResult> {
  const { isCorrect, adapter, modelName } = isAnthropicModel();

  // With the improved client selection logic, this function should only be called
  // with Anthropic models. If not, something went wrong with the client selection.
  if (!isCorrect) {
    throw new Error(
      `Anthropic client was called with an invalid model: ${adapter ? adapter + ':' + modelName : 'none specified'}. ` +
        `This is likely a bug in the client selection logic.`
    );
  }

  try {
    await initializeAnthropicClient();

    // Get API key from environment variables
    const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

    let content: string;
    let cost: ReviewCost | undefined;

    // Check if the model supports tool calling
    const model = getModelMapping(`anthropic:${modelName}`);
    const supportsToolCalling = model?.supportsToolCalling || false;
    const serpApiConfigured = !!process.env.SERPAPI_KEY;

    logger.debug(`Using model: ${modelName}, supportsToolCalling: ${supportsToolCalling}, serpApiConfigured: ${serpApiConfigured}`);

    // Tool calling implementation
    if (supportsToolCalling && serpApiConfigured && options?.type === 'architectural') {
      logger.info(`Generating architectural review with tool calling using Anthropic ${modelName}...`);

      // Always extract package information for architectural reviews to analyze dependencies
      // Even if includeDependencyAnalysis is not explicitly set
      const packageResults = await extractPackageInfo(process.cwd());
      
      // Load the prompt template for architectural review
      const promptTemplate = await loadPromptTemplate('architectural', options);

      // Prepare file summaries for the consolidated review
      const fileInfos = files.map(file => ({
        relativePath: file.relativePath,
        content:
          file.content.substring(0, 1000) +
          (file.content.length > 1000 ? '\n... (truncated)' : ''),
        sizeInBytes: file.content.length
      }));

      // Format package information for the prompt
      let packageInfoText = '';
      if (packageResults.length > 0) {
        packageInfoText = '\n\n## Package Dependencies\n\nThe project includes the following package dependencies:\n\n';
        
        // Format npm dependencies
        const npmDeps = packageResults.find(result => result.npm && result.npm.length > 0);
        if (npmDeps?.npm) {
          packageInfoText += '### NPM Dependencies (JavaScript/TypeScript)\n\n';
          npmDeps.npm.forEach(dep => {
            packageInfoText += `- ${dep.name}${dep.version ? ` (${dep.version})` : ''}${dep.devDependency ? ' (dev)' : ''}\n`;
          });
          packageInfoText += '\n';
        }
        
        // Format composer dependencies
        const composerDeps = packageResults.find(result => result.composer && result.composer.length > 0);
        if (composerDeps?.composer) {
          packageInfoText += '### Composer Dependencies (PHP)\n\n';
          composerDeps.composer.forEach(dep => {
            packageInfoText += `- ${dep.name}${dep.constraint ? ` (${dep.constraint})` : ''}${dep.devDependency ? ' (dev)' : ''}\n`;
          });
          packageInfoText += '\n';
        }
        
        // Format python dependencies
        const pythonDeps = packageResults.find(result => result.python && result.python.length > 0);
        if (pythonDeps?.python) {
          packageInfoText += '### Python Dependencies\n\n';
          pythonDeps.python.forEach(dep => {
            packageInfoText += `- ${dep.name}${dep.constraint ? ` (${dep.constraint})` : ''}\n`;
          });
          packageInfoText += '\n';
        }
        
        // Format ruby dependencies
        const rubyDeps = packageResults.find(result => result.ruby && result.ruby.length > 0);
        if (rubyDeps?.ruby) {
          packageInfoText += '### Ruby Dependencies\n\n';
          rubyDeps.ruby.forEach(dep => {
            packageInfoText += `- ${dep.name}${dep.constraint ? ` (${dep.constraint})` : ''}${dep.devDependency ? ' (dev)' : ''}\n`;
          });
          packageInfoText += '\n';
        }
      }

      // Combine the prompt with package information
      const userPrompt = formatConsolidatedReviewPrompt(
        promptTemplate,
        projectName,
        fileInfos,
        projectDocs
      ) + packageInfoText;

      // Prepare the system prompt
      const systemPrompt = `You are an expert code reviewer and software architect. Focus on providing actionable feedback on the project's architecture, dependencies, and overall design. You will be given a codebase to review.

IMPORTANT: DO NOT REPEAT THE INSTRUCTIONS IN YOUR RESPONSE. DO NOT ASK FOR CODE TO REVIEW. ASSUME THE CODE IS ALREADY PROVIDED IN THE USER MESSAGE. FOCUS ONLY ON PROVIDING THE ARCHITECTURAL REVIEW CONTENT.

You have access to the following tools to help with your review:
- search_dependency_security: Use this to search for security information about a dependency
- batch_search_dependency_security: Use this to search for security information about multiple dependencies (up to 5)

ESSENTIAL TASK: For ALL major dependencies in the project, you MUST use these tools to thoroughly check for:
1. Security vulnerabilities and CVEs
2. Version updates and recommendations
3. Compatibility issues and breaking changes
4. Deprecation warnings
5. Maintenance status

Always include a dedicated "Dependency Security Analysis" section in your review that summarizes the findings from your dependency security checks. This is a critical part of the architectural review.`;

      try {
        // Prepare the tools with the handler
        const tools = anthropicToolCallingHandler.prepareTools(ALL_TOOLS);
        
        // Make the initial API request with tools
        const response = await fetchWithRetry(
          'https://api.anthropic.com/v1/messages',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey || '',
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: await getApiModelName(modelName),
              system: systemPrompt,
              messages: [{ role: 'user', content: userPrompt }],
              temperature: 0.2,
              max_tokens: MAX_TOKENS_PER_REQUEST,
              tools
            })
          }
        );

        const data = await response.json();
        logger.debug(`Initial response: ${JSON.stringify(data)}`);

        // Process tool calls from the response
        const { toolCalls, responseMessage } = 
          anthropicToolCallingHandler.processToolCallsFromResponse(data);
        
        // If there are tool calls, execute them
        if (toolCalls.length > 0) {
          logger.info(`Executing ${toolCalls.length} tool calls for architectural review...`);
          
          // Execute each tool call
          const toolResults = await Promise.all(
            toolCalls.map(async (toolCall) => ({
              toolName: toolCall.name,
              result: await executeToolCall(toolCall.name, toolCall.arguments)
            }))
          );
          
          // Build a conversation with the tool results
          const initialMessage = { role: 'user', content: userPrompt };
          const assistantMessage = { 
            role: 'assistant', 
            content: responseMessage 
          };
          
          // Create a conversation with the tool results
          const messages = anthropicToolCallingHandler.createToolResultsRequest(
            [initialMessage, assistantMessage],
            toolResults
          );

          // Add a final user prompt
          messages.push({
            role: 'user',
            content: 'Based on the security information provided by the tools, complete your architectural review with security recommendations.' +
                    ' Please ensure your response includes specific version recommendations for dependencies with security issues.'
          });
          
          // Make the final API request with tool results
          const finalResponse = await fetchWithRetry(
            'https://api.anthropic.com/v1/messages',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey || '',
                'anthropic-version': '2023-06-01'
              },
              body: JSON.stringify({
                model: await getApiModelName(modelName),
                messages,
                temperature: 0.2,
                max_tokens: MAX_TOKENS_PER_REQUEST
              })
            }
          );
          
          const finalData = await finalResponse.json();
          
          if (finalData.content && finalData.content.length > 0) {
            content = finalData.content[0].text;
            logger.info(`Successfully generated architectural review with tool calling using Anthropic ${modelName}`);
          } else {
            throw new Error(`Invalid response format from Anthropic ${modelName}`);
          }
        } else {
          // No tool calls, just use the initial response
          if (data.content && data.content.length > 0) {
            content = data.content[0].text;
            logger.info(`Successfully generated architectural review using Anthropic ${modelName}`);
          } else {
            throw new Error(`Invalid response format from Anthropic ${modelName}`);
          }
        }
        
        // Calculate cost information
        try {
          cost = getCostInfoFromText(content, `anthropic:${modelName}`);
        } catch (error) {
          logger.warn(
            `Failed to calculate cost information: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      } catch (error) {
        throw new Error(
          `Failed to generate architectural review with Anthropic ${modelName}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } else {
      // If tool calling is not supported, fall back to regular consolidated review
      logger.info(`Generating regular architectural review using Anthropic ${modelName}...`);
      return generateAnthropicConsolidatedReview(
        files,
        projectName,
        'architectural',
        projectDocs,
        options
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
      modelUsed: `anthropic:${modelName}`,
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
