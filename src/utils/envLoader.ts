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
    
    // Load environment variables
    console.log(`Attempting to load environment variables from: ${envLocalPath}`);
    const result = dotenv.config({ path: envLocalPath });
    
    if (result.error) {
      return {
        success: false,
        message: `Error loading environment variables: ${result.error.message}`,
        envFile: envLocalPath
      };
    }
    
    // Log success without exposing values
    console.log(`Successfully loaded environment variables from ${envLocalPath}`);
    
    // Log which variables were found (names only, not values)
    const envVarNames = Object.keys(result.parsed || {});
    if (envVarNames.length > 0) {
      console.log('Variables found in .env.local (names only):');
      envVarNames.forEach(name => console.log(name));
    } else {
      console.log('No variables found in .env.local');
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
 * Get the API key with proper precedence handling
 * @returns Object containing the API key and information about which key was used
 */
export function getApiKey(): { 
  apiKey: string | undefined; 
  source: 'GOOGLE_GENERATIVE_AI_KEY' | 'GOOGLE_AI_STUDIO_KEY' | 'none';
  message: string;
} {
  const apiKeyGenAI = process.env.GOOGLE_GENERATIVE_AI_KEY;
  const apiKeyStudio = process.env.GOOGLE_AI_STUDIO_KEY;
  
  // Check if GOOGLE_GENERATIVE_AI_KEY is available
  if (apiKeyGenAI) {
    // If both are available, log a warning about precedence
    if (apiKeyStudio) {
      console.warn('Both GOOGLE_GENERATIVE_AI_KEY and GOOGLE_AI_STUDIO_KEY are set. Using GOOGLE_GENERATIVE_AI_KEY.');
    }
    
    console.log('API key is available in process.env');
    return {
      apiKey: apiKeyGenAI,
      source: 'GOOGLE_GENERATIVE_AI_KEY',
      message: 'Using GOOGLE_GENERATIVE_AI_KEY'
    };
  }
  
  // Fall back to GOOGLE_AI_STUDIO_KEY if available
  if (apiKeyStudio) {
    console.log('API key is available in process.env');
    console.warn('Using deprecated GOOGLE_AI_STUDIO_KEY. Consider switching to GOOGLE_GENERATIVE_AI_KEY.');
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
    message: 'No API key found. Please set GOOGLE_GENERATIVE_AI_KEY or GOOGLE_AI_STUDIO_KEY in your .env.local file.'
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
  const { apiKey, message } = getApiKey();
  
  if (!apiKey) {
    return {
      valid: false,
      message
    };
  }
  
  return {
    valid: true,
    message: 'All required environment variables are present'
  };
}
