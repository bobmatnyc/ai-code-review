/**
 * Test script for enhanced dependency analysis
 * 
 * This script tests the enhanced dependency analyzer functionality
 * to verify that it works correctly with dependency visualization,
 * unused dependency detection, and contextual analysis.
 */

const path = require('path');
const fs = require('fs');

// Check required dependencies
const requiredDeps = ['depcheck', 'dependency-cruiser'];
let missingDeps = [];

for (const dep of requiredDeps) {
  const modulePath = path.join(__dirname, '..', 'node_modules', dep);
  if (!fs.existsSync(modulePath)) {
    missingDeps.push(dep);
  }
}

if (missingDeps.length > 0) {
  console.error(`❌ Missing required dependencies: ${missingDeps.join(', ')}`);
  console.log('Run: npm install --save-dev depcheck dependency-cruiser');
  process.exit(1);
}

// Run the TypeScript module using ts-node
const { spawn } = require('child_process');
const projectRoot = path.join(__dirname, '..');

console.log('💡 Testing enhanced dependency analysis...');

const testProcess = spawn('npx', [
  'ts-node', 
  '--transpile-only',
  '-r', 
  'tsconfig-paths/register',
  path.join(projectRoot, 'src', 'utils', 'dependencies', 'test-enhanced-dependency-analysis.ts')
], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    DEBUG: 'true',
    NODE_ENV: 'development'
  }
});

testProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Enhanced dependency analysis test completed successfully');
  } else {
    console.error(`❌ Enhanced dependency analysis test failed with code ${code}`);
  }
});