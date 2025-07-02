/**
 * @fileoverview Enhanced dependency analyzer for AI Code Review
 *
 * This module provides comprehensive dependency analysis that goes beyond
 * security vulnerabilities to include:
 * 1. Dependency visualization
 * 2. Unused dependency detection
 * 3. Contextual analysis based on project type
 */

import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import logger from '../logger';
// Import types from other modules
import { detectTechStacks } from './dependencyRegistry';
// Import specialized modules
import { generateDependencyVisualization } from './dependencyVisualization';
import { formatStackSummary } from './formatStackSummary';
import { getContextualRecommendations } from './recommendationGenerator';
import { type EnhancedDependencyAnalysis, formatOverallReport } from './reportFormatter';
import { runNpmAudit } from './securityAnalysis';
import { findUnusedDependencies } from './unusedDependencies';

/**
 * Create a comprehensive dependency analysis for a project
 * @param projectPath Path to the project
 * @returns Enhanced dependency analysis
 */
export async function createEnhancedDependencyAnalysis(
  projectPath: string,
): Promise<EnhancedDependencyAnalysis> {
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
      total: 0,
    },
    dependencyGraph: '',
    dependencySummary: {
      total: 0,
      direct: 0,
      dev: 0,
      transitive: 0,
    },
    recommendations: [],
    securityReport: '',
    overallReport: '',
  };

  try {
    // Get tech stack information
    const stackAnalysis = await detectTechStacks(projectPath);
    result.techStackReport =
      stackAnalysis && stackAnalysis.length > 0
        ? formatStackSummary(stackAnalysis[0])
        : '## Project Stack Analysis\n\nNo tech stack detected.';

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
      result.dependencySummary.total =
        result.dependencySummary.direct + result.dependencySummary.dev;

      // Get transitive dependencies by running npm list
      try {
        const listOutput = execSync('npm list --json', { cwd: projectPath }).toString();
        const npmList = JSON.parse(listOutput);

        // Count all dependencies in the tree
        const countDeps = (deps: object): number => {
          if (!deps) return 0;
          return (
            Object.keys(deps).length +
            Object.values(deps).reduce((sum, dep: any) => {
              return sum + countDeps(dep.dependencies || {});
            }, 0)
          );
        };

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
      { total: result.securityIssues.total },
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
      return '## Dependency Analysis\n\n❌ Error: Invalid project path provided for dependency analysis.';
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
