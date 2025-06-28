#!/usr/bin/env node

/**
 * Phase 2 Test Runner for Extract Patterns Review Type
 * 
 * This is the main orchestrator for all Phase 2 testing activities:
 * 1. Real API Testing
 * 2. Output Quality Validation
 * 3. LangChain Evaluation
 * 4. External Project Testing
 * 5. Pattern Database Storage
 * 
 * Usage:
 *   node tests/extract-patterns/phase2-test-runner.js [options]
 * 
 * Options:
 *   --suite <name>      Test suite to run (all, api, validation, evaluation, external, database)
 *   --model <model>     Model to test with
 *   --output <dir>      Output directory for all results
 *   --quick             Run quick tests only (skip external projects)
 *   --store-patterns    Store results in pattern database
 */

const fs = require('fs').promises;
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Import test modules
const { runExtractPatternsReview, checkApiKeys } = require('./real-api-test');
const { validateExtractPatternsOutput, printValidationResults } = require('./output-validator');
const { evaluateExtractPatternsOutput, printEvaluationResults } = require('./langchain-evaluation');
const { testExternalProject, EXTERNAL_PROJECTS } = require('./external-project-test');
const { PatternDatabase, PatternRecord } = require('./pattern-database');

// Project root directory
const PROJECT_ROOT = path.join(__dirname, '../..');

/**
 * Test suite configuration
 */
const TEST_SUITES = {
  api: {
    name: 'Real API Testing',
    description: 'Test extract-patterns with real API calls',
    enabled: true
  },
  validation: {
    name: 'Output Quality Validation',
    description: 'Validate output quality and structure',
    enabled: true
  },
  evaluation: {
    name: 'LangChain Evaluation',
    description: 'Evaluate patterns using LangChain metrics',
    enabled: true
  },
  external: {
    name: 'External Project Testing',
    description: 'Test on well-known TypeScript projects',
    enabled: true
  },
  database: {
    name: 'Pattern Database Storage',
    description: 'Store patterns in searchable database',
    enabled: true
  }
};

/**
 * Phase 2 test result aggregator
 */
class Phase2TestResult {
  constructor() {
    this.timestamp = new Date().toISOString();
    this.suites = {};
    this.summary = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0
    };
    this.recommendations = [];
    this.artifacts = [];
  }

  /**
   * Add suite result
   */
  addSuiteResult(suiteName, result) {
    this.suites[suiteName] = result;
    this.summary.total++;
    
    if (result.success) {
      this.summary.passed++;
    } else if (result.skipped) {
      this.summary.skipped++;
    } else {
      this.summary.failed++;
    }
  }

  /**
   * Calculate overall success rate
   */
  getSuccessRate() {
    return this.summary.total > 0 ? 
      (this.summary.passed / this.summary.total) * 100 : 0;
  }

  /**
   * Determine if Phase 2 passed overall
   */
  isPassed() {
    return this.getSuccessRate() >= 70; // 70% threshold
  }
}

/**
 * Run real API testing suite
 */
async function runApiTestSuite(options) {
  console.log('\n🔍 Running Real API Testing Suite...');
  
  const result = {
    name: 'Real API Testing',
    success: false,
    skipped: false,
    details: [],
    artifacts: []
  };

  try {
    // Check API keys
    const { availableModels, missingKeys } = checkApiKeys();
    
    if (availableModels.length === 0) {
      result.skipped = true;
      result.details.push('❌ No API keys available for testing');
      return result;
    }

    // Test with our own codebase first
    const testConfig = {
      model: options.model,
      target: 'src/',
      output: options.output,
      interactive: true
    };

    const apiResult = await runExtractPatternsReview(testConfig);
    
    if (apiResult.success) {
      result.success = true;
      result.details.push(`✅ API test completed in ${apiResult.duration}ms`);
      result.details.push(`📄 Model: ${apiResult.model}`);
      result.artifacts.push({
        type: 'api-output',
        description: 'Extract patterns API output',
        content: apiResult.output
      });
    } else {
      result.details.push(`❌ API test failed: ${apiResult.error}`);
    }

  } catch (error) {
    result.details.push(`❌ API test suite error: ${error.message}`);
  }

  return result;
}

