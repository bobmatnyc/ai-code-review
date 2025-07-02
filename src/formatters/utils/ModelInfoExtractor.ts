/**
 * @fileoverview Utility for extracting model information from model strings.
 *
 * This module provides functions to extract and parse model information from
 * model strings in various formats. It handles different provider prefixes
 * and standardizes the output format.
 */

import logger from '../../utils/logger';

/**
 * Model information extracted from a model string
 */
export interface ModelInfo {
  /** The provider of the model (e.g., 'Google', 'Anthropic', 'OpenAI') */
  modelVendor: string;
  /** The name of the model without the provider prefix */
  modelName: string;
  /** A formatted string combining the provider and model name */
  modelInfo: string;
}

/**
 * Extract model information from a model string
 * @param modelString The model string to extract information from (e.g., 'gemini:gemini-1.5-pro')
 * @returns Object containing modelVendor, modelName, and modelInfo
 */
export function extractModelInfo(modelString?: string): ModelInfo {
  // Default values
  let modelVendor = 'Unknown';
  let modelName = 'AI';
  let modelInfo = 'AI';

  if (!modelString) {
    logger.warn('No model string provided. Using default values.');
    return { modelVendor, modelName, modelInfo };
  }

  // Extract model information based on provider prefix
  if (modelString.startsWith('openrouter:')) {
    modelVendor = 'OpenRouter';
    modelName = modelString.substring('openrouter:'.length);
    modelInfo = `OpenRouter (${modelName})`;
  } else if (modelString.startsWith('anthropic:')) {
    modelVendor = 'Anthropic';
    modelName = modelString.substring('anthropic:'.length);
    modelInfo = `Anthropic (${modelName})`;
  } else if (modelString.startsWith('openai:')) {
    modelVendor = 'OpenAI';
    modelName = modelString.substring('openai:'.length);
    modelInfo = `OpenAI (${modelName})`;
  } else if (modelString.startsWith('gemini:')) {
    modelVendor = 'Google';
    modelName = modelString.substring('gemini:'.length);
    modelInfo = `Google Gemini AI (${modelName})`;
  } else if (modelString.startsWith('Google:')) {
    // Handle miscapitalized provider names
    modelVendor = 'Google';
    modelName = modelString.substring('Google:'.length);
    modelInfo = `Google Gemini AI (${modelName})`;
  } else if (modelString.startsWith('Anthropic:')) {
    modelVendor = 'Anthropic';
    modelName = modelString.substring('Anthropic:'.length);
    modelInfo = `Anthropic (${modelName})`;
  } else if (modelString.startsWith('OpenAI:')) {
    modelVendor = 'OpenAI';
    modelName = modelString.substring('OpenAI:'.length);
    modelInfo = `OpenAI (${modelName})`;
  } else if (modelString.startsWith('OpenRouter:')) {
    modelVendor = 'OpenRouter';
    modelName = modelString.substring('OpenRouter:'.length);
    modelInfo = `OpenRouter (${modelName})`;
  } else {
    modelVendor = 'Unknown';
    modelName = modelString;
    modelInfo = `AI (${modelName})`;
  }

  return { modelVendor, modelName, modelInfo };
}

/**
 * Extract model information from a formatted model info string
 * @param modelInfo Formatted model info string (e.g., "Google Gemini AI (gemini-1.5-pro)")
 * @returns Object containing modelVendor and modelName
 */
export function extractModelInfoFromString(modelInfo: string): {
  modelVendor: string;
  modelName: string;
} {
  let modelVendor = 'Unknown';
  let modelName = 'AI';

  if (modelInfo) {
    if (modelInfo.includes('Google Gemini AI')) {
      modelVendor = 'Google';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'Gemini';
    } else if (modelInfo.includes('Anthropic')) {
      modelVendor = 'Anthropic';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'Claude';
    } else if (modelInfo.includes('OpenAI')) {
      modelVendor = 'OpenAI';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'GPT';
    } else if (modelInfo.includes('OpenRouter')) {
      modelVendor = 'OpenRouter';
      const match = modelInfo.match(/\((.*?)\)/);
      modelName = match ? match[1] : 'AI';
    }
  }

  return { modelVendor, modelName };
}
