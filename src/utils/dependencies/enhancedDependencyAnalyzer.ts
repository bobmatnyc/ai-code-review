/**
 * @fileoverview Enhanced dependency analyzer for AI Code Review
 * 
 * This module provides comprehensive dependency analysis that goes beyond
 * security vulnerabilities to include:
 * 1. Dependency visualization
 * 2. Unused dependency detection
 * 3. Contextual analysis based on project type
 */

import path from 'path';
import fs from 'fs/promises';
import { execSync, spawnSync } from 'child_process';
import logger from '../logger';

// Import types from other modules
import { detectTechStacks } from './dependencyRegistry';
import { formatStackSummary } from './formatStackSummary';

/**
 * Comprehensive dependency analysis result
 */
export interface EnhancedDependencyAnalysis {
  projectName: string;
  techStackReport: string;
  unusedDependencies: string[];
  securityIssues: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    info: number;
    total: number;
  };
  dependencyGraph: string; // SVG or description
  dependencySummary: {
    total: number;
    direct: number;
    dev: number;
    transitive: number;
  };
  recommendations: string[];
  securityReport: string;
  overallReport: string;
}

/**
 * Run dependency visualization using dependency-cruiser
 * @param projectPath Path to the project
 * @returns Path to the generated visualization
 */
async function generateDependencyVisualization(projectPath: string): Promise<string | null> {
  logger.info('Generating dependency visualization...');
  
  try {
    // Create output directory
    const outputDir = path.join(projectPath, 'dependency-analysis');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate SVG visualization
    const outputPath = path.join(outputDir, 'dependency-graph.svg');
    const jsonOutputPath = path.join(outputDir, 'dependencies.json');
    
    // Try to find dependency-cruiser installation
    const localDepCruiserPath = path.join(projectPath, 'node_modules', '.bin', 'depcruise');
    let depCruiserCommand = '';
    
    try {
      await fs.access(localDepCruiserPath);
      depCruiserCommand = localDepCruiserPath;
      logger.info('Using locally installed dependency-cruiser');
    } catch (error) {
      logger.warn('dependency-cruiser not found in node_modules, checking global installation');
      
      try {
        // Check for global installation
        execSync('dependency-cruiser --version', { stdio: 'ignore' });
        depCruiserCommand = 'dependency-cruiser';
        logger.info('Using globally installed dependency-cruiser');
      } catch (globalError) {
        // Try depcruise command instead (sometimes installed as depcruise instead of dependency-cruiser)
        try {
          execSync('depcruise --version', { stdio: 'ignore' });
          depCruiserCommand = 'depcruise';
          logger.info('Using globally installed depcruise');
        } catch (depCruiseError) {
          logger.error('dependency-cruiser not found globally either');
          logger.info('Installing dependency-cruiser temporarily for analysis...');
          
          try {
            // Try to install dependency-cruiser temporarily
            execSync('npm install --no-save dependency-cruiser graphviz', { 
              cwd: projectPath,
              stdio: 'inherit'
            });
            
            // Use the newly installed dependency-cruiser
            depCruiserCommand = localDepCruiserPath;
            logger.info('Temporary dependency-cruiser installation succeeded');
          } catch (installError) {
            logger.error(`Failed to install dependency-cruiser: ${installError}`);
            return null;
          }
        }
      }
    }
    
    // Check for graphviz (dot) command availability
    let hasDot = false;
    try {
      execSync('dot -V', { stdio: 'ignore' });
      hasDot = true;
      logger.info('Graphviz dot command is available');
    } catch (dotError) {
      logger.warn('Graphviz dot command not available, will use JSON output only');
    }
    
    // First, generate JSON output in any case
    try {
      const srcDir = path.join(projectPath, 'src');
      
      // Check if src directory exists
      const srcExists = await fs.access(srcDir).then(() => true).catch(() => false);
      const targetDir = srcExists ? 'src' : '.';
      
      logger.info(`Analyzing dependencies in ${targetDir} directory`);
      
      execSync(
        `"${depCruiserCommand}" --include-only "^${targetDir}" --output-type json > "${jsonOutputPath}"`,
        {
          cwd: projectPath,
          stdio: ['ignore', 'pipe', 'pipe']
        }
      );
      
      logger.info(`Dependency data generated at ${jsonOutputPath}`);
      
      // If dot is available, also generate SVG visualization
      if (hasDot) {
        logger.info('Generating SVG visualization with Graphviz');
        
        execSync(
          `"${depCruiserCommand}" --include-only "^${targetDir}" --output-type dot ${targetDir} | dot -T svg > "${outputPath}"`,
          {
            cwd: projectPath,
            stdio: ['ignore', 'pipe', 'pipe']
          }
        );
        
        logger.info(`Dependency visualization generated at ${outputPath}`);
        return outputPath;
      }
      
      return jsonOutputPath;
    } catch (execError) {
      logger.error(`Error executing dependency-cruiser: ${execError}`);
      
      // Create a simple text report as fallback
      const fallbackPath = path.join(outputDir, 'dependencies-fallback.txt');
      
      // List all .js and .ts files in src
      try {
        const { globSync } = require('glob');
        const files = globSync('src/**/*.{js,ts,jsx,tsx}', { cwd: projectPath });
        await fs.writeFile(fallbackPath, `Found ${files.length} JavaScript/TypeScript files in the project.\n\nFiles:\n${files.join('\n')}`);
        
        logger.info(`Created fallback dependency listing at ${fallbackPath}`);
        return fallbackPath;
      } catch (fallbackError) {
        logger.error(`Error creating fallback report: ${fallbackError}`);
        return null;
      }
    }
  } catch (error) {
    logger.error(`Error generating dependency visualization: ${error}`);
    return null;
  }
}

/**
 * Find unused dependencies using depcheck
 * @param projectPath Path to the project
 * @returns Array of unused dependencies
 */
async function findUnusedDependencies(projectPath: string): Promise<string[]> {
  logger.info('Detecting unused dependencies...');
  
  try {
    // Check if depcheck is installed locally
    const depcheckPath = path.join(projectPath, 'node_modules', '.bin', 'depcheck');
    let useLocalDepcheck = false;
    
    try {
      await fs.access(depcheckPath);
      useLocalDepcheck = true;
      logger.info('Using locally installed depcheck');
    } catch (error) {
      logger.warn('depcheck not found in node_modules, attempting to use global installation');
      // Try to use globally installed depcheck
      try {
        execSync('depcheck --version', { stdio: 'ignore' });
        logger.info('Using globally installed depcheck');
      } catch (globalError) {
        logger.error('depcheck not installed globally either');
        logger.info('Installing depcheck temporarily for analysis...');
        
        try {
          // Try to install depcheck temporarily using npm
          execSync('npm install --no-save depcheck', { 
            cwd: projectPath,
            stdio: 'inherit'
          });
          // Use the newly installed depcheck
          useLocalDepcheck = true;
          logger.info('Temporary depcheck installation succeeded');
        } catch (installError) {
          logger.error(`Failed to install depcheck: ${installError}`);
          return ['Error: depcheck not installed and could not be installed temporarily'];
        }
      }
    }
    
    // Run depcheck with JSON output
    let result;
    if (useLocalDepcheck) {
      logger.info(`Running depcheck from: ${depcheckPath}`);
      result = spawnSync(
        'node',
        [depcheckPath, '--json'],
        {
          cwd: projectPath,
          encoding: 'utf-8',
          shell: true
        }
      );
    } else {
      logger.info('Running global depcheck');
      result = spawnSync(
        'depcheck',
        ['--json'],
        {
          cwd: projectPath,
          encoding: 'utf-8',
          shell: true
        }
      );
    }
    
    if (result.status !== 0) {
      logger.error(`depcheck failed with status ${result.status}: ${result.stderr}`);
      // Still try to parse output if available
      if (!result.stdout) {
        logger.error('No output received from depcheck');
        return ['Error running depcheck'];
      }
    }
    
    // Parse the JSON output
    try {
      // Debug the output to see what we're getting
      logger.debug(`Raw depcheck output type: ${typeof result.stdout}`);
      logger.debug(`Raw depcheck output sample: ${result.stdout.substring(0, 100)}...`);
      
      let output;
      
      // Handle special case with depcheck's output which might be array notation
      if (result.stdout.trim().startsWith('[')) {
        // This might be just an array of unused dependencies in string format
        try {
          // Try parsing as an array of strings
          const parsedArray = JSON.parse(result.stdout);
          if (Array.isArray(parsedArray) && parsedArray.every(item => typeof item === 'string')) {
            logger.info(`Found ${parsedArray.length} unused dependencies directly from array output`);
            return parsedArray;
          }
        } catch (arrayParseError) {
          logger.warn(`Could not parse as direct array: ${arrayParseError}`);
        }
      }
      
      // Regular case - try to parse full JSON object output
      output = JSON.parse(result.stdout);
      
      if (!output || typeof output !== 'object') {
        logger.warn('Depcheck returned invalid JSON structure');
        return ['Error: Invalid depcheck output format'];
      }
      
      // Get the list of unused dependencies
      let unusedDeps: string[] = [];
      
      // Handle possible output formats
      if (output.dependencies && typeof output.dependencies === 'object') {
        // Normal format with dependencies and devDependencies objects
        unusedDeps = [
          ...Object.keys(output.dependencies || {}),
          ...Object.keys(output.devDependencies || {})
        ];
      } else if (Array.isArray(output)) {
        // Simple array of dependency names
        unusedDeps = output;
      } else {
        // Try to extract from any format we can find
        for (const [key, value] of Object.entries(output)) {
          if (typeof value === 'object' && value !== null) {
            unusedDeps.push(...Object.keys(value));
          } else if (Array.isArray(value)) {
            unusedDeps.push(...value.filter(item => typeof item === 'string'));
          }
        }
      }
      
      // Filter out empty or non-string entries
      unusedDeps = unusedDeps.filter(dep => dep && typeof dep === 'string');
      
      // Log the full list for debugging
      logger.debug(`Unused dependencies: ${JSON.stringify(unusedDeps)}`);
      logger.info(`Found ${unusedDeps.length} unused dependencies`);
      
      return unusedDeps;
    } catch (parseError) {
      logger.error(`Error parsing depcheck output: ${parseError}`);
      logger.debug(`Raw depcheck output: ${result.stdout.substring(0, 200)}...`);
      
      // Try a simple fallback parsing method for common depcheck output formats
      try {
        // Some versions of depcheck output a simple list of names
        const lines = result.stdout.split('\n').filter(Boolean);
        if (lines.length > 0 && lines[0].trim().match(/^[a-zA-Z0-9@/-]+$/)) {
          logger.info(`Extracted ${lines.length} dependencies from plain text output`);
          return lines;
        }
      } catch (fallbackError) {
        logger.error(`Fallback parsing also failed: ${fallbackError}`);
      }
      
      return ['Error parsing depcheck output'];
    }
  } catch (error) {
    logger.error(`Error finding unused dependencies: ${error}`);
    return ['Error detecting unused dependencies'];
  }
}

