#!/usr/bin/env node

/**
 * Test script for verifying environment variable loading.
 *
 * This script demonstrates how the AI Code Review tool prioritizes loading
 * environment variables from its own directory first, before falling back
 * to the target project directory.
 *
 * Usage:
 *   node scripts/test-env-loading.js [--debug]
 *   node scripts/test-env-loading.js --debug --override
 *
 * The --override flag will test loading with dotenv override option enabled.
 */

// Load dotenv as early as possible
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// ANSI color codes for better readability
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
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
          : type === 'env'
            ? `${colors.magenta}[ENV]${colors.reset}`
            : `${colors.cyan}[DEBUG]${colors.reset}`;

  console.log(`${prefix} ${message}`);
}

log(`${colors.bright}AI Code Review Tool - Environment Loading Test${colors.reset}`, 'info');
log('--------------------------------------------------------', 'info');

// Check if debug mode is enabled
const isDebug = process.argv.includes('--debug');
const useOverride = process.argv.includes('--override');

// Print runtime info
log('Runtime Information:', 'info');
log(`Node.js version: ${process.version}`, 'info');
log(`Current working directory: ${process.cwd()}`, 'info');
log(`Parent directory: ${path.dirname(process.cwd())}`, 'info');
log(`Debug mode: ${isDebug ? 'enabled' : 'disabled'}`, 'info');
log(`Override mode: ${useOverride ? 'enabled' : 'disabled'}`, 'info');

// Check initial environment state
log('', 'info');
log('Initial environment variables:', 'env');
log(`AI_CODE_REVIEW_LOG_LEVEL=${process.env.AI_CODE_REVIEW_LOG_LEVEL || '(not set)'}`, 'env');

// Define paths
const toolDirectory = path.resolve(__dirname, '..');
const toolEnvPath = path.resolve(toolDirectory, '.env.local');
const cwdEnvPath = path.resolve(process.cwd(), '.env.local');

// Log paths
console.log(`Tool directory: ${toolDirectory}`);
console.log(`Tool .env.local path: ${toolEnvPath}`);
console.log(`Current directory: ${process.cwd()}`);
console.log(`Current directory .env.local path: ${cwdEnvPath}`);

// Check if tool .env.local exists
console.log('\nChecking for .env.local files:');
let toolEnvExists = false;
try {
  toolEnvExists = fs.existsSync(toolEnvPath);
  console.log(`- Tool .env.local exists: ${toolEnvExists}`);
} catch (err) {
  console.error(`Error checking tool .env.local: ${err.message}`);
}

// Check if current directory .env.local exists
let cwdEnvExists = false;
try {
  cwdEnvExists = fs.existsSync(cwdEnvPath);
  console.log(`- Current directory .env.local exists: ${cwdEnvExists}`);
} catch (err) {
  console.error(`Error checking current directory .env.local: ${err.message}`);
}

// Now load environment with our prioritization logic
log('\nLoading environment variables with prioritization:', 'info');

// Function to extract variables from .env file
function extractEnvVars(envPath) {
  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const vars = {};

    envContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          vars[match[1].trim()] = match[2].trim();
        }
      });

    return vars;
  } catch (err) {
    log(`Error reading env file: ${err.message}`, 'error');
    return {};
  }
}

// Function to check .env file for log level
function checkForLogLevel(envPath) {
  const vars = extractEnvVars(envPath);

  if (vars.AI_CODE_REVIEW_LOG_LEVEL) {
    log(`AI_CODE_REVIEW_LOG_LEVEL found in ${path.basename(envPath)}: ${vars.AI_CODE_REVIEW_LOG_LEVEL}`, 'success');
    return true;
  } else {
    log(`AI_CODE_REVIEW_LOG_LEVEL not found in ${path.basename(envPath)}`, 'warn');
    return false;
  }
}

