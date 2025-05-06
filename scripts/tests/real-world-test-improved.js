#!/usr/bin/env node

// Set project root path for correct file references
const projectRoot = path.join(__dirname, '../..');


/**
 * Real-world test for tool calling implementation (improved version)
 * 
 * This script tests the actual tool calling implementation by:
 * 1. Creating a test directory with vulnerable dependencies
 * 2. Testing the OpenAI tool calling flow with real API keys 
 * 3. Testing the Anthropic tool calling flow with real API keys
 * 4. Examining the generated review files for security information
 * 
 * Requires actual API keys in .env.local for:
 * - SERPAPI_KEY
 * - AI_CODE_REVIEW_OPENAI_API_KEY or AI_CODE_REVIEW_ANTHROPIC_API_KEY
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { exit } = require('process');

// Create a temp directory with test files
const TEST_DIR = path.join(__dirname, 'real-world-test-temp');
const TEST_PACKAGE_JSON = path.join(TEST_DIR, 'package.json');
const REVIEW_DIR = path.join(__dirname, 'ai-code-review-docs');

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

// Find the most recent review file with a specific model
function findMostRecentReview(modelPrefix) {
  // Get all files in the review directory
  const files = fs.readdirSync(REVIEW_DIR);
  
  // Filter files that match the model prefix
  const modelFiles = files.filter(file => 
    file.startsWith('architectural-review') && 
    file.includes(modelPrefix) &&
    file.endsWith('.md')
  );
  
  // Sort files by creation time (newest first)
  modelFiles.sort((a, b) => {
    const statA = fs.statSync(path.join(REVIEW_DIR, a));
    const statB = fs.statSync(path.join(REVIEW_DIR, b));
    return statB.mtimeMs - statA.mtimeMs;
  });
  
  // Return the most recent file
  return modelFiles.length > 0 ? path.join(REVIEW_DIR, modelFiles[0]) : null;
}

// Check if a file contains security information
function checkFileForSecurityInfo(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    console.log(`Review file not found: ${filePath}`);
    return null;
  }
  
  // Read the file
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for security-related content
  const securityKeywords = [
    'security', 'vulnerability', 'vulnerabilities', 'CVE', 
    'dependency', 'dependencies', 'axios', 'node-forge', 'log4js'
  ];
  
  // Look for dependency analysis section
  const dependencySection = content.match(/## Dependency (Security )?Analysis[\s\S]*?(?=^##|\Z)/mi);
  
  if (dependencySection) {
    return dependencySection[0];
  }
  
  // Look for security references in issues section
  const securityReferences = [];
  
  // Match sections that mention security
  const sections = content.split(/^#{2,3} /m);
  for (const section of sections) {
    for (const keyword of securityKeywords) {
      if (section.toLowerCase().includes(keyword.toLowerCase())) {
        securityReferences.push(section.trim().split('\n')[0]); // First line (title)
        break;
      }
    }
  }
  
  return securityReferences.length > 0 ? 
    `Security references found: ${securityReferences.join(', ')}` : 
    null;
}

// Test OpenAI tool calling if API key is available
if (SERPAPI_KEY && OPENAI_API_KEY) {
  console.log(`\n=== Testing OpenAI Tool Calling with Real API Keys ===\n`);

  try {
    // Set the model to GPT-4o which supports tool calling
    env.AI_CODE_REVIEW_MODEL = 'openai:gpt-4o';
    
    // Run an architectural review with the CLI
    console.log(`Running architectural review on ${TEST_DIR} with OpenAI GPT-4o...`);
    const codeBin = path.join(__dirname, 'dist', 'index.js');
    
    // Execute the code review
    execSync(`${codeBin} ${TEST_DIR} --type=arch`, {
      env,
      stdio: 'inherit'
    });
    
    // Look for the most recent OpenAI review file
    const reviewFile = findMostRecentReview('gpt-4');
    console.log(`\nLooking for OpenAI review file: ${reviewFile}`);
    
    // Check if the file contains security information
    const securityInfo = checkFileForSecurityInfo(reviewFile);
    
    if (securityInfo) {
      console.log(`\n✅ OpenAI tool calling successfully found security information!`);
      console.log(`\nSecurity Info Excerpt:\n${securityInfo.substring(0, 500)}...`);
    } else {
      console.log(`\n⚠️ No security information found in the OpenAI review.`);
      console.log(`This could be because the model didn't use the tool, or the output format is different.`);
    }
    
    testRun = true;
  } catch (error) {
    console.error(`Error during OpenAI test: ${error.message}`);
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
    
    // Execute the code review
    execSync(`${codeBin} ${TEST_DIR} --type=arch`, {
      env,
      stdio: 'inherit'
    });
    
    // Look for the most recent Anthropic review file
    const reviewFile = findMostRecentReview('claude-3');
    console.log(`\nLooking for Anthropic review file: ${reviewFile}`);
    
    // Check if the file contains security information
    const securityInfo = checkFileForSecurityInfo(reviewFile);
    
    if (securityInfo) {
      console.log(`\n✅ Anthropic tool calling successfully found security information!`);
      console.log(`\nSecurity Info Excerpt:\n${securityInfo.substring(0, 500)}...`);
    } else {
      console.log(`\n⚠️ No security information found in the Anthropic review.`);
      console.log(`This could be because the model didn't use the tool, or the output format is different.`);
    }
    
    testRun = true;
  } catch (error) {
    console.error(`Error during Anthropic test: ${error.message}`);
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
  console.log(`The tests ran successfully. If security information was found in the reviews,`);
  console.log(`the tool calling implementation is working with real APIs!`);
}