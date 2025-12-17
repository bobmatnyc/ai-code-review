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
 * Format dependency overview section
 * @param summary Dependency summary statistics
 * @returns Formatted markdown string
 */
function formatDependencyOverview(summary: {
  total: number;
  direct: number;
  dev: number;
  transitive: number;
}): string {
  let section = '\n### 📦 Dependency Overview\n\n';
  section += `**Total Dependencies**: ${summary.total}\n`;
  section += `- 🔧 Production dependencies: ${summary.direct}\n`;
  section += `- 🛠️ Development dependencies: ${summary.dev}\n`;

  if (summary.transitive > 0) {
    section += `- 🔄 Transitive dependencies: ${summary.transitive}\n`;
  }
  section += '\n';

  return section;
}

/**
 * Format security severity breakdown
 * @param securityIssues Security issues with severity counts
 * @returns Formatted markdown string
 */
function formatSeverityBreakdown(securityIssues: SecurityIssues): string {
  let breakdown = '**Severity Breakdown**:\n';

  if (securityIssues.critical > 0) {
    breakdown += `- 🔴 Critical: ${securityIssues.critical}\n`;
  }
  if (securityIssues.high > 0) {
    breakdown += `- 🟠 High: ${securityIssues.high}\n`;
  }
  if (securityIssues.moderate > 0) {
    breakdown += `- 🟡 Moderate: ${securityIssues.moderate}\n`;
  }
  if (securityIssues.low > 0) {
    breakdown += `- 🟢 Low: ${securityIssues.low}\n`;
  }
  if (securityIssues.info > 0) {
    breakdown += `- ⚪ Info: ${securityIssues.info}\n`;
  }
  breakdown += '\n';

  return breakdown;
}

/**
 * Format security analysis section
 * @param securityIssues Security issues data
 * @param securityReport Detailed security report
 * @returns Formatted markdown string
 */
function formatSecurityAnalysis(securityIssues: SecurityIssues, securityReport: string): string {
  let section = '### 🔒 Security Analysis\n\n';

  const totalIssues = securityIssues.total || 0;

  if (totalIssues === 0) {
    return section + '✅ **No security vulnerabilities detected**\n\n';
  }

  const criticalCount = securityIssues.critical || 0;
  const highCount = securityIssues.high || 0;
  const hasCriticalOrHigh = criticalCount > 0 || highCount > 0;
  const issueWord = totalIssues === 1 ? 'issue' : 'issues';
  const severity = hasCriticalOrHigh ? '' : 'minor ';

  section += `⚠️ **${totalIssues} ${severity}security ${issueWord} detected**\n\n`;
  section += formatSeverityBreakdown(securityIssues);

  if (securityReport) {
    section += securityReport;
  }

  section += 'Run `npm audit fix` to address fixable vulnerabilities automatically.\n\n';

  return section;
}

/**
 * Categorize dependencies into dev and production
 * @param displayDeps Dependencies to categorize
 * @param projectName Project path
 * @returns Object with dev and prod dependency arrays
 */
