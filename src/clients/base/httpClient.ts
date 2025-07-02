/**
 * @fileoverview HTTP client utilities for API interactions.
 *
 * This module provides common HTTP request handling functionality with retry logic,
 * error handling, and timeout management. It's designed to be used by the various
 * AI API client implementations.
 */

import { ApiError } from '../../utils/apiErrorHandler';
import logger from '../../utils/logger';

/**
 * Fetch with automatic retry for transient errors
 * @param url The URL to fetch from
 * @param options Request options
 * @param retries Number of retries to attempt
 * @returns Promise resolving to the Response object
 * @throws Error if all retries fail
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
): Promise<Response> {
  logger.debug(`[FETCH DEBUG] fetchWithRetry called with url: ${url}`);
  for (let i = 0; i < retries; i++) {
    try {
      logger.debug(`Making API request to ${url} (attempt ${i + 1}/${retries})`);
      const res = await fetch(url, options);

      if (res.ok) {
        return res;
      }

      logger.error(`[FETCH DEBUG] Request failed with status: ${res.status}`);

      // Handle rate limiting and server errors with exponential backoff
      if (res.status === 429 || res.status >= 500) {
        const retryAfter = res.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 1000 * 2 ** i;

        logger.warn(`Request failed with status ${res.status}. Retrying in ${delayMs / 1000}s...`);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        // For other errors, try to get more detailed information
        try {
          const errorBody = await res.json();
          const requestId = res.headers.get('x-request-id') || res.headers.get('request-id');

          logger.error(`API error response: ${JSON.stringify(errorBody, null, 2)}`);
          logger.error(`Request URL: ${url}`);
          logger.error(`Request headers: ${JSON.stringify(options.headers, null, 2)}`);

          // Log request body if it exists (but mask API keys)
          let modelInfo = '';
          if (options.body) {
            try {
              const body = JSON.parse(options.body as string);
              if (body.messages) {
                // Only log message structure, not content
                logger.error(`Request had ${body.messages.length} messages`);
              }
              modelInfo = body.model || '';
              logger.error(`Request model: ${body.model}`);
              logger.error(`Request max_tokens: ${body.max_tokens}`);
              logger.error(`Request max_completion_tokens: ${body.max_completion_tokens}`);
            } catch {
              // If body isn't JSON, just note that
              logger.error('Request body was not JSON');
            }
          }

          // Create detailed error message
          const errorDetails: string[] = [
            `API request failed`,
            `Endpoint: ${url}`,
            `Status: ${res.status}`,
            `Error: ${errorBody.error?.message || JSON.stringify(errorBody)}`,
          ];

          if (requestId) {
            errorDetails.push(`Request ID: ${requestId}`);
          }

          if (modelInfo) {
            errorDetails.push(`Model: ${modelInfo}`);
          }

          throw new ApiError(errorDetails.join('\n  '));
        } catch (parseError) {
          // If we can't parse the error response, just use the status
          if (parseError instanceof ApiError) {
            throw parseError;
          }

          logger.error(`Failed to parse error response, status: ${res.status}`);
          throw new ApiError(
            `API request failed\n  Endpoint: ${url}\n  Status: ${res.status}\n  Error: Unable to parse error response`,
          );
        }
      }
    } catch (error) {
      // For network errors or other exceptions, retry if we have retries left
      if (i < retries - 1 && !(error instanceof ApiError)) {
        const delayMs = 1000 * 2 ** i;
        logger.warn(
          `Request failed with error: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delayMs / 1000}s...`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw error;
      }
    }
  }

  throw new ApiError(`Failed after ${retries} retries`);
}

/**
 * Generic retry mechanism for any asynchronous function
 * @param fn The function to retry
 * @param retries Maximum number of retries
 * @returns Promise resolving to the function's result
 * @throws Error if all retries fail
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: unknown) {
      // Type guard for errors with status property
      const err = error as { status?: number };

      // Handle rate limiting and server errors
      if ((err.status === 429 || (err.status && err.status >= 500)) && i < retries - 1) {
        const delayMs = 1000 * 2 ** i;
        logger.warn(
          `Operation failed with status ${err.status}. Retrying in ${delayMs / 1000}s...`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      } else if (i < retries - 1) {
        // For other errors, retry with backoff
        const delayMs = 1000 * 2 ** i;
        logger.warn(
          `Operation failed: ${error instanceof Error ? error.message : String(error)}. Retrying in ${delayMs / 1000}s...`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw error;
      }
    }
  }

  throw new ApiError(`Failed after ${retries} retries`);
}
