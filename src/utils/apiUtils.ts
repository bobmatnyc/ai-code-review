/**
 * @fileoverview Utility functions for API-related operations.
 *
 * This module provides utility functions for working with various AI APIs,
 * including determining which API keys are available and handling model selection.
 */

import logger from './logger';
import { getConfig } from './config';

/**
 * Get the available API key type based on the model specified in environment variables
 * @returns The type of API key available ('OpenRouter', 'Google', 'Anthropic', 'OpenAI', or null if none)
 */
export function getApiKeyType():
  | 'OpenRouter'
  | 'Google'
  | 'Anthropic'
  | 'OpenAI'
  | null {
  // Get configuration from the centralized config module
  const config = getConfig();

  // Get the model adapter from the configuration
  const selectedModel = config.selectedModel;
  const adapter = selectedModel
    ? selectedModel.includes(':')
      ? selectedModel.split(':')[0]
      : 'gemini'
    : '';

  // First check if we have a specific adapter specified in the model
  // and if we have the corresponding API key
  if (adapter === 'gemini' && config.googleApiKey) {
    return 'Google';
  }
  if (adapter === 'openrouter' && config.openRouterApiKey) {
    return 'OpenRouter';
  }
  if (adapter === 'anthropic' && config.anthropicApiKey) {
    return 'Anthropic';
  }
  if (adapter === 'openai' && config.openAIApiKey) {
    return 'OpenAI';
  }

  // If no specific adapter is specified or the preferred adapter doesn't have an API key,
  // check if any API keys are available
  // Note: We don't have any preference for which API to use - we'll use whatever is available
  if (adapter === '' || !selectedModel) {
    // Check for any available API keys
    if (config.googleApiKey) {
      return 'Google';
    }
    if (config.openRouterApiKey) {
      return 'OpenRouter';
    }
    if (config.anthropicApiKey) {
      return 'Anthropic';
    }
    if (config.openAIApiKey) {
      return 'OpenAI';
    }
  }

  // No API keys available or the specified adapter doesn't have an API key
  return null;
}

/**
 * Get the priority filter from command line arguments or options
 * @param options Review options that may contain the priority filter
 * @returns The priority filter (h, m, l, or a) or undefined if not specified
 */
export function getPriorityFilterFromArgs(
  options?: any
): 'h' | 'm' | 'l' | 'a' | undefined {
  // First check if the interactive option is a string (priority filter)
  if (
    options &&
    typeof options.interactive === 'string' &&
    ['h', 'm', 'l', 'a'].includes(options.interactive)
  ) {
    return options.interactive as 'h' | 'm' | 'l' | 'a';
  }

  // Otherwise check if there's a priority filter argument after --interactive
  const args = process.argv;
  const interactiveIndex = args.findIndex(
    arg => arg === '--interactive' || arg === '-i'
  );

  if (interactiveIndex !== -1 && interactiveIndex < args.length - 1) {
    const nextArg = args[interactiveIndex + 1];
    // Check if the next argument is a priority filter and not another option
    if (['h', 'm', 'l', 'a'].includes(nextArg) && !nextArg.startsWith('-')) {
      return nextArg as 'h' | 'm' | 'l' | 'a';
    }
  }

  return undefined;
}

/**
 * Get the model name from the configuration
 * @returns The model name or an empty string if not found
 */
export function getModelName(): string {
  const config = getConfig();
  const selectedModel = config.selectedModel;
  return selectedModel
    ? selectedModel.includes(':')
      ? selectedModel.split(':')[1]
      : selectedModel
    : '';
}

/**
 * Log model information
 * @param apiKeyType The type of API key being used
 * @param modelName The name of the model being used
 */
export function logModelInfo(
  apiKeyType: 'OpenRouter' | 'Google' | 'Anthropic' | 'OpenAI' | null,
  modelName: string
): void {
  if (!apiKeyType) {
    logger.warn('No API keys available. Using mock responses.');
    return;
  }

  if (!modelName) {
    logger.error(`No ${apiKeyType} model specified in environment variables.`);
    logger.error('Please set AI_CODE_REVIEW_MODEL in your .env.local file.');

    switch (apiKeyType) {
      case 'OpenRouter':
        logger.error(
          'Example: AI_CODE_REVIEW_MODEL=openrouter:anthropic/claude-3-opus'
        );
        break;
      case 'Google':
        logger.error('Example: AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro');
        break;
      case 'Anthropic':
        logger.error(
          'Example: AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus-20240229'
        );
        break;
      case 'OpenAI':
        logger.error('Example: AI_CODE_REVIEW_MODEL=openai:gpt-4o');
        break;
    }

    process.exit(1);
  }

  logger.info(`Using ${apiKeyType} API with model: ${modelName}`);
}