// First try tool directory
if (toolEnvExists) {
  log('Found .env.local in tool directory, checking contents:', 'info');
  checkForLogLevel(toolEnvPath);

  log(`Loading from tool directory with ${useOverride ? 'override enabled' : 'default settings'}`, 'env');
  const result = dotenv.config({
    path: toolEnvPath,
    override: useOverride
  });

  if (result.error) {
    log(`Error loading environment: ${result.error.message}`, 'error');
  } else {
    log('Successfully loaded environment from tool directory', 'success');

    // Show what was loaded
    const varNames = Object.keys(result.parsed || {});
    log(`Loaded ${varNames.length} variables:`, 'success');
    if (isDebug) {
      log(varNames.join(', '), 'debug');
    }

    // Check if log level was loaded
    if (result.parsed && result.parsed.AI_CODE_REVIEW_LOG_LEVEL) {
      log(`Loaded AI_CODE_REVIEW_LOG_LEVEL=${result.parsed.AI_CODE_REVIEW_LOG_LEVEL}`, 'success');
    }

    // Check if it's actually in process.env
    log(`Environment now has AI_CODE_REVIEW_LOG_LEVEL=${process.env.AI_CODE_REVIEW_LOG_LEVEL || '(not set)'}`, 'env');
  }
}
// Fall back to current directory
else if (cwdEnvExists) {
  log('No .env.local in tool directory, checking current directory:', 'info');
  checkForLogLevel(cwdEnvPath);

  log(`Loading from current directory with ${useOverride ? 'override enabled' : 'default settings'}`, 'env');
  const result = dotenv.config({
    path: cwdEnvPath,
    override: useOverride
  });

  if (result.error) {
    log(`Error loading environment: ${result.error.message}`, 'error');
  } else {
    log('Successfully loaded environment from current directory', 'success');

    // Show what was loaded
    const varNames = Object.keys(result.parsed || {});
    log(`Loaded ${varNames.length} variables:`, 'success');
    if (isDebug) {
      log(varNames.join(', '), 'debug');
    }

    // Check if log level was loaded
    if (result.parsed && result.parsed.AI_CODE_REVIEW_LOG_LEVEL) {
      log(`Loaded AI_CODE_REVIEW_LOG_LEVEL=${result.parsed.AI_CODE_REVIEW_LOG_LEVEL}`, 'success');
    }

    // Check if it's actually in process.env
    log(`Environment now has AI_CODE_REVIEW_LOG_LEVEL=${process.env.AI_CODE_REVIEW_LOG_LEVEL || '(not set)'}`, 'env');
  }
} else {
  log('No .env.local found in either location.', 'warn');
}

// Check for API keys (prioritizing AI_CODE_REVIEW prefixed keys)
log('\nChecking for API keys and configuration:', 'info');

const googleKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY ||
                 process.env.CODE_REVIEW_GOOGLE_API_KEY ||
                 process.env.GOOGLE_GENERATIVE_AI_KEY ||
                 process.env.GOOGLE_AI_STUDIO_KEY;

const openRouterKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY ||
                     process.env.CODE_REVIEW_OPENROUTER_API_KEY ||
                     process.env.OPENROUTER_API_KEY;

const anthropicKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY ||
                    process.env.CODE_REVIEW_ANTHROPIC_API_KEY ||
                    process.env.ANTHROPIC_API_KEY;

const openaiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY ||
                 process.env.CODE_REVIEW_OPENAI_API_KEY ||
                 process.env.OPENAI_API_KEY;

log(`Google API key available: ${!!googleKey}`, 'env');
log(`OpenRouter API key available: ${!!openRouterKey}`, 'env');
log(`Anthropic API key available: ${!!anthropicKey}`, 'env');
log(`OpenAI API key available: ${!!openaiKey}`, 'env');

// Check for selected model
const selectedModel = process.env.AI_CODE_REVIEW_MODEL || process.env.CODE_REVIEW_MODEL;
log(`Selected model: ${selectedModel || '(not set)'}`, 'env');

