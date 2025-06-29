#!/usr/bin/env node

/**
 * Real API testing for extract-patterns review type
 * 
 * This script tests the extract-patterns functionality with actual API calls
 * to validate output quality and ensure the feature works end-to-end.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const projectRoot = path.join(__dirname, '../../..');

// Test configuration
const TEST_CASES = [
  {
    name: 'Single File Test',
    path: 'src/types/review.ts',
    expectedCost: 0.01,
    description: 'Test pattern extraction on a single TypeScript file'
  },
  {
    name: 'Module Test', 
    path: 'src/strategies/',
    expectedCost: 0.05,
    description: 'Test pattern extraction on a module directory'
  },
  {
    name: 'Large Directory Test',
    path: 'src/',
    expectedCost: 0.20,
    description: 'Test pattern extraction on large directory'
  }
];

// Available models for testing
const MODELS_TO_TEST = [
  'anthropic:claude-3-opus',
  'anthropic:claude-3-sonnet',
  'openai:gpt-4o',
  'gemini:gemini-1.5-pro'
];

/**
 * Check if API key is available for a model
 */
function hasApiKey(model) {
  const provider = model.split(':')[0];
  switch (provider) {
    case 'anthropic':
      return !!process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;
    case 'openai':
      return !!process.env.AI_CODE_REVIEW_OPENAI_API_KEY;
    case 'gemini':
      return !!process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;
    default:
      return false;
  }
}

/**
 * Run extract-patterns review with specified parameters
 */
