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
 *
 * This function determines which AI provider to use based on:
 * 1. The model adapter specified in the AI_CODE_REVIEW_MODEL environment variable
 * 2. The availability of API keys for different providers
 *
 * The function first checks if a specific adapter is specified in the model name
 * (e.g., 'gemini:gemini-1.5-pro' or 'anthropic:claude-3-opus'). If so, it checks
 * if the corresponding API key is available. If not, or if no adapter is specified,
 * it falls back to checking for any available API key in a specific order.
 *
 * @returns The type of API key available ('OpenRouter', 'Google', 'Anthropic', 'OpenAI', or null if none)
 * @example
 * // If AI_CODE_REVIEW_MODEL='gemini:gemini-1.5-pro' and Google API key is available
 * getApiKeyType() // Returns 'Google'
 *
 * // If no model is specified but Anthropic API key is available
 * getApiKeyType() // Returns 'Anthropic'
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
  // If so, return the corresponding API type regardless of whether we have the API key
  // This ensures we respect the user's choice of model and provide appropriate error messages
  if (adapter === 'gemini') {
    return 'Google';
  }
  if (adapter === 'openrouter') {
    return 'OpenRouter';
  }
  if (adapter === 'anthropic') {
    return 'Anthropic';
  }
  if (adapter === 'openai') {
    return 'OpenAI';
  }

  // If no specific adapter is specified, check if any API keys are available
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
 *
 * This function extracts the priority filter from either:
 * 1. The options object (if the interactive property is a string)
 * 2. The command line arguments (if --interactive or -i is followed by a priority filter)
 *
 * Priority filters determine which issues to display in interactive mode:
 * - 'h': High priority issues only
 * - 'm': Medium and high priority issues
 * - 'l': Low, medium, and high priority issues
 * - 'a': All issues (including informational)
 *
 * @param options Review options that may contain the priority filter
 * @returns The priority filter (h, m, l, or a) or undefined if not specified
 * @example
 * // If options.interactive === 'h'
 * getPriorityFilterFromArgs({ interactive: 'h' }) // Returns 'h'
 *
 * // If command line includes '--interactive h'
 * getPriorityFilterFromArgs() // Returns 'h'
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
 *
 * This function extracts the actual model name from the AI_CODE_REVIEW_MODEL
 * environment variable. If the model is specified with an adapter prefix
 * (e.g., 'gemini:gemini-1.5-pro'), it removes the prefix.
 *
 * @returns The model name or an empty string if not found
 * @example
 * // If AI_CODE_REVIEW_MODEL='gemini:gemini-1.5-pro'
 * getModelName() // Returns 'gemini-1.5-pro'
 *
 * // If AI_CODE_REVIEW_MODEL='claude-3-opus'
 * getModelName() // Returns 'claude-3-opus'
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
 * Log model information and validate model configuration
 *
 * This function logs information about the selected model and API provider.
 * It also validates that a model name is specified when an API key is available.
 * If no model is specified but an API key is available, it provides helpful error
 * messages with examples of how to set the model in environment variables.
 *
 * The function will exit the process with an error code if an API key is available
 * but no model is specified.
 *
 * @param apiKeyType The type of API key being used ('OpenRouter', 'Google', 'Anthropic', 'OpenAI', or null)
 * @param modelName The name of the model being used
 * @throws Exits the process if an API key is available but no model is specified
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