// Check for log level and other configurations
log('\nFinal configuration state:', 'info');
log(`AI_CODE_REVIEW_LOG_LEVEL=${process.env.AI_CODE_REVIEW_LOG_LEVEL || '(not set)'}`, 'env');
log(`AI_CODE_REVIEW_MODEL=${process.env.AI_CODE_REVIEW_MODEL || '(not set)'}`, 'env');
log(`AI_CODE_REVIEW_DEFAULT_REVIEW_TYPE=${process.env.AI_CODE_REVIEW_DEFAULT_REVIEW_TYPE || '(not set)'}`, 'env');

// Test how the logger would behave based on current variables
log('\nLog level interpretation test:', 'info');

// Mock logger's behavior based on the current environment
const mockLogLevelMap = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  none: 4
};

// Get log level from CLI --debug flag or environment variable
function mockGetCurrentLogLevel() {
  // Force debug level if CLI flag is set
  if (process.argv.includes('--debug')) {
    log('Debug flag found in process.argv, would force DEBUG level', 'success');
    return 0; // Debug
  }

  const envLogLevel = process.env.AI_CODE_REVIEW_LOG_LEVEL?.toLowerCase();

  if (envLogLevel && envLogLevel in mockLogLevelMap) {
    log(`Found log level "${envLogLevel}" in AI_CODE_REVIEW_LOG_LEVEL, would set level to ${envLogLevel.toUpperCase()}`, 'success');
    return mockLogLevelMap[envLogLevel];
  }

  log('No valid log level found, would default to INFO', 'warn');
  return 1; // Info
}

const mockLogLevel = mockGetCurrentLogLevel();
log(`Logger would use log level: ${Object.keys(mockLogLevelMap)[mockLogLevel].toUpperCase()}`, 'success');

// Show summary of findings
log('\nEnvironment variable loading test summary:', 'info');

// Check if we found log level being set
if (process.env.AI_CODE_REVIEW_LOG_LEVEL) {
  log(`AI_CODE_REVIEW_LOG_LEVEL was found and set to "${process.env.AI_CODE_REVIEW_LOG_LEVEL}"`, 'success');
} else {
  log('AI_CODE_REVIEW_LOG_LEVEL was NOT found in any environment source', 'warn');
  log('If you have this in .env.local, make sure it\'s correctly formatted as AI_CODE_REVIEW_LOG_LEVEL=debug', 'warn');
}

// Summary of findings and advice
log('\nProblems and solutions:', 'info');

if (!process.env.AI_CODE_REVIEW_LOG_LEVEL) {
  log('ISSUE: Debug level not found in environment.', 'error');
  log('SOLUTION 1: Add AI_CODE_REVIEW_LOG_LEVEL=debug to your .env.local file', 'success');
  log('SOLUTION 2: Run with --debug flag: ai-code-review --debug [target]', 'success');
} else if (process.env.AI_CODE_REVIEW_LOG_LEVEL.toLowerCase() !== 'debug') {
  log(`ISSUE: Log level is set but not to debug (currently "${process.env.AI_CODE_REVIEW_LOG_LEVEL}")`, 'warn');
  log('SOLUTION: Change AI_CODE_REVIEW_LOG_LEVEL=debug in your .env.local file', 'success');
} else {
  log('AI_CODE_REVIEW_LOG_LEVEL is correctly set to debug!', 'success');
}

// Recommended next steps
log('\nRecommended next steps:', 'info');
log('1. Run the application with --debug flag: ai-code-review --debug [target]', 'info');
log('2. If debug logs still don\'t appear, check that your .env.local file contains AI_CODE_REVIEW_LOG_LEVEL=debug', 'info');
log('3. If using the global installation, make sure your .env.local is in the right location', 'info');

// Tips for fixing common issues
log('\nTips for fixing common issues:', 'info');
log('- Check for whitespace or quotes in your .env.local file values', 'info');
log('- Try adding the variable via command line: export AI_CODE_REVIEW_LOG_LEVEL=debug', 'info');
log('- To find the correct location for .env.local in global installations, run:', 'info');
log('  ai-code-review --which-dir', 'info');

log('\nEnvironment variable loading test complete!', 'success');