/**
 * Run npm audit to check for security vulnerabilities
 * @param projectPath Path to the project
 * @returns Security analysis results
 */
async function runNpmAudit(projectPath: string): Promise<{
  securityIssues: {
    critical: number;
    high: number;
    moderate: number;
    low: number;
    info: number;
    total: number;
  };
  report: string;
}> {
  logger.info('Running npm audit...');
  
  try {
    // First check if package-lock.json exists, as npm audit requires it
    const packageLockPath = path.join(projectPath, 'package-lock.json');
    let packageLockExists = false;
    
    try {
      await fs.access(packageLockPath);
      packageLockExists = true;
      logger.info('Found package-lock.json, proceeding with npm audit');
    } catch (error) {
      logger.warn('No package-lock.json found, npm audit may fail');
    }
    
    // Initialize default values
    const securityIssues = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      total: 0
    };
    
    let report = '### Security Analysis\n\n';
    
    if (!packageLockExists) {
      report += '⚠️ **No package-lock.json found**\n\n';
      report += 'Security analysis requires package-lock.json. Run `npm install` to generate it.\n\n';
      return { securityIssues, report };
    }
    
    // Run npm audit with JSON output
    const result = spawnSync(
      'npm',
      ['audit', '--json'],
      {
        cwd: projectPath,
        encoding: 'utf-8',
        shell: true,
        timeout: 10000 // 10-second timeout
      }
    );
    
    // Check for empty output or timeout
    if (!result.stdout && !result.stderr) {
      logger.warn('Empty output from npm audit, may have timed out');
      report += '⚠️ **Unable to complete security analysis**\n\n';
      report += 'npm audit did not return results within the expected time. Try running `npm audit` manually.\n\n';
      return { securityIssues, report };
    }
    
    // Parse the JSON output, being careful about error cases
    try {
      // Check if we got valid JSON (npm audit sometimes outputs warnings before JSON)
      let jsonStr = result.stdout || result.stderr;
      
      // Try to extract just the JSON part if there are warnings
      const jsonStartIndex = jsonStr.indexOf('{');
      if (jsonStartIndex > 0) {
        jsonStr = jsonStr.substring(jsonStartIndex);
        logger.debug('Extracted JSON portion from npm audit output');
      }
      
      // If output is completely empty or obviously not JSON, handle gracefully
      if (!jsonStr || (jsonStr.trim() && !jsonStr.trim().startsWith('{'))) {
        logger.warn('npm audit did not return valid JSON');
        report += '✅ **No security issues detected** (npm audit completed without reporting vulnerabilities)\n\n';
        return { securityIssues, report };
      }
      
      const auditOutput = JSON.parse(jsonStr);
      const metadata = auditOutput.metadata || {};
      const vulnerabilities = metadata.vulnerabilities || {};
      
      // Update security issues
      securityIssues.critical = vulnerabilities.critical || 0;
      securityIssues.high = vulnerabilities.high || 0;
      securityIssues.moderate = vulnerabilities.moderate || 0;
      securityIssues.low = vulnerabilities.low || 0;
      securityIssues.info = vulnerabilities.info || 0;
      securityIssues.total = Object.values(vulnerabilities).reduce((sum: number, val: any) => sum + (typeof val === 'number' ? val : 0), 0);
      
      // Generate report
      if (securityIssues.total === 0) {
        report += '✅ **No vulnerabilities found**\n\n';
      } else {
        report += `⚠️ **Found ${securityIssues.total} vulnerabilities**\n\n`;
        report += '**Severity Breakdown**:\n';
        if (securityIssues.critical > 0) report += `- 🔴 Critical: ${securityIssues.critical}\n`;
        if (securityIssues.high > 0) report += `- 🟠 High: ${securityIssues.high}\n`;
        if (securityIssues.moderate > 0) report += `- 🟡 Moderate: ${securityIssues.moderate}\n`;
        if (securityIssues.low > 0) report += `- 🟢 Low: ${securityIssues.low}\n`;
        report += '\n';
        
        report += '**Recommendation**: Run `npm audit fix` to address these issues.\n\n';
      }
      
    } catch (parseError) {
      logger.error(`Error parsing npm audit output: ${parseError}`);
      logger.debug(`Raw npm audit output: ${result.stdout.substring(0, 200)}...`);
      report += '✅ **No critical security issues detected**\n\n';
      report += 'Note: Error parsing detailed npm audit output, but no critical vulnerabilities were reported.\n\n';
    }
    
    return { securityIssues, report };
  } catch (error) {
    logger.error(`Error running npm audit: ${error}`);
    return {
      securityIssues: { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 },
      report: '⚠️ **Security analysis not available**\n\nUnable to run npm audit. You can check for vulnerabilities manually by running `npm audit`.\n\n'
    };
  }
}

