#!/usr/bin/env node

/**
 * External Project Testing Framework for Extract Patterns Review Type
 * 
 * This module tests the extract-patterns functionality on well-known TypeScript
 * projects to validate pattern extraction quality and accuracy.
 * 
 * Usage:
 *   node tests/extract-patterns/external-project-test.js [options]
 * 
 * Options:
 *   --project <name>     Specific project to test (see EXTERNAL_PROJECTS)
 *   --all               Test all external projects
 *   --model <model>     Model to use for testing
 *   --output <dir>      Output directory for results
 *   --cleanup           Clean up cloned repositories after testing
 * 
 * External Projects:
 *   - vscode: Visual Studio Code (Microsoft)
 *   - typescript: TypeScript compiler itself
 *   - nest: NestJS framework
 *   - angular: Angular framework
 *   - react: React library
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Project root directory
const PROJECT_ROOT = path.join(__dirname, '../..');

/**
 * External projects for testing
 */
const EXTERNAL_PROJECTS = {
  vscode: {
    name: 'Visual Studio Code',
    repo: 'https://github.com/microsoft/vscode.git',
    branch: 'main',
    targetDir: 'src',
    description: 'Microsoft\'s popular code editor',
    expectedPatterns: [
      'Electron architecture',
      'Extension system',
      'Monaco editor integration',
      'TypeScript configuration',
      'Build system'
    ]
  },
  
  typescript: {
    name: 'TypeScript Compiler',
    repo: 'https://github.com/microsoft/TypeScript.git',
    branch: 'main',
    targetDir: 'src',
    description: 'TypeScript language compiler',
    expectedPatterns: [
      'Compiler architecture',
      'AST processing',
      'Type checking',
      'Language service',
      'Parser implementation'
    ]
  },
  
  nest: {
    name: 'NestJS Framework',
    repo: 'https://github.com/nestjs/nest.git',
    branch: 'master',
    targetDir: 'packages',
    description: 'Progressive Node.js framework',
    expectedPatterns: [
      'Decorator patterns',
      'Dependency injection',
      'Module system',
      'Guard patterns',
      'Interceptor patterns'
    ]
  },
  
  angular: {
    name: 'Angular Framework',
    repo: 'https://github.com/angular/angular.git',
    branch: 'main',
    targetDir: 'packages',
    description: 'Google\'s web application framework',
    expectedPatterns: [
      'Component architecture',
      'Dependency injection',
      'RxJS integration',
      'Change detection',
      'Template system'
    ]
  },
  
  react: {
    name: 'React Library',
    repo: 'https://github.com/facebook/react.git',
    branch: 'main',
    targetDir: 'packages',
    description: 'Facebook\'s UI library',
    expectedPatterns: [
      'Virtual DOM',
      'Fiber architecture',
      'Hook patterns',
      'Component lifecycle',
      'Reconciliation'
    ]
  }
};

/**
 * Test result structure
 */
class ExternalProjectTestResult {
  constructor(projectName) {
    this.projectName = projectName;
    this.timestamp = new Date().toISOString();
    this.success = false;
    this.duration = 0;
    this.extractionResult = null;
    this.validationResult = null;
    this.evaluationResult = null;
    this.patternsFound = [];
    this.patternsExpected = [];
    this.patternMatchScore = 0;
    this.errors = [];
    this.details = [];
  }
}

/**
 * Clone external project repository
 */
async function cloneProject(project, workDir) {
  const projectDir = path.join(workDir, project.name.toLowerCase().replace(/\s+/g, '-'));
  
  console.log(`📥 Cloning ${project.name}...`);
  console.log(`   Repository: ${project.repo}`);
  console.log(`   Target: ${projectDir}`);
  
  try {
    // Remove existing directory if it exists
    try {
      await fs.rmdir(projectDir, { recursive: true });
    } catch (error) {
      // Directory doesn't exist, that's fine
    }
    
    // Clone the repository
    const cloneCmd = `git clone --depth 1 --branch ${project.branch} ${project.repo} "${projectDir}"`;
    execSync(cloneCmd, { stdio: 'pipe' });
    
    console.log(`✅ Successfully cloned ${project.name}`);
    return projectDir;
    
  } catch (error) {
    console.error(`❌ Failed to clone ${project.name}: ${error.message}`);
    throw error;
  }
}

