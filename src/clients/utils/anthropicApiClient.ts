/**
 * @fileoverview Anthropic API client for making API requests.
 *
 * This module handles the direct interactions with the Anthropic API,
 * including making requests, handling responses, and managing retries.
 * It provides a clean interface for other components to interact with
 * the Anthropic API without dealing with the HTTP details.
 */

import { handleFetchResponse, safeJsonParse } from '../../utils/apiErrorHandler';
import configManager from '../../utils/configManager';
import logger from '../../utils/logger';

// The logger will be properly initialized at the application level

/**
 * Interface for responses from the Anthropic API
 */
export interface AnthropicResponse {
  content: Array<{ text: string }>;
}

/**
 * Fetches from the Anthropic API with retry logic
 * @param url API endpoint URL
 * @param options Request options
 * @param retries Number of retries to attempt
 * @returns Promise resolving to the response
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries?: number,
): Promise<Response> {
  // Use the configured max retries or fall back to default
  const maxRetries =
    retries !== undefined ? retries : configManager.getRateLimitConfig().maxRetries;
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Only log detailed debug info if debug mode is enabled
      if (configManager.getApplicationConfig().debug.value) {
        console.error(`\n\n==== ANTHROPIC API REQUEST ====`);
        console.error(`Attempt: ${i + 1}/${maxRetries}`);
        console.error(`URL: ${url}`);
        console.error(`Method: ${options.method}`);
        console.error(`Headers: ${JSON.stringify(options.headers, null, 2)}`);
        console.error(`Body (first 500 chars): ${String(options.body).substring(0, 500)}...`);
        console.error(`==== END REQUEST ====\n`);
      }

      const res = await fetch(url, options);

      // Only log detailed debug info if debug mode is enabled
      if (configManager.getApplicationConfig().debug.value) {
        console.error(`\n\n==== ANTHROPIC API RESPONSE ====`);
        console.error(`Status: ${res.status}`);
        console.error(`Status Text: ${res.statusText}`);
        // Convert headers to plain object safely without using iterator spread
        const headersObj: Record<string, string> = {};
        res.headers.forEach((value, key) => {
          if (key && value) headersObj[key] = value;
        });
        console.error(`Headers: ${JSON.stringify(headersObj, null, 2)}`);
        console.error(`==== END RESPONSE HEADERS ====\n`);
      }

      if (res.ok) return res;

      // Try to get more detailed error information
      try {
        const errorText = await res.text();
        // Only log detailed error info if debug mode is enabled
        if (configManager.getApplicationConfig().debug.value) {
          console.error(`\n\n==== ANTHROPIC API ERROR DETAILS ====`);
          console.error(`Error response body: ${errorText}`);

          // Attempt to parse and log structured error information
          try {
            const errorJson = JSON.parse(errorText);
            console.error(`Error type: ${errorJson.type || 'unknown'}`);
            console.error(`Error message: ${errorJson.message || 'unknown'}`);
            if (errorJson.error) {
              console.error(`Detailed error: ${JSON.stringify(errorJson.error, null, 2)}`);
            }
          } catch (jsonError) {
            console.error(
              `Error response is not valid JSON: ${
                jsonError instanceof Error ? jsonError.message : String(jsonError)
              }`,
            );
          }

          console.error(`==== END ERROR DETAILS ====\n\n`);
        }

        // Clone the response with the error text since we've consumed the stream
        return new Response(errorText, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      } catch (readError) {
        console.error(`Could not read error response: ${readError}`);
      }

      if (res.status === 429 || res.status >= 500) {
        // Use configured retry delay with exponential backoff
        const retryDelay = configManager.getRateLimitConfig().retryDelayMs * (i + 1);
        logger.debug(`Retrying after ${retryDelay}ms delay...`);
        await new Promise((r) => setTimeout(r, retryDelay));
      } else {
        logger.debug(`Non-retryable error status: ${res.status}`);
        throw new Error(
          `Anthropic API request failed with status ${res.status}: ${res.statusText}`,
        );
      }
    } catch (error) {
      logger.debug(`Fetch error: ${error}`);
      if (i === maxRetries - 1) throw error;
      // Use configured retry delay with exponential backoff
      const retryDelay = configManager.getRateLimitConfig().retryDelayMs * (i + 1);
      logger.debug(`Retrying after ${retryDelay}ms delay...`);
      await new Promise((r) => setTimeout(r, retryDelay));
    }
  }
  throw new Error('Anthropic API request failed after all retry attempts');
}

/**
 * Makes a simple test request to validate API access
 * @param apiKey The Anthropic API key
 * @param modelName The model name to use
 * @returns Promise resolving to a boolean indicating success
 */
