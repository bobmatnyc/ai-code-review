#!/usr/bin/env node

/**
 * External project testing for extract-patterns review type
 * 
 * This script tests the extract-patterns functionality on well-known
 * TypeScript projects to validate pattern extraction effectiveness
 * and benchmark against established codebases.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { promisify } = require('util');

const projectRoot = path.join(__dirname, '../../..');
const testDir = path.join(projectRoot, 'temp-external-tests');

// Well-known TypeScript projects for testing
const EXTERNAL_PROJECTS = [
  {
    name: 'TypeScript Compiler',
    repo: 'microsoft/TypeScript',
    branch: 'main',
    testPath: 'src/compiler',
    expectedPatterns: ['Visitor', 'Factory', 'Builder'],
    description: 'TypeScript compiler source - complex architectural patterns'
  },
  {
    name: 'VS Code',
    repo: 'microsoft/vscode',
    branch: 'main', 
    testPath: 'src/vs/base',
    expectedPatterns: ['Event Emitter', 'Dependency Injection', 'Command'],
    description: 'VS Code base modules - event-driven architecture'
  },
  {
    name: 'Nest.js',
    repo: 'nestjs/nest',
    branch: 'master',
    testPath: 'packages/core',
    expectedPatterns: ['Decorator', 'Dependency Injection', 'Module'],
    description: 'Nest.js core - decorator-based framework patterns'
  },
  {
    name: 'Angular CLI',
    repo: 'angular/angular-cli',
    branch: 'main',
    testPath: 'packages/angular/cli',
    expectedPatterns: ['Command', 'Builder', 'Schematic'],
    description: 'Angular CLI - command pattern and code generation'
  },
  {
    name: 'RxJS',
    repo: 'ReactiveX/rxjs',
    branch: 'master',
    testPath: 'src/internal',
    expectedPatterns: ['Observer', 'Strategy', 'Chain of Responsibility'],
    description: 'RxJS internals - reactive programming patterns'
  }
];

/**
 * Download and extract project source
 */
async function downloadProject(project) {
  const projectDir = path.join(testDir, project.name.replace(/\s+/g, '-').toLowerCase());
  
  if (fs.existsSync(projectDir)) {
    console.log(`   📁 Project already exists: ${projectDir}`);
    return projectDir;
  }

  console.log(`   📥 Downloading ${project.name}...`);
  
  try {
    // Use git to clone just the specific directory we need
    const cloneUrl = `https://github.com/${project.repo}.git`;
    
    // Create temp directory
    fs.mkdirSync(projectDir, { recursive: true });
    
    // Initialize git repo and add remote
    execSync('git init', { cwd: projectDir, stdio: 'pipe' });
    execSync(`git remote add origin ${cloneUrl}`, { cwd: projectDir, stdio: 'pipe' });
    
    // Enable sparse checkout
    execSync('git config core.sparseCheckout true', { cwd: projectDir, stdio: 'pipe' });
    
    // Set sparse checkout path
    const sparseCheckoutPath = path.join(projectDir, '.git', 'info', 'sparse-checkout');
    fs.writeFileSync(sparseCheckoutPath, `${project.testPath}/*\npackage.json\ntsconfig.json\n`);
    
    // Pull only the needed files
    execSync(`git pull origin ${project.branch} --depth=1`, { 
      cwd: projectDir, 
      stdio: 'pipe',
      timeout: 60000 // 1 minute timeout
    });
    
    console.log(`   ✅ Downloaded to: ${projectDir}`);
    return projectDir;
    
  } catch (error) {
    console.log(`   ❌ Failed to download ${project.name}: ${error.message}`);
    return null;
  }
}

/**
 * Run extract-patterns on external project
 */
