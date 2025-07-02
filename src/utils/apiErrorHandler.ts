/**
 * @fileoverview API error handling utilities.
 *
 * This module provides standardized error handling for API calls,
 * including custom error classes for different types of API errors,
 * utility functions for handling fetch responses, and logging helpers.
 */

import logger from './logger';

/**
 * Base class for API errors
 *
 * This class extends the standard Error class to provide additional context
 * for API-related errors. It includes properties for the HTTP status code
 * and additional error details from the API response.
 *
 * All specific API error types (like AuthenticationError, RateLimitError, etc.)
 * extend this base class to provide a consistent error handling interface.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    // Ensure instanceof works correctly in ES5
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Error thrown when API rate limits are exceeded
 */
export class RateLimitError extends ApiError {
  constructor(
    message: string,
    public retryAfter?: number,
    statusCode?: number,
    details?: unknown,
  ) {
    super(message, statusCode, details);
    this.name = 'RateLimitError';
    // Ensure instanceof works correctly in ES5
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends ApiError {
  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'AuthenticationError';
    // Ensure instanceof works correctly in ES5
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Error thrown when a resource is not found
 */
export class NotFoundError extends ApiError {
  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'NotFoundError';
    // Ensure instanceof works correctly in ES5
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Error thrown when the API returns an invalid response format
 */
export class InvalidResponseError extends ApiError {
  constructor(message: string, statusCode?: number, details?: unknown) {
    super(message, statusCode, details);
    this.name = 'InvalidResponseError';
    // Ensure instanceof works correctly in ES5
    Object.setPrototypeOf(this, InvalidResponseError.prototype);
  }
}

/**
 * Handle a fetch response and throw appropriate errors if needed
 *
 * This function processes a fetch response and throws appropriate error types
 * based on the HTTP status code and response body. It handles common API error
 * scenarios like authentication failures, rate limiting, and resource not found.
 *
 * The function attempts to parse the response body as JSON if possible, or falls
 * back to text if not. It then constructs an appropriate error object with
 * detailed information about what went wrong.
 *
 * @param response The fetch response object from an API call
 * @param apiName The name of the API being called (for logging and error messages)
 * @returns The original response object if the response is ok (status 200-299)
 * @throws AuthenticationError for 401/403 status codes (authentication/authorization issues)
 * @throws NotFoundError for 404 status codes (resource not found)
 * @throws RateLimitError for 429 status codes (rate limit exceeded)
 * @throws ApiError for all other error status codes
 * @example
 * try {
 *   const response = await fetch('https://api.example.com/data');
 *   await handleFetchResponse(response, 'ExampleAPI');
 *   // Process successful response
 * } catch (error) {
 *   // Error is already logged and has the appropriate type
 *   if (error instanceof RateLimitError) {
 *     // Handle rate limiting specifically
 *   }
 * }
 */
export async function handleFetchResponse(response: Response, apiName: string): Promise<Response> {
  if (!response.ok) {
    // Try to get the error body
    let errorBody: string | object = 'Unknown error';
    try {
      // Clone the response so we can read it multiple times if needed
      // const clonedResponse = response.clone();

      // Log all headers for debugging
      console.log(`[DEBUG] ${apiName} API response headers:`);
      response.headers.forEach((value: string, name: string) => {
        console.log(`[DEBUG] ${name}: ${value}`);
      });

      // Try to parse as JSON first
      const contentType = response.headers.get('content-type');
      console.log(`[DEBUG] Content-Type: ${contentType}`);

      if (contentType && contentType.includes('application/json')) {
        errorBody = await response.json();
        console.log(`[DEBUG] JSON error body: ${JSON.stringify(errorBody)}`);
      } else {
        errorBody = await response.text();
        console.log(`[DEBUG] Text error body: ${errorBody}`);
      }
    } catch (e) {
      // Log body read errors
      console.log(
        `[DEBUG] Failed to read error body: ${e instanceof Error ? e.message : String(e)}`,
      );
      logger.debug(`Failed to read error body: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Create appropriate error based on status code
    const errorMessage = `${apiName} API error! Status: ${response.status}, Response: ${
      typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody)
    }`;

    // Log the error
    logger.error(errorMessage);

    // Throw appropriate error based on status code
    if (response.status === 401 || response.status === 403) {
      throw new AuthenticationError(errorMessage, response.status, errorBody);
    }
    if (response.status === 404) {
      throw new NotFoundError(errorMessage, response.status, errorBody);
    }
    if (response.status === 429) {
      // Check for retry-after header
      const retryAfter = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

      throw new RateLimitError(errorMessage, retryAfterSeconds, response.status, errorBody);
    }
    throw new ApiError(errorMessage, response.status, errorBody);
  }

  return response;
}

/**
 * Safely parse JSON from a response
 * @param response The fetch response object
 * @param apiName The name of the API being called (for logging)
 * @returns The parsed JSON data
 * @throws InvalidResponseError if the response cannot be parsed as JSON
 */
export async function safeJsonParse<T>(response: Response | any, apiName: string): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    const errorMessage = `Failed to parse ${apiName} API response as JSON: ${
      error instanceof Error ? error.message : String(error)
    }`;
    logger.error(errorMessage);
    throw new InvalidResponseError(errorMessage);
  }
}

/**
 * Log an API error with appropriate context and formatting
 *
 * This function logs API errors with rich context information to help with debugging
 * and troubleshooting. It detects the specific type of error and formats the log
 * message accordingly, providing different information based on the error type.
 *
 * The function handles various error types including:
 * - Rate limit errors (with retry information)
 * - Authentication errors
 * - Resource not found errors
 * - Invalid response errors
 * - General API errors
 * - Unexpected errors
 *
 * @param error The error object that was thrown
 * @param context Object containing context information:
 *   - apiName: The name of the API service (e.g., 'OpenAI', 'Anthropic')
 *   - operation: The operation being performed (e.g., 'generating review')
 *   - url: Optional URL for the request that failed
 * @example
 * try {
 *   // API call that might fail
 * } catch (error) {
 *   logApiError(error, {
 *     apiName: 'OpenAI',
 *     operation: 'generating code review',
 *     url: 'https://api.openai.com/v1/chat/completions'
 *   });
 * }
 */
export function logApiError(
  error: unknown,
  context: { operation: string; url?: string; apiName: string },
): void {
  const { operation, url, apiName } = context;

  if (error instanceof RateLimitError) {
    logger.warn(
      `Rate limit exceeded for ${apiName} API during ${operation}${
        url ? ` (${url})` : ''
      }. Retry after: ${error.retryAfter || 'unknown'} seconds.`,
    );
  } else if (error instanceof AuthenticationError) {
    logger.error(
      `Authentication failed for ${apiName} API during ${operation}${
        url ? ` (${url})` : ''
      }. Check your API key.`,
    );
  } else if (error instanceof NotFoundError) {
    logger.error(
      `Resource not found on ${apiName} API during ${operation}${
        url ? ` (${url})` : ''
      }. Check your request parameters.`,
    );
  } else if (error instanceof InvalidResponseError) {
    logger.error(
      `Invalid response from ${apiName} API during ${operation}${
        url ? ` (${url})` : ''
      }. The API may have changed or returned an unexpected format.`,
    );
  } else if (error instanceof ApiError) {
    logger.error(
      `API error from ${apiName} during ${operation}${url ? ` (${url})` : ''}: ${error.message}`,
    );
  } else {
    logger.error(
      `Unexpected error during ${apiName} API ${operation}${
        url ? ` (${url})` : ''
      }: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
