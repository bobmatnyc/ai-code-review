/**
 * @fileoverview Anthropic API client for making API requests.
 *
 * This module handles the direct interactions with the Anthropic API,
 * including making requests, handling responses, and managing retries.
 * It provides a clean interface for other components to interact with
 * the Anthropic API without dealing with the HTTP details.
 */

import logger from '../../utils/logger';
import {
  handleFetchResponse,
  safeJsonParse,
  ApiError
} from '../../utils/apiErrorHandler';

/**
 * Maximum tokens to request from the API for a single response
 */
export const MAX_TOKENS_PER_REQUEST = 4000;

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
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      logger.debug(`Anthropic API request attempt ${i + 1}/${retries}`);
      const res = await fetch(url, options);
      logger.debug(`Anthropic API response status: ${res.status}`);

      if (res.ok) return res;

      // Try to get more detailed error information
      try {
        const errorText = await res.text();
        logger.debug(`Anthropic API error response: ${errorText}`);
      } catch (readError) {
        logger.debug(`Could not read error response: ${readError}`);
      }

      if (res.status === 429 || res.status >= 500) {
        logger.debug(`Retrying after ${1000 * (i + 1)}ms delay...`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      } else {
        logger.debug(`Non-retryable error status: ${res.status}`);
        throw new Error(
          `Anthropic API request failed with status ${res.status}`
        );
      }
    } catch (error) {
      logger.debug(`Fetch error: ${error}`);
      if (i === retries - 1) throw error;
      logger.debug(`Retrying after ${1000 * (i + 1)}ms delay...`);
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
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
export async function testAnthropicApiAccess(
  apiKey: string | undefined,
  modelName: string
): Promise<boolean> {
  try {
    logger.info(`Initializing Anthropic model: ${modelName}...`);

    // Prepare the request body
    const requestBody = {
      model: modelName,
      system: 'You are a helpful AI assistant.',
      messages: [
        {
          role: 'user',
          content: 'Hello, are you available for a code review task?'
        }
      ],
      max_tokens: 100
    };

    logger.debug(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

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
      logger.debug(`Response status: ${response.status}`);
      const responseText = await response.text();
      logger.debug(`Response text: ${responseText}`);

      if (!response.ok) {
        logger.error(
          `Error initializing Anthropic model ${modelName}: ${responseText}`
        );
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
  apiKey: string | undefined,
  modelName: string,
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.2,
  tools?: any[]
): Promise<AnthropicResponse> {
  // Prepare the request options
  const requestOptions: Record<string, any> = {
    model: modelName,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature,
    max_tokens: MAX_TOKENS_PER_REQUEST
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestOptions.tools = tools;
  }

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
      body: JSON.stringify(requestOptions)
    }
  );

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
 */
export async function makeAnthropicConversationRequest(
  apiKey: string | undefined,
  modelName: string,
  messages: Array<{ role: string; content: any }>,
  temperature: number = 0.2
): Promise<AnthropicResponse> {
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
        model: modelName,
        messages,
        temperature,
        max_tokens: MAX_TOKENS_PER_REQUEST
      })
    }
  );

  // Handle error responses
  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Anthropic API error: ${errorBody}`);
  }

  // Parse and return the response
  return response.json();
}