#!/usr/bin/env node

/**
 * @fileoverview Generate version.ts file from package.json
 * 
 * This script generates the src/version.ts file from package.json version.
 * It's used during CI/CD to ensure the version file exists before TypeScript compilation.
 */

const fs = require('fs');
const path = require('path');

function generateVersionFile() {
  console.log('📦 Generating version file from package.json...');
  
  // Read package.json
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;
  
  // Generate version.ts content
  const versionFileContent = `// This file is auto-generated during build from package.json
// Do not edit manually - changes will be overwritten
export const VERSION = '${version}';
`;
  
  // Write version.ts file
  const versionFilePath = path.resolve(__dirname, '../src/version.ts');
  fs.writeFileSync(versionFilePath, versionFileContent);
  
  console.log(`✅ Generated version.ts with version '${version}'`);
}

// Run the function
generateVersionFile();
