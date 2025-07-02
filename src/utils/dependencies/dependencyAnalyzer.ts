/**
 * @fileoverview Dependency analyzer using dependency-cruiser
 *
 * This module provides utilities to analyze project dependencies using
 * dependency-cruiser and format the results for inclusion in architectural reviews.
 */

import { exec } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import logger from '../logger';

// Define interfaces for dependency-cruiser output
interface DependencyCruiserModule {
  source: string;
  dependencies: Array<{
    resolved: string;
    coreModule: boolean;
    followable: boolean;
    dynamic: boolean;
    circular?: boolean;
    valid: boolean;
  }>;
}

interface DependencyCruiserOutput {
  modules: DependencyCruiserModule[];
  summary: {
    violations: Array<{
      type: string;
      from: string;
      to: string;
      rule: {
        severity: string;
        name: string;
      };
    }>;
    error: number;
    warn: number;
    info: number;
  };
}

export interface DependencyAnalysisResult {
  modulesCount: number;
  dependenciesCount: number;
  circularDependencies: string[];
  highlyConnectedModules: Array<{
    module: string;
    dependencyCount: number;
  }>;
  externalDependencies: string[];
  violationSummary: {
    error: number;
    warn: number;
    info: number;
  };
  topViolations: Array<{
    type: string;
    from: string;
    to: string;
    ruleName: string;
    severity: string;
  }>;
  dependencyGraph?: string; // Path to generated graph file
}

/**
 * Runs dependency-cruiser on the specified directory to generate dependency analysis
 * @param directory The directory to analyze
 * @returns Results from the dependency analysis
 */
export async function analyzeDependencies(directory: string): Promise<DependencyAnalysisResult> {
  logger.info(`Analyzing dependencies in ${directory}...`);

  const outputDir = path.join(process.cwd(), 'dependency-analysis');

  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });

    // File paths for outputs
    const jsonOutputPath = path.join(outputDir, 'dependencies.json');
    const svgOutputPath = path.join(outputDir, 'dependency-graph.svg');

    // Run dependency-cruiser to get JSON output
    await runDependencyCruiser(directory, jsonOutputPath, 'json');

    // Also generate a visual graph of dependencies
    await runDependencyCruiser(directory, svgOutputPath, 'dot');

    // Parse the JSON output
    const analysisData = await fs.readFile(jsonOutputPath, 'utf8');
    const dependencyData = JSON.parse(analysisData) as DependencyCruiserOutput;

    // Process the data into a more useful format
    return processAnalysisResult(dependencyData, svgOutputPath);
  } catch (error) {
    logger.error(
      `Error analyzing dependencies: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      modulesCount: 0,
      dependenciesCount: 0,
      circularDependencies: [],
      highlyConnectedModules: [],
      externalDependencies: [],
      violationSummary: { error: 0, warn: 0, info: 0 },
      topViolations: [],
    };
  }
}

/**
 * Run dependency-cruiser with specified options
 * @param directory Directory to analyze
 * @param outputPath Path to output file
 * @param outputType Type of output to generate
 */
async function runDependencyCruiser(
  directory: string,
  outputPath: string,
  outputType: 'json' | 'dot',
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `npx dependency-cruiser --output-type ${outputType} --no-config --metrics --output-to "${outputPath}" "${directory}"`;

    exec(command, (error, stdout, stderr) => {
      if (error && error.code !== 0) {
        reject(new Error(`Dependency-cruiser execution failed: ${stderr}`));
        return;
      }

      resolve();
    });
  });
}

/**
 * Process the raw dependency-cruiser output into a more useful format
 * @param data Raw dependency-cruiser output
 * @param graphPath Path to generated graph file
 * @returns Processed dependency analysis results
 */
function processAnalysisResult(
  data: DependencyCruiserOutput,
  graphPath: string,
): DependencyAnalysisResult {
  // Count all dependencies
  let dependenciesCount = 0;
  const circularDependencies: string[] = [];
  const moduleDependencyCount: Record<string, number> = {};
  const externalDeps = new Set<string>();

  // Process modules and their dependencies
  data.modules.forEach((module) => {
    dependenciesCount += module.dependencies.length;

    // Track dependency count per module
    if (!moduleDependencyCount[module.source]) {
      moduleDependencyCount[module.source] = 0;
    }
    moduleDependencyCount[module.source] += module.dependencies.length;

    // Check for circular dependencies
    module.dependencies.forEach((dep) => {
      if (dep.circular) {
        circularDependencies.push(`${module.source} → ${dep.resolved}`);
      }

      // Identify external dependencies (node_modules)
      if (dep.resolved.includes('node_modules')) {
        const packageName = dep.resolved.split('node_modules/')[1].split('/')[0];
        externalDeps.add(packageName);
      }
    });
  });

  // Find highly connected modules (potential architectural hotspots)
  const highlyConnectedModules = Object.entries(moduleDependencyCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([module, count]) => ({ module, dependencyCount: count }));

  // Extract the top violations
  const topViolations = data.summary.violations.slice(0, 10).map((violation) => ({
    type: violation.type,
    from: violation.from,
    to: violation.to,
    ruleName: violation.rule.name,
    severity: violation.rule.severity,
  }));

  return {
    modulesCount: data.modules.length,
    dependenciesCount,
    circularDependencies,
    highlyConnectedModules,
    externalDependencies: Array.from(externalDeps),
    violationSummary: {
      error: data.summary.error,
      warn: data.summary.warn,
      info: data.summary.info,
    },
    topViolations,
    dependencyGraph: graphPath,
  };
}
