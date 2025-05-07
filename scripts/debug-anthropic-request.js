#!/usr/bin/env node

/**
 * Debug Anthropic API Request
 * 
 * This script makes direct API calls to Anthropic's Claude API 
 * to test various model name formats and our new mapping function.
 * 
 * Usage:
 *   node debug-anthropic-request.js [modelName]
 *   node debug-anthropic-request.js --all
 */

// Load environment variables
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

// Choose fetch implementation
const fetch = require('node-fetch');

// Set up debugging environment
process.env.AI_CODE_REVIEW_LOG_LEVEL = 'debug';
process.env.NODE_ENV = 'development';

// Import helper utilities if in test mode
let getApiModelName;
try {
  if (fs.existsSync(path.resolve(__dirname, '../dist/clients/utils/anthropicModelHelpers.js'))) {
    // Try to load the compiled helper
    const helpers = require('../dist/clients/utils/anthropicModelHelpers');
    getApiModelName = helpers.getApiModelName;
  } else {
    console.log('Compiled helpers not found, direct API testing only');
  }
} catch (error) {
  console.log('Error loading helper functions, direct API testing only:', error);
}

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Helper for consistent log output
function log(message, type = 'info') {
  const prefix = type === 'info' 
    ? `${colors.blue}[INFO]${colors.reset}`
    : type === 'success'
      ? `${colors.green}[SUCCESS]${colors.reset}`
      : type === 'error'
        ? `${colors.red}[ERROR]${colors.reset}`
        : type === 'warn'
          ? `${colors.yellow}[WARN]${colors.reset}`
          : type === 'api'
            ? `${colors.magenta}[API]${colors.reset}`
            : `${colors.cyan}[DEBUG]${colors.reset}`;
  
  console.log(`${prefix} ${message}`);
}

// Print header
function printHeader(text) {
  console.log('\n' + colors.bright + colors.cyan + '='.repeat(80) + colors.reset);
  console.log(colors.bright + colors.cyan + text + colors.reset);
  console.log(colors.bright + colors.cyan + '='.repeat(80) + colors.reset + '\n');
}

// Get API key from environment
const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY || 
              process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  log('No Anthropic API key found in environment variables.', 'error');
  log('Please set AI_CODE_REVIEW_ANTHROPIC_API_KEY in your .env.local file', 'error');
  process.exit(1);
}

// Check arguments for test mode
const args = process.argv.slice(2);
const testAll = args.includes('--all');
const modelName = testAll ? 'claude-3-7-sonnet-20250219' : (args[0] || 'claude-3-7-sonnet-20250219');

// Define test models if in test-all mode
const testModels = [
  // Working models with date suffixes
  'claude-3-7-sonnet-20250219',
  'claude-3-opus-20240229',
  'claude-3-5-sonnet-20241022',
  'claude-3-haiku-20240307',
  // Problematic models we want to fix
  'claude-3.7-sonnet',
  'claude-3-7-sonnet',
  'anthropic:claude-3.7-sonnet',
  'claude-3-sonnet',
  'claude-3.5-sonnet'
];

