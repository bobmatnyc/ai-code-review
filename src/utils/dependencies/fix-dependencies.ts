#!/usr/bin/env node

/**
 * @fileoverview Script that fixes the dependency security scanner by modifying how it handles stack analysis
 */

import fs from 'fs';
import path from 'path';

console.log('Fixing dependency scanner...');

// Path to the package security analyzer
const packageSecurityAnalyzerPath = path.join(__dirname, 'packageSecurityAnalyzer.ts');

// Read the file
const content = fs.readFileSync(packageSecurityAnalyzerPath, 'utf8');

// Modify the createDependencySecuritySection function to make OWASP dependency check the primary method
const modifiedContent = content.replace(
  `export async function createDependencySecuritySection(projectPath: string): Promise<string> {
  logger.info('Starting dependency security analysis...');
  try {
    // Get tech stack information first, as we'll use it regardless of security analysis method
    logger.debug('Analyzing package stack awareness for project: ' + projectPath);
    const stackAnalysis = await analyzePackagesWithStackAwareness(projectPath);
    logger.debug('Stack analysis complete, formatting summary');
    const techStackReport = formatStackSummary(stackAnalysis);
    logger.debug('Tech stack report generated with length: ' + techStackReport.length);

    // First try to use OWASP Dependency-Check if available
    try {
      const { createOwaspSecuritySection } = require('./owaspDependencyCheck');
      
      try {
        logger.info('Using OWASP Dependency-Check for security analysis...');
        const owaspReport = await createOwaspSecuritySection(projectPath);
        return owaspReport;
      } catch (owaspError) {
        logger.warn(\`OWASP Dependency-Check failed, falling back to built-in analyzer: \${owaspError}\`);
        // Fall back to built-in analyzer if OWASP fails
      }
    } catch (importError) {
      logger.debug(\`OWASP module not available, using built-in analyzer: \${importError}\`);
      // OWASP module not available, use built-in analyzer
    }`,
  `export async function createDependencySecuritySection(projectPath: string): Promise<string> {
  logger.info('Starting dependency security analysis...');
  try {
    // Get tech stack information first, as we'll use it regardless of security analysis method
    logger.debug('Analyzing package stack awareness for project: ' + projectPath);
    const stackAnalysis = await analyzePackagesWithStackAwareness(projectPath);
    logger.debug('Stack analysis complete, formatting summary');
    const techStackReport = stackAnalysis && stackAnalysis.packageResults ? 
      formatStackSummary(stackAnalysis) : 
      "## Project Stack Analysis\\n\\nNo project dependencies detected.";
    logger.debug('Tech stack report generated');

    // First try to use OWASP Dependency-Check if available
    try {
      const { createOwaspSecuritySection } = require('./owaspDependencyCheck');
      
      try {
        logger.info('Using OWASP Dependency-Check for security analysis...');
        const owaspReport = await createOwaspSecuritySection(projectPath);
        logger.debug('OWASP analysis completed successfully');
        return owaspReport;
      } catch (owaspError) {
        logger.warn(\`OWASP Dependency-Check failed: \${owaspError}\`);
        // Return just the tech stack info when OWASP fails
        return \`\${techStackReport}\\n\\n## Dependency Security Analysis\\n\\n⚠️ Dependency security analysis is not available.\\n\\nTo enable security scanning, install OWASP Dependency-Check or set SERPAPI_KEY in your environment.\`;
      }
    } catch (importError) {
      logger.debug(\`OWASP module error: \${importError}\`);
      // Return just the tech stack when OWASP module fails to load`,
);

// Write the modified content back to the file
fs.writeFileSync(packageSecurityAnalyzerPath, modifiedContent);

console.log('Fixed packageSecurityAnalyzer.ts');

// Also fix the dependencySecurityScanner.ts to handle null stackAnalysis
const securityScannerPath = path.join(__dirname, 'dependencySecurityScanner.ts');

// Add import for os module
let scannerContent = fs.readFileSync(securityScannerPath, 'utf8');
scannerContent =
  `/**
 * @fileoverview Advanced dependency scanning for package security analysis
 * 
 * This module implements comprehensive dependency scanning and vulnerability detection 
 * for architectural and security reviews. It uses multiple sources to detect publicly 
 * disclosed vulnerabilities in project dependencies.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { spawnSync } from 'child_process';
import os from 'os'; // Added for platform detection
import logger from '../logger';
import { detectTechStacks } from './dependencyRegistry';
import { analyzePackagesWithStackAwareness, formatStackSummary } from './stackAwarePackageAnalyzer';

` + scannerContent.substring(scannerContent.indexOf('/**\n * Interface for'));

// Fix the run function to use proper platform detection
scannerContent = scannerContent.replace(
  `async function isDependencyScannerInstalled(): Promise<boolean> {
  try {
    // Try to execute dependency-check script to see if it's installed
    const result = spawnSync('dependency-check', ['--version'], { 
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    
    return result.status === 0;
  } catch (error) {
    logger.debug('Dependency scanner not found in PATH');
    return false;
  }
}`,
  `async function isDependencyScannerInstalled(): Promise<boolean> {
  try {
    // Get the appropriate command based on the platform
    const command = os.platform() === 'win32' ? 'dependency-check.bat' : 'dependency-check';
    logger.debug(\`Checking for dependency scanner using command: \${command}\`);
    
    // Try to execute dependency-check script to see if it's installed
    const result = spawnSync(command, ['--version'], { 
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8',
      shell: true // Use shell on all platforms for better compatibility
    });
    
    logger.debug(\`Dependency scanner check result: status=\${result.status}, stderr=\${result.stderr}\`);
    return result.status === 0;
  } catch (error) {
    logger.debug(\`Dependency scanner not found in PATH: \${error}\`);
    return false;
  }
}`,
);

// Fix the run function to handle platform differences
scannerContent = scannerContent.replace(
  `    // Run the command
    const result = spawnSync('dependency-check', args, {
      cwd: projectPath,
      timeout: 300000, // 5 minutes timeout
      stdio: 'pipe',
      encoding: 'utf-8'
    });`,
  `    // Get the appropriate command based on the platform
    const command = os.platform() === 'win32' ? 'dependency-check.bat' : 'dependency-check';
    logger.debug(\`Running dependency scanner using command: \${command} with args: \${args.join(' ')}\`);
    
    // Run the command
    const result = spawnSync(command, args, {
      cwd: projectPath,
      timeout: 300000, // 5 minutes timeout
      stdio: 'pipe',
      encoding: 'utf-8',
      shell: true // Use shell on all platforms for better compatibility
    });`,
);

// Write the modified content back to the file
fs.writeFileSync(securityScannerPath, scannerContent);

console.log('Fixed dependencySecurityScanner.ts');
console.log('All fixes completed!');
