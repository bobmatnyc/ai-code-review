#!/usr/bin/env node

/**
 * Test script for verifying tool calling support in architectural reviews
 * 
 * This script tests both OpenAI and Anthropic tool calling implementations.
 * It runs an architectural review on a test directory with known dependencies.
 * 
 * Usage:
 *   node test-tool-calling.js [anthropic|openai]
 * 
 * By default, it will test both if no argument is provided.
 */

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

// Copy the mock serpApiHelper.ts to a .bak file
// Then copy the mock file to serpApiHelper.ts
console.log('\x1b[36mSetting up mock SERPAPI helper for testing...\x1b[0m');

// Adjust paths for running from scripts/tests directory
const projectRoot = path.join(__dirname, '../..');
const serpApiHelperPath = path.join(projectRoot, 'src/utils/dependencies/serpApiHelper.ts');
const serpApiHelperBackupPath = path.join(projectRoot, 'src/utils/dependencies/serpApiHelper.ts.bak');
const serpApiHelperMockPath = path.join(projectRoot, 'src/utils/dependencies/serpApiHelper.mock.ts');

try {
  // Backup the original file if not already backed up
  if (!fs.existsSync(serpApiHelperBackupPath)) {
    fs.copyFileSync(serpApiHelperPath, serpApiHelperBackupPath);
    console.log('Original serpApiHelper.ts backed up to serpApiHelper.ts.bak');
  }
  
  // Copy the mock file to serpApiHelper.ts
  fs.copyFileSync(serpApiHelperMockPath, serpApiHelperPath);
  console.log('Mock serpApiHelper.ts installed for testing');
  
  // Set a dummy SERPAPI_KEY for testing
  process.env.SERPAPI_KEY = 'dummy_key_for_testing';
  
  // Register a cleanup function to restore the original file on exit
  process.on('exit', () => {
    try {
      if (fs.existsSync(serpApiHelperBackupPath)) {
        fs.copyFileSync(serpApiHelperBackupPath, serpApiHelperPath);
        console.log('\n\x1b[36mRestored original serpApiHelper.ts\x1b[0m');
      }
    } catch (error) {
      console.error('Error restoring original serpApiHelper.ts:', error);
    }
  });
  
  // Also handle Ctrl+C and other termination signals
  process.on('SIGINT', () => process.exit(0));
  process.on('SIGTERM', () => process.exit(0));
  
} catch (error) {
  console.error('\x1b[31mError setting up mock files:\x1b[0m', error.message);
  process.exit(1);
}

// Default target directory for the test
const testDir = path.join(projectRoot, 'test-env');

// Parse command line arguments
const args = process.argv.slice(2);
const testProvider = args[0]?.toLowerCase() || 'both';

// Validate the test provider
if (testProvider !== 'anthropic' && testProvider !== 'openai' && testProvider !== 'both') {
  console.error('\x1b[31mERROR: Invalid provider. Use "anthropic", "openai", or "both".\x1b[0m');
  process.exit(1);
}

// Check if we should test OpenAI
const testOpenAI = testProvider === 'openai' || testProvider === 'both';
// Check if we should test Anthropic
const testAnthropic = testProvider === 'anthropic' || testProvider === 'both';

console.log('\x1b[36m=== Testing Tool Calling for Architectural Reviews ===\x1b[0m');
console.log(`Testing provider(s): ${testOpenAI ? 'OpenAI' : ''}${testOpenAI && testAnthropic ? ' and ' : ''}${testAnthropic ? 'Anthropic' : ''}`);
console.log(`Target directory: ${testDir}`);

// Test OpenAI tool calling
if (testOpenAI) {
  console.log('\n\x1b[33m=== Testing OpenAI Tool Calling ===\x1b[0m');
  
  // Check if the OpenAI API key is set
  if (!process.env.AI_CODE_REVIEW_OPENAI_API_KEY) {
    console.error('\x1b[31mERROR: AI_CODE_REVIEW_OPENAI_API_KEY environment variable is not set.\x1b[0m');
    console.error('Skipping OpenAI test.');
  } else {
    try {
      // Set the model to GPT-4o which supports tool calling
      process.env.AI_CODE_REVIEW_MODEL = 'openai:gpt-4o';
      
      // Run the test with verbose output
      const output = execSync(`node ${path.join(projectRoot, 'src/index.js')} ${testDir} --type=arch --verbose`, {
        env: process.env,
        stdio: 'inherit'
      });
      
      console.log('\n\x1b[32m=== OpenAI Tool Calling Test Completed ===\x1b[0m');
    } catch (error) {
      console.error('\x1b[31mERROR: Failed to run OpenAI test.\x1b[0m');
      console.error(error.message);
    }
  }
}

// Test Anthropic tool calling
if (testAnthropic) {
  console.log('\n\x1b[33m=== Testing Anthropic Tool Calling ===\x1b[0m');
  
  // Check if the Anthropic API key is set
  if (!process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY) {
    console.error('\x1b[31mERROR: AI_CODE_REVIEW_ANTHROPIC_API_KEY environment variable is not set.\x1b[0m');
    console.error('Skipping Anthropic test.');
  } else {
    try {
      // Set the model to Claude 3 Opus which supports tool calling
      process.env.AI_CODE_REVIEW_MODEL = 'anthropic:claude-3-opus';
      
      // Run the test with verbose output
      const output = execSync(`node ${path.join(projectRoot, 'src/index.js')} ${testDir} --type=arch --verbose`, {
        env: process.env,
        stdio: 'inherit'
      });
      
      console.log('\n\x1b[32m=== Anthropic Tool Calling Test Completed ===\x1b[0m');
    } catch (error) {
      console.error('\x1b[31mERROR: Failed to run Anthropic test.\x1b[0m');
      console.error(error.message);
    }
  }
}

console.log('\n\x1b[36m=== Tool Calling Tests Completed ===\x1b[0m');