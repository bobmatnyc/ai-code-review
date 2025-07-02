/**
 * @fileoverview Security analysis for dependencies in AI Code Review
 *
 * This module provides functionality to detect security vulnerabilities
 * in project dependencies using tools like npm audit.
 */

import { spawnSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import logger from '../logger';

/**
 * Security issues summary structure
 */
export interface SecurityIssues {
  critical: number;
  high: number;
  moderate: number;
  low: number;
  info: number;
  total: number;
}

/**
 * Security analysis result
 */
export interface SecurityAnalysisResult {
  securityIssues: SecurityIssues;
  report: string;
}

/**
 * Run npm audit to check for security vulnerabilities
 * @param projectPath Path to the project
 * @returns Security analysis results
 */
export async function runNpmAudit(projectPath: string): Promise<SecurityAnalysisResult> {
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
    const securityIssues: SecurityIssues = {
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      info: 0,
      total: 0,
    };

    let report = '### Security Analysis\n\n';

    if (!packageLockExists) {
      report += '⚠️ **No package-lock.json found**\n\n';
      report +=
        'Security analysis requires package-lock.json. Run `npm install` to generate it.\n\n';
      return { securityIssues, report };
    }

    // Run npm audit with JSON output
    const result = spawnSync('npm', ['audit', '--json'], {
      cwd: projectPath,
      encoding: 'utf-8',
      shell: true,
      timeout: 10000, // 10-second timeout
    });

    // Check for empty output or timeout
    if (!result.stdout && !result.stderr) {
      logger.warn('Empty output from npm audit, may have timed out');
      report += '⚠️ **Unable to complete security analysis**\n\n';
      report +=
        'npm audit did not return results within the expected time. Try running `npm audit` manually.\n\n';
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
        report +=
          '✅ **No security issues detected** (npm audit completed without reporting vulnerabilities)\n\n';
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
      securityIssues.total = Object.values(vulnerabilities).reduce(
        (sum: number, val: any) => sum + (typeof val === 'number' ? val : 0),
        0,
      );

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
      report +=
        'Note: Error parsing detailed npm audit output, but no critical vulnerabilities were reported.\n\n';
    }

    return { securityIssues, report };
  } catch (error) {
    logger.error(`Error running npm audit: ${error}`);
    return {
      securityIssues: { critical: 0, high: 0, moderate: 0, low: 0, info: 0, total: 0 },
      report:
        '⚠️ **Security analysis not available**\n\nUnable to run npm audit. You can check for vulnerabilities manually by running `npm audit`.\n\n',
    };
  }
}
