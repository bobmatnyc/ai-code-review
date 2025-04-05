#!/usr/bin/env node

import * as path from 'path';
import * as dotenv from 'dotenv';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
console.log(`Loading environment variables from: ${envLocalPath}`);
dotenv.config({ path: envLocalPath });

// Get API key
const apiKey = process.env.GOOGLE_AI_STUDIO_KEY || process.env.GOOGLE_GENERATIVE_AI_KEY;

if (!apiKey) {
  console.error('No API key found. Please set GOOGLE_AI_STUDIO_KEY or GOOGLE_GENERATIVE_AI_KEY in .env.local');
  process.exit(1);
}

/**
 * Test if a specific Gemini model is available
 * @param modelName Name of the model to test
 * @param apiVersion API version to use (v1 or v1beta)
 */
async function testModel(modelName: string, apiVersion: string = 'v1'): Promise<boolean> {
  try {
    console.log(`Testing model: ${modelName} with ${apiVersion} API...`);

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey);

    // Set the API version using a custom URL if needed
    const baseUrl = apiVersion === 'v1beta'
      ? 'https://generativelanguage.googleapis.com/v1beta'
      : undefined; // Use default for v1

    // Get the model
    const model = genAI.getGenerativeModel({
      model: modelName,
      apiVersion: apiVersion,
      // Use custom baseUrl for v1beta if needed
      ...(baseUrl ? { baseUrl } : {})
    });

    // Try a simple generation to verify the model works
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: 'Hello, are you available?' }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 100,
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

    console.log(`✅ Model ${modelName} is available with ${apiVersion} API. Response: "${text.substring(0, 50)}..."`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error testing model ${modelName} with ${apiVersion} API: ${error.message || error}`);
    return false;
  }
}

// Test models
async function runTest() {
  console.log('Testing Gemini models with latest SDK...');

  // Different models to try with v1beta API
  const v1betaModels = [
    'gemini-2.5-pro-preview-03-25',
    'gemini-2.5-pro-exp-03-25'
  ];

  // Different models to try with v1 API
  const v1Models = [
    'gemini-2.0-flash',
    'gemini-1.5-pro'
  ];

  console.log('\nTesting with v1beta API:');
  console.log('----------------------');
  for (const modelName of v1betaModels) {
    await testModel(modelName, 'v1beta');
    console.log(); // Add a blank line for readability
  }

  console.log('\nTesting with v1 API:');
  console.log('----------------');
  for (const modelName of v1Models) {
    await testModel(modelName, 'v1');
    console.log(); // Add a blank line for readability
  }
}

// Run the main function
runTest().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
