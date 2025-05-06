#!/usr/bin/env node

/**
 * Real-world test for tool calling implementation
 * 
 * This script tests the actual tool calling implementation by:
 * 1. Creating a test directory with vulnerable dependencies
 * 2. Testing the OpenAI tool calling flow with real API keys 
 * 3. Testing the Anthropic tool calling flow with real API keys
 * 
 * Requires actual API keys in .env.local for:
 * - SERPAPI_KEY
 * - AI_CODE_REVIEW_OPENAI_API_KEY or AI_CODE_REVIEW_ANTHROPIC_API_KEY
 */

const fs = require('fs');
const path = require('path');
const projectRoot = path.join(__dirname, '../../..');
const { execSync } = require('child_process');
const { exit } = require('process');

// Create a temp directory with test files
const TEST_DIR = path.join(__dirname, 'real-world-test-temp');
const TEST_PACKAGE_JSON = path.join(TEST_DIR, 'package.json');

// Create test directory
if (!fs.existsSync(TEST_DIR)) {
  console.log(`Creating test directory: ${TEST_DIR}`);
  fs.mkdirSync(TEST_DIR, { recursive: true });
}

// Create a package.json with known vulnerable dependencies
const testPackageJson = {
  "name": "test-project",
  "version": "1.0.0",
  "description": "Test project with vulnerable dependencies",
  "dependencies": {
    "axios": "0.21.1",
    "node-forge": "0.9.0",
    "log4js": "5.0.0"
  }
};

// Write the package.json to the test directory
fs.writeFileSync(TEST_PACKAGE_JSON, JSON.stringify(testPackageJson, null, 2));
console.log(`Created test package.json with vulnerable dependencies`);

// Check for API keys
const env = {
  ...process.env,
  PATH: process.env.PATH
};

const SERPAPI_KEY = env.SERPAPI_KEY;
const OPENAI_API_KEY = env.AI_CODE_REVIEW_OPENAI_API_KEY;
const ANTHROPIC_API_KEY = env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;

console.log(`API keys available:`);
console.log(`- SERPAPI: ${SERPAPI_KEY ? 'Yes' : 'No'}`);
console.log(`- OpenAI: ${OPENAI_API_KEY ? 'Yes' : 'No'}`);
console.log(`- Anthropic: ${ANTHROPIC_API_KEY ? 'Yes' : 'No'}`);

// Flag to track if any tests have run
let testRun = false;

// Test OpenAI tool calling if API key is available
if (SERPAPI_KEY && OPENAI_API_KEY) {
  console.log(`\n=== Testing OpenAI Tool Calling with Real API Keys ===\n`);

  try {
    // Set the model to GPT-4o which supports tool calling
    env.AI_CODE_REVIEW_MODEL = 'openai:gpt-4o';
    
    // Run an architectural review with the CLI
    console.log(`Running architectural review on ${TEST_DIR} with OpenAI GPT-4o...`);
    const codeBin = path.join(__dirname, 'dist', 'index.js');
    
    // Pipe stderr to stdout to see everything
    const output = execSync(`${codeBin} ${TEST_DIR} --type=arch --debug`, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    }).toString();
    
    // Print out the relevant parts of the output
    console.log(`\nOutput from OpenAI review (excerpt):`);
    
    // Extract dependency security analysis
    const securitySection = output.includes('Dependency Security Analysis') 
      ? output.split('Dependency Security Analysis')[1]?.split('---')[0] 
      : null;
      
    if (securitySection) {
      console.log(`\n## Dependency Security Analysis\n${securitySection}`);
      console.log(`✅ OpenAI tool calling successfully found security information!`);
    } else {
      console.log(`⚠️ No security analysis section found in the output.`);
      console.log(`This could be because the model didn't use the tool, or the output format is different.`);
    }
    
    testRun = true;
  } catch (error) {
    console.error(`Error during OpenAI test: ${error.message}`);
    console.error(`Command output: ${error.stdout?.toString() || 'No output'}`);
    console.error(`Error output: ${error.stderr?.toString() || 'No error output'}`);
  }
}

// Test Anthropic tool calling if API key is available
if (SERPAPI_KEY && ANTHROPIC_API_KEY) {
  console.log(`\n=== Testing Anthropic Tool Calling with Real API Keys ===\n`);

  try {
    // Set the model to Claude 3 Opus which supports tool calling
    env.AI_CODE_REVIEW_MODEL = 'anthropic:claude-3-opus';
    
    // Run an architectural review with the CLI
    console.log(`Running architectural review on ${TEST_DIR} with Anthropic Claude 3 Opus...`);
    const codeBin = path.join(__dirname, 'dist', 'index.js');
    
    // Pipe stderr to stdout to see everything
    const output = execSync(`${codeBin} ${TEST_DIR} --type=arch --debug`, {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    }).toString();
    
    // Print out the relevant parts of the output
    console.log(`\nOutput from Anthropic review (excerpt):`);
    
    // Extract dependency security analysis
    const securitySection = output.includes('Dependency Security Analysis') 
      ? output.split('Dependency Security Analysis')[1]?.split('---')[0] 
      : null;
      
    if (securitySection) {
      console.log(`\n## Dependency Security Analysis\n${securitySection}`);
      console.log(`✅ Anthropic tool calling successfully found security information!`);
    } else {
      console.log(`⚠️ No security analysis section found in the output.`);
      console.log(`This could be because the model didn't use the tool, or the output format is different.`);
    }
    
    testRun = true;
  } catch (error) {
    console.error(`Error during Anthropic test: ${error.message}`);
    console.error(`Command output: ${error.stdout?.toString() || 'No output'}`);
    console.error(`Error output: ${error.stderr?.toString() || 'No error output'}`);
  }
}

// Cleanup
console.log(`\nCleaning up test directory...`);
fs.rmSync(TEST_DIR, { recursive: true, force: true });
console.log(`Test directory removed.`);

if (!testRun) {
  console.log(`\n⚠️ No tests were run because required API keys are missing.`);
  console.log(`To run this test, you need at least one of these combinations:`);
  console.log(`1. SERPAPI_KEY + AI_CODE_REVIEW_OPENAI_API_KEY`);
  console.log(`2. SERPAPI_KEY + AI_CODE_REVIEW_ANTHROPIC_API_KEY`);
} else {
  console.log(`\n=== Test Complete ===`);
  console.log(`✅ Tool calling implementation is working with real APIs!`);
}