/**
 * Run output validation suite
 */
async function runValidationSuite(apiOutput, options) {
  console.log('\n📋 Running Output Validation Suite...');
  
  const result = {
    name: 'Output Validation',
    success: false,
    skipped: false,
    details: [],
    artifacts: []
  };

  try {
    if (!apiOutput) {
      result.skipped = true;
      result.details.push('⚠️ No API output available for validation');
      return result;
    }

    // Save API output to temporary file for validation
    const tempFile = path.join(options.output, 'temp-api-output.md');
    await fs.writeFile(tempFile, apiOutput);

    // Run validation
    const validationResult = await validateExtractPatternsOutput(tempFile);
    
    result.success = validationResult.isPassed();
    result.details.push(`📊 Validation score: ${validationResult.getScorePercentage()}%`);
    result.details.push(`✅ Sections found: ${validationResult.sections.found.length}`);
    result.details.push(`❌ Sections missing: ${validationResult.sections.missing.length}`);
    
    if (validationResult.quality.indicators.length > 0) {
      result.details.push(`🎯 Quality indicators: ${validationResult.quality.indicators.join(', ')}`);
    }

    result.artifacts.push({
      type: 'validation-report',
      description: 'Output validation report',
      data: validationResult
    });

    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});

  } catch (error) {
    result.details.push(`❌ Validation suite error: ${error.message}`);
  }

  return result;
}

/**
 * Run LangChain evaluation suite
 */
async function runEvaluationSuite(apiOutput, options) {
  console.log('\n🎯 Running LangChain Evaluation Suite...');
  
  const result = {
    name: 'LangChain Evaluation',
    success: false,
    skipped: false,
    details: [],
    artifacts: []
  };

  try {
    if (!apiOutput) {
      result.skipped = true;
      result.details.push('⚠️ No API output available for evaluation');
      return result;
    }

    // Save API output to temporary file for evaluation
    const tempFile = path.join(options.output, 'temp-eval-output.md');
    await fs.writeFile(tempFile, apiOutput);

    // Run evaluation
    const evaluationResult = await evaluateExtractPatternsOutput(tempFile);
    
    result.success = evaluationResult.overallScore >= 70;
    result.details.push(`📊 Overall score: ${evaluationResult.overallScore.toFixed(1)}/100`);
    result.details.push(`🎓 Grade: ${evaluationResult.getGrade()}`);
    
    // Add metric details
    for (const [name, metric] of Object.entries(evaluationResult.metrics)) {
      result.details.push(`   ${name}: ${metric.score.toFixed(1)}/100`);
    }

    result.artifacts.push({
      type: 'evaluation-report',
      description: 'LangChain evaluation report',
      data: evaluationResult
    });

    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});

  } catch (error) {
    result.details.push(`❌ Evaluation suite error: ${error.message}`);
  }

  return result;
}

/**
 * Run external project testing suite
 */
async function runExternalTestSuite(options) {
  console.log('\n🌐 Running External Project Testing Suite...');
  
  const result = {
    name: 'External Project Testing',
    success: false,
    skipped: false,
    details: [],
    artifacts: []
  };

  try {
    if (options.quick) {
      result.skipped = true;
      result.details.push('⚠️ Skipped due to --quick flag');
      return result;
    }

    // Test with a smaller, well-known project (NestJS)
    const testOptions = {
      model: options.model,
      cleanup: true,
      workDir: path.join(options.output, 'temp-external')
    };

    const externalResult = await testExternalProject('nest', testOptions);
    
    result.success = externalResult.success && externalResult.patternMatchScore >= 60;
    result.details.push(`📊 Pattern match score: ${externalResult.patternMatchScore.toFixed(1)}%`);
    result.details.push(`⏱️ Duration: ${Math.round(externalResult.duration / 1000)}s`);
    result.details.push(`🎯 Patterns found: ${externalResult.patternsFound.length}/${externalResult.patternsExpected.length}`);

    result.artifacts.push({
      type: 'external-test-report',
      description: 'External project test report',
      data: externalResult
    });

  } catch (error) {
    result.details.push(`❌ External test suite error: ${error.message}`);
  }

  return result;
}

