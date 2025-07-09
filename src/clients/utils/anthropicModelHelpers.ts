/**
 * @fileoverview Helper utilities for working with Anthropic models.
 *
 * This module provides utilities for model detection, initialization, and validation
 * specific to Anthropic's Claude models. It handles determining if a model is an
 * Anthropic model, validating API keys, and initializing model connections.
 */

import { getConfig } from '../../utils/config';
import logger from '../../utils/logger';
import { testAnthropicApiAccess } from './anthropicApiClient';
import { isDebugMode, validateAnthropicApiKey } from './index';

// Re-export the function for clients that need it
export { testAnthropicApiAccess };

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
      modelName: '',
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
    modelName,
  };
}

/**
 * Resolve the API model name for Anthropic from the model mapping
 * @param modelName The model name (without provider prefix)
 * @returns The API model name or the original name if not found
 */
export async function getApiModelName(modelName: string): Promise<string> {
  // DIRECT HARDCODED MAPPINGS FOR SPECIFIC MODELS
  // These take precedence over any lookups to handle specific known problematic cases

  // First, check if the model name has a date suffix (like -20250219)
  // If it does, use it as is (potentially removing provider prefix)
  const dateVersionPattern = /-\d{8}$/;
  if (dateVersionPattern.test(modelName)) {
    // If it has a provider prefix, remove it
    if (modelName.includes(':')) {
      return modelName.split(':')[1];
    }
    // Otherwise use it as is
    return modelName;
  }

  // Clean the model name for matching (remove provider prefix)
  const cleanModelName = modelName.includes(':') ? modelName.split(':')[1] : modelName;

  // Specifically for Claude 3.7 Sonnet - all its known variants
  if (cleanModelName === 'claude-3.7-sonnet' || cleanModelName === 'claude-3-7-sonnet') {
    logger.debug(
      `Detected Claude 3.7 Sonnet model, using fixed API name: claude-3-7-sonnet-20250219`,
    );
    return 'claude-3-7-sonnet-20250219';
  }

  // Handle Claude 3.5 Sonnet
  if (cleanModelName === 'claude-3.5-sonnet' || cleanModelName === 'claude-3-5-sonnet') {
    logger.debug(
      `Detected Claude 3.5 Sonnet model, using fixed API name: claude-3-5-sonnet-20241022`,
    );
    return 'claude-3-5-sonnet-20241022';
  }

  // Handle Claude 3 Opus
  if (cleanModelName === 'claude-3-opus' || cleanModelName === 'claude-3.0-opus') {
    logger.debug(`Detected Claude 3 Opus model, using fixed API name: claude-3-opus-20240229`);
    return 'claude-3-opus-20240229';
  }

  // Handle Claude 3 Sonnet
  if (cleanModelName === 'claude-3-sonnet' || cleanModelName === 'claude-3.0-sonnet') {
    logger.debug(`Detected Claude 3 Sonnet model, using fixed API name: claude-3-sonnet-20240229`);
    return 'claude-3-sonnet-20240229';
  }

  // Handle Claude 3 Haiku
  if (cleanModelName === 'claude-3-haiku' || cleanModelName === 'claude-3.0-haiku') {
    logger.debug(`Detected Claude 3 Haiku model, using fixed API name: claude-3-haiku-20240307`);
    return 'claude-3-haiku-20240307';
  }

  // Handle Claude 3.5 Haiku
  if (cleanModelName === 'claude-3.5-haiku' || cleanModelName === 'claude-3-5-haiku') {
    logger.debug(
      `Detected Claude 3.5 Haiku model, using fixed API name: claude-3-5-haiku-20241022`,
    );
    return 'claude-3-5-haiku-20241022';
  }

  // Import model maps to get the correct API model name
  const { getModelMapping, MODEL_MAP } = await import('./modelMaps');

  try {
    // Enhanced diagnostic logging
    logger.debug(`getApiModelName called with model name: ${modelName}`);

    // First, try to get the full model name directly from the configuration
    let fullModelName: string;

    // If the model name starts with "anthropic:", it's already in the right format for mapping
    if (modelName.startsWith('anthropic:')) {
      fullModelName = modelName;
      logger.debug(`Model name already has prefix: ${fullModelName}`);
    } else {
      // If it doesn't have the provider prefix, add it
      fullModelName = `anthropic:${modelName}`;
      logger.debug(`Added prefix to model name: ${fullModelName}`);
    }

    // Debug: Log available models in the map
    logger.debug(`Available model keys in MODEL_MAP: ${Object.keys(MODEL_MAP).join(', ')}`);

    // Look up the model in the configuration
    const modelConfig = getModelMapping(fullModelName);

    if (modelConfig) {
      logger.debug(`Found model configuration for ${fullModelName}:`);
      logger.debug(`- apiIdentifier: ${modelConfig.apiIdentifier}`);
      logger.debug(`- displayName: ${modelConfig.displayName}`);
      logger.debug(`- provider: ${modelConfig.provider}`);

      if (modelConfig.apiIdentifier) {
        logger.debug(
          `Using API model name from configuration: ${modelConfig.apiIdentifier} for ${modelName}`,
        );
        return modelConfig.apiIdentifier;
      }
    }

    // Try alternative formats if the exact key isn't found
    // This helps with cases where the model might be specified with dots vs hyphens
    const alternativeKey1 = fullModelName.replace(/\./g, '-');
    const alternativeKey2 = fullModelName.replace(/-/g, '.');

    logger.debug(`Trying alternative format (dots to hyphens): ${alternativeKey1}`);
    const altConfig1 = getModelMapping(alternativeKey1);
    if (altConfig1?.apiIdentifier) {
      logger.debug(
        `Found match with alternative format (dots to hyphens): ${alternativeKey1} -> ${altConfig1.apiIdentifier}`,
      );
      return altConfig1.apiIdentifier;
    }

    logger.debug(`Trying alternative format (hyphens to dots): ${alternativeKey2}`);
    const altConfig2 = getModelMapping(alternativeKey2);
    if (altConfig2?.apiIdentifier) {
      logger.debug(
        `Found match with alternative format (hyphens to dots): ${alternativeKey2} -> ${altConfig2.apiIdentifier}`,
      );
      return altConfig2.apiIdentifier;
    }

    // Special handling for models with date versions in the name
    // Check if the model name includes a date suffix (like -20250219)
    const dateVersionPattern = /-\d{8}$/;
    const dotDateVersionPattern = /\.\d{8}$/;

    if (dateVersionPattern.test(fullModelName)) {
      // Extract the base model name without the date
      const baseModelName = fullModelName.replace(dateVersionPattern, '');
      logger.debug(`Checking base model without date: ${baseModelName}`);

      const baseModelConfig = getModelMapping(baseModelName);
      if (baseModelConfig?.apiIdentifier) {
        // In this case, we'll return the original model name with date as the API name
        // This is because we want to preserve the explicit version the user requested
        logger.debug(
          `Found base model mapping for ${baseModelName}, but using original name with date as API name`,
        );
        // Return just the model name part, without the provider prefix
        return modelName.includes(':') ? modelName.split(':')[1] : modelName;
      }
    } else if (dotDateVersionPattern.test(fullModelName)) {
      // Handle dot version with date suffix (e.g., claude-3.7-sonnet.20250219)
      // Convert dots to hyphens for the base model name
      const baseDotModelName = fullModelName.replace(dotDateVersionPattern, '');
      const baseHyphenModelName = baseDotModelName.replace(/\./g, '-');

      logger.debug(`Checking base model with dots converted to hyphens: ${baseHyphenModelName}`);

      const baseModelConfig = getModelMapping(baseHyphenModelName);
      if (baseModelConfig?.apiIdentifier) {
        // Convert the whole model name to hyphen format for the API
        logger.debug(
          `Found base model mapping for ${baseHyphenModelName}, converting full name to hyphen format`,
        );
        const hyphenModelName = fullModelName.replace(/\./g, '-');
        return hyphenModelName.includes(':') ? hyphenModelName.split(':')[1] : hyphenModelName;
      }
    } else if (dateVersionPattern.test(modelName) || dotDateVersionPattern.test(modelName)) {
      // Handle versions without the provider prefix
      const hyphenModelName = modelName.replace(/\./g, '-');
      const baseModelName = hyphenModelName.replace(dateVersionPattern, '');
      const fullBaseModelName = `anthropic:${baseModelName}`;

      logger.debug(`Checking base model without provider and date: ${fullBaseModelName}`);

      const baseModelConfig = getModelMapping(fullBaseModelName);
      if (baseModelConfig?.apiIdentifier) {
        logger.debug(
          `Found base model mapping for ${fullBaseModelName}, using hyphen format of original name`,
        );
        return hyphenModelName;
      }
    }

    // If the model wasn't found, log a warning and return the original name
    logger.warn(
      `Model "${modelName}" (fullModelName: ${fullModelName}) not found in configuration. This may cause API errors.`,
    );
    logger.warn(
      'Make sure the model name is defined in MODEL_MAP within modelMaps.ts with the correct format',
    );
    return modelName;
  } catch (error) {
    logger.error(`Error getting API model name: ${error}`);
    return modelName;
  }
}

