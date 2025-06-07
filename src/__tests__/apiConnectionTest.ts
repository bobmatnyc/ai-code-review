/**
 * @fileoverview Tests for API connections to verify API keys.
 *
 * This module provides tests to verify that the API keys provided in the
 * environment variables are valid and working correctly. It tests connections
 * to various AI APIs including Google Gemini, OpenRouter, and Anthropic.
 *
 * Key features:
 * - Tests connection to Google Gemini API
 * - Tests connection to OpenRouter API
 * - Tests connection to Anthropic API
 * - Provides detailed error messages for failed connections
 * - Can be run on startup to verify API keys
 */

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold
} from '@google/generative-ai';
// Using native fetch API (Node.js 18+)
import dotenv from 'dotenv';
// import logger from '../utils/logger';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Test connection to Google Gemini API
 * @returns Promise resolving to a boolean indicating if the connection was successful
 */
export async function testGeminiConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  const apiKey =
    process.env.AI_CODE_REVIEW_GOOGLE_API_KEY ||
    process.env.CODE_REVIEW_GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: 'No Google Gemini API key found in environment variables'
    };
  }

  try {
    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey);

    // Get a simple model
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        }
      ]
    });

    // Test with a simple prompt
    const result = await model.generateContent('Hello, are you working?');
    const response = result.response;
    const text = response.text();

    if (text && text.length > 0) {
      return {
        success: true,
        message: `Successfully connected to Google Gemini API with model: gemini-1.5-flash`
      };
    } else {
      return {
        success: false,
        message: 'Connected to Google Gemini API but received empty response'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to Google Gemini API: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Test connection to Anthropic API
 * @returns Promise resolving to a boolean indicating if the connection was successful
 */
export async function testAnthropicConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  const apiKey =
    process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY ||
    process.env.CODE_REVIEW_ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: 'No Anthropic API key found in environment variables'
    };
  }

  try {
    // Make a simple request to the Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        messages: [{ role: 'user', content: 'Hello, are you working?' }],
        max_tokens: 10
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: `Anthropic API returned error: ${JSON.stringify(errorData)}`
      };
    }

    const data = (await response.json()) as { content?: Array<unknown> };

    if (data && data.content && data.content.length > 0) {
      return {
        success: true,
        message: `Successfully connected to Anthropic API with model: claude-3-haiku-20240307`
      };
    } else {
      return {
        success: false,
        message: 'Connected to Anthropic API but received invalid response'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to Anthropic API: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Test connection to OpenRouter API
 * @returns Promise resolving to a boolean indicating if the connection was successful
 */
export async function testOpenRouterConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  const apiKey =
    process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY ||
    process.env.CODE_REVIEW_OPENROUTER_API_KEY ||
    process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: 'No OpenRouter API key found in environment variables'
    };
  }

  try {
    // Make a simple request to the OpenRouter API
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
          'X-Title': 'AI Code Review Tool'
        },
        body: JSON.stringify({
          model: 'openai/gpt-3.5-turbo', // Use a simple model for testing
          messages: [{ role: 'user', content: 'Hello, are you working?' }],
          max_tokens: 10,
          temperature: 0.2,
          stream: false
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: `OpenRouter API returned error: ${JSON.stringify(errorData)}`
      };
    }

    const data = (await response.json()) as { choices?: Array<unknown> };

    if (data && data.choices && data.choices.length > 0) {
      return {
        success: true,
        message: `Successfully connected to OpenRouter API with model: openai/gpt-3.5-turbo`
      };
    } else {
      return {
        success: false,
        message: 'Connected to OpenRouter API but received invalid response'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to OpenRouter API: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Test connection to OpenAI API
 * @returns Promise resolving to a boolean indicating if the connection was successful
 */
export async function testOpenAIConnection(): Promise<{
  success: boolean;
  message: string;
}> {
  const apiKey =
    process.env.AI_CODE_REVIEW_OPENAI_API_KEY ||
    process.env.CODE_REVIEW_OPENAI_API_KEY ||
    process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: 'No OpenAI API key found in environment variables'
    };
  }

  try {
    // Make a simple request to the OpenAI API
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // Use a simple model for testing
          messages: [{ role: 'user', content: 'Hello, are you working?' }],
          max_tokens: 10,
          temperature: 0.2
        })
      }
    );

    if (!response.ok) {
      let errorMessage = `HTTP status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = JSON.stringify(errorData);
      } catch (e) {
        // If we can't parse the error as JSON, just use the status
      }
      
      return {
        success: false,
        message: `OpenAI API returned error: ${errorMessage}`
      };
    }

    const data = (await response.json()) as { choices?: Array<unknown> };

    if (data && data.choices && data.choices.length > 0) {
      return {
        success: true,
        message: `Successfully connected to OpenAI API with model: gpt-3.5-turbo`
      };
    } else {
      return {
        success: false,
        message: 'Connected to OpenAI API but received invalid response'
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to OpenAI API: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Helper function to determine which API to test based on the model
 */
function getSelectedApiType():
  | 'gemini'
  | 'openrouter'
  | 'anthropic'
  | 'openai'
  | 'all' {
  // Get the model from environment variables
  const selectedModel = process.env.AI_CODE_REVIEW_MODEL || '';

  // If no model is specified, test all APIs
  if (!selectedModel) {
    return 'all';
  }

  // Parse the model name
  const [adapter] = selectedModel.includes(':')
    ? selectedModel.split(':')
    : ['gemini'];

  // Return the appropriate API type
  switch (adapter.toLowerCase()) {
    case 'gemini':
      return 'gemini';
    case 'openrouter':
      return 'openrouter';
    case 'anthropic':
      return 'anthropic';
    case 'openai':
      return 'openai';
    default:
      return 'all';
  }
}

/**
 * Run API connection tests
 */
export async function runApiConnectionTests(): Promise<void> {
  console.log('Testing API connections...');

  // Determine which API to test
  const apiType = getSelectedApiType();

  // Test Google Gemini API connection if needed
  if (apiType === 'gemini' || apiType === 'all') {
    const geminiResult = await testGeminiConnection();
    console.log(
      `Google Gemini API: ${geminiResult.success ? '✅ CONNECTED' : '❌ FAILED'}`
    );
    console.log(`  ${geminiResult.message}`);
  }

  // Test OpenRouter API connection if needed
  if (apiType === 'openrouter' || apiType === 'all') {
    const openRouterResult = await testOpenRouterConnection();
    console.log(
      `OpenRouter API: ${openRouterResult.success ? '✅ CONNECTED' : '❌ FAILED'}`
    );
    console.log(`  ${openRouterResult.message}`);
  }

  // Test Anthropic API connection if needed
  if (apiType === 'anthropic' || apiType === 'all') {
    const anthropicResult = await testAnthropicConnection();
    console.log(
      `Anthropic API: ${anthropicResult.success ? '✅ CONNECTED' : '❌ FAILED'}`
    );
    console.log(`  ${anthropicResult.message}`);
  }

  // Test OpenAI API connection if needed
  if (apiType === 'openai' || apiType === 'all') {
    try {
      const openAIResult = await testOpenAIConnection();
      console.log(
        `OpenAI API: ${openAIResult.success ? '✅ CONNECTED' : '❌ FAILED'}`
      );
      console.log(`  ${openAIResult.message}`);
    } catch (error) {
      console.log(`OpenAI API: ❌ FAILED`);
      console.log(`  Error testing OpenAI API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log('API connection tests completed.');
}

// If this file is run directly, run the tests
if (require.main === module) {
  runApiConnectionTests().catch(error => {
    console.error('Error running API connection tests:', error);
    process.exit(1);
  });
}
