/**
 * @fileoverview Stack-aware package analyzer for detecting and analyzing dependencies
 *
 * This module enhances the standard package analyzer with tech stack awareness,
 * allowing it to find and analyze dependencies specific to different frameworks
 * and technology stacks.
 */

import { promises as fs } from 'fs';
import path from 'path';
import logger from '../logger';
import {
  type DetectedStack,
  detectTechStacks,
  getPackageFilesForStack,
  type TechStackType,
} from './dependencyRegistry';
import {
  extractPackageInfo,
  type PackageAnalysisResult,
  type PackageInfo,
} from './packageAnalyzer';

/**
 * Result of stack-aware package analysis
 */
export interface StackAwarePackageAnalysisResult {
  detectedStacks: DetectedStack[];
  primaryStack?: DetectedStack;
  packageResults: PackageAnalysisResult[];
  allPackages: PackageInfo[];
  productionPackages: PackageInfo[];
  devPackages: PackageInfo[];
  frameworkPackages: PackageInfo[];
}

/**
 * Analyze dependencies with stack awareness
 * @param projectPath The path to the project directory
 * @returns Promise with stack-aware package analysis results
 */
export async function analyzePackagesWithStackAwareness(
  projectPath: string,
): Promise<StackAwarePackageAnalysisResult> {
  try {
    // Detect tech stacks used in the project
    const detectedStacks = await detectTechStacks(projectPath);
    logger.info(`Detected ${detectedStacks.length} tech stacks`);

    // Sort by confidence level
    detectedStacks.sort((a, b) => {
      const confidenceMap = { high: 3, medium: 2, low: 1 };
      return confidenceMap[b.confidence] - confidenceMap[a.confidence];
    });

    // Get primary stack (highest confidence)
    const primaryStack = detectedStacks.length > 0 ? detectedStacks[0] : undefined;

    if (primaryStack) {
      logger.info(
        `Primary tech stack detected: ${primaryStack.name} (${primaryStack.confidence} confidence)`,
      );
    } else {
      logger.info('No tech stack detected, falling back to generic package analysis');
    }

    // Find package files to analyze
    const packageFilesToAnalyze: string[] = [];

    if (primaryStack) {
      // Get package files for detected stack
      const stackPackageFiles = getPackageFilesForStack(primaryStack, projectPath);
      packageFilesToAnalyze.push(...stackPackageFiles);
    } else {
      // Fall back to standard locations
      packageFilesToAnalyze.push(
        path.join(projectPath, 'package.json'),
        path.join(projectPath, 'composer.json'),
        path.join(projectPath, 'requirements.txt'),
        path.join(projectPath, 'Gemfile'),
      );
    }

    // Remove duplicates
    const uniquePackageFiles = [...new Set(packageFilesToAnalyze)];
    logger.debug(`Analyzing ${uniquePackageFiles.length} package files`);

    // Analyze each package file
    const packageResults: PackageAnalysisResult[] = [];

    for (const filePath of uniquePackageFiles) {
      try {
        // Check if file exists
        await fs.access(filePath);

        // Get directory for this package file
        const packageDir = path.dirname(filePath);
        const relativePackageResults = await extractPackageInfo(packageDir);

        packageResults.push(...relativePackageResults);
      } catch (error) {
        // File doesn't exist, skip
        logger.debug(`Package file ${filePath} not found, skipping`);
      }
    }

    // Process results to categorize packages
    const allPackages: PackageInfo[] = [];
    const productionPackages: PackageInfo[] = [];
    const devPackages: PackageInfo[] = [];
    const frameworkPackages: PackageInfo[] = [];

    for (const result of packageResults) {
      // Process npm packages
      if (result.npm) {
        for (const pkg of result.npm) {
          allPackages.push(pkg);
          if (pkg.devDependency) {
            devPackages.push(pkg);
          } else {
            productionPackages.push(pkg);
          }

          // Identify framework packages based on primary stack
          if (primaryStack && isFrameworkPackage(pkg.name, primaryStack.name)) {
            frameworkPackages.push(pkg);
          }
        }
      }

      // Process composer packages
      if (result.composer) {
        for (const pkg of result.composer) {
          allPackages.push(pkg);
          if (pkg.devDependency) {
            devPackages.push(pkg);
          } else {
            productionPackages.push(pkg);
          }

          // Identify framework packages based on primary stack
          if (primaryStack && isFrameworkPackage(pkg.name, primaryStack.name)) {
            frameworkPackages.push(pkg);
          }
        }
      }

      // Process python packages
      if (result.python) {
        for (const pkg of result.python) {
          allPackages.push(pkg);
          // All Python packages are considered production by default
          productionPackages.push(pkg);

          // Identify framework packages based on primary stack
          if (primaryStack && isFrameworkPackage(pkg.name, primaryStack.name)) {
            frameworkPackages.push(pkg);
          }
        }
      }

      // Process ruby packages
      if (result.ruby) {
        for (const pkg of result.ruby) {
          allPackages.push(pkg);
          if (pkg.devDependency) {
            devPackages.push(pkg);
          } else {
            productionPackages.push(pkg);
          }

          // Identify framework packages based on primary stack
          if (primaryStack && isFrameworkPackage(pkg.name, primaryStack.name)) {
            frameworkPackages.push(pkg);
          }
        }
      }
    }

    return {
      detectedStacks,
      primaryStack,
      packageResults,
      allPackages,
      productionPackages,
      devPackages,
      frameworkPackages,
    };
  } catch (error) {
    logger.error(
      `Error analyzing packages with stack awareness: ${error instanceof Error ? error.message : String(error)}`,
    );
    return {
      detectedStacks: [],
      packageResults: [],
      allPackages: [],
      productionPackages: [],
      devPackages: [],
      frameworkPackages: [],
    };
  }
}