/**
 * Initialize the Anthropic client and validate the model and API key
 * @returns Promise resolving to a boolean indicating if initialization was successful
 */
export async function initializeAnthropicClient(): Promise<boolean> {
  logger.debug('initializeAnthropicClient called');

  const { isCorrect, adapter, modelName } = isAnthropicModel();
  logger.debug(
    `initializeAnthropicClient: isCorrect=${isCorrect}, adapter=${adapter}, modelName=${modelName}`,
  );

  // If this is not an Anthropic model, just return true without initializing
  if (!isCorrect) {
    logger.debug(
      'initializeAnthropicClient: Not an Anthropic model, returning true without initializing',
    );
    return true;
  }

  // If we've already initialized, return true
  if (modelInitialized) {
    logger.debug('initializeAnthropicClient: Already initialized, returning true');
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
    // Ensure apiKey is defined
    if (!apiKey) {
      logger.error('Anthropic API key is missing');
      return false;
    }

    const success = await testAnthropicApiAccess(apiKey, modelName);

    if (success) {
      modelInitialized = true;
      return true;
    }

    return false;
  } catch (_error) {
    logger.error(`Error initializing Anthropic model ${modelName}`);
    return false;
  }
}

/**
 * Parse a response string for JSON content
 * @param content Response content to parse
 * @returns Parsed data or null if parsing fails
 */
export function parseJsonResponse(content: string): unknown | null {
  try {
    // First, check if the response is wrapped in any code block (regardless of language marker)
    const codeBlockMatch = content.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);

    let jsonContent = '';

    if (codeBlockMatch) {
      // If we have a code block, try its content
      jsonContent = codeBlockMatch[1];
    } else {
      // No code block, use the raw content
      jsonContent = content;
    }

    // Try to parse the content as JSON
    const structuredData = JSON.parse(jsonContent);

    // Validate that it has the expected structure
    if (!structuredData.summary || !Array.isArray(structuredData.issues)) {
      logger.warn('Response is valid JSON but does not have the expected structure');
    }

    return structuredData;
  } catch (parseError) {
    logger.warn(
      `Response is not valid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
    );
    return null;
  }
}
