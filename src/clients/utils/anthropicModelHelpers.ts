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
 * Date version pattern for model names (e.g., -20250219)
 */
const DATE_VERSION_PATTERN = /-\d{8}$/;
const DOT_DATE_VERSION_PATTERN = /\.\d{8}$/;

/**
 * Removes the provider prefix from a model name
 * @param modelName The model name (may have provider prefix)
 * @returns The model name without provider prefix
 */
function removeProviderPrefix(modelName: string): string {
  return modelName.includes(':') ? modelName.split(':')[1] : modelName;
}

/**
 * Adds the anthropic provider prefix to a model name if not present
 * @param modelName The model name
 * @returns The model name with anthropic provider prefix
 */
function ensureAnthropicPrefix(modelName: string): string {
  return modelName.startsWith('anthropic:') ? modelName : `anthropic:${modelName}`;
}

/**
 * Checks if a model name has a hardcoded mapping
 * @param cleanModelName The model name without provider prefix
 * @returns The API model name if hardcoded, null otherwise
 */
function getHardcodedMapping(cleanModelName: string): string | null {
  const hardcodedMappings: Record<string, string> = {
    'claude-3.7-sonnet': 'claude-3-7-sonnet-20250219',
    'claude-3-7-sonnet': 'claude-3-7-sonnet-20250219',
    'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
    'claude-3-5-sonnet': 'claude-3-5-sonnet-20241022',
    'claude-3-opus': 'claude-3-opus-20240229',
    'claude-3.0-opus': 'claude-3-opus-20240229',
    'claude-3-sonnet': 'claude-3-sonnet-20240229',
    'claude-3.0-sonnet': 'claude-3-sonnet-20240229',
    'claude-3-haiku': 'claude-3-haiku-20240307',
    'claude-3.0-haiku': 'claude-3-haiku-20240307',
    'claude-3.5-haiku': 'claude-3-5-haiku-20241022',
    'claude-3-5-haiku': 'claude-3-5-haiku-20241022',
  };

  const apiName = hardcodedMappings[cleanModelName];
  if (apiName) {
    logger.debug(`Using hardcoded mapping: ${cleanModelName} -> ${apiName}`);
    return apiName;
  }
  return null;
}

/**
 * Tries alternative format variations for model name lookup
 * @param fullModelName The full model name with provider prefix
 * @param getModelMapping Function to get model mapping
 * @returns The API identifier if found, null otherwise
 */
function tryAlternativeFormats(
  fullModelName: string,
  getModelMapping: (key: string) => { apiIdentifier?: string } | undefined,
): string | null {
  const alternativeKey1 = fullModelName.replace(/\./g, '-');
  const alternativeKey2 = fullModelName.replace(/-/g, '.');

  logger.debug(`Trying alternative format (dots to hyphens): ${alternativeKey1}`);
  const altConfig1 = getModelMapping(alternativeKey1);
  if (altConfig1?.apiIdentifier) {
    logger.debug(`Found match with alternative format: ${alternativeKey1} -> ${altConfig1.apiIdentifier}`);
    return altConfig1.apiIdentifier;
  }

  logger.debug(`Trying alternative format (hyphens to dots): ${alternativeKey2}`);
  const altConfig2 = getModelMapping(alternativeKey2);
  if (altConfig2?.apiIdentifier) {
    logger.debug(`Found match with alternative format: ${alternativeKey2} -> ${altConfig2.apiIdentifier}`);
    return altConfig2.apiIdentifier;
  }

  return null;
}

/**
 * Handles model names with date version suffixes
 * @param modelName Original model name
 * @param fullModelName Full model name with provider prefix
 * @param getModelMapping Function to get model mapping
 * @returns The API model name if successful, null otherwise
 */
