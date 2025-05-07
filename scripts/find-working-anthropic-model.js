#!/usr/bin/env node

/**
 * Find Working Anthropic Model
 * 
 * This script tests multiple model name formats to find which one works
 * with the Anthropic API. It tries different variations of the Claude 3
 * models to determine the correct naming convention.
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
dotenv.config({ path: envPath });

// Get the Anthropic API key
const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Error: AI_CODE_REVIEW_ANTHROPIC_API_KEY not found in .env.local');
  process.exit(1);
}

// Different model variants to test
const modelVariants = [
  // Claude 3.7
  'claude-3-7-sonnet-20250219',
  'claude-3-7-sonnet',
  'claude-3.7-sonnet-20250219',
  'claude-3.7-sonnet',
  
  // Claude 3.5
  'claude-3-5-sonnet-20240620',
  'claude-3-5-sonnet',
  'claude-3.5-sonnet-20240620',
  'claude-3.5-sonnet',
  
  // Claude 3 base models
  'claude-3-opus-20240229',
  'claude-3-opus',
  'claude-3-sonnet-20240229',
  'claude-3-sonnet',
  'claude-3-haiku-20240307',
  'claude-3-haiku',
  
  // Legacy Claude models
  'claude-2.1',
  'claude-2.0',
  'claude-instant-1.2',
];

// Test a specific model variant
async function testModel(modelName) {
  console.log(`\n===== Testing model: ${modelName} =====`);
  
  const url = 'https://api.anthropic.com/v1/messages';
  
  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'messages-2023-12-15',
    'Accept': 'application/json'
  };
  
  const requestBody = {
    model: modelName,
    system: 'You are a helpful AI assistant.',
    messages: [
      {
        role: 'user',
        content: 'Hello, please respond with the exact model name you are running as.'
      }
    ],
    max_tokens: 100
  };
  
  try {
    console.log('Sending request...');
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(requestBody)
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS!');
      console.log('Model responded with:', data.content[0]?.text);
      return { success: true, modelName, responseText: data.content[0]?.text };
    } else {
      const errorText = await response.text();
      console.log('❌ FAILED!');
      console.log('Error response:', errorText);
      return { success: false, modelName, error: errorText };
    }
  } catch (error) {
    console.error('Fetch error:', error.message);
    return { success: false, modelName, error: error.message };
  }
}

// Run tests for all model variants
async function findWorkingModels() {
  const results = [];
  
  for (const model of modelVariants) {
    const result = await testModel(model);
    results.push(result);
  }
  
  // Print summary
  console.log('\n\n===== TEST RESULTS SUMMARY =====');
  
  const workingModels = results.filter(r => r.success);
  console.log(`Total models tested: ${modelVariants.length}`);
  console.log(`Working models found: ${workingModels.length}`);
  
  if (workingModels.length > 0) {
    console.log('\nWorking model formats:');
    workingModels.forEach(model => {
      console.log(`- ${model.modelName}`);
    });
    
    console.log('\nRECOMMENDED MODEL NAME FORMAT:');
    console.log(workingModels[0].modelName);
    
    // Update .env.local with correct model format
    console.log('\nWould you like to update your .env.local file with the correct model format? (Y/n)');
    // In an actual interactive script, you would get user input here
    // For this automation, we'll just suggest the format
    console.log('To update manually, add this to your .env.local:');
    console.log(`AI_CODE_REVIEW_MODEL=anthropic:${workingModels[0].modelName}`);
  } else {
    console.log('\nNo working models found! Try checking your API key or internet connection.');
  }
}

// Run the tests
findWorkingModels().catch(error => {
  console.error('Error running tests:', error);
});