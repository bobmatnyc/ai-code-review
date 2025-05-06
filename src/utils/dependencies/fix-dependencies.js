#!/usr/bin/env node

// This script fixes the OWASP dependency check by modifying how it handles stack analysis

const path = require('path');
const fs = require('fs');

console.log('Fixing OWASP dependency check...');

// Path to the package security analyzer
const packageSecurityAnalyzerPath = path.join(__dirname, 'packageSecurityAnalyzer.ts');

// Read the file
let content = fs.readFileSync(packageSecurityAnalyzerPath, 'utf8');

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
      // Return just the tech stack when OWASP module fails to load`
);

// Write the modified content back to the file
fs.writeFileSync(packageSecurityAnalyzerPath, modifiedContent);

console.log('Fixed packageSecurityAnalyzer.ts');

// Also fix the owaspDependencyCheck.ts to handle null stackAnalysis
const owaspDependencyCheckPath = path.join(__dirname, 'owaspDependencyCheck.ts');

// Add import for os module
let owaspContent = fs.readFileSync(owaspDependencyCheckPath, 'utf8');
owaspContent = `/**
 * @fileoverview OWASP Dependency-Check integration for package security analysis
 * 
 * This module integrates with OWASP Dependency-Check to provide comprehensive
 * dependency scanning and vulnerability detection for architectural and security reviews.
 * OWASP Dependency-Check is an open-source solution that detects publicly disclosed 
 * vulnerabilities in project dependencies.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { spawnSync } from 'child_process';
import os from 'os'; // Added for platform detection
import logger from '../logger';
import { detectTechStacks } from './dependencyRegistry';
import { analyzePackagesWithStackAwareness, formatStackSummary } from './stackAwarePackageAnalyzer';

` + owaspContent.substring(owaspContent.indexOf('/**\n * Interface for OWASP'));

// Fix the run function to use proper platform detection
owaspContent = owaspContent.replace(
  `async function isOwaspDependencyCheckInstalled(): Promise<boolean> {
  try {
    // Try to execute dependency-check script to see if it's installed
    const result = spawnSync('dependency-check', ['--version'], { 
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8'
    });
    
    return result.status === 0;
  } catch (error) {
    logger.debug('OWASP Dependency-Check not found in PATH');
    return false;
  }
}`,
  `async function isOwaspDependencyCheckInstalled(): Promise<boolean> {
  try {
    // Get the appropriate command based on the platform
    const command = os.platform() === 'win32' ? 'dependency-check.bat' : 'dependency-check';
    logger.debug(\`Checking for OWASP Dependency-Check using command: \${command}\`);
    
    // Try to execute dependency-check script to see if it's installed
    const result = spawnSync(command, ['--version'], { 
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8',
      shell: true // Use shell on all platforms for better compatibility
    });
    
    logger.debug(\`OWASP Dependency-Check check result: status=\${result.status}, stderr=\${result.stderr}\`);
    return result.status === 0;
  } catch (error) {
    logger.debug(\`OWASP Dependency-Check not found in PATH: \${error}\`);
    return false;
  }
}`
);

// Fix the run function for OWASP to handle platform differences
owaspContent = owaspContent.replace(
  `    // Run the command
    const result = spawnSync('dependency-check', args, {
      cwd: projectPath,
      timeout: 300000, // 5 minutes timeout
      stdio: 'pipe',
      encoding: 'utf-8'
    });`,
  `    // Get the appropriate command based on the platform
    const command = os.platform() === 'win32' ? 'dependency-check.bat' : 'dependency-check';
    logger.debug(\`Running OWASP Dependency-Check using command: \${command} with args: \${args.join(' ')}\`);
    
    // Run the command
    const result = spawnSync(command, args, {
      cwd: projectPath,
      timeout: 300000, // 5 minutes timeout
      stdio: 'pipe',
      encoding: 'utf-8',
      shell: true // Use shell on all platforms for better compatibility
    });`
);

// Write the modified content back to the file
fs.writeFileSync(owaspDependencyCheckPath, owaspContent);

console.log('Fixed owaspDependencyCheck.ts');
console.log('All fixes completed!');