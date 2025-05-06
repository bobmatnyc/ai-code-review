#!/usr/bin/env node
/**
 * Test script for dependency analysis
 * Run with: node test-dependency-analysis.js [project-path]
 */

const path = require('path');
const fs = require('fs').promises;
const { spawnSync } = require('child_process');

// Set up minimal logger for the test
const logger = {
  info: (msg) => console.log(`[INFO] ${msg}`),
  warn: (msg) => console.log(`[WARN] ${msg}`),
  error: (msg) => console.log(`[ERROR] ${msg}`),
  debug: (msg) => console.log(`[DEBUG] ${msg}`)
};

/**
 * Simple test function to run dependency analysis
 */
async function testDependencyAnalysis(projectPath) {
  console.log('=========== TESTING DEPENDENCY ANALYSIS ===========');
  console.log(`Project path: ${projectPath}`);
  
  // Check if path exists
  try {
    await fs.access(projectPath);
    console.log(`✅ Project directory exists: ${projectPath}`);
  } catch (err) {
    console.error(`❌ Project directory does not exist: ${projectPath}`);
    process.exit(1);
  }
  
  // Step 1: Check for package.json
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    await fs.access(packageJsonPath);
    console.log('✅ Found package.json');
  } catch (err) {
    console.error('❌ No package.json found');
    process.exit(1);
  }
  
  // Step 2: Check for depcheck
  let hasDepcheck = false;
  try {
    const depcheckPath = path.join(projectPath, 'node_modules', '.bin', 'depcheck');
    await fs.access(depcheckPath);
    hasDepcheck = true;
    console.log('✅ Found depcheck in node_modules');
  } catch (err) {
    try {
      const result = spawnSync('depcheck', ['--version'], { encoding: 'utf-8' });
      if (result.status === 0) {
        hasDepcheck = true;
        console.log('✅ Found global depcheck installation');
      }
    } catch (globalErr) {
      console.warn('⚠️ depcheck not found - unused dependency detection may not work');
    }
  }
  
  // Step 3: Check for dependency-cruiser
  let hasDependencyCruiser = false;
  try {
    const depCruiserPath = path.join(projectPath, 'node_modules', '.bin', 'depcruise');
    await fs.access(depCruiserPath);
    hasDependencyCruiser = true;
    console.log('✅ Found dependency-cruiser in node_modules');
  } catch (err) {
    try {
      const result = spawnSync('depcruise', ['--version'], { encoding: 'utf-8' });
      if (result.status === 0) {
        hasDependencyCruiser = true;
        console.log('✅ Found global dependency-cruiser installation');
      }
    } catch (globalErr) {
      console.warn('⚠️ dependency-cruiser not found - visualization may not work');
    }
  }
  
  // Step 4: Try running npm audit
  try {
    console.log('Running npm audit...');
    const auditResult = spawnSync('npm', ['audit', '--json'], { 
      cwd: projectPath,
      encoding: 'utf-8'
    });
    
    if (auditResult.status === 0) {
      console.log('✅ npm audit ran successfully');
      
      try {
        const auditData = JSON.parse(auditResult.stdout);
        const vulnCount = auditData.metadata?.vulnerabilities?.total || 0;
        console.log(`Found ${vulnCount} vulnerabilities`);
      } catch (parseErr) {
        console.warn('⚠️ Could not parse npm audit output');
      }
    } else {
      console.log('⚠️ npm audit completed with warnings or errors');
    }
  } catch (auditErr) {
    console.error(`❌ npm audit failed: ${auditErr}`);
  }
  
  // Step 5: Try running the TypeScript code through ts-node
  try {
    console.log('\nTesting the actual analyzer implementation...');
    const tsNodePath = path.join(projectPath, 'node_modules', '.bin', 'ts-node');
    
    // Create a temporary test file
    const testFile = path.join(projectPath, 'temp-dependency-test.ts');
    await fs.writeFile(testFile, `
    import { createDependencyAnalysisSection } from './src/utils/dependencies/enhancedDependencyAnalyzer';
    
    async function main() {
      try {
        console.log('Running enhanced dependency analyzer...');
        const result = await createDependencyAnalysisSection('${projectPath.replace(/\\/g, '\\\\')}');
        console.log('ANALYSIS RESULT PREVIEW (first 200 chars):');
        console.log(result.substring(0, 200) + '...');
        console.log('\\nAnalysis completed successfully!');
      } catch (error) {
        console.error('Error in analysis:', error);
      }
    }
    
    main().catch(console.error);
    `);
    
    console.log('Running ts-node test...');
    const tsNodeResult = spawnSync(tsNodePath, ['temp-dependency-test.ts'], {
      cwd: projectPath,
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    
    // Clean up the temporary file
    await fs.unlink(testFile);
    
    if (tsNodeResult.status === 0) {
      console.log('✅ ts-node test completed successfully');
    } else {
      console.error('❌ ts-node test failed');
    }
  } catch (tsNodeErr) {
    console.error(`❌ ts-node test error: ${tsNodeErr}`);
  }
  
  console.log('\n=========== DEPENDENCY ANALYSIS TEST COMPLETE ===========');
}

// Get the project path from command line or use current directory
const projectPath = process.argv[2] || process.cwd();
testDependencyAnalysis(projectPath);