function handleDateVersionedModel(
  modelName: string,
  fullModelName: string,
  getModelMapping: (key: string) => { apiIdentifier?: string } | undefined,
): string | null {
  // Handle hyphen date version in full model name
  if (DATE_VERSION_PATTERN.test(fullModelName)) {
    const baseModelName = fullModelName.replace(DATE_VERSION_PATTERN, '');
    logger.debug(`Checking base model without date: ${baseModelName}`);

    const baseModelConfig = getModelMapping(baseModelName);
    if (baseModelConfig?.apiIdentifier) {
      logger.debug(`Found base model mapping, using original name with date`);
      return removeProviderPrefix(modelName);
    }
  }

  // Handle dot date version in full model name
  if (DOT_DATE_VERSION_PATTERN.test(fullModelName)) {
    const baseDotModelName = fullModelName.replace(DOT_DATE_VERSION_PATTERN, '');
    const baseHyphenModelName = baseDotModelName.replace(/\./g, '-');
    logger.debug(`Checking base model with dots converted to hyphens: ${baseHyphenModelName}`);

    const baseModelConfig = getModelMapping(baseHyphenModelName);
    if (baseModelConfig?.apiIdentifier) {
      logger.debug(`Found base model mapping, converting full name to hyphen format`);
      const hyphenModelName = fullModelName.replace(/\./g, '-');
      return removeProviderPrefix(hyphenModelName);
    }
  }

  // Handle date version without provider prefix
  if (DATE_VERSION_PATTERN.test(modelName) || DOT_DATE_VERSION_PATTERN.test(modelName)) {
    const hyphenModelName = modelName.replace(/\./g, '-');
    const baseModelName = hyphenModelName.replace(DATE_VERSION_PATTERN, '');
    const fullBaseModelName = `anthropic:${baseModelName}`;
    logger.debug(`Checking base model without provider and date: ${fullBaseModelName}`);

    const baseModelConfig = getModelMapping(fullBaseModelName);
    if (baseModelConfig?.apiIdentifier) {
      logger.debug(`Found base model mapping, using hyphen format`);
      return hyphenModelName;
    }
  }

  return null;
}

/**
 * Resolve the API model name for Anthropic from the model mapping
 * @param modelName The model name (without provider prefix)
 * @returns The API model name or the original name if not found
 */
export async function getApiModelName(modelName: string): Promise<string> {
  // Early return for models with date suffixes
  if (DATE_VERSION_PATTERN.test(modelName)) {
    return removeProviderPrefix(modelName);
  }

  // Check hardcoded mappings first
  const cleanModelName = removeProviderPrefix(modelName);
  const hardcodedMapping = getHardcodedMapping(cleanModelName);
  if (hardcodedMapping) {
    return hardcodedMapping;
  }

  // Import model maps for dynamic lookup
  const { getModelMapping, MODEL_MAP } = await import('./modelMaps');

  try {
    logger.debug(`getApiModelName called with model name: ${modelName}`);

    // Ensure model name has provider prefix for lookup
    const fullModelName = ensureAnthropicPrefix(modelName);
    logger.debug(`Full model name for lookup: ${fullModelName}`);
    logger.debug(`Available model keys in MODEL_MAP: ${Object.keys(MODEL_MAP).join(', ')}`);

    // Try direct model map lookup
    const modelConfig = getModelMapping(fullModelName);
    if (modelConfig?.apiIdentifier) {
      logger.debug(`Found model configuration: ${modelConfig.apiIdentifier}`);
      return modelConfig.apiIdentifier;
    }

    // Try alternative format variations
    const altMapping = tryAlternativeFormats(fullModelName, getModelMapping);
    if (altMapping) {
      return altMapping;
    }

    // Handle date-versioned models
    const dateVersionMapping = handleDateVersionedModel(modelName, fullModelName, getModelMapping);
    if (dateVersionMapping) {
      return dateVersionMapping;
    }

    // Model not found - log warning and return original
    logger.warn(
      `Model "${modelName}" (fullModelName: ${fullModelName}) not found in configuration. This may cause API errors.`,
    );
    logger.warn('Make sure the model name is defined in MODEL_MAP within modelMaps.ts');
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
