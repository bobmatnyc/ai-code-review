/**
 * @fileoverview API connection testing utilities
 *
 * This module provides functions to test API connections for different providers.
 */

import logger from '../../utils/logger';

/**
 * API test result
 */
export interface ApiTestResult {
  success: boolean;
  error?: string;
  latency?: number;
}

/**
 * Test a provider's API connection
 * @param provider Provider to test
 * @returns Test result
 */
export async function testProviderConnection(
  provider: 'openrouter' | 'anthropic' | 'google' | 'openai',
): Promise<ApiTestResult> {
  const startTime = Date.now();

  try {
    switch (provider) {
      case 'openrouter':
        return await testOpenRouter();
      case 'anthropic':
        return await testAnthropic();
      case 'google':
        return await testGoogle();
      case 'openai':
        return await testOpenAI();
      default:
        return {
          success: false,
          error: `Unknown provider: ${provider}`,
        };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}

/**
 * Test OpenRouter API connection
 */
async function testOpenRouter(): Promise<ApiTestResult> {
  const startTime = Date.now();

  try {
    const apiKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'OpenRouter API key not found in environment',
      };
    }

    // Make a simple API call to verify the key
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        latency,
      };
    }
    return {
      success: false,
      error: `API returned status ${response.status}: ${response.statusText}`,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}

/**
 * Test Anthropic API connection
 */
async function testAnthropic(): Promise<ApiTestResult> {
  const startTime = Date.now();

  try {
    const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'Anthropic API key not found in environment',
      };
    }

    // Make a simple API call to verify the key
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    const latency = Date.now() - startTime;

    if (response.ok || response.status === 400) {
      // 400 is acceptable for test (means auth worked)
      return {
        success: true,
        latency,
      };
    }
    return {
      success: false,
      error: `API returned status ${response.status}: ${response.statusText}`,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}

/**
 * Test Google API connection
 */
async function testGoogle(): Promise<ApiTestResult> {
  const startTime = Date.now();

  try {
    const apiKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'Google API key not found in environment',
      };
    }

    // Use the Gemini API to verify the key
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      {
        method: 'GET',
      },
    );

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        latency,
      };
    }
    return {
      success: false,
      error: `API returned status ${response.status}: ${response.statusText}`,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}

/**
 * Test OpenAI API connection
 */
async function testOpenAI(): Promise<ApiTestResult> {
  const startTime = Date.now();

  try {
    const apiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not found in environment',
      };
    }

    // Make a simple API call to verify the key
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        success: true,
        latency,
      };
    }
    return {
      success: false,
      error: `API returned status ${response.status}: ${response.statusText}`,
      latency,
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      latency,
    };
  }
}
