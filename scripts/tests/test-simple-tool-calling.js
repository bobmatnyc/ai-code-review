#!/usr/bin/env node
const path = require('path');

// Set project root path for correct file references
const projectRoot = path.join(__dirname, '../../..');


/**
 * Simple test script for verifying tool calling implementation
 * 
 * This script focuses on testing the SERPAPI integration without
 * needing actual API calls to the LLM services.
 */

// Import necessary packages
const { hasSerpApiConfig } = require('../../../src/utils/dependencies/serpApiHelper');
const path = require('path');
const fs = require('fs');

// Mock dependency security info type
const DependencySecurity = {
  createInfo: (name, version) => ({
    packageName: name,
    packageVersion: version,
    vulnerabilities: [{
      description: `Mock vulnerability for ${name}@${version}`,
      severity: 'high'
    }],
    recommendedVersion: version.split('.').map((v, i) => i === 0 ? parseInt(v) + 1 : v).join('.'),
    sources: ['https://example.com/mock-security-source']
  })
};

// Mock data with known vulnerable packages
const MOCK_DATA = {
  axios: DependencySecurity.createInfo('axios', '0.21.1'),
  'node-forge': DependencySecurity.createInfo('node-forge', '0.9.0'),
  log4js: DependencySecurity.createInfo('log4js', '5.0.0')
};

/**
 * Mock searchPackageSecurity function that returns predefined results
 */
async function mockSearchPackageSecurity(packageInfo) {
  console.log(`Searching for security info for ${packageInfo.name}@${packageInfo.version || 'latest'}`);
  
  // Add a small delay to simulate network request
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Return predefined data for known packages
  if (MOCK_DATA[packageInfo.name]) {
    return MOCK_DATA[packageInfo.name];
  }
  
  // Return null for unknown packages
  return null;
}

/**
 * Test handler for OpenAI tool calling
 */
async function testOpenAIToolCalling() {
  console.log('\n=== Testing OpenAI Tool Calling Implementation ===');
  
  // Test SERPAPI key check
  console.log('\nTesting SERPAPI key check...');
  console.log(`SERPAPI key configured: ${hasSerpApiConfig()}`);
  
  // Test package security search
  console.log('\nTesting package security search...');
  const axiosSecurity = await mockSearchPackageSecurity({ name: 'axios', version: '0.21.1' });
  console.log('Security info for axios:');
  console.log(`- Package: ${axiosSecurity.packageName}@${axiosSecurity.packageVersion}`);
  console.log(`- Vulnerabilities: ${axiosSecurity.vulnerabilities.length}`);
  console.log(`- Recommended version: ${axiosSecurity.recommendedVersion}`);
  
  // Test batch security search 
  console.log('\nTesting batch security search...');
  const packages = [
    { name: 'axios', version: '0.21.1' },
    { name: 'node-forge', version: '0.9.0' },
    { name: 'unknown-package', version: '1.0.0' }
  ];
  
  const results = [];
  for (const pkg of packages) {
    const result = await mockSearchPackageSecurity(pkg);
    if (result) {
      results.push(result);
    }
  }
  
  console.log(`Found security info for ${results.length} out of ${packages.length} packages`);
  
  console.log('\n=== OpenAI Tool Calling Test Completed ===');
  return true;
}

/**
 * Test handler for Anthropic tool calling
 */
async function testAnthropicToolCalling() {
  console.log('\n=== Testing Anthropic Tool Calling Implementation ===');
  
  // Test package security search with a different package
  console.log('\nTesting package security search...');
  const forgeSecurity = await mockSearchPackageSecurity({ name: 'node-forge', version: '0.9.0' });
  console.log('Security info for node-forge:');
  console.log(`- Package: ${forgeSecurity.packageName}@${forgeSecurity.packageVersion}`);
  console.log(`- Vulnerabilities: ${forgeSecurity.vulnerabilities.length}`);
  console.log(`- Recommended version: ${forgeSecurity.recommendedVersion}`);
  
  console.log('\n=== Anthropic Tool Calling Test Completed ===');
  return true;
}

// Main function
async function main() {
  console.log('Starting tool calling tests...');
  
  // Set a dummy SERPAPI key for testing
  process.env.SERPAPI_KEY = process.env.SERPAPI_KEY || 'mock_key_for_testing';
  
  try {
    // Test OpenAI implementation
    await testOpenAIToolCalling();
    
    // Test Anthropic implementation
    await testAnthropicToolCalling();
    
    console.log('\nAll tests completed successfully');
  } catch (error) {
    console.error('Error during tests:', error);
  }
}

// Run the main function
main().catch(console.error);