/**
 * Determine if a package is a framework package for the given stack
 * @param packageName The name of the package
 * @param stackType The tech stack type
 * @returns Boolean indicating if this is a framework package
 */
function isFrameworkPackage(packageName: string, stackType: TechStackType): boolean {
  switch (stackType) {
    case 'react':
      return (
        packageName === 'react' || packageName === 'react-dom' || packageName.startsWith('react-')
      );

    case 'nextjs':
      return packageName === 'next' || packageName.startsWith('next-');

    case 'vue':
      return packageName === 'vue' || packageName.startsWith('vue-') || packageName === '@vue/cli';

    case 'angular':
      return packageName.startsWith('@angular/') || packageName === 'angular';

    case 'express':
      return packageName === 'express' || packageName.startsWith('express-');

    case 'nestjs':
      return packageName.startsWith('@nestjs/');

    case 'laravel':
      return packageName.startsWith('laravel/');

    case 'symfony':
      return packageName.startsWith('symfony/');

    case 'django':
      return packageName === 'django' || packageName.startsWith('django-');

    case 'flask':
      return packageName === 'flask' || packageName.startsWith('flask-');

    case 'rails':
      return (
        packageName === 'rails' ||
        packageName === 'actionpack' ||
        packageName === 'activerecord' ||
        packageName === 'activestorage'
      );

    default:
      return false;
  }
}

/**
 * Get a summary of stack information and package counts
 * @param analysisResult The stack-aware package analysis result
 * @returns An HTML formatted summary of the stack and packages
 */
export function formatStackSummary(analysisResult: StackAwarePackageAnalysisResult): string {
  if (!analysisResult) {
    return '## Project Stack Analysis\n\n**Error**: Invalid analysis result\n\n';
  }

  const { primaryStack, allPackages, productionPackages, devPackages, frameworkPackages } =
    analysisResult;

  let summary = '## Project Stack Analysis\n\n';

  if (primaryStack) {
    summary += `**Primary Tech Stack**: ${getDisplayName(primaryStack.name)} (${primaryStack.confidence} confidence)\n\n`;

    if (
      primaryStack.parentStacks &&
      Array.isArray(primaryStack.parentStacks) &&
      primaryStack.parentStacks.length > 0
    ) {
      summary += '**Stack Hierarchy**:\n';
      summary += primaryStack.parentStacks.map((stack) => `- ${getDisplayName(stack)}`).join('\n');
      summary += '\n\n';
    }
  } else {
    summary += '**No specific tech stack detected**\n\n';
  }

  // Validate arrays before accessing length
  const allPackagesLength = Array.isArray(allPackages) ? allPackages.length : 0;
  const productionPackagesLength = Array.isArray(productionPackages)
    ? productionPackages.length
    : 0;
  const devPackagesLength = Array.isArray(devPackages) ? devPackages.length : 0;
  const frameworkPackagesLength = Array.isArray(frameworkPackages) ? frameworkPackages.length : 0;

  summary += '**Package Statistics**:\n';
  summary += `- Total Packages: ${allPackagesLength}\n`;
  summary += `- Production Dependencies: ${productionPackagesLength}\n`;
  summary += `- Development Dependencies: ${devPackagesLength}\n`;

  if (frameworkPackagesLength > 0) {
    summary += `- Framework-specific Packages: ${frameworkPackagesLength}\n`;
  }

  summary += '\n';

  if (frameworkPackagesLength > 0 && Array.isArray(frameworkPackages)) {
    summary += '**Key Framework Packages**:\n';
    frameworkPackages.slice(0, 5).forEach((pkg) => {
      if (pkg && typeof pkg.name === 'string') {
        summary += `- \`${pkg.name}\`${pkg.version ? ` (${pkg.version})` : ''}\n`;
      }
    });
    if (frameworkPackagesLength > 5) {
      summary += `- ... and ${frameworkPackagesLength - 5} more\n`;
    }
    summary += '\n';
  }

  return summary;
}

/**
 * Get a display name for a tech stack
 * @param stackName The tech stack type
 * @returns A user-friendly display name
 */
function getDisplayName(stackName: TechStackType): string {
  switch (stackName) {
    case 'nodejs':
      return 'Node.js';
    case 'nextjs':
      return 'Next.js';
    case 'nestjs':
      return 'NestJS';
    case 'react':
      return 'React';
    case 'vue':
      return 'Vue.js';
    case 'angular':
      return 'Angular';
    case 'express':
      return 'Express.js';
    case 'laravel':
      return 'Laravel';
    case 'symfony':
      return 'Symfony';
    case 'wordpress':
      return 'WordPress';
    case 'django':
      return 'Django';
    case 'flask':
      return 'Flask';
    case 'python':
      return 'Python';
    case 'ruby':
      return 'Ruby';
    case 'rails':
      return 'Ruby on Rails';
    case 'java':
      return 'Java';
    case 'dotnet':
      return '.NET';
    case 'go':
      return 'Go';
    case 'rust':
      return 'Rust';
    case 'php':
      return 'PHP';
    case 'svelte':
      return 'Svelte';
    case 'fastify':
      return 'Fastify';
    case 'fastapi':
      return 'FastAPI';
    default:
      return stackName;
  }
}
