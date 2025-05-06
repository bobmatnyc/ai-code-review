#!/usr/bin/env node

/**
 * Direct test for SERPAPI dependency security search
 * 
 * This script directly tests the SERPAPI functionality without going through the full review process.
 */

// Import SERPAPI helper directly
const { searchPackageSecurity, batchSearchPackageSecurity, formatSecurityInfo } = require($3);
const path = require('path');
const projectRoot = path.join(__dirname, '../../..');

// Set up test packages
const testPackages = [
  { name: 'axios', version: '0.21.1' },
  { name: 'log4js', version: '5.0.0' },
  { name: 'node-forge', version: '0.9.0' }
];

// Test individual package search
async function testIndividualSearch() {
  console.log('\n=== Testing Individual Package Security Search ===\n');
  
  for (const pkg of testPackages) {
    console.log(`Searching for security info for ${pkg.name}@${pkg.version}...`);
    
    try {
      const result = await searchPackageSecurity(pkg, 'npm');
      
      if (result) {
        console.log(`✅ Found security information for ${pkg.name}:`);
        console.log(`- Vulnerabilities: ${result.vulnerabilities.length}`);
        if (result.recommendedVersion) {
          console.log(`- Recommended version: ${result.recommendedVersion}`);
        }
        console.log(`- Sources: ${result.sources.length}`);
      } else {
        console.log(`❌ No security information found for ${pkg.name}.`);
      }
    } catch (error) {
      console.error(`Error searching for ${pkg.name}: ${error.message}`);
    }
    
    console.log(''); // Add a blank line between results
  }
}

// Test batch package search
async function testBatchSearch() {
  console.log('\n=== Testing Batch Package Security Search ===\n');
  
  try {
    console.log(`Searching for security info for ${testPackages.length} packages in batch...`);
    
    const results = await batchSearchPackageSecurity(testPackages, 'npm');
    
    console.log(`✅ Found security information for ${results.length} packages.`);
    
    if (results.length > 0) {
      // Format the results as they would appear in a review
      const formattedOutput = formatSecurityInfo(results);
      console.log('\nFormatted Security Information Preview:');
      console.log('----------------------------------------');
      console.log(formattedOutput.slice(0, 500) + '...\n');
    }
  } catch (error) {
    console.error(`Error during batch search: ${error.message}`);
  }
}

// Run the tests
async function main() {
  console.log('Starting SERPAPI dependency security test...');
  console.log(`SERPAPI key available: ${!!process.env.SERPAPI_KEY}`);
  
  if (!process.env.SERPAPI_KEY) {
    console.error('❌ Error: SERPAPI_KEY is not set in environment variables.');
    console.error('Please set the SERPAPI_KEY environment variable to run this test.');
    process.exit(1);
  }
  
  await testIndividualSearch();
  await testBatchSearch();
  
  console.log('\n=== All Tests Completed ===');
}

// Execute the main function
main().catch(error => {
  console.error('Unexpected error during test:', error);
  process.exit(1);
});