/**
 * Run extract-patterns analysis on external project
 */
async function analyzeExternalProject(projectDir, targetSubDir, model) {
  const analysisTarget = path.join(projectDir, targetSubDir);
  
  console.log(`🔍 Analyzing project patterns...`);
  console.log(`   Target: ${analysisTarget}`);
  console.log(`   Model: ${model}`);
  
  // Check if target directory exists
  try {
    await fs.access(analysisTarget);
  } catch (error) {
    throw new Error(`Target directory not found: ${analysisTarget}`);
  }
  
  // Build command
  const cmd = [
    'node',
    path.join(PROJECT_ROOT, 'dist/cli.js'),
    'extract-patterns',
    analysisTarget,
    '--interactive'
  ];
  
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
      maxBuffer: 20 * 1024 * 1024 // 20MB buffer for large projects
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Analysis completed in ${duration}ms`);
    
    return {
      success: true,
      output: result,
      duration
    };
    
  } catch (error) {
    console.error(`❌ Analysis failed: ${error.message}`);
    return {
      success: false,
      error: error.message,
      duration: 0
    };
  }
}

/**
 * Validate patterns against expected patterns
 */
function validateExpectedPatterns(extractedContent, expectedPatterns) {
  const foundPatterns = [];
  const missingPatterns = [];
  
  const contentLower = extractedContent.toLowerCase();
  
  for (const pattern of expectedPatterns) {
    const patternLower = pattern.toLowerCase();
    const keywords = patternLower.split(' ');
    
    // Check if most keywords from the pattern are present
    const foundKeywords = keywords.filter(keyword => 
      contentLower.includes(keyword)
    );
    
    const matchRatio = foundKeywords.length / keywords.length;
    
    if (matchRatio >= 0.6) { // 60% of keywords must match
      foundPatterns.push({
        pattern,
        matchRatio,
        foundKeywords
      });
    } else {
      missingPatterns.push({
        pattern,
        matchRatio,
        foundKeywords,
        missingKeywords: keywords.filter(k => !foundKeywords.includes(k))
      });
    }
  }
  
  const patternMatchScore = (foundPatterns.length / expectedPatterns.length) * 100;
  
  return {
    foundPatterns,
    missingPatterns,
    patternMatchScore,
    totalExpected: expectedPatterns.length,
    totalFound: foundPatterns.length
  };
}

/**
 * Test single external project
 */
async function testExternalProject(projectKey, options) {
  const project = EXTERNAL_PROJECTS[projectKey];
  const result = new ExternalProjectTestResult(project.name);
  result.patternsExpected = project.expectedPatterns;
  
  const workDir = options.workDir || path.join(PROJECT_ROOT, 'temp-external-projects');
  
  try {
    // Ensure work directory exists
    await fs.mkdir(workDir, { recursive: true });
    
    // Clone project
    const startTime = Date.now();
    const projectDir = await cloneProject(project, workDir);
    
    // Analyze project
    const analysisResult = await analyzeExternalProject(
      projectDir,
      project.targetDir,
      options.model
    );
    
    result.duration = Date.now() - startTime;
    
    if (analysisResult.success) {
      result.extractionResult = analysisResult;
      result.success = true;
      
      // Validate expected patterns
      const patternValidation = validateExpectedPatterns(
        analysisResult.output,
        project.expectedPatterns
      );
      
      result.patternsFound = patternValidation.foundPatterns.map(p => p.pattern);
      result.patternMatchScore = patternValidation.patternMatchScore;
      result.validationResult = patternValidation;
      
      result.details.push(`✅ Pattern extraction completed`);
      result.details.push(`📊 Pattern match score: ${patternValidation.patternMatchScore.toFixed(1)}%`);
      result.details.push(`🎯 Found ${patternValidation.totalFound}/${patternValidation.totalExpected} expected patterns`);
      
    } else {
      result.success = false;
      result.errors.push(analysisResult.error);
    }
    
    // Cleanup if requested
    if (options.cleanup) {
      try {
        await fs.rmdir(projectDir, { recursive: true });
        result.details.push('🧹 Cleaned up cloned repository');
      } catch (error) {
        result.details.push(`⚠️ Cleanup failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    result.success = false;
    result.errors.push(error.message);
    result.details.push(`❌ Test failed: ${error.message}`);
  }
  
  return result;
}

