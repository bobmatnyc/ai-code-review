#!/usr/bin/env node

/**
 * Script to copy JSON files to the dist directory.
 * This ensures that files like modelMaps.json are available at runtime.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all JSON files in the src directory
const jsonFiles = glob.sync('src/**/*.json');

console.log('Copying JSON files to dist directory:');

// Copy each JSON file to the corresponding location in dist
jsonFiles.forEach(file => {
  const destPath = file.replace(/^src\//, 'dist/');
  const destDir = path.dirname(destPath);
  
  // Ensure the destination directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  // Copy the file
  fs.copyFileSync(file, destPath);
  console.log(`  ${file} -> ${destPath}`);
});

console.log('✅ JSON files copied successfully');