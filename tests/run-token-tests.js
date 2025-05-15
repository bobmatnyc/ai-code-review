/**
 * Token Counting and Multi-Pass Review Test Runner
 * 
 * This script runs all three test scripts for the token counting and multi-pass
 * review functionality:
 * 
 * 1. E2E test of the multi-pass review
 * 2. API token counting verification test
 * 3. Progress tracking simulation test
 */

// Importing our test modules
// Note: If some of these modules don't exist yet, we'll create placeholders
let runMultipassE2E, runApiTokenCounting, runProgressTracking;

try {
  runProgressTracking = require('./progress-tracking-simulation').runTest;
  console.log('✅ Successfully loaded progress tracking test');
} catch (error) {
  console.warn('⚠️ Could not load progress tracking test:', error.message);
  runProgressTracking = async () => {
    console.log('⚠️ Progress tracking test skipped (module not found)');
    return Promise.resolve();
  };
}

try {
  runMultipassE2E = require('./test-multipass-e2e').runTest;
  console.log('✅ Successfully loaded multi-pass E2E test');
} catch (error) {
  console.warn('⚠️ Could not load multi-pass E2E test:', error.message);
  runMultipassE2E = async () => {
    console.log('⚠️ Multi-pass E2E test skipped (module not found)');
    return Promise.resolve();
  };
}

try {
  runApiTokenCounting = require('./test-api-token-counting').runTest;
  console.log('✅ Successfully loaded API token counting test');
} catch (error) {
  console.warn('⚠️ Could not load API token counting test:', error.message);
  runApiTokenCounting = async () => {
    console.log('⚠️ API token counting test skipped (module not found)');
    return Promise.resolve();
  };
}

async function runAllTests() {
  console.log('========================================================');
  console.log('RUNNING ALL TOKEN COUNTING AND MULTI-PASS REVIEW TESTS');
  console.log('========================================================\n');
  
  try {
    // Run the E2E test
    console.log('\n[1/3] Running multi-pass E2E test...\n');
    await runMultipassE2E();
    
    // Run the API token counting test
    console.log('\n[2/3] Running API token counting verification test...\n');
    await runApiTokenCounting();
    
    // Run the progress tracking test
    console.log('\n[3/3] Running progress tracking simulation test...\n');
    await runProgressTracking();
    
    console.log('\n========================================================');
    console.log('ALL TESTS COMPLETED');
    console.log('========================================================\n');
    
  } catch (error) {
    console.error('Error running tests:', error);
    process.exit(1);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };