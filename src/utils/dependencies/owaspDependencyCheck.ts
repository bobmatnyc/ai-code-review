/**
 * @fileoverview OWASP Dependency-Check integration for package security analysis
 *
 * This module integrates with OWASP Dependency-Check to provide comprehensive
 * dependency scanning and vulnerability detection for architectural and security reviews.
 * OWASP Dependency-Check is an open-source solution that detects publicly disclosed
 * vulnerabilities in project dependencies.
 */

import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import logger from '../logger';
import { detectTechStacks } from './dependencyRegistry';
import { formatStackSummary } from './stackAwarePackageAnalyzer';

/**
 * Interface for OWASP Dependency-Check configuration
 */
interface OwaspConfig {
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
 * Interface for OWASP Dependency-Check scan results
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
 * Check if OWASP Dependency-Check is installed
 * @returns True if installed, false otherwise
 */
async function isOwaspDependencyCheckInstalled(): Promise<boolean> {
  try {
    // Try to execute dependency-check script to see if it's installed
    const result = spawnSync('dependency-check', ['--version'], {
      timeout: 10000,
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    return result.status === 0;
  } catch (_error) {
    logger.debug('OWASP Dependency-Check not found in PATH');
    return false;
  }
}

/**
 * Get default configuration for OWASP Dependency-Check
 * @returns Default configuration
 */
function getDefaultConfig(): OwaspConfig {
  return {
    outputFormat: 'JSON',
    scanPath: '.',
  };
}

/**
 * Run OWASP Dependency-Check on a project
 * @param projectPath The path to the project
 * @param config Optional configuration for OWASP Dependency-Check
 * @returns Path to the generated report file
 */
async function runOwaspDependencyCheck(
  projectPath: string,
  config?: Partial<OwaspConfig>,
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

  logger.info('Running OWASP Dependency-Check...');

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

    // Run the command
    const result = spawnSync('dependency-check', args, {
      cwd: projectPath,
      timeout: 300000, // 5 minutes timeout
      stdio: 'pipe',
      encoding: 'utf-8',
    });

    if (result.status !== 0) {
      logger.error(`OWASP Dependency-Check failed with status ${result.status}`);
      logger.error(`Error: ${result.stderr}`);
      throw new Error(`OWASP Dependency-Check failed: ${result.stderr}`);
    }

    logger.info(`OWASP Dependency-Check completed successfully. Report saved to ${outputFile}`);
    return outputFile;
  } catch (error) {
    logger.error(`Error running OWASP Dependency-Check: ${error}`);
    throw error;
  }
}

/**
 * Parse OWASP Dependency-Check JSON report
 * @param reportPath Path to the JSON report file
 * @returns Parsed scan results
 */
async function parseOwaspReport(reportPath: string): Promise<ScanResults> {
  try {
    const reportContent = await fs.readFile(reportPath, 'utf-8');
    const report = JSON.parse(reportContent);

    return report as ScanResults;
  } catch (error) {
    logger.error(`Error parsing OWASP Dependency-Check report: ${error}`);
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
  if (results.scanInfo?.engineVersion) {
    report += '### Scan Information\n\n';
    report += `- OWASP Dependency-Check Version: ${results.scanInfo.engineVersion}\n`;
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
 * Create a fallback report when OWASP Dependency-Check is not installed
 * @returns Fallback report
 */
function createFallbackReport(): string {
  return (
    '## Dependency Security Analysis\n\n' +
    '⚠️ **OWASP Dependency-Check not installed**\n\n' +
    'To enable comprehensive dependency security analysis, please install OWASP Dependency-Check:\n\n' +
    '1. Visit https://owasp.org/www-project-dependency-check/\n' +
    '2. Follow the installation instructions for your platform\n' +
    '3. Ensure the `dependency-check` command is available in your PATH\n\n' +
    'Once installed, re-run this analysis to get detailed security information about your dependencies.\n'
  );
}

/**
 * Run security analysis with OWASP Dependency-Check
 * @param projectPath The path to the project
 * @returns Security analysis results
 */
export async function analyzeSecurityWithOwasp(
  projectPath: string,
): Promise<SecurityAnalysisResults> {
  try {
    // Check if OWASP Dependency-Check is installed
    const isInstalled = await isOwaspDependencyCheckInstalled();

    // Get tech stack information using our existing detection
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

    const techStackReport = formatStackSummary(stackAnalysisResult);

    if (!isInstalled) {
      logger.warn('OWASP Dependency-Check not installed. Using fallback report.');
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
        error: 'OWASP Dependency-Check not installed',
      };
    }

    // Run OWASP Dependency-Check
    const reportPath = await runOwaspDependencyCheck(projectPath);

    // Parse the report
    const scanResults = await parseOwaspReport(reportPath);

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
    logger.error(`Error analyzing security with OWASP: ${error}`);

    // Get tech stack information even if OWASP analysis fails
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

      const techStackReport = formatStackSummary(stackAnalysisResult);

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
export async function createOwaspSecuritySection(projectPath: string): Promise<string> {
  try {
    const securityAnalysis = await analyzeSecurityWithOwasp(projectPath);

    // Combine tech stack report and vulnerability report
    return `${securityAnalysis.techStackReport}\n\n${securityAnalysis.vulnerabilityReport}`;
  } catch (error) {
    logger.error(`Error creating OWASP security section: ${error}`);
    return '## Dependency Security Analysis\n\n❌ An error occurred while analyzing dependencies.';
  }
}
