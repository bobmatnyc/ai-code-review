/**
 * @fileoverview Anthropic API client for making API requests.
 *
 * This module handles the direct interactions with the Anthropic API,
 * including making requests, handling responses, and managing retries.
 * It provides a clean interface for other components to interact with
 * the Anthropic API without dealing with the HTTP details.
 */

import logger /* , { LogLevel } */ from '../../utils/logger'; // LogLevel not used
import {
  handleFetchResponse,
  safeJsonParse
  // ApiError // Not used in this file
} from '../../utils/apiErrorHandler';

// The logger will be properly initialized at the application level

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
      console.error(`\n\n==== ANTHROPIC API REQUEST ====`);
      console.error(`Attempt: ${i + 1}/${retries}`);
      console.error(`URL: ${url}`);
      console.error(`Method: ${options.method}`);
      console.error(`Headers: ${JSON.stringify(options.headers, null, 2)}`);
      console.error(`Body (first 500 chars): ${String(options.body).substring(0, 500)}...`);
      console.error(`==== END REQUEST ====\n`);
      
      const res = await fetch(url, options);
      
      console.error(`\n\n==== ANTHROPIC API RESPONSE ====`);
      console.error(`Status: ${res.status}`);
      console.error(`Status Text: ${res.statusText}`);
      console.error(`Headers: ${JSON.stringify(Object.fromEntries([...res.headers.entries()]), null, 2)}`);
      console.error(`==== END RESPONSE HEADERS ====\n`);

      if (res.ok) return res;

      // Try to get more detailed error information
      try {
        const errorText = await res.text();
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
          console.error(`Error response is not valid JSON: ${
            jsonError instanceof Error ? jsonError.message : String(jsonError)
          }`);
        }
        
        console.error(`==== END ERROR DETAILS ====\n\n`);
        
        // Clone the response with the error text since we've consumed the stream
        return new Response(errorText, { 
          status: res.status, 
          statusText: res.statusText,
          headers: res.headers
        });
      } catch (readError) {
        console.error(`Could not read error response: ${readError}`);
      }

      if (res.status === 429 || res.status >= 500) {
        logger.debug(`Retrying after ${1000 * (i + 1)}ms delay...`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      } else {
        logger.debug(`Non-retryable error status: ${res.status}`);
        throw new Error(
          `Anthropic API request failed with status ${res.status}: ${res.statusText}`
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
    // DIRECT CONSOLE OUTPUT - bypassing logger completely
    console.error("\n\n==== ANTHROPIC API DEBUG ====");
    console.error(`Testing model: ${modelName}`);
    console.error(`API URL: https://api.anthropic.com/v1/messages`);
    console.error(`API Version: 2023-06-01`);
    console.error(`============================\n`);
    
    // Regular logging
    logger.info(`Initializing Anthropic model: ${modelName}...`);

    // IMPORTANT: Get proper API model name from model mappings
    const { getApiModelName } = await import('./anthropicModelHelpers');
    
    // Look up the API-friendly model name from our model mappings
    const apiModelName = await getApiModelName(modelName);
    
    logger.debug(`Test API access using model: ${apiModelName} (from ${modelName})`);
    console.error(`Test API access using model: ${apiModelName} (from ${modelName})`);
    
    // Prepare the request body with the mapped model name
    const requestBody = {
      model: apiModelName, // Use the format from our configuration
      system: 'You are a helpful AI assistant.',
      messages: [
        {
          role: 'user',
          content: 'Hello, are you available for a code review task?'
        }
      ],
      max_tokens: 100
    };

    // Detailed request logging
    logger.info(`Testing Anthropic API with model: ${apiModelName}`);
    logger.debug(`Request URL: https://api.anthropic.com/v1/messages`);
    logger.debug(`Request headers: Content-Type: application/json, anthropic-version: 2023-06-01, anthropic-beta: messages-2023-12-15`);
    logger.debug(`Request body: ${JSON.stringify(requestBody, null, 2)}`);

    // Direct console logging to help debug issues
    console.log(`\n\n==== ANTHROPIC API REQUEST ====`);
    console.log(`URL: https://api.anthropic.com/v1/messages`);
    console.log(`API Version: 2023-06-01`);
    console.log(`API Beta: messages-2023-12-15`);
    console.log(`Converted model: ${modelName} → ${apiModelName}`);
    console.log(`API Key exists: ${apiKey ? 'YES' : 'NO'}`);
    console.log(`API Key first 5 chars: ${apiKey?.substring(0, 5)}...`);
    console.log(`============================\n`);
    
    // Use the standard API endpoint
    const apiEndpoint = 'https://api.anthropic.com/v1/messages';
    
    const response = await fetchWithRetry(
      apiEndpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey || '',
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'messages-2023-12-15',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    );

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
  // Get proper API model name from model mappings
  const { getApiModelName } = await import('./anthropicModelHelpers');
  
  // Look up the API-friendly model name from our model mappings
  const apiModelName = await getApiModelName(modelName);
  logger.debug(`makeAnthropicRequest: Using model ${apiModelName} from mappings (model: ${modelName})`);
  
  // Prepare the request options
  const requestOptions: Record<string, any> = {
    model: apiModelName, // Use the format from our configuration
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    temperature,
    max_tokens: MAX_TOKENS_PER_REQUEST
  };

  // Add tools if provided
  if (tools && tools.length > 0) {
    requestOptions.tools = tools;
  }

  // Make the API request using the standard messages endpoint
  const apiEndpoint = 'https://api.anthropic.com/v1/messages';
  
  const response = await fetchWithRetry(
    apiEndpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'messages-2023-12-15',
        'Accept': 'application/json'
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
  // Get proper API model name from model mappings
  const { getApiModelName } = await import('./anthropicModelHelpers');
  
  // Look up the API-friendly model name from our model mappings
  const apiModelName = await getApiModelName(modelName);
  logger.debug(`makeAnthropicConversationRequest: Using model ${apiModelName} from mappings (model: ${modelName})`);
  
  // Make the API request using the standard messages endpoint
  const apiEndpoint = 'https://api.anthropic.com/v1/messages';
  
  const response = await fetchWithRetry(
    apiEndpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || '',
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'messages-2023-12-15',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: apiModelName,
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