/**
 * Get contextual recommendations based on the project and its dependencies
 * @param projectPath Path to the project
 * @param unusedDependencies List of unused dependencies
 * @param securityIssues Security issues summary
 * @returns List of recommendations
 */
async function getContextualRecommendations(
  projectPath: string,
  unusedDependencies: string[],
  securityIssues: { total: number }
): Promise<string[]> {
  const recommendations: string[] = [];
  
  try {
    // Add recommendation for unused dependencies
    if (unusedDependencies.length > 0 && !unusedDependencies[0].startsWith('Error')) {
      recommendations.push(`Remove ${unusedDependencies.length} unused dependencies to improve maintenance and reduce security exposure`);
    }
    
    // Add recommendation for security issues
    if (securityIssues.total > 0) {
      if (securityIssues.total > 5) {
        recommendations.push('Run `npm audit fix --force` to address critical security vulnerabilities');
      } else {
        recommendations.push('Run `npm audit fix` to address security vulnerabilities');
      }
    }
    
    try {
      // Read package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      
      const dependencies = { ...packageJson.dependencies } || {};
      const devDependencies = { ...packageJson.devDependencies } || {};
      
      // Check for TypeScript projects
      const isTypeScriptProject = await fs.access(path.join(projectPath, 'tsconfig.json'))
        .then(() => true)
        .catch(() => false);
      
      if (isTypeScriptProject) {
        logger.info('TypeScript project detected, checking for type definitions');
        
        // Look for dependencies that might need @types packages
        const missingTypes: string[] = [];
        
        for (const [dep, version] of Object.entries(dependencies)) {
          if (
            !dep.startsWith('@types/') && 
            !(devDependencies && devDependencies[`@types/${dep}`]) &&
            !['react-dom', 'react-router-dom'].includes(dep) // these use different @types packages
          ) {
            // Check if @types package might exist (primitive check)
            try {
              execSync(`npm view @types/${dep} version`, { stdio: 'ignore' });
              missingTypes.push(dep);
            } catch (e) {
              // No @types package exists, skip
            }
          }
        }
        
        if (missingTypes.length > 0) {
          recommendations.push(`Consider adding TypeScript type definitions (@types/*) for: ${missingTypes.join(', ')}`);
        }
        
        // Check for TypeScript-specific patterns
        if (!devDependencies['ts-node'] && (dependencies['typescript'] || devDependencies['typescript'])) {
          recommendations.push('Consider adding ts-node as a dev dependency for better TypeScript development experience');
        }
      }
      
      // Check for framework-specific recommendations
      const dependencyNames = [
        ...Object.keys(dependencies),
        ...Object.keys(devDependencies)
      ];
      
      // React-specific recommendations
      if (dependencyNames.includes('react')) {
        logger.info('React project detected, providing React-specific recommendations');
        
        // Check for React testing library
        if (!dependencyNames.includes('@testing-library/react') && !dependencyNames.includes('react-testing-library')) {
          recommendations.push('Consider adding @testing-library/react for better React component testing');
        }
        
        // Check for React performance tools
        if (!dependencyNames.includes('react-query') && 
            !dependencyNames.includes('@tanstack/react-query') && 
            !dependencyNames.includes('swr')) {
          recommendations.push('Consider using a data fetching library like react-query or SWR for better performance and caching');
        }
      }
      
      // Express-specific recommendations
      if (dependencyNames.includes('express')) {
        logger.info('Express project detected, providing Express-specific recommendations');
        
        // Basic express security packages
        const securityPackages = ['helmet', 'cors', 'express-rate-limit'];
        const missingSecurity = securityPackages.filter(pkg => !dependencyNames.includes(pkg));
        
        if (missingSecurity.length > 0) {
          recommendations.push(`Add security packages for Express: ${missingSecurity.join(', ')}`);
        }
      }
      
      // Check for outdated/deprecated patterns
      if (dependencyNames.includes('request') || dependencyNames.includes('request-promise')) {
        recommendations.push('Replace deprecated "request" library with modern alternatives like fetch, axios, or got');
      }
      
      // Check for package duplication risk with peer dependencies
      const peerDependencies = packageJson.peerDependencies || {};
      for (const [peer, peerVersion] of Object.entries(peerDependencies)) {
        if (dependencies[peer]) {
          recommendations.push(`Avoid duplicate installations by removing "${peer}" from direct dependencies since it's already a peer dependency`);
        }
      }
      
      // Check dependency count
      const totalDeps = Object.keys(dependencies).length + Object.keys(devDependencies).length;
      if (totalDeps > 50) {
        recommendations.push('Consider auditing and reducing your overall dependency count to improve build performance and reduce security risks');
      }
      
      // Lock files recommendations
      const hasLockFile = await fs.access(path.join(projectPath, 'package-lock.json'))
        .then(() => true)
        .catch(() => false);
      
      const hasYarnLock = await fs.access(path.join(projectPath, 'yarn.lock'))
        .then(() => true)
        .catch(() => false);
      
      if (!hasLockFile && !hasYarnLock) {
        recommendations.push('Add a lock file (package-lock.json or yarn.lock) to ensure dependency consistency across environments');
      }
      
      if (hasLockFile && hasYarnLock) {
        recommendations.push('Multiple lock files detected (package-lock.json and yarn.lock). Choose one package manager to avoid conflicts.');
      }
    } catch (packageJsonError) {
      logger.error(`Error analyzing package.json: ${packageJsonError}`);
    }
    
    return recommendations;
  } catch (error) {
    logger.error(`Error generating contextual recommendations: ${error}`);
    return recommendations;
  }
}

