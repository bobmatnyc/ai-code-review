/**
 * @fileoverview Dependency analysis report formatters for AI Code Review
 *
 * This module provides functions for formatting dependency analysis reports
 * in markdown format with consistent styling and structure.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { SecurityIssues } from './securityAnalysis';

/**
 * Comprehensive dependency analysis result
 */
export interface EnhancedDependencyAnalysis {
  projectName: string;
  techStackReport: string;
  unusedDependencies: string[];
  securityIssues: SecurityIssues;
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
 * Format the overall dependency analysis report
 * @param analysis The enhanced dependency analysis result
 * @returns Formatted markdown report
 */
export function formatOverallReport(analysis: EnhancedDependencyAnalysis): string {
  let report = '## Enhanced Dependency Analysis\n\n';

  // Add tech stack information
  report +=
    analysis.techStackReport || '**Tech Stack**: Could not detect project technology stack.\n\n';

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
    if (analysis.securityIssues.moderate > 0)
      report += `- 🟡 Moderate: ${analysis.securityIssues.moderate}\n`;
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

        displayDeps.forEach((dep) => {
          if (devDependencies[dep]) {
            devDeps.push(dep);
          } else {
            prodDeps.push(dep);
          }
        });

        if (prodDeps.length > 0) {
          report += '**Unused production dependencies**:\n';
          prodDeps.forEach((dep) => (report += `- \`${dep}\`\n`));
          report += '\n';
        }

        if (devDeps.length > 0) {
          report += '**Unused development dependencies**:\n';
          devDeps.forEach((dep) => (report += `- \`${dep}\`\n`));
          report += '\n';
        }
      } catch (_error) {
        // If we can't determine dev vs prod, just list them all
        displayDeps.forEach((dep) => (report += `- \`${dep}\`\n`));
      }

      if (hasMore) {
        report += `\n...and ${analysis.unusedDependencies.length - limit} more unused dependencies\n`;
      }

      report +=
        '\n**Impact**: Unused dependencies increase your security surface area, slow down builds, and add unnecessary bloat to your project.\n\n';
      report +=
        '**Recommendation**: Run `npx depcheck` to confirm these findings, then remove unneeded dependencies.\n\n';
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
      report +=
        'This visualization shows package relationships and can help identify dependency bottlenecks or circular dependencies.\n\n';
    } else if (ext === '.json') {
      report += `A JSON representation of your dependency graph has been generated at:\n\`${analysis.dependencyGraph}\`\n\n`;
      report +=
        'This data can be used with visualization tools to explore your dependency structure.\n\n';
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

    analysis.recommendations.forEach((rec) => {
      if (
        rec.toLowerCase().includes('security') ||
        rec.toLowerCase().includes('vulnerab') ||
        rec.toLowerCase().includes('audit fix')
      ) {
        securityRecs.push(rec);
      } else if (
        rec.toLowerCase().includes('performance') ||
        rec.toLowerCase().includes('speed') ||
        rec.toLowerCase().includes('faster')
      ) {
        performanceRecs.push(rec);
      } else {
        maintenanceRecs.push(rec);
      }
    });

    if (securityRecs.length > 0) {
      report += '**Security Improvements**:\n';
      securityRecs.forEach((rec) => (report += `- 🔒 ${rec}\n`));
      report += '\n';
    }

    if (performanceRecs.length > 0) {
      report += '**Performance Improvements**:\n';
      performanceRecs.forEach((rec) => (report += `- ⚡ ${rec}\n`));
      report += '\n';
    }

    if (maintenanceRecs.length > 0) {
      report += '**Maintenance Improvements**:\n';
      maintenanceRecs.forEach((rec) => (report += `- 🔧 ${rec}\n`));
      report += '\n';
    }
  }

  return report;
}

/**
 * Creates a section for dependency analysis in a review
 * @param projectPath Path to the project directory
 * @returns Promise with formatted dependency analysis section
 */
export function formatDependencyAnalysisSection(report: string): string {
  if (!report || typeof report !== 'string') {
    return '## Dependency Analysis\n\n❌ Error: Invalid report data provided for dependency analysis.';
  }

  return report;
}