/**
 * Run pattern database storage suite
 */
async function runDatabaseSuite(apiOutput, options) {
  console.log('\n🗄️ Running Pattern Database Storage Suite...');
  
  const result = {
    name: 'Pattern Database Storage',
    success: false,
    skipped: false,
    details: [],
    artifacts: []
  };

  try {
    if (!options.storePatterns) {
      result.skipped = true;
      result.details.push('⚠️ Skipped (--store-patterns not specified)');
      return result;
    }

    if (!apiOutput) {
      result.skipped = true;
      result.details.push('⚠️ No API output available for storage');
      return result;
    }

    // Initialize database
    const db = new PatternDatabase();
    await db.initialize();

    // Create pattern record
    const patternRecord = new PatternRecord({
      projectName: 'ai-code-review',
      projectType: 'cli-tool',
      language: 'typescript',
      model: options.model,
      tags: ['typescript', 'cli', 'code-review', 'ai']
    });

    // Extract patterns from API output
    patternRecord.patterns = patternRecord.extractPatterns(apiOutput);
    patternRecord.hash = patternRecord.generateHash(apiOutput);

    // Store in database
    const patternId = await db.storePattern(patternRecord);
    
    result.success = true;
    result.details.push(`✅ Pattern stored with ID: ${patternId}`);
    result.details.push(`📊 Architecture patterns: ${patternRecord.patterns.architecture.length}`);
    result.details.push(`📊 Code style patterns: ${patternRecord.patterns.codeStyle.length}`);
    result.details.push(`📊 Toolchain patterns: ${patternRecord.patterns.toolchain.length}`);

    // Test search functionality
    const searchResults = await db.searchPatterns('typescript', { limit: 5 });
    result.details.push(`🔍 Search test: Found ${searchResults.length} patterns for 'typescript'`);

    await db.close();

    result.artifacts.push({
      type: 'pattern-record',
      description: 'Stored pattern record',
      data: { id: patternId, patterns: patternRecord.patterns }
    });

  } catch (error) {
    result.details.push(`❌ Database suite error: ${error.message}`);
  }

  return result;
}

/**
 * Print comprehensive test results
 */
function printPhase2Results(testResult) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 PHASE 2 TEST RESULTS SUMMARY');
  console.log(`${'='.repeat(80)}`);
  
  console.log(`Overall Success Rate: ${testResult.getSuccessRate().toFixed(1)}%`);
  console.log(`Status: ${testResult.isPassed() ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Timestamp: ${testResult.timestamp}`);
  
  console.log(`\n📈 Summary:`);
  console.log(`   Total Suites: ${testResult.summary.total}`);
  console.log(`   Passed: ${testResult.summary.passed}`);
  console.log(`   Failed: ${testResult.summary.failed}`);
  console.log(`   Skipped: ${testResult.summary.skipped}`);

  console.log(`\n📋 Suite Results:`);
  for (const [suiteName, suiteResult] of Object.entries(testResult.suites)) {
    const status = suiteResult.skipped ? '⏭️ SKIPPED' : 
                   suiteResult.success ? '✅ PASSED' : '❌ FAILED';
    
    console.log(`\n${status} ${suiteResult.name}`);
    
    if (suiteResult.details.length > 0) {
      suiteResult.details.forEach(detail => console.log(`   ${detail}`));
    }
  }

  if (testResult.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    testResult.recommendations.forEach(rec => console.log(`   • ${rec}`));
  }

  console.log(`\n📄 Artifacts Generated: ${testResult.artifacts.length}`);
  testResult.artifacts.forEach(artifact => 
    console.log(`   • ${artifact.type}: ${artifact.description}`)
  );
}

