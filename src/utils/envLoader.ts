/**
 * @fileoverview Environment variable loading and validation utilities.
 *
 * This module provides utilities for loading, validating, and accessing environment
 * variables used by the code review tool. It handles loading from .env.local files,
 * provides clear error messages for missing variables, and manages API key precedence.
 *
 * Key responsibilities:
 * - Loading environment variables from .env.local
 * - Validating required environment variables
 * - Managing API key precedence (GOOGLE_GENERATIVE_AI_KEY vs GOOGLE_AI_STUDIO_KEY)
 * - Providing clear error messages for configuration issues
 * - Logging environment variable status without exposing sensitive values
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import fs from 'fs/promises';

/**
 * Load environment variables from .env.local file
 * @param envFilePath Optional custom path to .env file
 * @returns Object containing information about the loading process
 */
export async function loadEnvVariables(envFilePath?: string): Promise<{
  success: boolean;
  message: string;
  envFile?: string;
}> {
  try {
    // Default to .env.local in current working directory
    const envLocalPath = envFilePath || path.resolve(process.cwd(), '.env.local');

    // Check if the file exists
    try {
      await fs.access(envLocalPath);
    } catch (error) {
      return {
        success: false,
        message: `Environment file not found: ${envLocalPath}. Please create this file with your API keys.`
      };
    }

    // Check if debug mode is enabled
    const isDebugMode = process.argv.includes('--debug');

    // Helper function for debug logging
    function debugLog(message: string): void {
      if (isDebugMode) {
        console.log(`\x1b[36m[DEBUG]\x1b[0m ${message}`);
      }
    }

    // Load environment variables
    debugLog(`Attempting to load environment variables from: ${envLocalPath}`);
    const result = dotenv.config({ path: envLocalPath });

    if (result.error) {
      return {
        success: false,
        message: `Error loading environment variables: ${result.error.message}`,
        envFile: envLocalPath
      };
    }

    // Log success without exposing values
    debugLog(`Successfully loaded environment variables from ${envLocalPath}`);

    // Log which variables were found (names only, not values)
    const envVarNames = Object.keys(result.parsed || {});
    if (envVarNames.length > 0 && isDebugMode) {
      debugLog('Variables found in .env.local (names only):');
      debugLog(envVarNames.join(', '));
    } else if (isDebugMode) {
      debugLog('No variables found in .env.local');
    }

    return {
      success: true,
      message: `Successfully loaded environment variables from ${envLocalPath}`,
      envFile: envLocalPath
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Unexpected error loading environment variables: ${error.message || error}`
    };
  }
}

/**
 * Get the Google API key with proper precedence handling
 * @returns Object containing the API key and information about which key was used
 */
export function getGoogleApiKey(): {
  apiKey: string | undefined;
  source: string;
  message: string;
} {
  // Check if debug mode is enabled
  const isDebugMode = process.argv.includes('--debug');

  // Helper function for debug logging
  function debugLog(message: string): void {
    if (isDebugMode) {
      console.log(`\x1b[36m[DEBUG]\x1b[0m ${message}`);
    }
  }

  // Check for API keys in order of preference
  const apiKeyNew = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;
  const apiKeyLegacy = process.env.CODE_REVIEW_GOOGLE_API_KEY;
  const apiKeyGenAI = process.env.GOOGLE_GENERATIVE_AI_KEY;
  const apiKeyStudio = process.env.GOOGLE_AI_STUDIO_KEY;

  // Preferred key: AI_CODE_REVIEW_GOOGLE_API_KEY
  if (apiKeyNew) {
    debugLog('Google API key found: AI_CODE_REVIEW_GOOGLE_API_KEY');
    return {
      apiKey: apiKeyNew,
      source: 'AI_CODE_REVIEW_GOOGLE_API_KEY',
      message: 'Using AI_CODE_REVIEW_GOOGLE_API_KEY'
    };
  }

  // Legacy key: CODE_REVIEW_GOOGLE_API_KEY
  if (apiKeyLegacy) {
    console.warn('Warning: Using deprecated environment variable CODE_REVIEW_GOOGLE_API_KEY. Please switch to AI_CODE_REVIEW_GOOGLE_API_KEY.');
    debugLog('Google API key found: CODE_REVIEW_GOOGLE_API_KEY (deprecated)');
    return {
      apiKey: apiKeyLegacy,
      source: 'CODE_REVIEW_GOOGLE_API_KEY',
      message: 'Using deprecated CODE_REVIEW_GOOGLE_API_KEY'
    };
  }

  // Fallback to GOOGLE_GENERATIVE_AI_KEY
  if (apiKeyGenAI) {
    console.warn('Warning: Using generic environment variable GOOGLE_GENERATIVE_AI_KEY. Consider using AI_CODE_REVIEW_GOOGLE_API_KEY for better isolation.');
    debugLog('Google API key found: GOOGLE_GENERATIVE_AI_KEY');
    return {
      apiKey: apiKeyGenAI,
      source: 'GOOGLE_GENERATIVE_AI_KEY',
      message: 'Using GOOGLE_GENERATIVE_AI_KEY'
    };
  }

  // Last resort: GOOGLE_AI_STUDIO_KEY
  if (apiKeyStudio) {
    console.warn('Warning: Using deprecated environment variable GOOGLE_AI_STUDIO_KEY. Please switch to AI_CODE_REVIEW_GOOGLE_API_KEY.');
    debugLog('Google API key found: GOOGLE_AI_STUDIO_KEY (deprecated)');
    return {
      apiKey: apiKeyStudio,
      source: 'GOOGLE_AI_STUDIO_KEY',
      message: 'Using deprecated GOOGLE_AI_STUDIO_KEY'
    };
  }

  // No API key found
  return {
    apiKey: undefined,
    source: 'none',
    message: 'No Google API key found. Please set AI_CODE_REVIEW_GOOGLE_API_KEY in your .env.local file.'
  };
}

/**
 * Get the OpenRouter API key with proper precedence handling
 * @returns Object containing the API key and information about which key was used
 */
export function getOpenRouterApiKey(): {
  apiKey: string | undefined;
  source: string;
  message: string;
} {
  // Check if debug mode is enabled
  const isDebugMode = process.argv.includes('--debug');

  // Helper function for debug logging
  function debugLog(message: string): void {
    if (isDebugMode) {
      console.log(`\x1b[36m[DEBUG]\x1b[0m ${message}`);
    }
  }

  // Check for API keys in order of preference
  const apiKeyNew = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY;
  const apiKeyLegacy = process.env.CODE_REVIEW_OPENROUTER_API_KEY;
  const apiKeyGeneric = process.env.OPENROUTER_API_KEY;

  // Preferred key: AI_CODE_REVIEW_OPENROUTER_API_KEY
  if (apiKeyNew) {
    debugLog('OpenRouter API key found: AI_CODE_REVIEW_OPENROUTER_API_KEY');
    return {
      apiKey: apiKeyNew,
      source: 'AI_CODE_REVIEW_OPENROUTER_API_KEY',
      message: 'Using AI_CODE_REVIEW_OPENROUTER_API_KEY'
    };
  }

  // Legacy key: CODE_REVIEW_OPENROUTER_API_KEY
  if (apiKeyLegacy) {
    console.warn('Warning: Using deprecated environment variable CODE_REVIEW_OPENROUTER_API_KEY. Please switch to AI_CODE_REVIEW_OPENROUTER_API_KEY.');
    debugLog('OpenRouter API key found: CODE_REVIEW_OPENROUTER_API_KEY (deprecated)');
    return {
      apiKey: apiKeyLegacy,
      source: 'CODE_REVIEW_OPENROUTER_API_KEY',
      message: 'Using deprecated CODE_REVIEW_OPENROUTER_API_KEY'
    };
  }

  // Fallback to OPENROUTER_API_KEY
  if (apiKeyGeneric) {
    console.warn('Warning: Using generic environment variable OPENROUTER_API_KEY. Consider using AI_CODE_REVIEW_OPENROUTER_API_KEY for better isolation.');
    debugLog('OpenRouter API key found: OPENROUTER_API_KEY');
    return {
      apiKey: apiKeyGeneric,
      source: 'OPENROUTER_API_KEY',
      message: 'Using OPENROUTER_API_KEY'
    };
  }

  // No API key found
  return {
    apiKey: undefined,
    source: 'none',
    message: 'No OpenRouter API key found. Please set AI_CODE_REVIEW_OPENROUTER_API_KEY in your .env.local file.'
  };
}

/**
 * Validate that required environment variables are present
 * @returns Object containing validation result and error message if applicable
 */
export function validateRequiredEnvVars(): {
  valid: boolean;
  message: string;
} {
  // Check for Google API key
  const googleApiKey = getGoogleApiKey();
  // Check for OpenRouter API key
  const openRouterApiKey = getOpenRouterApiKey();

  // If we have at least one API key, we're good to go
  if (googleApiKey.apiKey || openRouterApiKey.apiKey) {
    return {
      valid: true,
      message: 'At least one API key is available'
    };
  }

  // No API keys found
  return {
    valid: false,
    message: 'No API keys found. Please set either AI_CODE_REVIEW_GOOGLE_API_KEY or AI_CODE_REVIEW_OPENROUTER_API_KEY in your .env.local file.'
  };
}