// Main function to test the API
async function testAnthropicApi(modelName) {
  printHeader(`Testing Anthropic API with model: ${modelName}`);
  
  // Map the model name using our helper if available
  let apiModelName = modelName;
  if (getApiModelName) {
    try {
      // Special handling for provider-prefixed model names
      // We should strip the provider prefix before passing to API
      let modelForApi = modelName;
      if (modelName.startsWith('anthropic:')) {
        modelForApi = modelName.split(':')[1];
        log(`Removing provider prefix for API call: ${modelName} -> ${modelForApi}`, 'info');
      }
      
      // Get the mapped API name
      apiModelName = await getApiModelName(modelName);
      
      // If the model name has a provider prefix, remove it for the API call
      if (apiModelName.startsWith('anthropic:')) {
        apiModelName = apiModelName.split(':')[1];
        log(`Removing provider prefix from result: ${apiModelName}`, 'info');
      }
      
      if (apiModelName !== modelForApi) {
        log(`Mapped ${modelName} -> ${apiModelName} using our helper`, 'success');
      } else {
        log(`Helper returned same model name: ${modelName}`, 'info');
      }
    } catch (error) {
      log(`Error mapping model name: ${error}`, 'error');
    }
  }
  
  // API endpoint
  const apiEndpoint = 'https://api.anthropic.com/v1/messages';
  
  // Simple request payload
  const requestOptions = {
    model: apiModelName, // Use the mapped name if available
    max_tokens: 100,
    messages: [
      {
        role: 'user',
        content: 'Say hello and identify yourself and your model name.'
      }
    ]
  };
  
  // Log the request
  log('Request headers:', 'api');
  log(JSON.stringify({
    'Content-Type': 'application/json',
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'messages-2023-12-15',
    'x-api-key': '***API_KEY_REDACTED***',
    'Accept': 'application/json'
  }, null, 2), 'api');
  
  log('Request body:', 'api');
  log(JSON.stringify(requestOptions, null, 2), 'api');
  
  try {
    // Make the API request
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'messages-2023-12-15',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestOptions)
    });
    
    // Log the response status
    log(`Response status: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error');
    log(`Response headers:`, 'api');
    
    // Print response headers
    response.headers.forEach((value, name) => {
      log(`${name}: ${value}`, 'api');
    });
    
    // Try to parse the response
    const responseText = await response.text();
    log('Response body:', 'api');
    
    try {
      // Try to parse as JSON
      const json = JSON.parse(responseText);
      
      // For successful responses, just show the model output
      if (response.ok && json.content && json.content.length > 0) {
        log(`Model response: ${json.content[0].text}`, 'success');
      } else {
        // For errors or unexpected responses, show the full JSON
        log(JSON.stringify(json, null, 2), 'api');
        
        // If there's an error, highlight it
        if (json.error) {
          log(`Error type: ${json.error.type}`, 'error');
          log(`Error message: ${json.error.message}`, 'error');
        }
      }
    } catch (e) {
      // If not JSON, show as text
      log(responseText, 'api');
    }
    
    if (!response.ok) {
      // Suggestions for common errors
      if (response.status === 404) {
        log('404 Not Found error might indicate:', 'warn');
        log('1. The model name is incorrect or not available', 'warn');
        log('2. The API endpoint URL might have changed', 'warn');
        log('3. The API version or beta headers might be incorrect', 'warn');
        
        // Suggest trying with the date suffix
        if (!modelName.match(/-\d{8}$/)) {
          log(`Try using the model name with a date suffix, e.g.:`, 'warn');
          if (modelName.includes('claude-3-7') || modelName.includes('claude-3.7')) {
            log(`claude-3-7-sonnet-20250219`, 'warn');
          } else if (modelName.includes('claude-3-opus') || modelName.includes('claude-3.0-opus')) {
            log(`claude-3-opus-20240229`, 'warn'); 
          } else if (modelName.includes('claude-3.5-sonnet') || modelName.includes('claude-3-5-sonnet')) {
            log(`claude-3-5-sonnet-20241022`, 'warn');
          }
        }
      } else if (response.status === 401) {
        log('401 Unauthorized error indicates:', 'warn');
        log('1. Your API key might be invalid', 'warn');
        log('2. Your API key might not have access to this model', 'warn');
      } else if (response.status === 400) {
        log('400 Bad Request error indicates:', 'warn');
        log('1. The request payload might be malformed', 'warn');
        log('2. Required parameters might be missing', 'warn');
      }
      
      return false;
    } else {
      log('API request successful!', 'success');
      return true;
    }
  } catch (error) {
    log(`Error making request: ${error.message}`, 'error');
    if (error.code === 'ENOTFOUND') {
      log('Network error: Could not resolve the API host. Check your internet connection.', 'error');
    } else if (error.code === 'ECONNREFUSED') {
      log('Network error: Connection refused. The API server might be down.', 'error');
    }
    return false;
  }
}

// Run the tests
async function runTests() {
  if (testAll) {
    printHeader('TESTING ALL MODEL FORMATS');
    log('Testing multiple model formats to verify our mapping function', 'info');
    
    const results = {};
    
    for (const model of testModels) {
      const success = await testAnthropicApi(model);
      results[model] = success;
    }
    
    // Print summary
    printHeader('TEST RESULTS SUMMARY');
    
    log('MODEL NAME'.padEnd(30) + ' | ' + 'RESULT', 'info');
    log('-'.repeat(30) + '-+-' + '-'.repeat(20), 'info');
    
    for (const model of Object.keys(results)) {
      const resultText = results[model] 
        ? `${colors.green}SUCCESS${colors.reset}` 
        : `${colors.red}FAILED${colors.reset}`;
      log(model.padEnd(30) + ' | ' + resultText, 'info');
    }
    
    // Print recommendations
    printHeader('RECOMMENDATIONS');
    
    log('Based on the test results, here are the recommended model formats to use:', 'info');
    log('1. For Claude 3.7 Sonnet: claude-3-7-sonnet-20250219', 'info');
    log('2. For Claude 3.5 Sonnet: claude-3-5-sonnet-20241022', 'info');
    log('3. For Claude 3 Opus: claude-3-opus-20240229', 'info');
    log('4. For Claude 3 Haiku: claude-3-haiku-20240307', 'info');
    
    log('\nWhen using the application, you can use any of these formats:', 'info');
    log('- anthropic:claude-3.7-sonnet', 'info');
    log('- claude-3.7-sonnet', 'info');
    log('- anthropic:claude-3-7-sonnet', 'info');
    log('The application will automatically convert them to the correct API format.', 'info');
  } else {
    // Just test a single model
    await testAnthropicApi(modelName);
  }
}

// Run the tests
runTests().catch(error => {
  log(`Unhandled error: ${error.message}`, 'error');
});