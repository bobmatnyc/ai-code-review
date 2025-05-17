#!/usr/bin/env node

/**
 * Post-build script to fix OpenAI API test in the bundled output.
 * 
 * This script replaces the "TEST NOT IMPLEMENTED" message for OpenAI API
 * connections with the actual implementation that properly tests the connection.
 */

const fs = require('fs');
const path = require('path');

// Path to the bundled output
const bundlePath = path.resolve(__dirname, '../dist/index.js');

// Check if the bundle exists
if (!fs.existsSync(bundlePath)) {
  console.error(`❌ Bundle not found at ${bundlePath}`);
  process.exit(1);
}

// Read the bundle
console.log(`📖 Reading bundle from ${bundlePath}`);
let bundleContent = fs.readFileSync(bundlePath, 'utf8');

// Original code to replace
const originalCode = `if (apiType === "openai" || apiType === "all") {
    console.log(\`OpenAI API: \\u26A0\\uFE0F TEST NOT IMPLEMENTED\`);
    console.log(\`  OpenAI API test not implemented yet\`);
  }`;

// New code with actual implementation
const newCode = `if (apiType === "openai" || apiType === "all") {
    try {
      const openAIResult = await testOpenAIConnection();
      console.log(\`OpenAI API: \${openAIResult.success ? "\\u2705 CONNECTED" : "\\u274C FAILED"}\`);
      console.log(\`  \${openAIResult.message}\`);
    } catch (error) {
      console.log(\`OpenAI API: \\u274C FAILED\`);
      console.log(\`  Error testing OpenAI API: \${error instanceof Error ? error.message : String(error)}\`);
    }
  }`;

// Check if the original code exists in the bundle
if (!bundleContent.includes(originalCode)) {
  console.log('⚠️ Original code pattern not found. Looking for alternative pattern...');
  
  // Try a more relaxed pattern
  const relaxedPattern = /if\s*\(\s*apiType\s*===\s*"openai"\s*\|\|\s*apiType\s*===\s*"all"\s*\)\s*{\s*console\.log\(`OpenAI API: \\u26A0\\uFE0F TEST NOT IMPLEMENTED`\);\s*console\.log\(`\s*OpenAI API test not implemented yet`\);\s*}/;
  
  if (relaxedPattern.test(bundleContent)) {
    console.log('🔍 Found using relaxed pattern.');
    bundleContent = bundleContent.replace(relaxedPattern, newCode);
    // Write the updated bundle
    fs.writeFileSync(bundlePath, bundleContent);
    console.log(`✅ Successfully updated OpenAI API test in the bundled output`);
  } else {
    // The code to replace doesn't exist, which is fine if it's already been updated
    console.log('ℹ️ OpenAI API test code not found - it may have already been updated');
    // Don't fail the build for this
    process.exit(0);
  }
} else {
  // Replace the code
  bundleContent = bundleContent.replace(originalCode, newCode);
  // Write the updated bundle
  fs.writeFileSync(bundlePath, bundleContent);
  console.log(`✅ Successfully updated OpenAI API test in the bundled output`);
}