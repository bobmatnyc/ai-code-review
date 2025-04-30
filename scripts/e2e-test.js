#!/usr/bin/env node

/**
 * E2E Test Script for AI Code Review
 * 
 * This script performs a series of end-to-end tests for the AI Code Review tool before publishing.
 * It verifies that the core functionality works correctly by:
 * 
 * 1. Testing the CLI with --version flag
 * 2. Testing the CLI with --help flag
 * 3. Testing the model listing feature
 * 4. Testing a simple code review on test projects
 * 5. Testing various command line arguments
 * 
 * These tests ensure that the package is functioning correctly before publishing.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

// ANSI color codes for prettier output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

// Keep track of test results
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

/**
 * Run a command and return the result or throw an error
 * @param {string} command Command to run
 * @param {boolean} silent If true, don't print the command or output
 * @returns {string} Command output
 */
function runCommand(command, silent = false) {
  if (!silent) {
    console.log(`${colors.cyan}> ${command}${colors.reset}`);
  }
  
  try {
    const output = execSync(command, { encoding: 'utf8' });
    if (!silent) {
      // Only show first 5 lines of output to avoid flooding the console
      const truncatedOutput = output.split('\n').slice(0, 5).join('\n');
      if (output.split('\n').length > 5) {
        console.log(`${truncatedOutput}\n${colors.cyan}... (output truncated)${colors.reset}`);
      } else {
        console.log(truncatedOutput);
      }
    }
    return output;
  } catch (error) {
    if (!silent) {
      console.error(`${colors.red}Command failed: ${error.message}${colors.reset}`);
    }
    throw error;
  }
}

/**
 * Run a test and report results
 * @param {string} name Test name
 * @param {function} testFn Test function
 */
function runTest(name, testFn) {
  console.log(`\n${colors.bright}Running test: ${name}${colors.reset}`);
  try {
    testFn();
    console.log(`${colors.green} Test passed: ${name}${colors.reset}`);
    passedTests++;
  } catch (error) {
    console.error(`${colors.red} Test failed: ${name}${colors.reset}`);
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    failedTests++;
  }
}

/**
 * Skip a test and report it as skipped
 * @param {string} name Test name
 * @param {string} reason Reason for skipping
 */
function skipTest(name, reason) {
  console.log(`\n${colors.bright}Skipping test: ${name}${colors.reset}`);
  console.log(`${colors.yellow}� Test skipped: ${reason}${colors.reset}`);
  skippedTests++;
}

// Begin tests
console.log(`${colors.bright}${colors.cyan}Starting E2E tests for AI Code Review${colors.reset}`);

// Ensure dist directory exists
runTest('Build verification', () => {
  assert.ok(fs.existsSync('dist/index.js'), 'dist/index.js should exist');
  assert.ok(fs.existsSync('dist/index.js.map'), 'dist/index.js.map should exist');
});

// Test version flag
runTest('Version flag', () => {
  const output = runCommand('node dist/index.js -v');
  assert.ok(output.includes('AI Code Review Tool v2.1.5'), 'Should display correct version in log');
  assert.ok(output.trim().endsWith('2.1.5'), 'Should output version number as last line');
});

// Test help flag
runTest('Help flag', () => {
  const output = runCommand('node dist/index.js --help');
  assert.ok(output.includes('Options:'), 'Should display options');
  assert.ok(output.includes('--type'), 'Should include type option');
});

// Test models flag
runTest('Models flag', () => {
  const output = runCommand('node dist/index.js --models');
  // The actual output format depends on the CLI implementation, 
  // adjust the assertions to match the actual output
  assert.ok(output.includes('Tool v2.1.5'), 'Should show version information');
  // Just verify the command runs without error
});

// Test if the tool starts with a basic file
runTest('Basic file analysis', () => {
  // Create a simple TypeScript file for testing
  const testDir = path.join(__dirname, '..', 'temp-test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
  }
  
  const testFile = path.join(testDir, 'test.ts');
  fs.writeFileSync(testFile, `
// Simple TypeScript file for testing
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

export default greet;
`);
  
  try {
    // Run an estimate on the file without API keys
    // Just verify it doesn't crash
    const output = runCommand(`node dist/index.js ${testFile} --estimate`);
    assert.ok(output.includes('Tool v2.1.5'), 'Should show version information');
    
    // Since we don't have API keys, this should run but we can't verify specific outputs
    // Just make sure it doesn't completely fail
  } finally {
    // Clean up
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir);
    }
  }
});

// Check if any API keys are available to run more comprehensive tests
const hasGeminiKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY || process.env.GOOGLE_GENERATIVE_AI_KEY;
const hasAnthropicKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;
const hasOpenRouterKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY;

if (hasGeminiKey || hasAnthropicKey || hasOpenRouterKey) {
  runTest('API connection test', () => {
    const output = runCommand('node dist/index.js --test-api');
    assert.ok(output.includes('API connection tests completed'), 'Should complete API connection tests');
  });
  
  // Only run full review test if we have API keys
  runTest('Simple code review', () => {
    const testProject = path.join(__dirname, '..', 'test-projects', 'typescript');
    const output = runCommand(`node dist/index.js ${testProject} --type quick-fixes --output-dir ./temp-review-output`);
    
    assert.ok(output.includes('Starting code review'), 'Should start code review');
    assert.ok(output.includes('Code review complete'), 'Should complete code review');
    assert.ok(fs.existsSync('./temp-review-output'), 'Should create output directory');
    
    // Clean up output directory
    if (fs.existsSync('./temp-review-output')) {
      fs.rmSync('./temp-review-output', { recursive: true, force: true });
    }
  });
} else {
  skipTest('API connection test', 'No API keys available');
  skipTest('Simple code review', 'No API keys available');
}

// Test shebang by running as executable
runTest('Executable test', () => {
  // First make sure the file has execute permissions
  runCommand('chmod +x dist/index.js', true);
  
  // Then try to run it directly
  const output = runCommand('./dist/index.js -v');
  assert.ok(output.includes('2.1.5'), 'Should run as executable and display version');
});

// Print test summary
console.log(`\n${colors.bright}${colors.cyan}E2E Test Summary:${colors.reset}`);
console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
console.log(`${colors.yellow}Skipped: ${skippedTests}${colors.reset}`);

// Exit with success if all tests passed
if (failedTests > 0) {
  console.error(`${colors.red}${colors.bright}E2E tests failed!${colors.reset}`);
  process.exit(1);
} else {
  console.log(`${colors.green}${colors.bright}All E2E tests passed!${colors.reset}`);
  process.exit(0);
}