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
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: any
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
    details?: any
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
  constructor(message: string, statusCode?: number, details?: any) {
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
  constructor(message: string, statusCode?: number, details?: any) {
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
  constructor(message: string, statusCode?: number, details?: any) {
    super(message, statusCode, details);
    this.name = 'InvalidResponseError';
    // Ensure instanceof works correctly in ES5
    Object.setPrototypeOf(this, InvalidResponseError.prototype);
  }
}

/**
 * Handle a fetch response and throw appropriate errors if needed
 * @param response The fetch response object
 * @param apiName The name of the API being called (for logging)
 * @returns The response if it's ok
 * @throws ApiError if the response is not ok
 */
export async function handleFetchResponse(
  response: Response | any,
  apiName: string
): Promise<Response | any> {
  if (!response.ok) {
    // Try to get the error body
    let errorBody: string | object = 'Unknown error';
    try {
      // Try to parse as JSON first
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        errorBody = await response.json();
      } else {
        errorBody = await response.text();
      }
    } catch (e) {
      // Ignore body read errors
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
      throw new AuthenticationError(
        errorMessage,
        response.status,
        errorBody
      );
    } else if (response.status === 404) {
      throw new NotFoundError(
        errorMessage,
        response.status,
        errorBody
      );
    } else if (response.status === 429) {
      // Check for retry-after header
      const retryAfter = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

      throw new RateLimitError(
        errorMessage,
        retryAfterSeconds,
        response.status,
        errorBody
      );
    } else {
      throw new ApiError(
        errorMessage,
        response.status,
        errorBody
      );
    }
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
export async function safeJsonParse<T>(
  response: Response | any,
  apiName: string
): Promise<T> {
  try {
    return await response.json() as T;
  } catch (error) {
    const errorMessage = `Failed to parse ${apiName} API response as JSON: ${
      error instanceof Error ? error.message : String(error)
    }`;
    logger.error(errorMessage);
    throw new InvalidResponseError(errorMessage);
  }
}

/**
 * Log an API error with context information
 * @param error The error that occurred
 * @param context Additional context information
 */
export function logApiError(
  error: unknown,
  context: { operation: string; url?: string; apiName: string }
): void {
  const { operation, url, apiName } = context;

  if (error instanceof RateLimitError) {
    logger.warn(
      `Rate limit exceeded for ${apiName} API during ${operation}${
        url ? ` (${url})` : ''
      }. Retry after: ${error.retryAfter || 'unknown'} seconds.`
    );
  } else if (error instanceof AuthenticationError) {
    logger.error(
      `Authentication failed for ${apiName} API during ${operation}${
        url ? ` (${url})` : ''
      }. Check your API key.`
    );
  } else if (error instanceof NotFoundError) {
    logger.error(
      `Resource not found on ${apiName} API during ${operation}${
        url ? ` (${url})` : ''
      }. Check your request parameters.`
    );
  } else if (error instanceof InvalidResponseError) {
    logger.error(
      `Invalid response from ${apiName} API during ${operation}${
        url ? ` (${url})` : ''
      }. The API may have changed or returned an unexpected format.`
    );
  } else if (error instanceof ApiError) {
    logger.error(
      `API error from ${apiName} during ${operation}${
        url ? ` (${url})` : ''
      }: ${error.message}`
    );
  } else {
    logger.error(
      `Unexpected error during ${apiName} API ${operation}${
        url ? ` (${url})` : ''
      }: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