/**
 * Main test execution function
 */
async function main() {
  const args = yargs(hideBin(process.argv))
    .option('suite', {
      alias: 's',
      type: 'string',
      description: 'Test suite to run',
      choices: ['all', ...Object.keys(TEST_SUITES)],
      default: 'all'
    })
    .option('model', {
      alias: 'm',
      type: 'string',
      description: 'Model to test with',
      default: 'anthropic:claude-3-opus'
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Output directory for results',
      default: 'test-results/phase2'
    })
    .option('quick', {
      alias: 'q',
      type: 'boolean',
      description: 'Run quick tests only',
      default: false
    })
    .option('store-patterns', {
      type: 'boolean',
      description: 'Store results in pattern database',
      default: false
    })
    .help()
    .argv;

  console.log('🚀 Extract Patterns Phase 2 Test Runner');
  console.log('=======================================\n');

  // Ensure output directory exists
  await fs.mkdir(args.output, { recursive: true });

  const testResult = new Phase2TestResult();
  let apiOutput = null;

  // Determine which suites to run
  const suitesToRun = args.suite === 'all' ? Object.keys(TEST_SUITES) : [args.suite];
  
  console.log(`Running ${suitesToRun.length} test suite(s): ${suitesToRun.join(', ')}`);
  console.log(`Model: ${args.model}`);
  console.log(`Output: ${args.output}`);
  console.log(`Quick mode: ${args.quick ? 'Yes' : 'No'}`);

  // Run test suites in order
  for (const suiteName of suitesToRun) {
    try {
      let suiteResult;

      switch (suiteName) {
        case 'api':
          suiteResult = await runApiTestSuite(args);
          if (suiteResult.success && suiteResult.artifacts.length > 0) {
            apiOutput = suiteResult.artifacts[0].content;
          }
          break;

        case 'validation':
          suiteResult = await runValidationSuite(apiOutput, args);
          break;

        case 'evaluation':
          suiteResult = await runEvaluationSuite(apiOutput, args);
          break;

        case 'external':
          suiteResult = await runExternalTestSuite(args);
          break;

        case 'database':
          suiteResult = await runDatabaseSuite(apiOutput, args);
          break;

        default:
          console.warn(`⚠️ Unknown test suite: ${suiteName}`);
          continue;
      }

      testResult.addSuiteResult(suiteName, suiteResult);
      testResult.artifacts.push(...(suiteResult.artifacts || []));

    } catch (error) {
      console.error(`💥 Error running ${suiteName} suite: ${error.message}`);
      testResult.addSuiteResult(suiteName, {
        name: TEST_SUITES[suiteName]?.name || suiteName,
        success: false,
        skipped: false,
        details: [`❌ Suite error: ${error.message}`],
        artifacts: []
      });
    }

    // Brief pause between suites
    if (suitesToRun.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Generate recommendations
  if (!testResult.isPassed()) {
    testResult.recommendations.push('Review failed test suites and address issues');
  }
  if (testResult.summary.skipped > 0) {
    testResult.recommendations.push('Consider running skipped tests with proper configuration');
  }

  // Save comprehensive results
  const resultsFile = path.join(args.output, `phase2-test-results-${Date.now()}.json`);
  await fs.writeFile(resultsFile, JSON.stringify(testResult, null, 2));

  // Print results
  printPhase2Results(testResult);
  
  console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
  
  // Exit with appropriate code
  process.exit(testResult.isPassed() ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Phase 2 test runner error:', error);
    process.exit(1);
  });
}

module.exports = { main, Phase2TestResult };
