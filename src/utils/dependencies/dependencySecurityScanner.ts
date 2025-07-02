/**
 * @fileoverview Advanced dependency scanning for package security analysis
 *
 * This module implements comprehensive dependency scanning and vulnerability detection
 * for architectural and security reviews. It uses multiple sources to detect publicly
 * disclosed vulnerabilities in project dependencies.
 */

import { spawnSync } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os'; // Added for platform detection
import path from 'path';
import logger from '../logger';
import { detectTechStacks } from './dependencyRegistry';
import { formatStackSummary } from './stackAwarePackageAnalyzer';

/**
 * Interface for Dependency scanner configuration
 */
interface ScannerConfig {
  jarPath?: string;
  cliPath?: string;
  nvdApiKey?: string;
  suppressionFile?: string;
  outputFormat?: 'XML' | 'HTML' | 'CSV' | 'JSON' | 'JUNIT' | 'SARIF' | 'ALL';
  scanPath?: string;
}

/**
 * Interface for a dependency vulnerability
 */
interface Vulnerability {
  name: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' | 'UNKNOWN';
  description: string;
  cvssScore?: number;
  cveId?: string;
  references?: string[];
  fixedVersions?: string[];
}

/**
 * Interface for a dependency in the scan results
 */
interface Dependency {
  fileName: string;
  filePath: string;
  md5?: string;
  sha1?: string;
  sha256?: string;
  projectReferences?: string[];
  evidenceCollected?: any;
  packages?: Package[];
  vulnerabilities?: Vulnerability[];
}

/**
 * Interface for a package in the scan results
 */
interface Package {
  id: string;
  name: string;
  version?: string;
  ecosystem?: string;
  url?: string;
  description?: string;
}

/**
 * Interface for dependency scan results
 */
interface ScanResults {
  reportSchema?: string;
  scanInfo?: {
    engineVersion?: string;
    dataSource?: any[];
    scanDateTime?: string;
  };
  projectInfo?: {
    name?: string;
    reportDate?: string;
    credits?: string;
  };
  dependencies: Dependency[];
  vulnerablePackages?: Package[];
}

/**
 * Interface for security analysis results
 */
export interface SecurityAnalysisResults {
  techStackReport: string;
  vulnerabilityReport: string;
  totalDependencies: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  highVulnerabilities: number;
  mediumVulnerabilities: number;
  lowVulnerabilities: number;
  unmappedVulnerabilities: number;
  scanSuccessful: boolean;
  error?: string;
}

/**
 * Check if dependency scanner is installed
 * @returns True if installed, false otherwise
 */
async function isDependencyScannerInstalled(): Promise<boolean> {
  try {
    // Get the appropriate command based on the platform
    const command = os.platform() === 'win32' ? 'dependency-check.bat' : 'dependency-check';
    console.log(`Checking for dependency scanner using command: ${command}`);
    logger.info(`Checking for dependency scanner using command: ${command}`);

    // Try to execute dependency-check script to see if it's installed
    const result = spawnSync(command, ['--version'], {
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8',
      shell: true, // Use shell on all platforms for better compatibility
    });

    const isInstalled = result.status === 0;
    console.log(`Dependency scanner ${isInstalled ? 'is INSTALLED ✅' : 'is NOT INSTALLED ❌'}`);
    logger.info(`Dependency scanner ${isInstalled ? 'is INSTALLED ✅' : 'is NOT INSTALLED ❌'}`);

    return isInstalled;
  } catch (error) {
    console.log(`Dependency scanner not found in PATH: ${error}`);
    logger.info(`Dependency scanner not found in PATH: ${error}`);
    return false;
  }
}

/**
 * Get default configuration for dependency scanning
 * @returns Default configuration
 */
function getDefaultConfig(): ScannerConfig {
  return {
    outputFormat: 'JSON',
    scanPath: '.',
  };
}

/**
 * Run dependency scanner on a project
 * @param projectPath The path to the project
 * @param config Optional configuration for dependency scanner
 * @returns Path to the generated report file
 */
