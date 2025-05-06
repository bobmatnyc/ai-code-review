/**
 * @fileoverview Test module for enhanced dependency analysis
 * 
 * This module provides a standalone test for the enhanced dependency analyzer
 * to verify that it works correctly with all features.
 */

import path from 'path';
import { createEnhancedDependencyAnalysis } from './enhancedDependencyAnalyzer';
import logger from '../logger';

// Set log level to debug for more verbose output
logger.level = 'debug';

async function runTest() {
  console.log('=========== STARTING ENHANCED DEPENDENCY ANALYSIS TEST ===========');
  
  // Use the project root as the test path
  const projectPath = path.resolve(__dirname, '..', '..', '..');
  console.log(`Project path: ${projectPath}`);
  
  try {
    // Run the enhanced dependency analysis
    console.log('Running enhanced dependency analysis...');
    const analysis = await createEnhancedDependencyAnalysis(projectPath);
    
    // Output the results
    console.log('\n--- Enhanced Dependency Analysis Results ---');
    console.log(`Project: ${analysis.projectName}`);
    console.log(`Total dependencies: ${analysis.dependencySummary.total}`);
    console.log(`Direct dependencies: ${analysis.dependencySummary.direct}`);
    console.log(`Dev dependencies: ${analysis.dependencySummary.dev}`);
    console.log(`Transitive dependencies: ${analysis.dependencySummary.transitive}`);
    console.log(`Unused dependencies: ${analysis.unusedDependencies.length}`);
    console.log(`Security issues: ${analysis.securityIssues.total}`);
    
    if (analysis.dependencyGraph) {
      console.log(`Dependency graph generated at: ${analysis.dependencyGraph}`);
    }
    
    // Output recommendations
    if (analysis.recommendations.length > 0) {
      console.log('\n--- Recommendations ---');
      analysis.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    // Output a sample of the overall report
    const reportPreview = analysis.overallReport.substring(0, 500) + '...';
    console.log('\n--- Report Preview ---');
    console.log(reportPreview);
    
    console.log('\n✅ Enhanced dependency analysis test completed successfully');
    return 0;
  } catch (error) {
    console.error('❌ Enhanced dependency analysis test failed:');
    console.error(error);
    return 1;
  }
}

// Run the test and exit with appropriate code
runTest()
  .then(exitCode => {
    process.exit(exitCode);
  })
  .catch(error => {
    console.error('Unhandled error in test:', error);
    process.exit(1);
  });