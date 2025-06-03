#!/usr/bin/env node

/**
 * @fileoverview Script to synchronize version between package.json and src/index.ts
 * 
 * This script reads the version from package.json and updates the VERSION constant
 * in src/index.ts to match. This ensures a single source of truth for the version.
 */

const fs = require('fs');
const path = require('path');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Read src/index.ts
const indexPath = path.join(__dirname, '..', 'src', 'index.ts');
let indexContent = fs.readFileSync(indexPath, 'utf8');

// Replace VERSION constant
const versionRegex = /const VERSION = ['"][\d.]+['"]/;
const newVersionLine = `const VERSION = '${version}'`;

if (versionRegex.test(indexContent)) {
  indexContent = indexContent.replace(versionRegex, newVersionLine);
  
  // Write back to file
  fs.writeFileSync(indexPath, indexContent);
  
  console.log(`✅ Updated VERSION constant to '${version}' in src/index.ts`);
} else {
  console.error('❌ Could not find VERSION constant in src/index.ts');
  console.error('   Expected format: const VERSION = \'x.x.x\'');
  process.exit(1);
}