async function runDependencyScanner(
  projectPath: string,
  config?: Partial<ScannerConfig>,
): Promise<string> {
  const defaultConfig = getDefaultConfig();
  const mergedConfig = { ...defaultConfig, ...config };

  // Create a temp directory for outputs if it doesn't exist
  const outputDir = path.join(projectPath, 'ai-code-review-docs', 'dependency-check');
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    logger.error(`Error creating output directory: ${error}`);
    throw error;
  }

  // Define output file path
  const outputFile = path.join(outputDir, 'dependency-check-report.json');

  logger.info('Running dependency scanner...');

  try {
    // Build command arguments
    const args: string[] = [
      '--project',
      path.basename(projectPath),
      '--format',
      mergedConfig.outputFormat as string,
      '--out',
      outputDir,
      '--scan',
      mergedConfig.scanPath || projectPath,
    ];

    // Add NVD API key if provided
    if (mergedConfig.nvdApiKey) {
      args.push('--nvdApiKey', mergedConfig.nvdApiKey);
    }

    // Add suppression file if provided
    if (mergedConfig.suppressionFile) {
      args.push('--suppression', mergedConfig.suppressionFile);
    }

    // Get the appropriate command based on the platform
    const command = os.platform() === 'win32' ? 'dependency-check.bat' : 'dependency-check';
    logger.debug(
      `Running dependency scanner using command: ${command} with args: ${args.join(' ')}`,
    );

    // Run the command
    const result = spawnSync(command, args, {
      cwd: projectPath,
      timeout: 300000, // 5 minutes timeout
      stdio: 'pipe',
      encoding: 'utf-8',
      shell: true, // Use shell on all platforms for better compatibility
    });

    if (result.status !== 0) {
      logger.error(`Dependency scanner failed with status ${result.status}`);
      logger.error(`Error: ${result.stderr}`);
      throw new Error(`Dependency scanner failed: ${result.stderr}`);
    }

    logger.info(`Dependency scanner completed successfully. Report saved to ${outputFile}`);
    return outputFile;
  } catch (error) {
    logger.error(`Error running dependency scanner: ${error}`);
    throw error;
  }
}

/**
 * Parse dependency scanner JSON report
 * @param reportPath Path to the JSON report file
 * @returns Parsed scan results
 */
async function parseScannerReport(reportPath: string): Promise<ScanResults> {
  try {
    const reportContent = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(reportContent);

    return report as ScanResults;
  } catch (error) {
    logger.error(`Error parsing dependency scanner report: ${error}`);
    throw error;
  }
}

/**
 * Format vulnerability severity for display
 * @param severity The severity level
 * @returns Emoji and formatted severity
 */
function formatSeverity(severity: string): { emoji: string; formatted: string } {
  switch (severity.toUpperCase()) {
    case 'CRITICAL':
      return { emoji: '🔴', formatted: 'CRITICAL' };
    case 'HIGH':
      return { emoji: '🟠', formatted: 'HIGH' };
    case 'MEDIUM':
      return { emoji: '🟡', formatted: 'MEDIUM' };
    case 'LOW':
      return { emoji: '🟢', formatted: 'LOW' };
    default:
      return { emoji: '⚪', formatted: 'UNKNOWN' };
  }
}

/**
 * Format scan results as a markdown report
 * @param results The scan results
 * @returns Formatted markdown report
 */
