/**
 * @fileoverview Utilities for handling model information and display
 *
 * This module provides helper functions for parsing and displaying
 * provider and model information in a user-friendly format.
 */

import { parseModelString } from '../../clients/utils/modelMaps';

/**
 * Parse and display provider and model information
 *
 * @param modelName The full model name (e.g., 'openai:gpt-4.1')
 * @returns An object with provider and model display information
 */
export function getProviderDisplayInfo(modelName: string): { provider: string; model: string } {
  // If the model name doesn't contain a colon, it's not in the expected format
  if (!modelName.includes(':')) {
    return {
      provider: 'Unknown',
      model: modelName,
    };
  }

  try {
    // Try to parse the model string using the utilities from modelMaps
    const { provider, modelName: extractedModelName } = parseModelString(modelName);

    return {
      provider: provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase(), // Capitalize provider name
      model: extractedModelName,
    };
  } catch (error) {
    // If parsing fails, use a fallback approach
    const parts = modelName.split(':');

    if (parts.length === 2) {
      const providerPart = parts[0].toLowerCase();
      return {
        provider: providerPart.charAt(0).toUpperCase() + providerPart.slice(1), // Capitalize provider name
        model: parts[1],
      };
    }

    // If format is not recognized, return unknown provider and original model name
    return {
      provider: 'Unknown',
      model: modelName,
    };
  }
}