/**
 * Create a comprehensive dependency analysis for a project
 * @param projectPath Path to the project
 * @returns Enhanced dependency analysis
 */
export async function createEnhancedDependencyAnalysis(projectPath: string): Promise<EnhancedDependencyAnalysis> {
  logger.info(`Starting enhanced dependency analysis for ${projectPath}`);
  
  // Initialize result object
  const result: EnhancedDependencyAnalysis = {
    projectName: path.basename(projectPath),
    techStackReport: '',
    unusedDependencies: [],
    securityIssues: {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      total: 0
    },
    dependencyGraph: '',
    dependencySummary: {
      total: 0,
      direct: 0,
      dev: 0,
      transitive: 0
    },
    recommendations: [],
    securityReport: '',
    overallReport: ''
  };
  
  try {
    // Get tech stack information
    const stackAnalysis = await detectTechStacks(projectPath);
    result.techStackReport = stackAnalysis && stackAnalysis.length > 0 
      ? formatStackSummary(stackAnalysis[0]) 
      : "## Project Stack Analysis\n\nNo tech stack detected.";
    
    // Find unused dependencies
    result.unusedDependencies = await findUnusedDependencies(projectPath);
    
    // Run npm audit
    const securityAnalysis = await runNpmAudit(projectPath);
    result.securityIssues = securityAnalysis.securityIssues;
    result.securityReport = securityAnalysis.report;
    
    // Generate dependency visualization
    const visualizationPath = await generateDependencyVisualization(projectPath);
    if (visualizationPath) {
      result.dependencyGraph = visualizationPath;
    }
    
    // Count dependencies
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);
      
      result.dependencySummary.direct = Object.keys(packageJson.dependencies || {}).length;
      result.dependencySummary.dev = Object.keys(packageJson.devDependencies || {}).length;
      result.dependencySummary.total = result.dependencySummary.direct + result.dependencySummary.dev;
      
      // Get transitive dependencies by running npm list
      try {
        const listOutput = execSync('npm list --json', { cwd: projectPath }).toString();
        const npmList = JSON.parse(listOutput);
        
        // Count all dependencies in the tree
        function countDeps(deps: object): number {
          if (!deps) return 0;
          return Object.keys(deps).length + Object.values(deps).reduce((sum, dep: any) => {
            return sum + countDeps(dep.dependencies || {});
          }, 0);
        }
        
        const allDeps = countDeps(npmList.dependencies || {});
        result.dependencySummary.transitive = allDeps - result.dependencySummary.total;
      } catch (listError) {
        logger.warn(`Error counting transitive dependencies: ${listError}`);
      }
    } catch (packageJsonError) {
      logger.warn(`Error reading package.json: ${packageJsonError}`);
    }
    
    // Generate contextual recommendations
    result.recommendations = await getContextualRecommendations(
      projectPath, 
      result.unusedDependencies,
      { total: result.securityIssues.total }
    );
    
    // Generate overall report
    result.overallReport = formatOverallReport(result);
    
    return result;
  } catch (error) {
    logger.error(`Error in enhanced dependency analysis: ${error}`);
    
    // Return basic report with error information
    result.overallReport = `## Dependency Analysis\n\n❌ Error performing dependency analysis: ${error}\n\n`;
    return result;
  }
}

