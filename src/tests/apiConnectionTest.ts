/**
 * @fileoverview Tests for API connections to verify API keys.
 *
 * This module provides tests to verify that the API keys provided in the
 * environment variables are valid and working correctly. It tests connections
 * to both Google Gemini API and OpenRouter API.
 *
 * Key features:
 * - Tests connection to Google Gemini API
 * - Tests connection to OpenRouter API
 * - Provides detailed error messages for failed connections
 * - Can be run on startup to verify API keys
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

/**
 * Test connection to Google Gemini API
 * @returns Promise resolving to a boolean indicating if the connection was successful
 */
export async function testGeminiConnection(): Promise<{ success: boolean; message: string }> {
  const apiKey = process.env.CODE_REVIEW_GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_KEY;

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
 * Test connection to OpenRouter API
 * @returns Promise resolving to a boolean indicating if the connection was successful
 */
export async function testOpenRouterConnection(): Promise<{ success: boolean; message: string }> {
  const apiKey = process.env.CODE_REVIEW_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return {
      success: false,
      message: 'No OpenRouter API key found in environment variables'
    };
  }

  try {
    // Make a simple request to the OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/bobmatnyc/code-review',
        'X-Title': 'AI Code Review Tool'
      },
      body: JSON.stringify({
        model: 'openai/gpt-3.5-turbo', // Use a simple model for testing
        messages: [
          { role: 'user', content: 'Hello, are you working?' }
        ],
        max_tokens: 10,
        temperature: 0.2,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        message: `OpenRouter API returned error: ${JSON.stringify(errorData)}`
      };
    }

    const data = await response.json() as any;

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
 * Run all API connection tests
 */
export async function runApiConnectionTests(): Promise<void> {
  console.log('Testing API connections...');

  // Test Google Gemini API connection
  const geminiResult = await testGeminiConnection();
  console.log(`Google Gemini API: ${geminiResult.success ? '✅ CONNECTED' : '❌ FAILED'}`);
  console.log(`  ${geminiResult.message}`);

  // Test OpenRouter API connection
  const openRouterResult = await testOpenRouterConnection();
  console.log(`OpenRouter API: ${openRouterResult.success ? '✅ CONNECTED' : '❌ FAILED'}`);
  console.log(`  ${openRouterResult.message}`);

  console.log('API connection tests completed.');
}

// If this file is run directly, run the tests
if (require.main === module) {
  runApiConnectionTests().catch(error => {
    console.error('Error running API connection tests:', error);
    process.exit(1);
  });
}
