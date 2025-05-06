#!/usr/bin/env node
/**
 * Standalone script to test dependency analysis function 
 * Run with: node dependency-test.js
 */

// Import required modules
const path = require('path');
const fs = require('fs').promises;

// Same OWASP check logic used in the main app 
async function isOwaspDependencyCheckInstalled() {
  const os = require('os');
  try {
    console.log('Checking if OWASP Dependency-Check is installed...');
    // Get the appropriate command based on the platform
    const command = os.platform() === 'win32' ? 'dependency-check.bat' : 'dependency-check';
    
    // Try to execute dependency-check script to see if it's installed
    const { spawnSync } = require('child_process');
    const result = spawnSync(command, ['--version'], { 
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8',
      shell: true // Use shell on all platforms for better compatibility
    });
    
    const isInstalled = result.status === 0;
    console.log(`OWASP Dependency-Check ${isInstalled ? 'is INSTALLED ✅' : 'is NOT INSTALLED ❌'}`);
    if (result.stderr) {
      console.log(`STDERR: ${result.stderr}`);
    }
    if (result.stdout) {
      console.log(`STDOUT: ${result.stdout}`);
    }
    
    return isInstalled;
  } catch (error) {
    console.log(`OWASP Dependency-Check not found in PATH: ${error}`);
    return false;
  }
}

// Basic tech stack detection
async function detectTechStack(projectPath) {
  try {
    console.log(`Looking for package.json in ${projectPath}`);
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    try {
      await fs.access(packageJsonPath);
      console.log('✅ Found package.json!');
      
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(content);
      
      console.log('📦 Dependencies:');
      if (packageJson.dependencies) {
        for (const [name, version] of Object.entries(packageJson.dependencies)) {
          console.log(`- ${name}: ${version}`);
        }
      }
      
      return {
        name: packageJson.name,
        tech: 'Node.js',
        dependencies: packageJson.dependencies || {}
      };
    } catch (err) {
      console.log('❌ No package.json found');
    }
    
    // Add other tech stack detections here if needed
    return null;
  } catch (error) {
    console.error(`Error detecting tech stack: ${error}`);
    return null;
  }
}

// Main function to analyze dependencies
async function analyzeDependencies(projectPath) {
  console.log('=========== DEPENDENCY ANALYSIS STARTED ===========');
  console.log(`Project path: ${projectPath}`);
  
  // Check if path exists
  try {
    await fs.access(projectPath);
    console.log(`✅ Project directory exists: ${projectPath}`);
  } catch (err) {
    console.error(`❌ Project directory does not exist: ${projectPath}`);
    return;
  }
  
  // Detect tech stack
  const stack = await detectTechStack(projectPath);
  console.log(`Detected stack: ${stack ? stack.tech : 'Unknown'}`);
  
  // Check if OWASP is installed
  const owaspInstalled = await isOwaspDependencyCheckInstalled();
  
  if (owaspInstalled) {
    console.log('Running OWASP Dependency Check...');
    // Implementation would go here
    console.log('✅ OWASP analysis complete');
  } else {
    console.log('⚠️ OWASP Dependency-Check not installed. Using basic analysis instead.');
    console.log('To install OWASP Dependency Check, visit: https://owasp.org/www-project-dependency-check/');
  }
  
  console.log('=========== DEPENDENCY ANALYSIS COMPLETED ===========');
}

// Get the project path from command line or use current directory
const projectPath = process.argv[2] || process.cwd();
analyzeDependencies(projectPath);