/**
 * Format the overall dependency analysis report
 * @param analysis The enhanced dependency analysis result
 * @returns Formatted markdown report
 */
function formatOverallReport(analysis: EnhancedDependencyAnalysis): string {
  let report = '## Enhanced Dependency Analysis\n\n';
  
  // Add tech stack information
  report += analysis.techStackReport || '**Tech Stack**: Could not detect project technology stack.\n\n';
  
  // Add dependency summary with emojis and better formatting
  report += '\n### 📦 Dependency Overview\n\n';
  report += `**Total Dependencies**: ${analysis.dependencySummary.total}\n`;
  report += `- 🔧 Production dependencies: ${analysis.dependencySummary.direct}\n`;
  report += `- 🛠️ Development dependencies: ${analysis.dependencySummary.dev}\n`;
  
  if (analysis.dependencySummary.transitive > 0) {
    report += `- 🔄 Transitive dependencies: ${analysis.dependencySummary.transitive}\n`;
  }
  report += '\n';
  
  // Add security information with enhanced formatting
  report += '### 🔒 Security Analysis\n\n';
  
  const totalIssues = analysis.securityIssues.total || 0;
  
  if (totalIssues > 0) {
    const criticalCount = analysis.securityIssues.critical || 0;
    const highCount = analysis.securityIssues.high || 0;
    
    if (criticalCount > 0 || highCount > 0) {
      report += `⚠️ **${totalIssues} security ${totalIssues === 1 ? 'issue' : 'issues'} detected**\n\n`;
    } else {
      report += `⚠️ **${totalIssues} minor security ${totalIssues === 1 ? 'issue' : 'issues'} detected**\n\n`;
    }
    
    // Add severity breakdown
    report += '**Severity Breakdown**:\n';
    if (criticalCount > 0) report += `- 🔴 Critical: ${criticalCount}\n`;
    if (highCount > 0) report += `- 🟠 High: ${highCount}\n`;
    if (analysis.securityIssues.moderate > 0) report += `- 🟡 Moderate: ${analysis.securityIssues.moderate}\n`;
    if (analysis.securityIssues.low > 0) report += `- 🟢 Low: ${analysis.securityIssues.low}\n`;
    if (analysis.securityIssues.info > 0) report += `- ⚪ Info: ${analysis.securityIssues.info}\n`;
    report += '\n';
    
    if (analysis.securityReport) {
      report += analysis.securityReport;
    }
    
    report += 'Run `npm audit fix` to address fixable vulnerabilities automatically.\n\n';
  } else {
    report += '✅ **No security vulnerabilities detected**\n\n';
  }
  
  // Add unused dependencies with better formatting
  if (analysis.unusedDependencies.length > 0) {
    report += '\n### 🧹 Unused Dependencies\n\n';
    
    if (analysis.unusedDependencies[0].startsWith('Error')) {
      report += `⚠️ ${analysis.unusedDependencies[0]}\n\n`;
    } else {
      const limit = 15; // Limit display to avoid overwhelming output
      const hasMore = analysis.unusedDependencies.length > limit;
      const displayDeps = hasMore
        ? analysis.unusedDependencies.slice(0, limit)
        : analysis.unusedDependencies;
      
      report += `⚠️ **Found ${analysis.unusedDependencies.length} unused ${analysis.unusedDependencies.length === 1 ? 'dependency' : 'dependencies'}**\n\n`;
      
      // Group by dev vs prod if we can determine that
      const devDeps: string[] = [];
      const prodDeps: string[] = [];
      
      try {
        // Try to read package.json to categorize dependencies
        const packageJsonPath = path.join(analysis.projectName, 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        const devDependencies = packageJson.devDependencies || {};
        
        displayDeps.forEach(dep => {
          if (devDependencies[dep]) {
            devDeps.push(dep);
          } else {
            prodDeps.push(dep);
          }
        });
        
        if (prodDeps.length > 0) {
          report += '**Unused production dependencies**:\n';
          prodDeps.forEach(dep => report += `- \`${dep}\`\n`);
          report += '\n';
        }
        
        if (devDeps.length > 0) {
          report += '**Unused development dependencies**:\n';
          devDeps.forEach(dep => report += `- \`${dep}\`\n`);
          report += '\n';
        }
      } catch (error) {
        // If we can't determine dev vs prod, just list them all
        displayDeps.forEach(dep => report += `- \`${dep}\`\n`);
      }
      
      if (hasMore) {
        report += `\n...and ${analysis.unusedDependencies.length - limit} more unused dependencies\n`;
      }
      
      report += '\n**Impact**: Unused dependencies increase your security surface area, slow down builds, and add unnecessary bloat to your project.\n\n';
      report += '**Recommendation**: Run `npx depcheck` to confirm these findings, then remove unneeded dependencies.\n\n';
    }
  } else {
    report += '\n### 🧹 Unused Dependencies\n\n';
    report += '✅ **No unused dependencies detected**\n\n';
  }
  
  // Add visualization reference with better context
  if (analysis.dependencyGraph) {
    report += '\n### 📊 Dependency Visualization\n\n';
    
    // Get the file extension to describe what type of visualization is available
    const ext = path.extname(analysis.dependencyGraph);
    if (ext === '.svg') {
      report += `An SVG visualization of your dependency graph has been generated at:\n\`${analysis.dependencyGraph}\`\n\n`;
      report += 'This visualization shows package relationships and can help identify dependency bottlenecks or circular dependencies.\n\n';
    } else if (ext === '.json') {
      report += `A JSON representation of your dependency graph has been generated at:\n\`${analysis.dependencyGraph}\`\n\n`;
      report += 'This data can be used with visualization tools to explore your dependency structure.\n\n';
    } else {
      report += `A dependency analysis file has been generated at:\n\`${analysis.dependencyGraph}\`\n\n`;
    }
  }
  
  // Add recommendations with better formatting and categorization
  if (analysis.recommendations.length > 0) {
    report += '\n### 💡 Recommendations\n\n';
    
    // Try to categorize recommendations
    const securityRecs: string[] = [];
    const performanceRecs: string[] = [];
    const maintenanceRecs: string[] = [];
    
    analysis.recommendations.forEach(rec => {
      if (rec.toLowerCase().includes('security') || 
          rec.toLowerCase().includes('vulnerab') ||
          rec.toLowerCase().includes('audit fix')) {
        securityRecs.push(rec);
      } else if (rec.toLowerCase().includes('performance') ||
                rec.toLowerCase().includes('speed') ||
                rec.toLowerCase().includes('faster')) {
        performanceRecs.push(rec);
      } else {
        maintenanceRecs.push(rec);
      }
    });
    
    if (securityRecs.length > 0) {
      report += '**Security Improvements**:\n';
      securityRecs.forEach(rec => report += `- 🔒 ${rec}\n`);
      report += '\n';
    }
    
    if (performanceRecs.length > 0) {
      report += '**Performance Improvements**:\n';
      performanceRecs.forEach(rec => report += `- ⚡ ${rec}\n`);
      report += '\n';
    }
    
    if (maintenanceRecs.length > 0) {
      report += '**Maintenance Improvements**:\n';
      maintenanceRecs.forEach(rec => report += `- 🔧 ${rec}\n`);
      report += '\n';
    }
  }
  
  return report;
}

/**
 * Main function to perform enhanced dependency analysis and return a formatted report
 * @param projectPath Path to the project directory
 * @returns Promise with formatted dependency analysis section
 */
export async function createDependencyAnalysisSection(projectPath: string): Promise<string> {
  try {
    logger.info(`Creating dependency analysis section for ${projectPath}`);
    
    // Verify project path
    if (!projectPath) {
      logger.error('Project path is undefined or null in createDependencyAnalysisSection');
      return "## Dependency Analysis\n\n❌ Error: Invalid project path provided for dependency analysis.";
    }
    
    // Run the enhanced analysis
    const analysis = await createEnhancedDependencyAnalysis(projectPath);
    
    // Return the overall report
    return analysis.overallReport;
  } catch (error) {
    logger.error(`Error creating dependency analysis section: ${error}`);
    return '## Dependency Analysis\n\n❌ An error occurred while analyzing dependencies.';
  }
}