function formatScanResults(results: ScanResults): string {
  let report = '## Dependency Security Analysis\n\n';

  // Count vulnerabilities by severity
  const vulnCount = {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    unknown: 0,
  };

  // Count vulnerable dependencies
  const vulnerableDependencies = new Set<string>();

  // Process dependencies with vulnerabilities
  results.dependencies.forEach((dependency) => {
    if (dependency.vulnerabilities && dependency.vulnerabilities.length > 0) {
      vulnerableDependencies.add(dependency.fileName);

      dependency.vulnerabilities.forEach((vuln) => {
        vulnCount.total++;

        switch (vuln.severity.toUpperCase()) {
          case 'CRITICAL':
            vulnCount.critical++;
            break;
          case 'HIGH':
            vulnCount.high++;
            break;
          case 'MEDIUM':
            vulnCount.medium++;
            break;
          case 'LOW':
            vulnCount.low++;
            break;
          default:
            vulnCount.unknown++;
            break;
        }
      });
    }
  });

  // Add summary
  if (vulnCount.total > 0) {
    report += `⚠️ **${vulnCount.total} security issues** found across ${vulnerableDependencies.size} dependencies.\n\n`;
    report += '**Vulnerability Severity Breakdown**:\n';
    if (vulnCount.critical > 0)
      report += `- ${formatSeverity('CRITICAL').emoji} Critical: ${vulnCount.critical}\n`;
    if (vulnCount.high > 0) report += `- ${formatSeverity('HIGH').emoji} High: ${vulnCount.high}\n`;
    if (vulnCount.medium > 0)
      report += `- ${formatSeverity('MEDIUM').emoji} Medium: ${vulnCount.medium}\n`;
    if (vulnCount.low > 0) report += `- ${formatSeverity('LOW').emoji} Low: ${vulnCount.low}\n`;
    if (vulnCount.unknown > 0)
      report += `- ${formatSeverity('UNKNOWN').emoji} Unknown: ${vulnCount.unknown}\n`;
    report += '\n';
  } else {
    report += '✅ No security issues found across analyzed dependencies.\n\n';
  }

  // Add details for each vulnerable dependency
  if (vulnCount.total > 0) {
    report += '### Vulnerable Dependencies\n\n';

    results.dependencies.forEach((dependency) => {
      if (dependency.vulnerabilities && dependency.vulnerabilities.length > 0) {
        // Get package info
        const packageName =
          dependency.packages && dependency.packages.length > 0
            ? dependency.packages[0].name
            : dependency.fileName;

        const packageVersion =
          dependency.packages && dependency.packages.length > 0 && dependency.packages[0].version
            ? dependency.packages[0].version
            : 'unknown version';

        report += `#### ${packageName} (${packageVersion})\n\n`;

        // Add each vulnerability
        dependency.vulnerabilities.forEach((vuln) => {
          const { emoji, formatted } = formatSeverity(vuln.severity);

          report += `${emoji} **${formatted}**: ${vuln.description || vuln.name}\n\n`;

          if (vuln.cveId) {
            report += `- CVE ID: \`${vuln.cveId}\`\n`;
          }

          if (vuln.cvssScore) {
            report += `- CVSS Score: ${vuln.cvssScore}\n`;
          }

          if (vuln.fixedVersions && vuln.fixedVersions.length > 0) {
            report += `- Fixed in: ${vuln.fixedVersions.join(', ')}\n`;
          }

          if (vuln.references && vuln.references.length > 0) {
            report += `- References: ${vuln.references.slice(0, 2).join(', ')}${vuln.references.length > 2 ? ' (and more)' : ''}\n`;
          }

          report += '\n';
        });

        report += '---\n\n';
      }
    });
  }

  // Add scan information
  if (results.scanInfo && results.scanInfo.engineVersion) {
    report += '### Scan Information\n\n';
    report += `- Scanner Version: ${results.scanInfo.engineVersion}\n`;
    if (results.scanInfo.scanDateTime) {
      report += `- Scan Date: ${results.scanInfo.scanDateTime}\n`;
    }
    report += `- Total Dependencies Analyzed: ${results.dependencies.length}\n`;
    report += `- Dependencies with Vulnerabilities: ${vulnerableDependencies.size}\n`;
    report += '\n';
  }

  return report;
}

/**
 * Create a fallback report when dependency scanner is not installed
 * @returns Fallback report
 */
function createFallbackReport(): string {
  return (
    '## Dependency Security Analysis\n\n' +
    '⚠️ **Dependency scanner not installed**\n\n' +
    'To enable comprehensive dependency security analysis, please install a dependency scanner.\n\n' +
    'Once installed, re-run this analysis to get detailed security information about your dependencies.\n'
  );
}

/**
 * Run dependency security analysis
 * @param projectPath The path to the project
 * @returns Security analysis results
 */
