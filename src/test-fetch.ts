#!/usr/bin/env node

import * as path from 'path';
import * as dotenv from 'dotenv';

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
 * Test if a specific Gemini model is available with direct API call
 * @param modelName Name of the model to test
 * @param apiVersion API version to use (v1 or v1beta)
 */
async function testModel(modelName: string, apiVersion: string = 'v1'): Promise<boolean> {
  try {
    console.log(`Testing model: ${modelName} with ${apiVersion} API...`);

    // Prepare the request
    const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'Hello, are you available?' }]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 100
      }
    };

    // Make the request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
    }

    // Parse the response
    const data = await response.json();

    // Extract the text from the response
    let text = '';
    if (data.candidates && data.candidates[0] && data.candidates[0].content &&
        data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
      text = data.candidates[0].content.parts[0].text;
    }

    console.log(`✅ Model ${modelName} is available with ${apiVersion} API. Response: "${text.substring(0, 50)}..."`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error testing model ${modelName} with ${apiVersion} API: ${error.message || error}`);
    return false;
  }
}

// Test models
async function runTest() {
  console.log('Testing Gemini models with direct API calls...');

  // Different models to try with v1beta API
  const v1betaModels = [
    'gemini-2.5-pro-preview-03-25',
    'gemini-2.5-pro-exp-03-25',
    'gemini-2.5-pro-latest'
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
