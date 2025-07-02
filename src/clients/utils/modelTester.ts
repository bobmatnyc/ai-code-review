/**
 * @fileoverview Utilities for testing AI model availability and capabilities.
 *
 * This module provides functions for testing the availability and functionality of
 * different AI models across all supported providers. It helps users verify that
 * their API keys are valid and that the models they intend to use are accessible
 * and functioning correctly.
 */

import {
  getAnthropicApiKey,
  getGoogleApiKey,
  getOpenAIApiKey,
  getOpenRouterApiKey,
} from '../../utils/envLoader';
import logger from '../../utils/logger';
import type { Provider } from './modelMaps';

/**
 * Test result interface
 */
export interface TestResult {
  success: boolean;
  message: string;
  model?: string;
  provider?: Provider;
  response?: string;
  error?: any;
}

/**
 * Format an API error message
 * @param error Error object
 * @param provider Provider name
 * @returns Formatted error message
 */
function formatApiError(error: any, provider: string): string {
  // Extract the error message
  const errorMessage = error.message || String(error);

  // Check for common error patterns
  if (errorMessage.includes('API key')) {
    return `Invalid ${provider} API key: ${errorMessage}`;
  }
  if (errorMessage.includes('Rate limit')) {
    return `${provider} API rate limit exceeded: ${errorMessage}`;
  }
  if (errorMessage.includes('not found')) {
    return `${provider} model not found: ${errorMessage}`;
  }
  if (errorMessage.includes('quota')) {
    return `${provider} API quota exceeded: ${errorMessage}`;
  }
  return `${provider} API error: ${errorMessage}`;
}

/**
 * Test a Gemini model
 * @param modelName Model name to test
 * @returns Test result
 */
export async function testGeminiModel(modelName = 'gemini-1.5-pro'): Promise<TestResult> {
  const apiKeyResult = getGoogleApiKey();

  if (!apiKeyResult.apiKey) {
    return {
      success: false,
      message:
        'No Google API key found. Please set AI_CODE_REVIEW_GOOGLE_API_KEY in your .env file.',
      provider: 'gemini',
    };
  }

  try {
    // Dynamically import the GoogleGenerativeAI library
    const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = await import(
      '@google/generative-ai'
    );

    // Initialize the client
    const genAI = new GoogleGenerativeAI(apiKeyResult.apiKey);

    // Get the model
    const model = genAI.getGenerativeModel({ model: modelName });

    // Test the model with a simple prompt
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Say hello in one word.' }] }],
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    const response = result.response.text();

    return {
      success: true,
      message: `Successfully tested ${modelName}`,
      model: modelName,
      provider: 'gemini',
      response,
    };
  } catch (error) {
    logger.error(`Error testing Gemini model ${modelName}:`, error);

    return {
      success: false,
      message: formatApiError(error, 'Gemini'),
      model: modelName,
      provider: 'gemini',
      error,
    };
  }
}

/**
 * Test an Anthropic model
 * @param modelName Model name to test
 * @returns Test result
 */
export async function testAnthropicModel(
  modelName = 'claude-3-sonnet-20240229',
): Promise<TestResult> {
  const apiKeyResult = getAnthropicApiKey();

  if (!apiKeyResult.apiKey) {
    return {
      success: false,
      message:
        'No Anthropic API key found. Please set AI_CODE_REVIEW_ANTHROPIC_API_KEY in your .env file.',
      provider: 'anthropic',
    };
  }

  try {
    // Use fetch to test the API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeyResult.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say hello in one word.' }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API error: ${response.status} ${errorData.error?.message || 'Unknown error'}`,
      );
    }

    const data = await response.json();

    return {
      success: true,
      message: `Successfully tested ${modelName}`,
      model: modelName,
      provider: 'anthropic',
      response: data.content[0].text,
    };
  } catch (error) {
    logger.error(`Error testing Anthropic model ${modelName}:`, error);

    return {
      success: false,
      message: formatApiError(error, 'Anthropic'),
      model: modelName,
      provider: 'anthropic',
      error,
    };
  }
}

/**
 * Test an OpenAI model
 * @param modelName Model name to test
 * @returns Test result
 */