export async function analyzeDependencySecurity(
  projectPath: string,
): Promise<SecurityAnalysisResults> {
  try {
    logger.info('==== DEPENDENCY SECURITY ANALYSIS ====');
    logger.info(`Checking if dependency scanner is installed for project: ${projectPath}`);

    // Check if dependency scanner is installed
    const isInstalled = await isDependencyScannerInstalled();
    logger.info(`Dependency scanner installed: ${isInstalled}`);

    // Get tech stack information using our existing detection
    logger.info('Detecting tech stacks for security analysis...');
    const stackAnalysis = await detectTechStacks(projectPath);
    logger.info(`Tech stack detection complete: found ${stackAnalysis?.length || 0} stacks`);

    // Create a minimal StackAwarePackageAnalysisResult to pass to formatStackSummary
    const stackAnalysisResult = {
      detectedStacks: stackAnalysis,
      packageResults: [],
      allPackages: [],
      productionPackages: [],
      devPackages: [],
      frameworkPackages: [],
    };

    const techStackReport =
      Array.isArray(stackAnalysis) && stackAnalysis.length > 0
        ? formatStackSummary(stackAnalysisResult)
        : '## Project Stack Analysis\n\nNo tech stack detected.';
    logger.info('Tech stack report generated for security analysis');

    if (!isInstalled) {
      logger.warn('⚠️ Dependency scanner not installed. Using fallback report.');
      return {
        techStackReport,
        vulnerabilityReport: createFallbackReport(),
        totalDependencies: 0,
        totalVulnerabilities: 0,
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        mediumVulnerabilities: 0,
        lowVulnerabilities: 0,
        unmappedVulnerabilities: 0,
        scanSuccessful: false,
        error: 'Dependency scanner not installed',
      };
    }

    // Run dependency scanner
    const reportPath = await runDependencyScanner(projectPath);

    // Parse the report
    const scanResults = await parseScannerReport(reportPath);

    // Count vulnerabilities by severity
    let totalVulnerabilities = 0;
    let criticalVulnerabilities = 0;
    let highVulnerabilities = 0;
    let mediumVulnerabilities = 0;
    let lowVulnerabilities = 0;
    let unmappedVulnerabilities = 0;

    scanResults.dependencies.forEach((dependency) => {
      if (dependency.vulnerabilities) {
        dependency.vulnerabilities.forEach((vuln) => {
          totalVulnerabilities++;

          switch (vuln.severity.toUpperCase()) {
            case 'CRITICAL':
              criticalVulnerabilities++;
              break;
            case 'HIGH':
              highVulnerabilities++;
              break;
            case 'MEDIUM':
              mediumVulnerabilities++;
              break;
            case 'LOW':
              lowVulnerabilities++;
              break;
            default:
              unmappedVulnerabilities++;
              break;
          }
        });
      }
    });

    // Format the report
    const vulnerabilityReport = formatScanResults(scanResults);

    return {
      techStackReport,
      vulnerabilityReport,
      totalDependencies: scanResults.dependencies.length,
      totalVulnerabilities,
      criticalVulnerabilities,
      highVulnerabilities,
      mediumVulnerabilities,
      lowVulnerabilities,
      unmappedVulnerabilities,
      scanSuccessful: true,
    };
  } catch (error) {
    logger.error(`Error analyzing dependency security: ${error}`);

    // Get tech stack information even if dependency analysis fails
    try {
      const stackAnalysis = await detectTechStacks(projectPath);

      // Create a minimal StackAwarePackageAnalysisResult to pass to formatStackSummary
      const stackAnalysisResult = {
        detectedStacks: stackAnalysis,
        packageResults: [],
        allPackages: [],
        productionPackages: [],
        devPackages: [],
        frameworkPackages: [],
      };

      const techStackReport =
        Array.isArray(stackAnalysis) && stackAnalysis.length > 0
          ? formatStackSummary(stackAnalysisResult)
          : '## Project Stack Analysis\n\nNo tech stack detected.';

      return {
        techStackReport,
        vulnerabilityReport: `## Dependency Security Analysis\n\n❌ Error running security analysis: ${error}`,
        totalDependencies: 0,
        totalVulnerabilities: 0,
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        mediumVulnerabilities: 0,
        lowVulnerabilities: 0,
        unmappedVulnerabilities: 0,
        scanSuccessful: false,
        error: error instanceof Error ? error.message : String(error),
      };
    } catch (stackError) {
      logger.error(`Error getting tech stack information: ${stackError}`);

      return {
        techStackReport: '## Project Stack Analysis\n\n❌ Error analyzing project stack.',
        vulnerabilityReport: `## Dependency Security Analysis\n\n❌ Error running security analysis: ${error}`,
        totalDependencies: 0,
        totalVulnerabilities: 0,
        criticalVulnerabilities: 0,
        highVulnerabilities: 0,
        mediumVulnerabilities: 0,
        lowVulnerabilities: 0,
        unmappedVulnerabilities: 0,
        scanSuccessful: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

/**
 * Create a dependency security section for reviews
 * @param projectPath The path to the project
 * @returns Security information formatted for inclusion in reviews
 */
export async function createDependencySecuritySection(projectPath: string): Promise<string> {
  try {
    console.log('=========== RUNNING DEPENDENCY SECURITY ANALYSIS ===========');
    console.log(`Project path: ${projectPath}`);
    logger.info('=========== RUNNING DEPENDENCY SECURITY ANALYSIS ===========');
    logger.info(`Project path: ${projectPath}`);

    const securityAnalysis = await analyzeDependencySecurity(projectPath);
    logger.info('Dependency security analysis completed successfully');
    logger.info(`Tech stack report length: ${securityAnalysis.techStackReport?.length || 0}`);
    logger.info(
      `Vulnerability report length: ${securityAnalysis.vulnerabilityReport?.length || 0}`,
    );

    // Combine tech stack report and vulnerability report
    const combinedReport = `${securityAnalysis.techStackReport}\n\n${securityAnalysis.vulnerabilityReport}`;
    logger.info(`Combined report generated (${combinedReport.length} characters)`);
    return combinedReport;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack =
      error instanceof Error && error.stack ? error.stack : 'No stack trace available';

    logger.error(`Error creating dependency security section: ${errorMessage}`);
    logger.error(errorStack);
    return '## Dependency Security Analysis\n\n❌ An error occurred while analyzing dependencies.';
  }
}