function runExtractPatternsReview(testPath, model, interactive = false) {
  const outputDir = path.join(projectRoot, 'ai-code-review-docs', 'extract-patterns-tests');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const cmd = [
    'node',
    path.join(projectRoot, 'dist', 'index.js'),
    'extract-patterns',
    testPath,
    '--output-dir', outputDir,
    interactive ? '--interactive' : ''
  ].filter(Boolean).join(' ');
  
  console.log(`Running: ${cmd}`);
  console.log(`Model: ${model}`);
  
  const env = {
    ...process.env,
    AI_CODE_REVIEW_MODEL: model
  };
  
  const startTime = Date.now();
  
  try {
    const result = execSync(cmd, {
      env,
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      output: result,
      duration,
      outputDir
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      success: false,
      error: error.message,
      stderr: error.stderr?.toString(),
      duration,
      outputDir
    };
  }
}

/**
 * Validate the output JSON against the extract-patterns schema
 */
function validateOutput(outputDir, testName) {
  try {
    // Find the most recent output file
    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(outputDir, f),
        mtime: fs.statSync(path.join(outputDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (files.length === 0) {
      return { valid: false, error: 'No JSON output files found' };
    }
    
    const outputFile = files[0].path;
    const content = fs.readFileSync(outputFile, 'utf8');
    
    // Parse JSON
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      return { valid: false, error: `Invalid JSON: ${parseError.message}` };
    }
    
    // Basic schema validation
    if (!parsed.patterns) {
      return { valid: false, error: 'Missing "patterns" root object' };
    }
    
    const patterns = parsed.patterns;
    const requiredFields = [
      'version', 'timestamp', 'projectName', 'projectOverview',
      'technologyStack', 'codeMetrics', 'architecturalPatterns',
      'codeStyle', 'testingStrategy', 'exemplarCharacteristics',
      'replicationGuide', 'summary'
    ];
    
    for (const field of requiredFields) {
      if (!patterns[field]) {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
    
    // Content quality checks
    const qualityIssues = [];
    
    if (patterns.summary.length < 50) {
      qualityIssues.push('Summary too short');
    }
    
    if (patterns.architecturalPatterns.length === 0) {
      qualityIssues.push('No architectural patterns identified');
    }
    
    if (patterns.exemplarCharacteristics.strengths.length === 0) {
      qualityIssues.push('No strengths identified');
    }
    
    return {
      valid: true,
      qualityIssues,
      outputFile,
      patterns
    };
    
  } catch (error) {
    return { valid: false, error: `Validation error: ${error.message}` };
  }
}

/**
 * Run cost estimation test
 */
function runCostEstimation(testPath, model) {
  const cmd = [
    'node',
    path.join(projectRoot, 'dist', 'index.js'),
    'extract-patterns',
    testPath,
    '--estimate'
  ].join(' ');
  
  const env = {
    ...process.env,
    AI_CODE_REVIEW_MODEL: model
  };
  
  try {
    const result = execSync(cmd, {
      env,
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf8'
    });
    
    return { success: true, output: result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Main test function
 */
async function runRealApiTests() {
  console.log('=== Extract Patterns Real API Testing ===\n');
  
  // Check available models
  const availableModels = MODELS_TO_TEST.filter(hasApiKey);
  
  if (availableModels.length === 0) {
    console.error('❌ No API keys found for any supported models');
    console.error('Please set one of the following environment variables:');
    console.error('- AI_CODE_REVIEW_ANTHROPIC_API_KEY');
    console.error('- AI_CODE_REVIEW_OPENAI_API_KEY');
    console.error('- AI_CODE_REVIEW_GOOGLE_API_KEY');
    process.exit(1);
  }
  
  console.log(`✅ Found API keys for: ${availableModels.join(', ')}\n`);
  
  const results = [];
  
  // Test each available model with each test case
  for (const model of availableModels) {
    console.log(`\n🧪 Testing model: ${model}`);
    console.log('='.repeat(50));
    
    for (const testCase of TEST_CASES) {
      console.log(`\n📋 ${testCase.name}: ${testCase.description}`);
      console.log(`   Path: ${testCase.path}`);
      console.log(`   Expected cost: ~$${testCase.expectedCost}`);
      
      // Run cost estimation first
      console.log('   💰 Running cost estimation...');
      const costResult = runCostEstimation(testCase.path, model);
      
      if (costResult.success) {
        console.log('   ✅ Cost estimation completed');
        // Extract cost from output if possible
        const costMatch = costResult.output.match(/\$[\d.]+/);
        if (costMatch) {
          console.log(`   💵 Estimated cost: ${costMatch[0]}`);
        }
      } else {
        console.log(`   ❌ Cost estimation failed: ${costResult.error}`);
      }
      
      // Run actual review
      console.log('   🔍 Running extract-patterns review...');
      const reviewResult = runExtractPatternsReview(testCase.path, model, true);
      
      if (reviewResult.success) {
        console.log(`   ✅ Review completed in ${reviewResult.duration}ms`);
        
        // Validate output
        console.log('   📊 Validating output...');
        const validation = validateOutput(reviewResult.outputDir, testCase.name);
        
        if (validation.valid) {
          console.log('   ✅ Output validation passed');
          if (validation.qualityIssues.length > 0) {
            console.log(`   ⚠️  Quality issues: ${validation.qualityIssues.join(', ')}`);
          }
        } else {
          console.log(`   ❌ Output validation failed: ${validation.error}`);
        }
        
        results.push({
          model,
          testCase: testCase.name,
          success: true,
          duration: reviewResult.duration,
          validation
        });
        
      } else {
        console.log(`   ❌ Review failed: ${reviewResult.error}`);
        if (reviewResult.stderr) {
          console.log(`   📝 Error details: ${reviewResult.stderr}`);
        }
        
        results.push({
          model,
          testCase: testCase.name,
          success: false,
          error: reviewResult.error
        });
      }
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successful.length}`);
  console.log(`❌ Failed tests: ${failed.length}`);
  console.log(`📈 Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%`);
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(result => {
      console.log(`   - ${result.model} / ${result.testCase}: ${result.error}`);
    });
  }
  
  if (successful.length > 0) {
    console.log('\n✅ Successful Tests:');
    successful.forEach(result => {
      console.log(`   - ${result.model} / ${result.testCase}: ${result.duration}ms`);
    });
  }
  
  console.log('\n🎉 Real API testing completed!');
  console.log('📁 Check ai-code-review-docs/extract-patterns-tests/ for output files');
}

// Run tests if this script is executed directly
if (require.main === module) {
  runRealApiTests().catch(error => {
    console.error('Error running tests:', error);
    process.exit(1);
  });
}

module.exports = { runRealApiTests };
