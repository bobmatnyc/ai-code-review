/**
 * @fileoverview Utilities for validating API keys for different AI providers.
 *
 * This module provides functions for validating API keys for different AI providers,
 * including Anthropic, Google, OpenAI, and OpenRouter.
 */
import logger from '../../utils/logger';

/**
 * Validate the Anthropic API key
 * @param apiKey The Anthropic API key to validate
 * @param isDebugMode Whether debug mode is enabled
 * @returns True if the API key is valid, false otherwise
 */
export function validateAnthropicApiKey(apiKey: string | undefined, isDebugMode = false): boolean {
  if (!apiKey) {
    logger.error('No Anthropic API key found.');
    logger.error('Please add the following to your .env file:');
    logger.error('- AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here');
    return false;
  }

  if (isDebugMode) {
    logger.info('Anthropic API key found: AI_CODE_REVIEW_ANTHROPIC_API_KEY');
  }

  return true;
}

/**
 * Validate the Google API key
 * @param apiKey The Google API key to validate
 * @param isDebugMode Whether debug mode is enabled
 * @returns True if the API key is valid, false otherwise
 */
export function validateGoogleApiKey(apiKey: string | undefined, isDebugMode = false): boolean {
  if (!apiKey) {
    logger.error('No Google API key found.');
    logger.error('Please add the following to your .env file:');
    logger.error('- AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here');
    return false;
  }

  if (isDebugMode) {
    logger.info('Google API key found: AI_CODE_REVIEW_GOOGLE_API_KEY');
  }

  return true;
}

/**
 * Validate the OpenRouter API key
 * @param apiKey The OpenRouter API key to validate
 * @param isDebugMode Whether debug mode is enabled
 * @returns True if the API key is valid, false otherwise
 */
export function validateOpenRouterApiKey(apiKey: string | undefined, isDebugMode = false): boolean {
  if (!apiKey) {
    logger.error('No OpenRouter API key found.');
    logger.error('Please add the following to your .env file:');
    logger.error('- AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here');
    return false;
  }

  if (isDebugMode) {
    logger.info('OpenRouter API key found: AI_CODE_REVIEW_OPENROUTER_API_KEY');
  }

  return true;
}

/**
 * Validate the OpenAI API key
 * @param apiKey The OpenAI API key to validate
 * @param isDebugMode Whether debug mode is enabled
 * @returns True if the API key is valid, false otherwise
 */
export function validateOpenAIApiKey(apiKey: string | undefined, isDebugMode = false): boolean {
  if (!apiKey) {
    logger.error('No OpenAI API key found.');
    logger.error('Please add the following to your .env file:');
    logger.error('- AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here');
    return false;
  }

  if (isDebugMode) {
    logger.info('OpenAI API key found: AI_CODE_REVIEW_OPENAI_API_KEY');
  }

  return true;
}

/**
 * Get whether debug mode is enabled
 * @returns True if debug mode is enabled, false otherwise
 */
export function isDebugMode(): boolean {
  return process.argv.includes('--debug');
}
