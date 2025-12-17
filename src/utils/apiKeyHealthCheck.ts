/**
 * @fileoverview API key validation through lightweight health check calls
 *
 * This module validates API keys by making minimal test calls to each provider's API.
 * It helps detect invalid or expired keys before running reviews.
 */

import logger from './logger';

/**
 * Result of API key validation
 */
export interface KeyValidationResult {
  /** Whether the key is valid */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Provider name */
  provider?: string;
}

/**
 * Validate Google/Gemini API key
 * @param apiKey Google API key to validate
 * @returns Validation result
 */
async function validateGoogleApiKey(apiKey: string): Promise<KeyValidationResult> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { valid: true, provider: 'google' };
    }

    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    const errorMessage = errorData?.error?.message || response.statusText || 'Unknown error';

    return {
      valid: false,
      error: `Invalid Google API key: ${errorMessage}`,
      provider: 'google',
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate Google API key: ${error}`,
      provider: 'google',
    };
  }
}

/**
 * Validate Anthropic API key
 * @param apiKey Anthropic API key to validate
 * @returns Validation result
 */
async function validateAnthropicApiKey(apiKey: string): Promise<KeyValidationResult> {
  try {
    const url = 'https://api.anthropic.com/v1/messages';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }],
      }),
    });

    // 200 = valid key, 401 = invalid key, other = network/service error
    if (response.ok || response.status === 400) {
      // 400 might be returned but with valid auth - key is still valid
      return { valid: true, provider: 'anthropic' };
    }

    if (response.status === 401) {
      return {
        valid: false,
        error: 'Invalid Anthropic API key: Authentication failed',
        provider: 'anthropic',
      };
    }

    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    const errorMessage = errorData?.error?.message || response.statusText || 'Unknown error';

    return {
      valid: false,
      error: `Failed to validate Anthropic API key: ${errorMessage}`,
      provider: 'anthropic',
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate Anthropic API key: ${error}`,
      provider: 'anthropic',
    };
  }
}

/**
 * Validate OpenRouter API key
 * @param apiKey OpenRouter API key to validate
 * @returns Validation result
 */
async function validateOpenRouterApiKey(apiKey: string): Promise<KeyValidationResult> {
  try {
    const url = 'https://openrouter.ai/api/v1/auth/key';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { valid: true, provider: 'openrouter' };
    }

    if (response.status === 401) {
      return {
        valid: false,
        error: 'Invalid OpenRouter API key: Authentication failed',
        provider: 'openrouter',
      };
    }

    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    const errorMessage =
      (typeof errorData === 'object' && errorData?.error) || response.statusText || 'Unknown error';

    return {
      valid: false,
      error: `Failed to validate OpenRouter API key: ${errorMessage}`,
      provider: 'openrouter',
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate OpenRouter API key: ${error}`,
      provider: 'openrouter',
    };
  }
}

/**
 * Validate OpenAI API key
 * @param apiKey OpenAI API key to validate
 * @returns Validation result
 */
async function validateOpenAIApiKey(apiKey: string): Promise<KeyValidationResult> {
  try {
    const url = 'https://api.openai.com/v1/models';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { valid: true, provider: 'openai' };
    }

    if (response.status === 401) {
      return {
        valid: false,
        error: 'Invalid OpenAI API key: Authentication failed',
        provider: 'openai',
      };
    }

    const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    const errorMessage = errorData?.error?.message || response.statusText || 'Unknown error';

    return {
      valid: false,
      error: `Failed to validate OpenAI API key: ${errorMessage}`,
      provider: 'openai',
    };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate OpenAI API key: ${error}`,
      provider: 'openai',
    };
  }
}

/**
 * Validate API key for a specific provider
 * @param provider Provider name (google, anthropic, openrouter, openai)
 * @param apiKey API key to validate
 * @returns Validation result
 */
export async function validateApiKey(
  provider: string,
  apiKey: string,
): Promise<KeyValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return {
      valid: false,
      error: 'API key is empty',
      provider,
    };
  }

  logger.debug(`Validating API key for provider: ${provider}`);

  switch (provider.toLowerCase()) {
    case 'google':
    case 'gemini':
      return validateGoogleApiKey(apiKey);
    case 'anthropic':
    case 'claude':
      return validateAnthropicApiKey(apiKey);
    case 'openrouter':
      return validateOpenRouterApiKey(apiKey);
    case 'openai':
      return validateOpenAIApiKey(apiKey);
    default:
      return {
        valid: false,
        error: `Unknown provider: ${provider}`,
        provider,
      };
  }
}

/**
 * Get validation status for all configured API keys
 * @param config Configuration object with API keys
 * @returns Map of provider to validation result
 */
export async function getKeyStatus(config: {
  googleApiKey?: string;
  anthropicApiKey?: string;
  openRouterApiKey?: string;
  openAIApiKey?: string;
}): Promise<Map<string, KeyValidationResult>> {
  const results = new Map<string, KeyValidationResult>();

  if (config.googleApiKey) {
    results.set('google', await validateApiKey('google', config.googleApiKey));
  }

  if (config.anthropicApiKey) {
    results.set('anthropic', await validateApiKey('anthropic', config.anthropicApiKey));
  }

  if (config.openRouterApiKey) {
    results.set('openrouter', await validateApiKey('openrouter', config.openRouterApiKey));
  }

  if (config.openAIApiKey) {
    results.set('openai', await validateApiKey('openai', config.openAIApiKey));
  }

  return results;
}