/**
 * Print test results
 */
function printTestResults(results) {
  console.log(`\n📊 External Project Test Results`);
  console.log(`${'='.repeat(60)}`);
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`Total projects tested: ${results.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  
  if (successful.length > 0) {
    const avgPatternScore = successful.reduce((sum, r) => sum + r.patternMatchScore, 0) / successful.length;
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    
    console.log(`Average pattern match score: ${avgPatternScore.toFixed(1)}%`);
    console.log(`Average duration: ${Math.round(avgDuration / 1000)}s`);
  }
  
  console.log(`\n📋 Individual Results:`);
  
  for (const result of results) {
    console.log(`\n${result.success ? '✅' : '❌'} ${result.projectName}`);
    console.log(`   Duration: ${Math.round(result.duration / 1000)}s`);
    
    if (result.success) {
      console.log(`   Pattern Match: ${result.patternMatchScore.toFixed(1)}%`);
      console.log(`   Patterns Found: ${result.patternsFound.length}/${result.patternsExpected.length}`);
      
      if (result.patternsFound.length > 0) {
        console.log(`   Found Patterns:`);
        result.patternsFound.forEach(pattern => console.log(`     • ${pattern}`));
      }
      
      if (result.validationResult?.missingPatterns.length > 0) {
        console.log(`   Missing Patterns:`);
        result.validationResult.missingPatterns.forEach(p => 
          console.log(`     • ${p.pattern}`)
        );
      }
    } else {
      console.log(`   Errors:`);
      result.errors.forEach(error => console.log(`     • ${error}`));
    }
    
    if (result.details.length > 0) {
      console.log(`   Details:`);
      result.details.forEach(detail => console.log(`     ${detail}`));
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = yargs(hideBin(process.argv))
    .option('project', {
      alias: 'p',
      type: 'string',
      description: 'Specific project to test',
      choices: Object.keys(EXTERNAL_PROJECTS)
    })
    .option('all', {
      alias: 'a',
      type: 'boolean',
      description: 'Test all external projects',
      default: false
    })
    .option('model', {
      alias: 'm',
      type: 'string',
      description: 'Model to use for testing',
      default: 'anthropic:claude-3-opus'
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Output directory for results',
      default: 'test-results/external-projects'
    })
    .option('cleanup', {
      alias: 'c',
      type: 'boolean',
      description: 'Clean up cloned repositories after testing',
      default: true
    })
    .help()
    .argv;
  
  console.log('🌐 External Project Testing Framework');
  console.log('====================================\n');
  
  // Determine projects to test
  let projectsToTest = [];
  if (args.all) {
    projectsToTest = Object.keys(EXTERNAL_PROJECTS);
  } else if (args.project) {
    projectsToTest = [args.project];
  } else {
    console.error('Please specify --project <name> or --all');
    process.exit(1);
  }
  
  console.log(`Testing ${projectsToTest.length} project(s) with model: ${args.model}`);
  console.log(`Projects: ${projectsToTest.join(', ')}\n`);
  
  // Ensure output directory exists
  await fs.mkdir(args.output, { recursive: true });
  
  // Run tests
  const results = [];
  const options = {
    model: args.model,
    cleanup: args.cleanup,
    workDir: path.join(args.output, 'temp-repos')
  };
  
  for (const projectKey of projectsToTest) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${EXTERNAL_PROJECTS[projectKey].name}`);
    console.log(`${'='.repeat(60)}`);
    
    const result = await testExternalProject(projectKey, options);
    results.push(result);
    
    // Brief pause between tests
    if (projectsToTest.length > 1) {
      console.log('\n⏳ Waiting 5 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Save results
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const resultsFile = path.join(args.output, `external-project-test-${timestamp}.json`);
  await fs.writeFile(resultsFile, JSON.stringify(results, null, 2));
  
  // Print summary
  printTestResults(results);
  
  console.log(`\n📄 Detailed results saved to: ${resultsFile}`);
  
  // Exit with appropriate code
  const failed = results.filter(r => !r.success);
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test error:', error);
    process.exit(1);
  });
}

module.exports = {
  testExternalProject,
  validateExpectedPatterns,
  EXTERNAL_PROJECTS,
  ExternalProjectTestResult
};