export async function testOpenAIModel(modelName = 'gpt-4o'): Promise<TestResult> {
  const apiKeyResult = getOpenAIApiKey();

  if (!apiKeyResult.apiKey) {
    return {
      success: false,
      message:
        'No OpenAI API key found. Please set AI_CODE_REVIEW_OPENAI_API_KEY in your .env file.',
      provider: 'openai',
    };
  }

  try {
    // Use fetch to test the API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKeyResult.apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say hello in one word.' }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API error: ${response.status} ${errorData.error?.message || 'Unknown error'}`,
      );
    }

    const data = await response.json();

    return {
      success: true,
      message: `Successfully tested ${modelName}`,
      model: modelName,
      provider: 'openai',
      response: data.choices[0].message.content,
    };
  } catch (error) {
    logger.error(`Error testing OpenAI model ${modelName}:`, error);

    return {
      success: false,
      message: formatApiError(error, 'OpenAI'),
      model: modelName,
      provider: 'openai',
      error,
    };
  }
}

/**
 * Test an OpenRouter model
 * @param modelName Model name to test
 * @returns Test result
 */
export async function testOpenRouterModel(
  modelName = 'anthropic/claude-3-opus-20240229',
): Promise<TestResult> {
  const apiKeyResult = getOpenRouterApiKey();

  if (!apiKeyResult.apiKey) {
    return {
      success: false,
      message:
        'No OpenRouter API key found. Please set AI_CODE_REVIEW_OPENROUTER_API_KEY in your .env file.',
      provider: 'openrouter',
    };
  }

  try {
    // Use fetch to test the API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKeyResult.apiKey}`,
        'HTTP-Referer': 'https://github.com/bobmatnyc/ai-code-review',
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say hello in one word.' }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API error: ${response.status} ${errorData.error?.message || 'Unknown error'}`,
      );
    }

    const data = await response.json();

    return {
      success: true,
      message: `Successfully tested ${modelName}`,
      model: modelName,
      provider: 'openrouter',
      response: data.choices[0].message.content,
    };
  } catch (error) {
    logger.error(`Error testing OpenRouter model ${modelName}:`, error);

    return {
      success: false,
      message: formatApiError(error, 'OpenRouter'),
      model: modelName,
      provider: 'openrouter',
      error,
    };
  }
}

/**
 * Test the best available model
 * @returns Test result
 */
export async function testBestAvailableModel(): Promise<TestResult> {
  // Try Gemini first
  const geminiResult = await testGeminiModel();
  if (geminiResult.success) {
    return geminiResult;
  }

  // Try Anthropic next
  const anthropicResult = await testAnthropicModel();
  if (anthropicResult.success) {
    return anthropicResult;
  }

  // Try OpenAI next
  const openaiResult = await testOpenAIModel();
  if (openaiResult.success) {
    return openaiResult;
  }

  // Try OpenRouter last
  const openRouterResult = await testOpenRouterModel();
  if (openRouterResult.success) {
    return openRouterResult;
  }

  // No models available
  return {
    success: false,
    message: 'No API keys found or all API tests failed. Please check your .env file and API keys.',
  };
}

/**
 * Find an available model for a specific provider
 * @param provider Provider to test
 * @param modelOptions Array of model names to try
 * @returns The first available model or null if none are available
 */
export async function findAvailableModelForProvider(
  provider: Provider,
  modelOptions: string[],
): Promise<string | null> {
  logger.info(`Testing ${modelOptions.length} ${provider} models...`);

  for (const modelName of modelOptions) {
    try {
      let result: TestResult;

      switch (provider) {
        case 'gemini':
          result = await testGeminiModel(modelName);
          break;
        case 'anthropic':
          result = await testAnthropicModel(modelName);
          break;
        case 'openai':
          result = await testOpenAIModel(modelName);
          break;
        case 'openrouter':
          result = await testOpenRouterModel(modelName);
          break;
        default:
          logger.error(`Unknown provider: ${provider}`);
          return null;
      }

      if (result.success) {
        logger.info(`Found available model: ${modelName}`);
        return modelName;
      }
    } catch (error) {
      logger.error(`Error testing ${provider} model ${modelName}:`, error);
      // Continue to the next model
    }
  }

  logger.error(`No available ${provider} models found.`);
  return null;
}
