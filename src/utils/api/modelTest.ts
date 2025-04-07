/**
 * @fileoverview Utilities for testing AI model availability and capabilities.
 *
 * This module provides functions for testing the availability and functionality of
 * different AI models. It helps users verify that their API key is valid and
 * that the models they intend to use are accessible and functioning correctly.
 */

import { getApiKeyForProvider } from '../config';
import logger from '../logger';
import { formatApiError } from './apiUtils';

/**
 * Test result interface
 */
interface TestResult {
  success: boolean;
  message: string;
  model?: string;
  response?: string;
  error?: any;
}

/**
 * Test a Gemini model
 * @param modelName Model name to test
 * @returns Test result
 */
export async function testGeminiModel(modelName: string = 'gemini-1.5-pro'): Promise<TestResult> {
  const apiKey = getApiKeyForProvider('gemini');
  
  if (!apiKey) {
    return {
      success: false,
      message: 'No Google API key found. Please set AI_CODE_REVIEW_GOOGLE_API_KEY in your .env.local file.'
    };
  }
  
  try {
    // Dynamically import the GoogleGenerativeAI library
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    
    // Initialize the client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Get the model
    const model = genAI.getGenerativeModel({ model: modelName });
    
    // Test the model with a simple prompt
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Say hello in one word.' }] }]
    });
    
    const response = result.response.text();
    
    return {
      success: true,
      message: `Successfully tested ${modelName}`,
      model: modelName,
      response
    };
  } catch (error) {
    logger.error(`Error testing Gemini model ${modelName}:`, error);
    
    return {
      success: false,
      message: formatApiError(error, 'Gemini'),
      model: modelName,
      error
    };
  }
}

/**
 * Test an Anthropic model
 * @param modelName Model name to test
 * @returns Test result
 */
export async function testAnthropicModel(modelName: string = 'claude-3-sonnet-20240229'): Promise<TestResult> {
  const apiKey = getApiKeyForProvider('anthropic');
  
  if (!apiKey) {
    return {
      success: false,
      message: 'No Anthropic API key found. Please set AI_CODE_REVIEW_ANTHROPIC_API_KEY in your .env.local file.'
    };
  }
  
  try {
    // Use fetch to test the API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Say hello in one word.' }
        ]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      message: `Successfully tested ${modelName}`,
      model: modelName,
      response: data.content[0].text
    };
  } catch (error) {
    logger.error(`Error testing Anthropic model ${modelName}:`, error);
    
    return {
      success: false,
      message: formatApiError(error, 'Anthropic'),
      model: modelName,
      error
    };
  }
}

/**
 * Test an OpenAI model
 * @param modelName Model name to test
 * @returns Test result
 */
export async function testOpenAIModel(modelName: string = 'gpt-4o'): Promise<TestResult> {
  const apiKey = getApiKeyForProvider('openai');
  
  if (!apiKey) {
    return {
      success: false,
      message: 'No OpenAI API key found. Please set AI_CODE_REVIEW_OPENAI_API_KEY in your .env.local file.'
    };
  }
  
  try {
    // Use fetch to test the API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Say hello in one word.' }
        ]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      message: `Successfully tested ${modelName}`,
      model: modelName,
      response: data.choices[0].message.content
    };
  } catch (error) {
    logger.error(`Error testing OpenAI model ${modelName}:`, error);
    
    return {
      success: false,
      message: formatApiError(error, 'OpenAI'),
      model: modelName,
      error
    };
  }
}

/**
 * Test an OpenRouter model
 * @param modelName Model name to test
 * @returns Test result
 */
export async function testOpenRouterModel(modelName: string = 'anthropic/claude-3-opus'): Promise<TestResult> {
  const apiKey = getApiKeyForProvider('openrouter');
  
  if (!apiKey) {
    return {
      success: false,
      message: 'No OpenRouter API key found. Please set AI_CODE_REVIEW_OPENROUTER_API_KEY in your .env.local file.'
    };
  }
  
  try {
    // Use fetch to test the API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/bobmatnyc/ai-code-review'
      },
      body: JSON.stringify({
        model: modelName,
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Say hello in one word.' }
        ]
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${response.status} ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      message: `Successfully tested ${modelName}`,
      model: modelName,
      response: data.choices[0].message.content
    };
  } catch (error) {
    logger.error(`Error testing OpenRouter model ${modelName}:`, error);
    
    return {
      success: false,
      message: formatApiError(error, 'OpenRouter'),
      model: modelName,
      error
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
    message: 'No API keys found or all API tests failed. Please check your .env.local file and API keys.'
  };
}