async function testExternalProject(project, model) {
  console.log(`\n🧪 Testing ${project.name}`);
  console.log(`   Description: ${project.description}`);
  console.log(`   Expected patterns: ${project.expectedPatterns.join(', ')}`);
  
  // Download project
  const projectDir = await downloadProject(project);
  if (!projectDir) {
    return { success: false, error: 'Failed to download project' };
  }
  
  const testPath = path.join(projectDir, project.testPath);
  if (!fs.existsSync(testPath)) {
    console.log(`   ⚠️  Test path not found: ${testPath}`);
    return { success: false, error: 'Test path not found' };
  }
  
  // Run extract-patterns review
  const outputDir = path.join(projectRoot, 'ai-code-review-docs', 'external-project-tests');
  fs.mkdirSync(outputDir, { recursive: true });
  
  const cmd = [
    'node',
    path.join(projectRoot, 'dist', 'index.js'),
    'extract-patterns',
    testPath,
    '--output-dir', outputDir,
    '--interactive'
  ].join(' ');
  
  const env = {
    ...process.env,
    AI_CODE_REVIEW_MODEL: model
  };
  
  console.log(`   🔍 Running extract-patterns analysis...`);
  const startTime = Date.now();
  
  try {
    const result = execSync(cmd, {
      env,
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 300000 // 5 minute timeout
    });
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ Analysis completed in ${duration}ms`);
    
    // Validate output
    const validation = await validateExternalProjectOutput(outputDir, project);
    
    return {
      success: true,
      duration,
      validation,
      outputDir
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ Analysis failed after ${duration}ms: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

/**
 * Validate output for external project
 */
async function validateExternalProjectOutput(outputDir, project) {
  try {
    // Find the most recent JSON output
    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(outputDir, f),
        mtime: fs.statSync(path.join(outputDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    if (files.length === 0) {
      return { valid: false, error: 'No JSON output found' };
    }
    
    const outputFile = files[0].path;
    const content = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    
    if (!content.patterns) {
      return { valid: false, error: 'Invalid output format' };
    }
    
    const patterns = content.patterns;
    
    // Check if expected patterns were identified
    const identifiedPatterns = patterns.architecturalPatterns.map(p => p.patternName.toLowerCase());
    const expectedPatterns = project.expectedPatterns.map(p => p.toLowerCase());
    
    const foundExpected = expectedPatterns.filter(expected =>
      identifiedPatterns.some(identified => 
        identified.includes(expected.split(' ')[0]) || 
        expected.split(' ')[0].includes(identified)
      )
    );
    
    const patternMatchRate = foundExpected.length / expectedPatterns.length;
    
    // Quality checks
    const qualityIssues = [];
    
    if (patterns.architecturalPatterns.length === 0) {
      qualityIssues.push('No architectural patterns identified');
    }
    
    if (patterns.exemplarCharacteristics.strengths.length === 0) {
      qualityIssues.push('No strengths identified');
    }
    
    if (patterns.technologyStack.coreLanguages.length === 0) {
      qualityIssues.push('No core languages identified');
    }
    
    return {
      valid: true,
      patternMatchRate,
      foundExpected,
      expectedPatterns,
      identifiedPatterns,
      qualityIssues,
      outputFile
    };
    
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Cleanup temporary files
 */
function cleanup() {
  if (fs.existsSync(testDir)) {
    console.log('\n🧹 Cleaning up temporary files...');
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.log(`⚠️  Cleanup warning: ${error.message}`);
    }
  }
}

/**
 * Main test function
 */
async function runExternalProjectTests() {
  console.log('=== External Project Testing for Extract Patterns ===\n');
  
  // Check for API key
  const hasAnthropicKey = !!process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.AI_CODE_REVIEW_OPENAI_API_KEY;
  const hasGeminiKey = !!process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;
  
  if (!hasAnthropicKey && !hasOpenAIKey && !hasGeminiKey) {
    console.error('❌ No API keys found. Please set at least one of:');
    console.error('- AI_CODE_REVIEW_ANTHROPIC_API_KEY');
    console.error('- AI_CODE_REVIEW_OPENAI_API_KEY');
    console.error('- AI_CODE_REVIEW_GOOGLE_API_KEY');
    process.exit(1);
  }
  
  // Select model to use
  const model = hasAnthropicKey ? 'anthropic:claude-3-sonnet' :
                hasOpenAIKey ? 'openai:gpt-4o' :
                'gemini:gemini-1.5-pro';
  
  console.log(`🤖 Using model: ${model}\n`);
  
  // Create temp directory
  fs.mkdirSync(testDir, { recursive: true });
  
  const results = [];
  
  try {
    // Test a subset of projects (to avoid long runtime)
    const projectsToTest = EXTERNAL_PROJECTS.slice(0, 3); // Test first 3 projects
    
    for (const project of projectsToTest) {
      const result = await testExternalProject(project, model);
      results.push({ project: project.name, ...result });
      
      // Add delay between tests to avoid rate limiting
      if (projectsToTest.indexOf(project) < projectsToTest.length - 1) {
        console.log('   ⏳ Waiting 10 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
  } finally {
    // Always cleanup
    cleanup();
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 EXTERNAL PROJECT TEST SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful tests: ${successful.length}`);
  console.log(`❌ Failed tests: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n✅ Successful Tests:');
    successful.forEach(result => {
      console.log(`   - ${result.project}: ${result.duration}ms`);
      if (result.validation && result.validation.valid) {
        const matchRate = (result.validation.patternMatchRate * 100).toFixed(1);
        console.log(`     Pattern match rate: ${matchRate}%`);
        console.log(`     Found patterns: ${result.validation.foundExpected.join(', ')}`);
      }
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    failed.forEach(result => {
      console.log(`   - ${result.project}: ${result.error}`);
    });
  }
  
  // Calculate overall pattern detection rate
  const validResults = successful.filter(r => r.validation && r.validation.valid);
  if (validResults.length > 0) {
    const avgPatternMatchRate = validResults.reduce((sum, r) => sum + r.validation.patternMatchRate, 0) / validResults.length;
    console.log(`\n📈 Average pattern detection rate: ${(avgPatternMatchRate * 100).toFixed(1)}%`);
  }
  
  console.log('\n🎉 External project testing completed!');
  console.log('📁 Check ai-code-review-docs/external-project-tests/ for output files');
}

// Handle cleanup on exit
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);

// Run tests if this script is executed directly
if (require.main === module) {
  runExternalProjectTests().catch(error => {
    console.error('Error running external project tests:', error);
    cleanup();
    process.exit(1);
  });
}

module.exports = { runExternalProjectTests };
