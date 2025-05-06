#!/usr/bin/env node

// Script to fix the dependency analysis integration in architectural review handler

const fs = require('fs');
const path = require('path');

console.log('Fixing dependency analysis integration in architectural review handler...');

// Read the architectural review handler file
const handlerPath = path.join(__dirname, 'src/handlers/architecturalReviewHandler.ts');
const handlerContent = fs.readFileSync(handlerPath, 'utf8');

// Fix the issue with dynamic require by replacing it with the imported module
const fixedContent = handlerContent.replace(
  `try {
            // Try to import the package security analyzer
            const { createDependencySecuritySection } = require('../utils/dependencies/packageSecurityAnalyzer');
            logger.debug('Package security analyzer module loaded successfully');
            
            // Run the security analysis
            logger.info('Running dependency security analysis for project path: ' + projectPath);
            const securitySection = await createDependencySecuritySection(projectPath);
            logger.debug('Security section generated with length: ' + securitySection.length);`,
  `try {
            // The package security analyzer is already imported at the top of the file
            logger.debug('Using imported package security analyzer');
            
            // Run the security analysis
            logger.info('Running dependency security analysis for project path: ' + projectPath);
            const securitySection = await createDependencySecuritySection(projectPath);
            logger.debug('Security section generated with length: ' + (securitySection ? securitySection.length : 0));`
);

// Write the fixed content back to the file
fs.writeFileSync(handlerPath, fixedContent);
console.log('Fixed architecturalReviewHandler.ts');

// Now let's fix the serpApiHelper.ts to add more logging
const serpApiHelperPath = path.join(__dirname, 'src/utils/dependencies/serpApiHelper.ts');
const serpApiHelperContent = fs.readFileSync(serpApiHelperPath, 'utf8');

const fixedSerpApiHelper = serpApiHelperContent.replace(
  `export function hasSerpApiConfig(): boolean {
  const hasKey = !!process.env.SERPAPI_KEY;
  console.log(\`[DEBUG] SERPAPI_KEY available: \${hasKey ? 'YES' : 'NO'}\`);
  if (hasKey) {
    console.log(\`[DEBUG] SERPAPI_KEY first 5 chars: \${process.env.SERPAPI_KEY?.substring(0, 5)}...\`);
  }
  return hasKey;
}`,
  `export function hasSerpApiConfig(): boolean {
  const hasKey = !!process.env.SERPAPI_KEY;
  logger.debug(\`SERPAPI_KEY available: \${hasKey ? 'YES' : 'NO'}\`);
  if (hasKey) {
    logger.debug(\`SERPAPI_KEY first 5 chars: \${process.env.SERPAPI_KEY?.substring(0, 5)}...\`);
  } else {
    logger.warn('SERPAPI_KEY not found in environment variables. Set this key to enable package security analysis.');
  }
  return hasKey;
}`
);

// Write the fixed content back to the file
fs.writeFileSync(serpApiHelperPath, fixedSerpApiHelper);
console.log('Fixed serpApiHelper.ts');

// Now let's fix the packageSecurityAnalyzer.ts to add more detailed logging
const analyzerPath = path.join(__dirname, 'src/utils/dependencies/packageSecurityAnalyzer.ts');
const analyzerContent = fs.readFileSync(analyzerPath, 'utf8');

const fixedAnalyzer = analyzerContent.replace(
  `export async function createDependencySecuritySection(projectPath: string): Promise<string> {
  try {
    // Get tech stack information first, as we'll use it regardless of security analysis method
    const stackAnalysis = await analyzePackagesWithStackAwareness(projectPath);
    const techStackReport = formatStackSummary(stackAnalysis);`,
  `export async function createDependencySecuritySection(projectPath: string): Promise<string> {
  logger.info('Starting dependency security analysis...');
  try {
    // Get tech stack information first, as we'll use it regardless of security analysis method
    logger.debug('Analyzing package stack awareness for project: ' + projectPath);
    const stackAnalysis = await analyzePackagesWithStackAwareness(projectPath);
    logger.debug('Stack analysis complete, formatting summary');
    const techStackReport = formatStackSummary(stackAnalysis);
    logger.debug('Tech stack report generated with length: ' + techStackReport.length);`
);

// Write the fixed content back to the file
fs.writeFileSync(analyzerPath, fixedAnalyzer);
console.log('Fixed packageSecurityAnalyzer.ts');

console.log('All fixes applied!');