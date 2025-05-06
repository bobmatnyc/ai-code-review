/**
 * @fileoverview Helper utilities for working with Anthropic models.
 *
 * This module provides utilities for model detection, initialization, and validation
 * specific to Anthropic's Claude models. It handles determining if a model is an
 * Anthropic model, validating API keys, and initializing model connections.
 */

import { getConfig } from '../../utils/config';
import logger from '../../utils/logger';
import { validateAnthropicApiKey, isDebugMode } from './index';
import { testAnthropicApiAccess } from './anthropicApiClient';

// Track if we've initialized a model successfully
let modelInitialized = false;

/**
 * Interface for the result of Anthropic model detection
 */
export interface AnthropicModelResult {
  isCorrect: boolean;
  adapter: string;
  modelName: string;
}

/**
 * Determines if the current model is an Anthropic model and extracts adapter and model name.
 * @returns Object containing detection results
 */
export function isAnthropicModel(): AnthropicModelResult {
  // Get the model from configuration (CLI override or env)
  const selectedModel = getConfig().selectedModel || '';

  logger.debug(`isAnthropicModel called with AI_CODE_REVIEW_MODEL=${selectedModel}`);

  // If the model is empty, this is not an Anthropic model
  if (!selectedModel) {
    logger.debug('isAnthropicModel: No model selected, returning false');
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

  logger.debug(`isAnthropicModel: Parsed adapter=${adapter}, modelName=${modelName}`);
  logger.debug(`isAnthropicModel: isCorrect=${adapter === 'anthropic'}`);

  return {
    isCorrect: adapter === 'anthropic',
    adapter,
    modelName
  };
}

/**
 * Resolve the API model name for Anthropic from the model mapping
 * @param modelName The model name (without provider prefix)
 * @returns The API model name or the original name if not found
 */
export async function getApiModelName(modelName: string): Promise<string> {
  // For Anthropic, we use the model name directly without modification
  logger.debug(`API model name: ${modelName}`);
  return modelName;
}

/**
 * Initialize the Anthropic client and validate the model and API key
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
export async function initializeAnthropicClient(): Promise<boolean> {
  logger.debug('initializeAnthropicClient called');

  const { isCorrect, adapter, modelName } = isAnthropicModel();
  logger.debug(
    `initializeAnthropicClient: isCorrect=${isCorrect}, adapter=${adapter}, modelName=${modelName}`
  );

  // If this is not an Anthropic model, just return true without initializing
  if (!isCorrect) {
    logger.debug(
      'initializeAnthropicClient: Not an Anthropic model, returning true without initializing'
    );
    return true;
  }

  // If we've already initialized, return true
  if (modelInitialized) {
    logger.debug(
      'initializeAnthropicClient: Already initialized, returning true'
    );
    return true;
  }

  logger.debug('initializeAnthropicClient: Proceeding with initialization');

  // Get API key from environment variables
  const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

  // Validate the API key
  if (!validateAnthropicApiKey(apiKey, isDebugMode())) {
    process.exit(1);
  }

  try {
    // Test API access with the specified model
    const success = await testAnthropicApiAccess(apiKey, modelName);
    
    if (success) {
      modelInitialized = true;
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error(`Error initializing Anthropic model ${modelName}`);
    return false;
  }
}

/**
 * Parse a response string for JSON content
 * @param content Response content to parse
 * @returns Parsed data or null if parsing fails
 */
export function parseJsonResponse(content: string): any | null {
  try {
    // First, check if the response is wrapped in a code block
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    const jsonContent = jsonMatch ? jsonMatch[1] : content;

    // Check if the content is valid JSON
    const structuredData = JSON.parse(jsonContent);

    // Validate that it has the expected structure
    if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
      logger.warn(
        'Response is valid JSON but does not have the expected structure'
      );
    }
    
    return structuredData;
  } catch (parseError) {
    logger.warn(
      `Response is not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`
    );
    return null;
  }
}