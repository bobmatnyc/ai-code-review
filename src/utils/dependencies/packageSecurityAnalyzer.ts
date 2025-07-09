/**
 * @fileoverview Package security analyzer using SERPAPI
 *
 * This module provides utilities to analyze package dependencies for security issues
 * and integrates with architectural reviews to provide security insights.
 */

import fs from 'node:fs';
import logger from '../logger';
import {
  extractPackageInfo,
  type PackageAnalysisResult,
  type PackageInfo,
} from './packageAnalyzer';
import { batchSearchPackageSecurity, hasSerpApiConfig } from './serpApiHelper';
import { analyzePackagesWithStackAwareness, formatStackSummary } from './stackAwarePackageAnalyzer';

/**
 * Package security analysis result
 */
export interface PackageSecurityAnalysisResult {
  analyzedPackages: string[];
  packageCount: number;
  securityIssuesFound: number;
  securityReport: string;
  missingApiKey: boolean;
  techStackReport?: string;
}

/**
 * Analyze all package dependencies in a project for security issues
 * @param projectPath The path to the project directory
 * @returns Promise with security analysis results
 */
export async function analyzePackageSecurity(
  projectPath: string,
): Promise<PackageSecurityAnalysisResult> {
  logger.info('Starting package security analysis...');

  // Check if SERPAPI is configured
  if (!hasSerpApiConfig()) {
    logger.warn(
      'SERPAPI_KEY not found in environment variables. Security analysis requires this key to be set.',
    );
    return {
      analyzedPackages: [],
      packageCount: 0,
      securityIssuesFound: 0,
      securityReport:
        '## Package Security Analysis\n\n⚠️ Security analysis requires SERPAPI_KEY to be set in your environment variables.\n\nTo enable package security analysis, add your SERPAPI_KEY to your .env.local file.',
      missingApiKey: true,
    };
  }

  try {
    // First, use the stack-aware analyzer to detect tech stacks
    const stackAnalysis = await analyzePackagesWithStackAwareness(projectPath);
    const techStackReport = formatStackSummary(stackAnalysis);

    // Extract package information from all detected package files
    let packageResults: PackageAnalysisResult[];

    // If we detected stacks and found packages, use those
    if (stackAnalysis.packageResults.length > 0) {
      packageResults = stackAnalysis.packageResults;
      logger.info(`Found ${packageResults.length} package files from stack detection`);
    } else {
      // Fall back to standard package detection
      packageResults = await extractPackageInfo(projectPath);
      logger.info(`Found ${packageResults.length} package files with standard detection`);
    }

    if (packageResults.length === 0) {
      logger.info('No package files found for security analysis.');
      return {
        analyzedPackages: [],
        packageCount: 0,
        securityIssuesFound: 0,
        securityReport:
          '## Package Security Analysis\n\nNo package files (package.json, composer.json, requirements.txt, Gemfile) found in the project.',
        missingApiKey: false,
        techStackReport,
      };
    }

    // Analyze each package file
    let securityReport = '## Package Security Analysis\n\n';
    let totalSecurityIssues = 0;
    const analyzedPackages: string[] = [];
    let totalPackages = 0;

    for (const packageResult of packageResults) {
      const securityResults = await analyzePackageFile(packageResult);
      securityReport += securityResults.report;
      totalSecurityIssues += securityResults.issuesFound;
      analyzedPackages.push(...securityResults.analyzedPackages);
      totalPackages += securityResults.packageCount;
    }

    // Add summary information
    if (totalSecurityIssues > 0) {
      securityReport = `## Package Security Analysis\n\n⚠️ **${totalSecurityIssues} security issues** found across ${analyzedPackages.length} analyzed packages.\n\n${securityReport.substring(securityReport.indexOf('\n\n') + 2)}`;
    } else {
      securityReport = `## Package Security Analysis\n\n✅ No security issues found across ${analyzedPackages.length} analyzed packages.\n\n${securityReport.substring(securityReport.indexOf('\n\n') + 2)}`;
    }

    return {
      analyzedPackages,
      packageCount: totalPackages,
      securityIssuesFound: totalSecurityIssues,
      securityReport,
      missingApiKey: false,
      techStackReport,
    };
  } catch (error) {
    logger.error(
      `Error analyzing package security: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      analyzedPackages: [],
      packageCount: 0,
      securityIssuesFound: 0,
      securityReport:
        '## Package Security Analysis\n\n❌ An error occurred while analyzing package security.',
      missingApiKey: false,
    };
  }
}

/**
 * Analyze a single package file for security issues
 * @param packageResult The package analysis result
 * @returns Security analysis for the package file
 */
async function analyzePackageFile(packageResult: PackageAnalysisResult): Promise<{
  report: string;
  issuesFound: number;
  analyzedPackages: string[];
  packageCount: number;
}> {
  let report = `### ${packageResult.filename}\n\n`;
  let issuesFound = 0;
  const analyzedPackages: string[] = [];
  let packageCount = 0;

  // Determine ecosystem based on file type
  let ecosystem: 'npm' | 'composer' | 'pip' | 'gem' | null = null;
  let packages: PackageInfo[] = [];

  if (packageResult.npm && packageResult.npm.length > 0) {
    ecosystem = 'npm';
    packages = packageResult.npm;
  } else if (packageResult.composer && packageResult.composer.length > 0) {
    ecosystem = 'composer';
    packages = packageResult.composer;
  } else if (packageResult.python && packageResult.python.length > 0) {
    ecosystem = 'pip';
    packages = packageResult.python;
  } else if (packageResult.ruby && packageResult.ruby.length > 0) {
    ecosystem = 'gem';
    packages = packageResult.ruby;
  }

  if (!ecosystem || packages.length === 0) {
    report += 'No dependencies found in this file.\n\n';
    return { report, issuesFound: 0, analyzedPackages: [], packageCount: 0 };
  }

  // Filter out dev dependencies for initial analysis
  const productionPackages = packages.filter((pkg) => !pkg.devDependency);
  packageCount = productionPackages.length;

  // Prioritize production packages and limit to 5 for analysis
  const packagesToAnalyze = productionPackages.slice(0, 5);

  if (packagesToAnalyze.length === 0) {
    report += 'No production dependencies found for security analysis.\n\n';
    return { report, issuesFound: 0, analyzedPackages: [], packageCount };
  }

  report += `Analyzing ${packagesToAnalyze.length} of ${packageCount} dependencies for security issues...\n\n`;

  // Search for security issues
  const securityResults = await batchSearchPackageSecurity(packagesToAnalyze, ecosystem);

  // Process results
  if (securityResults.length === 0) {
    report += '✅ No security issues found in analyzed dependencies.\n\n';
  } else {
    for (const result of securityResults) {
      analyzedPackages.push(result.packageName);

      // Count vulnerabilities with severity higher than "low"
      const significantVulnerabilities = result.vulnerabilities.filter((vuln) =>
        ['critical', 'high', 'medium'].includes(vuln.severity),
      );

      if (significantVulnerabilities.length > 0) {
        issuesFound += significantVulnerabilities.length;
      }

      // Add package information
      report += `#### ${result.packageName} ${result.packageVersion ? `(${result.packageVersion})` : ''}\n\n`;

      // Add vulnerability information
      if (result.vulnerabilities.length > 0) {
        for (const vuln of result.vulnerabilities) {
          // Skip "unknown" severity vulnerabilities with generic descriptions
          if (
            vuln.severity === 'unknown' &&
            vuln.description.includes('No specific vulnerabilities found')
          ) {
            continue;
          }

          const severityEmoji = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
            unknown: '⚪',
          }[vuln.severity];

          report += `${severityEmoji} **${vuln.severity.toUpperCase()}**: ${vuln.description}\n\n`;

          if (vuln.affectedVersions) {
            report += `- Affected versions: ${vuln.affectedVersions}\n`;
          }

          if (vuln.fixedVersions) {
            report += `- Fixed in: ${vuln.fixedVersions}\n`;
          }

          report += '\n';
        }
      } else {
        report += '✅ No known vulnerabilities\n\n';
      }

      // Add recommendation if available
      if (result.recommendedVersion) {
        report += `⬆️ **Recommended update**: Version ${result.recommendedVersion}\n\n`;
      }

      // Add deprecation warning if available
      if (result.deprecationInfo) {
        report += `⚠️ **Deprecation warning**: ${result.deprecationInfo}\n\n`;
      }

      report += '---\n\n';
    }
  }

  return { report, issuesFound, analyzedPackages, packageCount };
}

/**
 * Create a dependency security section for architectural reviews
 * @param projectPath The path to the project
 * @returns Security information formatted for inclusion in reviews
 */
export async function createDependencySecuritySection(projectPath: string): Promise<string> {
  console.log('=========== STARTING DEPENDENCY SECURITY ANALYSIS ===========');
  console.log(`Project path: ${projectPath}`);
  logger.info('=========== STARTING DEPENDENCY SECURITY ANALYSIS ===========');
  logger.info(`Project path: ${projectPath}`);

  // Use the enhanced dependency analyzer instead
  try {
    const { createDependencyAnalysisSection } = await import('./enhancedDependencyAnalyzer');
    logger.info(
      'Using enhanced dependency analyzer with visualization and unused dependency detection',
    );
    return await createDependencyAnalysisSection(projectPath);
  } catch (enhancedError: unknown) {
    const errorMessage =
      enhancedError instanceof Error ? enhancedError.message : String(enhancedError);
    logger.error(`Error using enhanced dependency analyzer: ${errorMessage}`);
    logger.info('Falling back to standard analyzer...');
    // Continue with the original implementation if enhanced analyzer fails
    try {
      // Get tech stack information first, as we'll use it regardless of security analysis method
      logger.info(`Analyzing package stack awareness for project: ${projectPath}`);

      // Validate projectPath
      if (!projectPath) {
        logger.error('Project path is undefined or null in createDependencySecuritySection');
        return '## Project Stack Analysis\n\n❌ Error: Invalid project path provided for dependency analysis.';
      }

      // Check if the directory exists
      try {
        const stats = fs.statSync(projectPath);
        logger.info(`Project directory exists: ${stats.isDirectory()}`);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`Project directory does not exist or is not accessible: ${errorMessage}`);
        return '## Project Stack Analysis\n\n❌ Error: Project directory not accessible.';
      }

      logger.info('Beginning stack analysis...');
      const stackAnalysis = await analyzePackagesWithStackAwareness(projectPath);
      logger.info('Stack analysis completed');

      // Handle null or undefined stackAnalysis
      if (!stackAnalysis) {
        logger.error('Stack analysis returned null or undefined');
        return '## Project Stack Analysis\n\nNo project dependencies detected.';
      }

      logger.info(
        `Stack analysis results: found ${stackAnalysis.packageResults?.length || 0} package files`,
      );

      const techStackReport =
        stackAnalysis && Array.isArray(stackAnalysis.packageResults)
          ? formatStackSummary(stackAnalysis)
          : '## Project Stack Analysis\n\nNo project dependencies detected.';
      logger.info('Tech stack report generated successfully');

      // First try to use advanced dependency scanner if available
      try {
        console.log('Attempting to use dependency security scanner...');
        logger.info('Attempting to use dependency security scanner...');
        // Use dynamic import instead of require
        const securityScanner = await import('./dependencySecurityScanner');
        const { createDependencySecuritySection } = securityScanner;
        console.log('Scanner module loaded successfully');
        logger.info('Scanner module loaded successfully');

        try {
          logger.info('Executing dependency security scanner...');
          const securityReport = await createDependencySecuritySection(projectPath);
          logger.info('✅ Dependency security analysis completed successfully');
          logger.info(`Security report length: ${securityReport?.length || 0} characters`);
          return securityReport;
        } catch (scanError: unknown) {
          const errorMessage = scanError instanceof Error ? scanError.message : String(scanError);
          const errorStack =
            scanError instanceof Error && scanError.stack
              ? scanError.stack
              : 'No stack trace available';
          logger.error(`❌ Dependency scanner failed: ${errorMessage}`);
          logger.error(errorStack);
          // Return just the tech stack info when scanner fails
          return `${techStackReport}\n\n## Dependency Security Analysis\n\n⚠️ Dependency security analysis is not available.\n\nTo enable security scanning, configure a dependency scanner or set SERPAPI_KEY in your environment.`;
        }
      } catch (importError: unknown) {
        const errorMessage =
          importError instanceof Error ? importError.message : String(importError);
        logger.error(`❌ Scanner module import error: ${errorMessage}`);
        const errorStack =
          importError instanceof Error && importError.stack
            ? importError.stack
            : 'No stack trace available';
        logger.error(errorStack);
        // Return just the tech stack when scanner module fails to load
      }

      // Fallback to the built-in analyzer
      logger.info('Falling back to built-in security analyzer...');

      // Check if SERPAPI is configured
      if (!hasSerpApiConfig()) {
        logger.warn(
          '❓ SERPAPI_KEY not found. Security vulnerability analysis requires either a dependency scanner or SERPAPI_KEY.',
        );

        // Return tech stack report with message about missing security analysis tools
        logger.info('Returning tech stack report with missing tools message');
        return `${techStackReport}\n\n## Dependency Security Analysis\n\n⚠️ Security vulnerability analysis is disabled.\n\nTo enable vulnerability detection:\n\n1. Install a dependency security scanner\n\n   OR\n\n2. Add SERPAPI_KEY to your .env.local file for the built-in analyzer`;
      }

      logger.info('Running package security analysis with SERPAPI...');
      const securityAnalysis = await analyzePackageSecurity(projectPath);
      logger.info(
        `Package security analysis completed with ${securityAnalysis.packageCount} packages analyzed`,
      );

      if (securityAnalysis.missingApiKey) {
        // This shouldn't happen since we already checked for SERPAPI_KEY, but just in case
        logger.warn('Missing API key detected in security analysis result');
        return `${techStackReport}\n\n${securityAnalysis.securityReport}`;
      }

      if (securityAnalysis.packageCount === 0) {
        // Even if no packages were found, include tech stack info
        logger.info('No packages found for security analysis');
        return `${techStackReport}\n\n## Package Security Analysis\n\nNo package dependencies found in the project.`;
      }

      // Combine tech stack report and security report
      logger.info('Successfully completed security analysis, returning combined report');
      logger.info(
        `Tech stack report length: ${techStackReport.length}, Security report length: ${securityAnalysis.securityReport.length}`,
      );
      return `${techStackReport}\n\n${securityAnalysis.securityReport}`;
    } catch (error) {
      logger.error(`Error in dependency security analysis: ${error}`);

      // If all else fails, return a simple message without failing the entire review process
      return '## Dependency Security Analysis\n\n⚠️ Unable to perform dependency security analysis due to an internal error.\n\nThe rest of the review is still valid.';
    }
  }
}
