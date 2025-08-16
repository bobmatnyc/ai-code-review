#!/usr/bin/env node

/**
 * Script to manage build numbers - check, set, or reset.
 * 
 * Usage:
 *   node scripts/manage-build-number.js           # Show current build info
 *   node scripts/manage-build-number.js --reset   # Reset build number to 0
 *   node scripts/manage-build-number.js --set 5   # Set build number to 5
 * 
 * WHY: Provides administrative control over build numbers for
 * troubleshooting and deployment verification.
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const shouldReset = args.includes('--reset');
const setIndex = args.indexOf('--set');
const shouldSet = setIndex > -1;
const newBuildNumber = shouldSet && args[setIndex + 1] ? parseInt(args[setIndex + 1]) : null;

// Read package.json to get current version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Path to build-number.json
const buildNumberPath = path.join(__dirname, '..', 'build-number.json');

// Read existing build info
let buildInfo = null;
try {
  if (fs.existsSync(buildNumberPath)) {
    buildInfo = JSON.parse(fs.readFileSync(buildNumberPath, 'utf8'));
  }
} catch (error) {
  console.warn('Warning: Could not read build-number.json:', error);
}

// Handle commands
if (shouldReset) {
  // Reset build number to 0
  const newInfo = {
    buildNumber: 0,
    version: currentVersion,
    lastBuild: new Date().toISOString()
  };
  
  fs.writeFileSync(buildNumberPath, JSON.stringify(newInfo, null, 2));
  console.log(`✅ Build number reset to 0 for version ${currentVersion}`);
  
} else if (shouldSet && newBuildNumber !== null && !isNaN(newBuildNumber)) {
  // Set build number to specific value
  const newInfo = {
    buildNumber: newBuildNumber,
    version: currentVersion,
    lastBuild: new Date().toISOString()
  };
  
  fs.writeFileSync(buildNumberPath, JSON.stringify(newInfo, null, 2));
  console.log(`✅ Build number set to ${newBuildNumber} for version ${currentVersion}`);
  
} else {
  // Display current build info
  console.log('\n📦 Build Number Information:');
  console.log('----------------------------');
  
  if (buildInfo) {
    console.log(`Current Version:  ${buildInfo.version}`);
    console.log(`Build Number:     ${buildInfo.buildNumber}`);
    console.log(`Last Build:       ${buildInfo.lastBuild}`);
    console.log(`Display Format:   ${buildInfo.version} (build ${buildInfo.buildNumber})`);
    
    // Check if version matches package.json
    if (buildInfo.version !== currentVersion) {
      console.log('\n⚠️  Warning: Version mismatch!');
      console.log(`   Package.json version: ${currentVersion}`);
      console.log(`   Build info version:   ${buildInfo.version}`);
      console.log('   The build number will reset on next build.');
    }
  } else {
    console.log('No build information found.');
    console.log(`Package version: ${currentVersion}`);
    console.log('Build number will be 0 on next build.');
  }
  
  console.log('\nUsage:');
  console.log('  node scripts/manage-build-number.js           # Show current info');
  console.log('  node scripts/manage-build-number.js --reset   # Reset to 0');
  console.log('  node scripts/manage-build-number.js --set 5   # Set to specific number');
}