function categorizeDependencies(
  displayDeps: string[],
  projectName: string,
): { devDeps: string[]; prodDeps: string[] } {
  const devDeps: string[] = [];
  const prodDeps: string[] = [];

  try {
    const packageJsonPath = path.join(projectName, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const devDependencies = packageJson.devDependencies || {};

    displayDeps.forEach((dep) => {
      if (devDependencies[dep]) {
        devDeps.push(dep);
      } else {
        prodDeps.push(dep);
      }
    });
  } catch (_error) {
    // If categorization fails, treat all as production
    prodDeps.push(...displayDeps);
  }

  return { devDeps, prodDeps };
}

/**
 * Format unused dependencies section
 * @param unusedDeps Array of unused dependencies
 * @param projectName Project path
 * @returns Formatted markdown string
 */
function formatUnusedDependencies(unusedDeps: string[], projectName: string): string {
  let section = '\n### 🧹 Unused Dependencies\n\n';

  if (unusedDeps.length === 0) {
    return section + '✅ **No unused dependencies detected**\n\n';
  }

  if (unusedDeps[0].startsWith('Error')) {
    return section + `⚠️ ${unusedDeps[0]}\n\n`;
  }

  const limit = 15;
  const hasMore = unusedDeps.length > limit;
  const displayDeps = hasMore ? unusedDeps.slice(0, limit) : unusedDeps;
  const depWord = unusedDeps.length === 1 ? 'dependency' : 'dependencies';

  section += `⚠️ **Found ${unusedDeps.length} unused ${depWord}**\n\n`;

  const { devDeps, prodDeps } = categorizeDependencies(displayDeps, projectName);

  if (prodDeps.length > 0) {
    section += '**Unused production dependencies**:\n';
    prodDeps.forEach((dep) => (section += `- \`${dep}\`\n`));
    section += '\n';
  }

  if (devDeps.length > 0) {
    section += '**Unused development dependencies**:\n';
    devDeps.forEach((dep) => (section += `- \`${dep}\`\n`));
    section += '\n';
  }

  if (hasMore) {
    section += `\n...and ${unusedDeps.length - limit} more unused dependencies\n`;
  }

  section +=
    '\n**Impact**: Unused dependencies increase your security surface area, slow down builds, and add unnecessary bloat to your project.\n\n';
  section +=
    '**Recommendation**: Run `npx depcheck` to confirm these findings, then remove unneeded dependencies.\n\n';

  return section;
}

/**
 * Format dependency visualization section
 * @param graphPath Path to dependency graph file
 * @returns Formatted markdown string
 */
function formatDependencyVisualization(graphPath: string): string {
  if (!graphPath) {
    return '';
  }

  let section = '\n### 📊 Dependency Visualization\n\n';
  const ext = path.extname(graphPath);

  if (ext === '.svg') {
    section += `An SVG visualization of your dependency graph has been generated at:\n\`${graphPath}\`\n\n`;
    section +=
      'This visualization shows package relationships and can help identify dependency bottlenecks or circular dependencies.\n\n';
  } else if (ext === '.json') {
    section += `A JSON representation of your dependency graph has been generated at:\n\`${graphPath}\`\n\n`;
    section +=
      'This data can be used with visualization tools to explore your dependency structure.\n\n';
  } else {
    section += `A dependency analysis file has been generated at:\n\`${graphPath}\`\n\n`;
  }

  return section;
}

/**
 * Categorize recommendations by type
 * @param recommendations Array of recommendation strings
 * @returns Object with categorized recommendations
 */
function categorizeRecommendations(recommendations: string[]): {
  security: string[];
  performance: string[];
  maintenance: string[];
} {
  const security: string[] = [];
  const performance: string[] = [];
  const maintenance: string[] = [];

  recommendations.forEach((rec) => {
    const lower = rec.toLowerCase();
    if (lower.includes('security') || lower.includes('vulnerab') || lower.includes('audit fix')) {
      security.push(rec);
    } else if (
      lower.includes('performance') ||
      lower.includes('speed') ||
      lower.includes('faster')
    ) {
      performance.push(rec);
    } else {
      maintenance.push(rec);
    }
  });

  return { security, performance, maintenance };
}

/**
 * Format recommendations section
 * @param recommendations Array of recommendation strings
 * @returns Formatted markdown string
 */
function formatRecommendations(recommendations: string[]): string {
  if (recommendations.length === 0) {
    return '';
  }

  let section = '\n### 💡 Recommendations\n\n';
  const { security, performance, maintenance } = categorizeRecommendations(recommendations);

  if (security.length > 0) {
    section += '**Security Improvements**:\n';
    security.forEach((rec) => (section += `- 🔒 ${rec}\n`));
    section += '\n';
  }

  if (performance.length > 0) {
    section += '**Performance Improvements**:\n';
    performance.forEach((rec) => (section += `- ⚡ ${rec}\n`));
    section += '\n';
  }

  if (maintenance.length > 0) {
    section += '**Maintenance Improvements**:\n';
    maintenance.forEach((rec) => (section += `- 🔧 ${rec}\n`));
    section += '\n';
  }

  return section;
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

  // Add each section using helper functions
  report += formatDependencyOverview(analysis.dependencySummary);
  report += formatSecurityAnalysis(analysis.securityIssues, analysis.securityReport);
  report += formatUnusedDependencies(analysis.unusedDependencies, analysis.projectName);
  report += formatDependencyVisualization(analysis.dependencyGraph);
  report += formatRecommendations(analysis.recommendations);

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
