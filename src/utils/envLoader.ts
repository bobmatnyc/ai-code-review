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
 *
 * @deprecated This module is being replaced by unifiedConfig.ts for better maintainability.
 * The new system provides clearer precedence rules and better error handling.
 */

import * as path from 'path';
import * as dotenv from 'dotenv';
import fs from 'fs/promises';

// Helper function for debug logging - always visible to help diagnose environment variable loading issues
function debugLog(message: string): void {
  if (process.argv.includes('--debug') || process.env.AI_CODE_REVIEW_LOG_LEVEL?.toLowerCase() === 'debug') {
    console.log(`\x1b[36m[DEBUG:ENV]\x1b[0m ${message}`);
  }
}

// Special diagnostic logging for tracking environment variable loading
// This is a separate function to make it clear when we're specifically
// tracing environment variable loading issues
function traceEnvVarLoading(message: string): void {
  // This will always be visible, regardless of log level
  console.log(`\x1b[35m[ENV-TRACE]\x1b[0m ${message}`);
}

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
    let envLocalPath: string;
    
    if (envFilePath) {
      // If explicitly provided, use the specified path
      envLocalPath = envFilePath;
    } else {
      // Priority order for environment files:
      // 1. Project-level .env.local (highest priority)
      // 2. Project-level .env
      // 3. Tool installation directory .env.local
      
      const projectEnvLocal = path.resolve(process.cwd(), '.env.local');
      const projectEnv = path.resolve(process.cwd(), '.env');
      
      // Check for project-level env files first
      try {
        await fs.access(projectEnvLocal);
        envLocalPath = projectEnvLocal;
        debugLog(`Found project-level .env.local: ${projectEnvLocal}`);
      } catch {
        // Try project-level .env
        try {
          await fs.access(projectEnv);
          envLocalPath = projectEnv;
          debugLog(`Found project-level .env: ${projectEnv}`);
        } catch {
          // Fall back to tool installation directories
          const possibleToolDirectories = [
            path.resolve(__dirname, '..', '..'), // Local development or npm link
            path.resolve(__dirname, '..', '..', '..'), // Global npm installation
            '/opt/homebrew/lib/node_modules/@bobmatnyc/ai-code-review' // Homebrew global installation
          ];
          
          // Check for environment variable specifying the tool directory
          if (process.env.AI_CODE_REVIEW_DIR) {
            possibleToolDirectories.unshift(process.env.AI_CODE_REVIEW_DIR);
            debugLog(`Using tool directory from AI_CODE_REVIEW_DIR: ${process.env.AI_CODE_REVIEW_DIR}`);
          }
          
          // Default to project directory if nothing else is found
          envLocalPath = projectEnvLocal;
          
          // Try each possible tool directory
          for (const dir of possibleToolDirectories) {
            const potentialEnvPath = path.resolve(dir, '.env.local');
            debugLog(`Checking for tool .env.local in: ${potentialEnvPath}`);
            
            try {
              await fs.access(potentialEnvPath);
              // If we can access the file in this directory, use it
              envLocalPath = potentialEnvPath;
              debugLog(`Found .env.local in tool directory: ${potentialEnvPath}`);
              break;
            } catch (statError) {
              // File doesn't exist in this directory, continue to next
              debugLog(`No .env.local in ${potentialEnvPath}`)
            }
          }
        }
      }
    }
    // envLocalPath is already defined and set above

    // Check if the file exists
    try {
      await fs.access(envLocalPath);
    } catch (error) {
      // Don't fail if we can't find the .env.local file
      // Just return a warning message instead
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      traceEnvVarLoading(`Environment file not found: ${envLocalPath} (${errorMessage}). Continuing without it.`);
      return {
        success: true,
        message: `No .env.local file found. You may need to set API keys via environment variables or command line options.`,
        envFile: envLocalPath
      };
    }


    // Load environment variables
    traceEnvVarLoading(`Attempting to load environment variables from: ${envLocalPath}`);
    
    // Store current values to see what changes
    const beforeModel = process.env.AI_CODE_REVIEW_MODEL;
    
    // Use override: true to force override existing values
    const result = dotenv.config({ path: envLocalPath, override: true });
    
    // Log what changed
    if (beforeModel !== process.env.AI_CODE_REVIEW_MODEL) {
      traceEnvVarLoading(`AI_CODE_REVIEW_MODEL changed from '${beforeModel}' to '${process.env.AI_CODE_REVIEW_MODEL}'`);
    }

    if (result.error) {
      traceEnvVarLoading(`Error loading environment variables: ${result.error.message}`);
      return {
        success: false,
        message: `Error loading environment variables: ${result.error.message}`,
        envFile: envLocalPath
      };
    }

    // Log success without exposing values
    traceEnvVarLoading(`Successfully loaded environment variables from ${envLocalPath}`);

    // Log which variables were found (names only, not values)
    const envVarNames = Object.keys(result.parsed || {});
    if (envVarNames.length > 0) {
      traceEnvVarLoading('Variables found in .env.local (names only):');
      // Specifically check for log level
      if (envVarNames.includes('AI_CODE_REVIEW_LOG_LEVEL')) {
        traceEnvVarLoading(`AI_CODE_REVIEW_LOG_LEVEL is set to: ${process.env.AI_CODE_REVIEW_LOG_LEVEL}`);
      } else {
        traceEnvVarLoading('AI_CODE_REVIEW_LOG_LEVEL is NOT present in .env.local');
      }
      debugLog(envVarNames.join(', '));
    } else {
      traceEnvVarLoading('No variables found in .env.local');
    }

    return {
      success: true,
      message: `Successfully loaded environment variables from ${envLocalPath}`,
      envFile: envLocalPath
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error loading environment variables: ${errorMessage}`);
    return {
      success: false,
      message: `Unexpected error loading environment variables: ${errorMessage}`,
      envFile: envFilePath
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
  // Already have global debugLog function

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
    console.warn(
      'Warning: Using deprecated environment variable CODE_REVIEW_GOOGLE_API_KEY. Please switch to AI_CODE_REVIEW_GOOGLE_API_KEY.'
    );
    debugLog('Google API key found: CODE_REVIEW_GOOGLE_API_KEY (deprecated)');
    return {
      apiKey: apiKeyLegacy,
      source: 'CODE_REVIEW_GOOGLE_API_KEY',
      message: 'Using deprecated CODE_REVIEW_GOOGLE_API_KEY'
    };
  }

  // Fallback to GOOGLE_GENERATIVE_AI_KEY
  if (apiKeyGenAI) {
    console.warn(
      'Warning: Using generic environment variable GOOGLE_GENERATIVE_AI_KEY. Consider using AI_CODE_REVIEW_GOOGLE_API_KEY for better isolation.'
    );
    debugLog('Google API key found: GOOGLE_GENERATIVE_AI_KEY');
    return {
      apiKey: apiKeyGenAI,
      source: 'GOOGLE_GENERATIVE_AI_KEY',
      message: 'Using GOOGLE_GENERATIVE_AI_KEY'
    };
  }

  // Last resort: GOOGLE_AI_STUDIO_KEY
  if (apiKeyStudio) {
    console.warn(
      'Warning: Using deprecated environment variable GOOGLE_AI_STUDIO_KEY. Please switch to AI_CODE_REVIEW_GOOGLE_API_KEY.'
    );
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
    message:
      'No Google API key found. Please set AI_CODE_REVIEW_GOOGLE_API_KEY in your .env.local file.'
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
  // Already have global debugLog function

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
    console.warn(
      'Warning: Using deprecated environment variable CODE_REVIEW_OPENROUTER_API_KEY. Please switch to AI_CODE_REVIEW_OPENROUTER_API_KEY.'
    );
    debugLog(
      'OpenRouter API key found: CODE_REVIEW_OPENROUTER_API_KEY (deprecated)'
    );
    return {
      apiKey: apiKeyLegacy,
      source: 'CODE_REVIEW_OPENROUTER_API_KEY',
      message: 'Using deprecated CODE_REVIEW_OPENROUTER_API_KEY'
    };
  }

  // Fallback to OPENROUTER_API_KEY
  if (apiKeyGeneric) {
    console.warn(
      'Warning: Using generic environment variable OPENROUTER_API_KEY. Consider using AI_CODE_REVIEW_OPENROUTER_API_KEY for better isolation.'
    );
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
    message:
      'No OpenRouter API key found. Please set AI_CODE_REVIEW_OPENROUTER_API_KEY in your .env.local file.'
  };
}

/**
 * Get the Anthropic API key with proper precedence handling
 * @returns Object containing the API key and information about which key was used
 */
export function getAnthropicApiKey(): {
  apiKey: string | undefined;
  source: string;
  message: string;
} {
  // Already have global debugLog function

  // Check for API keys in order of preference
  const apiKeyNew = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;
  const apiKeyLegacy = process.env.CODE_REVIEW_ANTHROPIC_API_KEY;
  const apiKeyGeneric = process.env.ANTHROPIC_API_KEY;

  // Preferred key: AI_CODE_REVIEW_ANTHROPIC_API_KEY
  if (apiKeyNew) {
    debugLog('Anthropic API key found: AI_CODE_REVIEW_ANTHROPIC_API_KEY');
    return {
      apiKey: apiKeyNew,
      source: 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
      message: 'Using AI_CODE_REVIEW_ANTHROPIC_API_KEY'
    };
  }

  // Legacy key: CODE_REVIEW_ANTHROPIC_API_KEY
  if (apiKeyLegacy) {
    console.warn(
      'Warning: Using deprecated environment variable CODE_REVIEW_ANTHROPIC_API_KEY. Please switch to AI_CODE_REVIEW_ANTHROPIC_API_KEY.'
    );
    debugLog(
      'Anthropic API key found: CODE_REVIEW_ANTHROPIC_API_KEY (deprecated)'
    );
    return {
      apiKey: apiKeyLegacy,
      source: 'CODE_REVIEW_ANTHROPIC_API_KEY',
      message: 'Using deprecated CODE_REVIEW_ANTHROPIC_API_KEY'
    };
  }

  // Fallback to ANTHROPIC_API_KEY
  if (apiKeyGeneric) {
    console.warn(
      'Warning: Using generic environment variable ANTHROPIC_API_KEY. Consider using AI_CODE_REVIEW_ANTHROPIC_API_KEY for better isolation.'
    );
    debugLog('Anthropic API key found: ANTHROPIC_API_KEY');
    return {
      apiKey: apiKeyGeneric,
      source: 'ANTHROPIC_API_KEY',
      message: 'Using ANTHROPIC_API_KEY'
    };
  }

  // No API key found
  return {
    apiKey: undefined,
    source: 'none',
    message:
      'No Anthropic API key found. Please set AI_CODE_REVIEW_ANTHROPIC_API_KEY in your .env.local file.'
  };
}

/**
 * Get the OpenAI API key with proper precedence handling
 * @returns Object containing the API key and information about which key was used
 */
export function getOpenAIApiKey(): {
  apiKey: string | undefined;
  source: string;
  message: string;
} {
  // Already have global debugLog function

  // Check for API keys in order of preference
  const apiKeyNew = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;
  const apiKeyLegacy = process.env.CODE_REVIEW_OPENAI_API_KEY;
  const apiKeyGeneric = process.env.OPENAI_API_KEY;

  // Preferred key: AI_CODE_REVIEW_OPENAI_API_KEY
  if (apiKeyNew) {
    debugLog('OpenAI API key found: AI_CODE_REVIEW_OPENAI_API_KEY');
    return {
      apiKey: apiKeyNew,
      source: 'AI_CODE_REVIEW_OPENAI_API_KEY',
      message: 'Using AI_CODE_REVIEW_OPENAI_API_KEY'
    };
  }

  // Legacy key: CODE_REVIEW_OPENAI_API_KEY
  if (apiKeyLegacy) {
    console.warn(
      'Warning: Using deprecated environment variable CODE_REVIEW_OPENAI_API_KEY. Please switch to AI_CODE_REVIEW_OPENAI_API_KEY.'
    );
    debugLog('OpenAI API key found: CODE_REVIEW_OPENAI_API_KEY (deprecated)');
    return {
      apiKey: apiKeyLegacy,
      source: 'CODE_REVIEW_OPENAI_API_KEY',
      message: 'Using deprecated CODE_REVIEW_OPENAI_API_KEY'
    };
  }

  // Fallback to OPENAI_API_KEY
  if (apiKeyGeneric) {
    console.warn(
      'Warning: Using generic environment variable OPENAI_API_KEY. Consider using AI_CODE_REVIEW_OPENAI_API_KEY for better isolation.'
    );
    debugLog('OpenAI API key found: OPENAI_API_KEY');
    return {
      apiKey: apiKeyGeneric,
      source: 'OPENAI_API_KEY',
      message: 'Using OPENAI_API_KEY'
    };
  }

  // No API key found
  return {
    apiKey: undefined,
    source: 'none',
    message:
      'No OpenAI API key found. Please set AI_CODE_REVIEW_OPENAI_API_KEY in your .env.local file.'
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
  // Check for Anthropic API key
  const anthropicApiKey = getAnthropicApiKey();
  // Check for OpenAI API key
  const openaiApiKey = getOpenAIApiKey();

  // If we have at least one API key, we're good to go
  if (
    googleApiKey.apiKey ||
    openRouterApiKey.apiKey ||
    anthropicApiKey.apiKey ||
    openaiApiKey.apiKey
  ) {
    return {
      valid: true,
      message: 'At least one API key is available'
    };
  }

  // No API keys found
  return {
    valid: false,
    message:
      'No API keys found. Please set either AI_CODE_REVIEW_GOOGLE_API_KEY or AI_CODE_REVIEW_OPENROUTER_API_KEY in your .env.local file.'
  };
}