export async function testAnthropicApiAccess(apiKey: string, modelName: string): Promise<boolean> {
  try {
    // Only log detailed debug info if debug mode is enabled
    if (configManager.getApplicationConfig().debug.value) {
      console.error('\n\n==== ANTHROPIC API DEBUG ====');
      console.error(`Testing model: ${modelName}`);
      console.error(`API URL: ${configManager.getApiEndpoint('anthropic')}`);
      console.error(`API Version: ${configManager.getApiVersion('anthropic')}`);
      console.error(`============================\n`);
    }

    // Regular logging
    logger.info(`Initializing Anthropic model: ${modelName}...`);

    // IMPORTANT: Get proper API model name from model mappings
    const { getApiModelName } = await import('./anthropicModelHelpers');

    // Look up the API-friendly model name from our model mappings
    const apiModelName = await getApiModelName(modelName);
    if (!apiModelName) {
      throw new Error(`Could not determine API model name for ${modelName}`);
    }

    logger.debug(`Test API access using model: ${apiModelName} (from ${modelName})`);
    console.error(`Test API access using model: ${apiModelName} (from ${modelName})`);

    // Prepare the request body with the mapped model name
    const requestBody = {
      model: apiModelName, // Use the format from our configuration
      system: 'You are a helpful AI assistant.',
      messages: [
        {
          role: 'user',
          content: 'Hello, are you available for a code review task?',
        },
      ],
      max_tokens: 100,
    };

    // Detailed request logging
    logger.info(`Testing Anthropic API with model: ${apiModelName}`);
    logger.debug(`Request URL: https://api.anthropic.com/v1/messages`);
    logger.debug(
      `Request headers: Content-Type: application/json, anthropic-version: 2023-06-01, anthropic-beta: messages-2023-12-15`,
    );
    logger.debug(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

    // Direct console logging to help debug issues
    // Only log detailed debug info if debug mode is enabled
    if (configManager.getApplicationConfig().debug.value) {
      console.log(`\n\n==== ANTHROPIC API REQUEST ====`);
      console.log(`URL: ${configManager.getApiEndpoint('anthropic')}`);
      console.log(`API Version: ${configManager.getApiVersion('anthropic')}`);
      console.log(`API Beta: messages-2023-12-15`);
      console.log(`Converted model: ${modelName} → ${apiModelName}`);
      console.log(`API Key exists: ${apiKey ? 'YES' : 'NO'}`);
      console.log(`API Key first 5 chars: ${apiKey?.substring(0, 5)}...`);
      console.log(`============================\n`);
    }

    // Use the configured API endpoint
    const apiEndpoint = configManager.getApiEndpoint('anthropic');

    const response = await fetchWithRetry(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': configManager.getApiVersion('anthropic'),
        'anthropic-beta': 'messages-2023-12-15',
        Accept: 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Try to parse the response
    try {
      logger.debug(`Response status: ${response.status}`);
      const responseText = await response.text();
      logger.debug(`Response text: ${responseText}`);

      // Additional detailed logging for debugging Anthropic API issues
      logger.debug(`==== ANTHROPIC DEBUG ====`);
      logger.debug(`Request to Anthropic API for model: ${apiModelName}`);
      logger.debug(`Response status: ${response.status}`);
      logger.debug(`Response text: ${responseText}`);
      logger.debug(`========================`);

      if (!response.ok) {
        logger.error(`Error initializing Anthropic model ${modelName}: ${responseText}`);
        return false;
      }

      try {
        const data = JSON.parse(responseText);
        logger.debug(`Parsed response: ${JSON.stringify(data, null, 2)}`);

        if (data.content && data.content.length > 0) {
          logger.info(`Successfully initialized Anthropic model: ${modelName}`);
          return true;
        }

        logger.error(
          `Unexpected response format from Anthropic model ${modelName}: ${JSON.stringify(data)}`,
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
 * Makes a request to the Anthropic API for message completion
 * @param apiKey The Anthropic API key
 * @param modelName The model name to use
 * @param systemPrompt The system prompt
 * @param userPrompt The user prompt
 * @param temperature The temperature parameter
 * @param tools Optional tools for tool calling
 * @returns Promise resolving to the response data
 */
export async function makeAnthropicRequest(
  apiKey: string,
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  temperature = 0.2,
  tools?: Record<string, unknown>[],
): Promise<AnthropicResponse> {
  // Get proper API model name from model mappings
  const { getApiModelName } = await import('./anthropicModelHelpers');

  // Look up the API-friendly model name from our model mappings
  const apiModelName = await getApiModelName(modelName);
  if (!apiModelName) {
    throw new Error(`Could not determine API model name for ${modelName}`);
  }
  logger.debug(
    `makeAnthropicRequest: Using model ${apiModelName} from mappings (model: ${modelName})`,
  );

  // Prepare the request options
  const requestOptions: Record<string, unknown> = {
    model: apiModelName, // Use the format from our configuration
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature,
    max_tokens: configManager.getTokenConfig('anthropic').maxTokensPerRequest,
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestOptions.tools = tools;
  }

  // Use the configured API endpoint
  const apiEndpoint = configManager.getApiEndpoint('anthropic');

  const response = await fetchWithRetry(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': configManager.getApiVersion('anthropic'),
      'anthropic-beta': 'messages-2023-12-15',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestOptions),
  });

  // Handle response errors
  await handleFetchResponse(response, 'Anthropic');

  // Parse the response safely
  return safeJsonParse<AnthropicResponse>(response, 'Anthropic');
}

/**
 * Makes a request to the Anthropic API with a full conversation history
 * @param apiKey The Anthropic API key
 * @param modelName The model name to use
 * @param messages The full conversation history
 * @param temperature The temperature parameter
 * @returns Promise resolving to the response data
 * @throws Error if the API request fails or returns invalid data
 */
export async function makeAnthropicConversationRequest(
  apiKey: string,
  modelName: string,
  messages: Array<{ role: string; content: unknown }>,
  temperature = 0.2,
): Promise<AnthropicResponse> {
  if (!apiKey) {
    logger.error('Anthropic API key is missing');
    throw new Error('Anthropic API key is required but was not provided');
  }

  if (!modelName) {
    logger.error('Model name is missing');
    throw new Error('Model name is required but was not provided');
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    logger.error('Invalid or empty messages array provided');
    throw new Error('Valid messages array is required for conversation request');
  }

  try {
    // Get proper API model name from model mappings
    const { getApiModelName } = await import('./anthropicModelHelpers');

    // Look up the API-friendly model name from our model mappings
    const apiModelName = await getApiModelName(modelName);
    if (!apiModelName) {
      throw new Error(`Could not determine API model name for ${modelName}`);
    }
    logger.debug(
      `makeAnthropicConversationRequest: Using model ${apiModelName} from mappings (model: ${modelName})`,
    );

    // Validate the messages array format
    for (const message of messages) {
      if (
        !message.role ||
        (message.role !== 'user' && message.role !== 'assistant' && message.role !== 'system')
      ) {
        logger.error(`Invalid message role: ${message.role}`);
        throw new Error(
          `Message role must be "user", "assistant", or "system", but got "${message.role}"`,
        );
      }

      if (message.content === undefined || message.content === null) {
        logger.error('Message content is missing');
        throw new Error('Message content is required for all messages');
      }
    }

    // Use the configured API endpoint
    const apiEndpoint = configManager.getApiEndpoint('anthropic');

    logger.debug(`Making request to Anthropic API: ${apiEndpoint}`);
    logger.debug(`Using model: ${apiModelName}`);
    logger.debug(`Message count: ${messages.length}`);

    try {
      const response = await fetchWithRetry(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': configManager.getApiVersion('anthropic'),
          'anthropic-beta': 'messages-2023-12-15',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          model: apiModelName,
          messages,
          temperature,
          max_tokens: configManager.getTokenConfig('anthropic').maxTokensPerRequest,
        }),
      });

      // Handle error responses
      if (!response.ok) {
        let errorBody = 'Unknown error';
        try {
          errorBody = await response.text();

          // Attempt to parse error as JSON for more details
          try {
            const errorJson = JSON.parse(errorBody);
            const errorType = errorJson.type || 'unknown';
            const errorMessage = errorJson.message || errorBody;

            logger.error(`Anthropic API error (${errorType}): ${errorMessage}`);
            logger.debug(`Full error response: ${JSON.stringify(errorJson, null, 2)}`);

            throw new Error(`Anthropic API error (${errorType}): ${errorMessage}`);
          } catch (parseError) {
            // If we can't parse as JSON, use the raw error body
            logger.error(`Anthropic API error: ${errorBody}`);
            throw new Error(`Anthropic API error: ${errorBody}`);
          }
        } catch (readError) {
          // If we can't even read the error response
          logger.error(`Anthropic API error (status ${response.status}): ${response.statusText}`);
          logger.debug(
            `Error reading error response: ${
              readError instanceof Error ? readError.message : String(readError)
            }`,
          );

          throw new Error(
            `Anthropic API error (status ${response.status}): ${response.statusText}`,
          );
        }
      }

      // Parse the response
      try {
        const jsonResponse = (await response.json()) as AnthropicResponse;

        // Validate the response format
        if (!jsonResponse.content || !Array.isArray(jsonResponse.content)) {
          logger.error(
            'Invalid response format from Anthropic API: missing or invalid content array',
          );
          throw new Error(
            'Invalid response format from Anthropic API: missing or invalid content array',
          );
        }

        return jsonResponse;
      } catch (parseError) {
        logger.error(
          `Error parsing Anthropic API response: ${
            parseError instanceof Error ? parseError.message : String(parseError)
          }`,
        );
        throw new Error(
          `Failed to parse Anthropic API response: ${
            parseError instanceof Error ? parseError.message : String(parseError)
          }`,
        );
      }
    } catch (fetchError) {
      // This will catch errors from fetchWithRetry
      if (fetchError instanceof Error) {
        logger.error(`Error communicating with Anthropic API: ${fetchError.message}`);
        throw fetchError; // Rethrow with original stack trace
      }
      logger.error(`Unknown error communicating with Anthropic API: ${String(fetchError)}`);
      throw new Error(`Unknown error communicating with Anthropic API: ${String(fetchError)}`);
    }
  } catch (error) {
    // Catch any other errors in this function
    if (error instanceof Error) {
      // If it's already an Error object, just rethrow it
      throw error;
    }
    // If it's some other type, wrap it in an Error
    logger.error(`Unexpected error in makeAnthropicConversationRequest: ${String(error)}`);
    throw new Error(`Unexpected error in makeAnthropicConversationRequest: ${String(error)}`);
  }
}
