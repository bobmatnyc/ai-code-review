#!/usr/bin/env node

/**
 * Direct test for SERPAPI dependency security search
 * 
 * This script directly tests the SERPAPI functionality without going through the full review process.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';

// Determine current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Direct implementation of core functionality to test SERPAPI
// These are simplified versions of the functions in serpApiHelper.ts

// Test packages
const testPackages = [
  { name: 'axios', version: '0.21.1' },
  { name: 'log4js', version: '5.0.0' },
  { name: 'node-forge', version: '0.9.0' }
];

/**
 * Search for security information about a package directly using SERPAPI
 */
async function searchPackageSecurity(packageInfo, ecosystem) {
  try {
    const apiKey = process.env.SERPAPI_KEY;
    if (!apiKey) {
      console.error('SERPAPI_KEY is not set in environment variables');
      return null;
    }
    
    const searchTerm = `${packageInfo.name} ${packageInfo.version || ''} security vulnerability ${ecosystem}`;
    console.log(`Searching for: "${searchTerm}"`);
    
    const url = new URL('https://serpapi.com/search');
    url.searchParams.append('engine', 'google');
    url.searchParams.append('q', searchTerm);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('num', '10');
    
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`SERPAPI request failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`Got ${data.organic_results?.length || 0} results from SERPAPI`);
    
    // Extract basic vulnerability information
    return processResults(data, packageInfo);
  } catch (error) {
    console.error(`Error searching for package security: ${error.message}`);
    return null;
  }
}

/**
 * Process the search results to extract relevant information
 */
function processResults(data, packageInfo) {
  // Basic result structure
  const result = {
    packageName: packageInfo.name,
    packageVersion: packageInfo.version,
    vulnerabilities: [],
    sources: []
  };
  
  const organicResults = data.organic_results || [];
  
  // Process each result
  for (const item of organicResults) {
    const title = item.title || '';
    const snippet = item.snippet || '';
    const link = item.link || '';
    
    // Check if the result mentions security and the package name
    if (isSecurityRelated(title, snippet, packageInfo.name)) {
      // Add source
      if (link && !result.sources.includes(link)) {
        result.sources.push(link);
      }
      
      // Extract vulnerability info
      const vulnInfo = extractVulnerability(title, snippet);
      if (vulnInfo) {
        result.vulnerabilities.push(vulnInfo);
      }
    }
  }
  
  // Return null if no relevant information was found
  return result.sources.length > 0 ? result : null;
}

/**
 * Check if a result is related to security for the given package
 */
function isSecurityRelated(title, snippet, packageName) {
  const combined = `${title} ${snippet}`.toLowerCase();
  const pkgName = packageName.toLowerCase();
  
  // Check if it mentions the package
  if (!combined.includes(pkgName)) {
    return false;
  }
  
  // Check if it mentions security keywords
  const securityKeywords = [
    'vulnerability', 'security', 'cve', 'exploit', 'patch',
    'advisory', 'risk', 'threat', 'attack', 'compromise'
  ];
  
  return securityKeywords.some(keyword => combined.includes(keyword));
}

/**
 * Extract vulnerability information from search results
 */
function extractVulnerability(title, snippet) {
  const combined = `${title} ${snippet}`;
  
  // Simple severity detection
  let severity = 'unknown';
  if (/critical|severe/i.test(combined)) {
    severity = 'critical';
  } else if (/high|important/i.test(combined)) {
    severity = 'high';
  } else if (/medium|moderate/i.test(combined)) {
    severity = 'medium';
  } else if (/low|minor/i.test(combined)) {
    severity = 'low';
  }
  
  return {
    description: snippet,
    severity,
    url: title.match(/https?:\/\/[^\s]+/)?.[0]
  };
}

/**
 * Search for multiple packages
 */
async function batchSearchPackageSecurity(packages, ecosystem) {
  const results = [];
  
  for (const pkg of packages) {
    const result = await searchPackageSecurity(pkg, ecosystem);
    if (result) {
      results.push(result);
    }
    
    // Add a delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// Test Individual Search
async function testIndividualSearch() {
  console.log('\n=== Testing Individual Package Security Search ===\n');
  
  for (const pkg of testPackages) {
    console.log(`\nSearching for security info for ${pkg.name}@${pkg.version}...`);
    
    try {
      const result = await searchPackageSecurity(pkg, 'npm');
      
      if (result) {
        console.log(`✅ Found security information for ${pkg.name}:`);
        console.log(`- Vulnerabilities: ${result.vulnerabilities.length}`);
        console.log(`- Sources: ${result.sources.length}`);
        
        if (result.vulnerabilities.length > 0) {
          console.log('\nExample vulnerability:');
          console.log(`- Severity: ${result.vulnerabilities[0].severity}`);
          console.log(`- Description: ${result.vulnerabilities[0].description.substring(0, 100)}...`);
        }
      } else {
        console.log(`❌ No security information found for ${pkg.name}.`);
      }
    } catch (error) {
      console.error(`Error searching for ${pkg.name}: ${error.message}`);
    }
  }
}

// Test Batch Search
async function testBatchSearch() {
  console.log('\n=== Testing Batch Package Security Search ===\n');
  
  try {
    console.log(`Searching for security info for ${testPackages.length} packages in batch...`);
    
    const results = await batchSearchPackageSecurity(testPackages, 'npm');
    
    console.log(`✅ Found security information for ${results.length} out of ${testPackages.length} packages.`);
    
    for (const result of results) {
      console.log(`\n- ${result.packageName}: ${result.vulnerabilities.length} vulnerabilities, ${result.sources.length} sources`);
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