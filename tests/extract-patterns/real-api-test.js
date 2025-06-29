#!/usr/bin/env node

/**
 * Real API Testing Script for Extract Patterns Review Type
 * 
 * This script tests the extract-patterns functionality with real API calls
 * to validate the quality and accuracy of pattern extraction.
 * 
 * Usage:
 *   node tests/extract-patterns/real-api-test.js [options]
 * 
 * Options:
 *   --model <model>     Specify model to test (e.g., anthropic:claude-3-opus)
 *   --target <path>     Target directory/file to analyze (default: src/)
 *   --output <path>     Output directory for results (default: test-results/)
 *   --interactive       Enable interactive mode for structured output
 *   --validate          Run validation checks on output
 * 
 * Environment Variables:
 *   AI_CODE_REVIEW_ANTHROPIC_API_KEY - Anthropic API key
 *   AI_CODE_REVIEW_OPENAI_API_KEY    - OpenAI API key
 *   AI_CODE_REVIEW_GOOGLE_API_KEY    - Google API key
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Project root directory
const PROJECT_ROOT = path.join(__dirname, '../..');

// Default test configuration
const DEFAULT_CONFIG = {
  model: 'anthropic:claude-3-opus',
  target: 'src/',
  output: 'test-results/extract-patterns',
  interactive: true,
  validate: true
};

// Test models to validate against
const TEST_MODELS = [
  'anthropic:claude-3-opus',
  'anthropic:claude-3-sonnet',
  'openai:gpt-4',
  'openai:gpt-4-turbo',
  'google:gemini-2.5-pro'
];

/**
 * Parse command line arguments
 */
function parseArguments() {
  return yargs(hideBin(process.argv))
    .option('model', {
      alias: 'm',
      type: 'string',
      description: 'Model to test with',
      default: DEFAULT_CONFIG.model
    })
    .option('target', {
      alias: 't',
      type: 'string',
      description: 'Target directory or file to analyze',
      default: DEFAULT_CONFIG.target
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Output directory for test results',
      default: DEFAULT_CONFIG.output
    })
    .option('interactive', {
      alias: 'i',
      type: 'boolean',
      description: 'Enable interactive mode',
      default: DEFAULT_CONFIG.interactive
    })
    .option('validate', {
      alias: 'v',
      type: 'boolean',
      description: 'Run validation checks',
      default: DEFAULT_CONFIG.validate
    })
    .option('all-models', {
      alias: 'a',
      type: 'boolean',
      description: 'Test with all available models',
      default: false
    })
    .help()
    .argv;
}

/**
 * Check if required API keys are available
 */
function checkApiKeys() {
  const requiredKeys = {
    'anthropic:claude-3-opus': 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
    'anthropic:claude-3-sonnet': 'AI_CODE_REVIEW_ANTHROPIC_API_KEY',
    'openai:gpt-4': 'AI_CODE_REVIEW_OPENAI_API_KEY',
    'openai:gpt-4-turbo': 'AI_CODE_REVIEW_OPENAI_API_KEY',
    'google:gemini-2.5-pro': 'AI_CODE_REVIEW_GOOGLE_API_KEY'
  };

  const availableModels = [];
  const missingKeys = [];

  for (const [model, envVar] of Object.entries(requiredKeys)) {
    if (process.env[envVar]) {
      availableModels.push(model);
    } else {
      missingKeys.push({ model, envVar });
    }
  }

  return { availableModels, missingKeys };
}

/**
 * Ensure output directory exists
 */
async function ensureOutputDirectory(outputPath) {
  try {
    await fs.mkdir(outputPath, { recursive: true });
    console.log(`✅ Output directory created: ${outputPath}`);
  } catch (error) {
    console.error(`❌ Failed to create output directory: ${error.message}`);
    throw error;
  }
}

/**
 * Run extract-patterns review with specified configuration
 */
async function runExtractPatternsReview(config) {
  const { model, target, output, interactive } = config;
  
  console.log(`\n🔍 Running extract-patterns review...`);
  console.log(`   Model: ${model}`);
  console.log(`   Target: ${target}`);
  console.log(`   Interactive: ${interactive}`);

  // Build command
  const cmd = [
    'node',
    path.join(PROJECT_ROOT, 'dist/cli.js'),
    'extract-patterns',
    target
  ];

  // Add flags
  if (interactive) {
    cmd.push('--interactive');
  }

  // Set environment variables
  const env = {
    ...process.env,
    AI_CODE_REVIEW_MODEL: model
  };

  try {
    const startTime = Date.now();
    
    // Execute the command
    const result = execSync(cmd.join(' '), {
      cwd: PROJECT_ROOT,
      env,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ Review completed in ${duration}ms`);
    
    return {
      success: true,
      output: result,
      duration,
      model,
      target
    };

  } catch (error) {
    console.error(`❌ Review failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      model,
      target
    };
  }
}

/**
 * Save test results to file
 */
async function saveTestResults(results, outputPath) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `extract-patterns-test-${timestamp}.json`;
  const filepath = path.join(outputPath, filename);

  const testReport = {
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      averageDuration: results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.duration, 0) / results.filter(r => r.success).length || 0
    }
  };

  try {
    await fs.writeFile(filepath, JSON.stringify(testReport, null, 2));
    console.log(`📄 Test results saved to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error(`❌ Failed to save test results: ${error.message}`);
    throw error;
  }
}

/**
 * Main test execution function
 */
async function main() {
  console.log('🚀 Extract Patterns Real API Test Runner');
  console.log('=========================================\n');

  // Parse arguments
  const args = parseArguments();
  
  // Check API keys
  const { availableModels, missingKeys } = checkApiKeys();
  
  console.log(`📋 Available models: ${availableModels.length}`);
  availableModels.forEach(model => console.log(`   ✅ ${model}`));
  
  if (missingKeys.length > 0) {
    console.log(`\n⚠️  Missing API keys for:`);
    missingKeys.forEach(({ model, envVar }) => 
      console.log(`   ❌ ${model} (${envVar})`)
    );
  }

  // Determine models to test
  let modelsToTest = [];
  if (args.allModels) {
    modelsToTest = availableModels;
  } else if (availableModels.includes(args.model)) {
    modelsToTest = [args.model];
  } else {
    console.error(`❌ Model ${args.model} is not available (missing API key)`);
    process.exit(1);
  }

  if (modelsToTest.length === 0) {
    console.error('❌ No models available for testing');
    process.exit(1);
  }

  // Ensure output directory exists
  await ensureOutputDirectory(args.output);

  // Run tests
  const results = [];
  
  for (const model of modelsToTest) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing model: ${model}`);
    console.log(`${'='.repeat(60)}`);

    const config = {
      model,
      target: args.target,
      output: args.output,
      interactive: args.interactive
    };

    const result = await runExtractPatternsReview(config);
    results.push(result);

    // Brief pause between tests
    if (modelsToTest.length > 1) {
      console.log('⏳ Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Save results
  const resultsFile = await saveTestResults(results, args.output);

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(60)}`);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total tests: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    console.log(`Average duration: ${Math.round(avgDuration)}ms`);
  }

  if (failed.length > 0) {
    console.log('\n❌ Failed tests:');
    failed.forEach(result => {
      console.log(`   ${result.model}: ${result.error}`);
    });
  }

  console.log(`\n📄 Detailed results: ${resultsFile}`);
  
  // Exit with appropriate code
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run the test if this script is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { main, runExtractPatternsReview, checkApiKeys };
