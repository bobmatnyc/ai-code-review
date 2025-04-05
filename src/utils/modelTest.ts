/**
 * @fileoverview Utilities for testing Gemini model availability and capabilities.
 *
 * This module provides functions for testing the availability and functionality of
 * different Gemini AI models. It helps users verify that their API key is valid and
 * that the models they intend to use are accessible and functioning correctly.
 *
 * Key responsibilities:
 * - Testing if specific Gemini models are available
 * - Verifying API key validity
 * - Testing model response quality with simple prompts
 * - Finding the best available model from a list of candidates
 * - Providing detailed feedback on model availability and performance
 *
 * These utilities are particularly useful during setup and troubleshooting to ensure
 * that the code review tool can successfully connect to and use the Gemini API.
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

/**
 * Test if a specific Gemini model is available
 * @param apiKey API key to use
 * @param modelName Name of the model to test
 * @returns Promise resolving to a boolean indicating if the model is available
 */
export async function testModel(apiKey: string, modelName: string): Promise<boolean> {
  // Validate API key
  if (!apiKey) {
    console.error('Error: API key is required to test the model');
    throw new Error('Missing API key');
  }

  try {
    console.log(`Testing model: ${modelName}...`);
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: modelName });

    // Get configuration from environment variables or use defaults
    const temperature = parseFloat(process.env.GEMINI_TEMPERATURE || '0.2');
    const maxOutputTokens = parseInt(process.env.GEMINI_MAX_OUTPUT_TOKENS || '100', 10);

    // Try a simple generation to verify the model works
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hello, are you available?' }] }],
      generationConfig: {
        temperature: temperature,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: maxOutputTokens,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        }
      ]
    });

    const response = result.response;
    const text = response.text();

    console.log(`Model ${modelName} is available. Response: "${text.substring(0, 50)}..."`);
    return true;
  } catch (error: unknown) {
    // Handle specific error types
    const errorObj = error as Error;
    if (errorObj.message && errorObj.message.includes('API key')) {
      console.error(`Invalid API key when testing model ${modelName}:`, errorObj.message);
    } else if (errorObj.message && errorObj.message.includes('Rate limit')) {
      console.error(`Rate limit exceeded when testing model ${modelName}:`, errorObj.message);
    } else if (errorObj.message && errorObj.message.includes('not found')) {
      console.error(`Model ${modelName} not found:`, errorObj.message);
    } else {
      console.error(`Error testing model ${modelName}:`, errorObj.message || String(error));
    }
    return false;
  }
}

/**
 * Test all available models and return the first one that works
 * @param apiKey API key to use
 * @returns Promise resolving to the name of the first available model, or null if none are available
 */
export async function findAvailableModel(apiKey: string): Promise<string | null> {
  // Validate API key
  if (!apiKey) {
    console.error('Error: API key is required to find available models');
    throw new Error('Missing API key');
  }

  // Get model options from environment variables or use defaults
  const modelOptionsEnv = process.env.GEMINI_MODEL_OPTIONS;
  const modelOptions = modelOptionsEnv ?
    modelOptionsEnv.split(',').map(model => model.trim()) : [
    'gemini-2.5-pro-preview-03-25', // Try with updated API key
    'gemini-2.0-flash',
    'gemini-1.5-pro',
    'gemini-pro',
    'gemini-pro-latest'
  ];

  console.log(`Testing ${modelOptions.length} models in order of preference...`);

  for (const modelName of modelOptions) {
    try {
      const isAvailable = await testModel(apiKey, modelName);
      if (isAvailable) {
        return modelName;
      }
    } catch (error) {
      console.error(`Error in findAvailableModel when testing ${modelName}:`, error);
      // Continue to the next model
    }
  }

  console.error('No available models found. Please check your API key and quota.');
  return null;
}
