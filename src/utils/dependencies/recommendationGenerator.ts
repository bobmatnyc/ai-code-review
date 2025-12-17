/**
 * @fileoverview Dependency recommendation generator for AI Code Review
 *
 * This module provides contextual dependency recommendations based on
 * project type, unused dependencies, security issues, and best practices.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import logger from '../logger';

// SecurityIssues type is not used in this file
// import { SecurityIssues } from './securityAnalysis';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

/**
 * Generates recommendations for unused dependencies
 * @param unusedDependencies List of unused dependencies
 * @returns Array of recommendations
 */
function getUnusedDependencyRecommendations(unusedDependencies: string[]): string[] {
  if (unusedDependencies.length > 0 && !unusedDependencies[0].startsWith('Error')) {
    return [
      `Remove ${unusedDependencies.length} unused dependencies to improve maintenance and reduce security exposure`,
    ];
  }
  return [];
}

/**
 * Generates recommendations for security issues
 * @param securityIssues Security issues summary
 * @returns Array of recommendations
 */
function getSecurityRecommendations(securityIssues: { total: number }): string[] {
  if (securityIssues.total > 0) {
    const command = securityIssues.total > 5 ? 'npm audit fix --force' : 'npm audit fix';
    const severity =
      securityIssues.total > 5 ? 'critical security vulnerabilities' : 'security vulnerabilities';
    return [`Run \`${command}\` to address ${severity}`];
  }
  return [];
}

/**
 * Finds missing @types packages for TypeScript projects
 * @param dependencies Project dependencies
 * @param devDependencies Project dev dependencies
 * @returns Array of dependencies missing @types packages
 */
function findMissingTypeDefinitions(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
): string[] {
  const missingTypes: string[] = [];
  const specialCases = ['react-dom', 'react-router-dom']; // these use different @types packages

  for (const [dep] of Object.entries(dependencies)) {
    if (
      !dep.startsWith('@types/') &&
      !devDependencies?.[`@types/${dep}`] &&
      !specialCases.includes(dep)
    ) {
      // Check if @types package exists
      try {
        execSync(`npm view @types/${dep} version`, { stdio: 'ignore' });
        missingTypes.push(dep);
      } catch {
        // No @types package exists, skip
      }
    }
  }

  return missingTypes;
}

/**
 * Generates TypeScript-specific recommendations
 * @param projectPath Path to the project
 * @param dependencies Project dependencies
 * @param devDependencies Project dev dependencies
 * @returns Array of TypeScript recommendations
 */
async function getTypeScriptRecommendations(
  projectPath: string,
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
): Promise<string[]> {
  const recommendations: string[] = [];

  // Check if TypeScript project
  const isTypeScriptProject = await fs
    .access(path.join(projectPath, 'tsconfig.json'))
    .then(() => true)
    .catch(() => false);

  if (!isTypeScriptProject) {
    return recommendations;
  }

  logger.info('TypeScript project detected, checking for type definitions');

  // Check for missing @types packages
  const missingTypes = findMissingTypeDefinitions(dependencies, devDependencies);
  if (missingTypes.length > 0) {
    recommendations.push(
      `Consider adding TypeScript type definitions (@types/*) for: ${missingTypes.join(', ')}`,
    );
  }

  // Check for ts-node
  const hasTypeScript = dependencies.typescript || devDependencies.typescript;
  if (!devDependencies['ts-node'] && hasTypeScript) {
    recommendations.push(
      'Consider adding ts-node as a dev dependency for better TypeScript development experience',
    );
  }

  return recommendations;
}

/**
 * Generates React-specific recommendations
 * @param dependencyNames All dependency names (dependencies + devDependencies)
 * @returns Array of React recommendations
 */
function getReactRecommendations(dependencyNames: string[]): string[] {
  if (!dependencyNames.includes('react')) {
    return [];
  }

  logger.info('React project detected, providing React-specific recommendations');
  const recommendations: string[] = [];

  // Check for testing library
  const hasTestingLibrary =
    dependencyNames.includes('@testing-library/react') ||
    dependencyNames.includes('react-testing-library');

  if (!hasTestingLibrary) {
    recommendations.push(
      'Consider adding @testing-library/react for better React component testing',
    );
  }

  // Check for data fetching library
  const hasDataFetching =
    dependencyNames.includes('react-query') ||
    dependencyNames.includes('@tanstack/react-query') ||
    dependencyNames.includes('swr');

  if (!hasDataFetching) {
    recommendations.push(
      'Consider using a data fetching library like react-query or SWR for better performance and caching',
    );
  }

  return recommendations;
}

/**
 * Generates Express-specific recommendations
 * @param dependencyNames All dependency names (dependencies + devDependencies)
 * @returns Array of Express recommendations
 */
function getExpressRecommendations(dependencyNames: string[]): string[] {
  if (!dependencyNames.includes('express')) {
    return [];
  }

  logger.info('Express project detected, providing Express-specific recommendations');

  const securityPackages = ['helmet', 'cors', 'express-rate-limit'];
  const missingSecurity = securityPackages.filter((pkg) => !dependencyNames.includes(pkg));

  if (missingSecurity.length > 0) {
    return [`Add security packages for Express: ${missingSecurity.join(', ')}`];
  }

  return [];
}

/**
 * Checks for deprecated packages
 * @param dependencyNames All dependency names
 * @returns Array of deprecation recommendations
 */
function getDeprecatedPackageRecommendations(dependencyNames: string[]): string[] {
  const recommendations: string[] = [];

  if (dependencyNames.includes('request') || dependencyNames.includes('request-promise')) {
    recommendations.push(
      'Replace deprecated "request" library with modern alternatives like fetch, axios, or got',
    );
  }

  return recommendations;
}

/**
 * Checks for peer dependency conflicts
 * @param packageJson Parsed package.json content
 * @returns Array of peer dependency recommendations
 */
function getPeerDependencyRecommendations(packageJson: PackageJson): string[] {
  const recommendations: string[] = [];
  const dependencies = packageJson.dependencies || {};
  const peerDependencies = packageJson.peerDependencies || {};

  for (const [peer] of Object.entries(peerDependencies)) {
    if (dependencies[peer]) {
      recommendations.push(
        `Avoid duplicate installations by removing "${peer}" from direct dependencies since it's already a peer dependency`,
      );
    }
  }

  return recommendations;
}

/**
 * Checks dependency count and recommends reduction if needed
 * @param dependencies Project dependencies
 * @param devDependencies Project dev dependencies
 * @returns Array of recommendations
 */
function getDependencyCountRecommendations(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>,
): string[] {
  const totalDeps = Object.keys(dependencies).length + Object.keys(devDependencies).length;

  if (totalDeps > 50) {
    return [
      'Consider auditing and reducing your overall dependency count to improve build performance and reduce security risks',
    ];
  }

  return [];
}

/**
 * Checks lock files and provides recommendations
 * @param projectPath Path to the project
 * @returns Array of lock file recommendations
 */
async function getLockFileRecommendations(projectPath: string): Promise<string[]> {
  const recommendations: string[] = [];

  const hasLockFile = await fs
    .access(path.join(projectPath, 'package-lock.json'))
    .then(() => true)
    .catch(() => false);

  const hasYarnLock = await fs
    .access(path.join(projectPath, 'yarn.lock'))
    .then(() => true)
    .catch(() => false);

  if (!hasLockFile && !hasYarnLock) {
    recommendations.push(
      'Add a lock file (package-lock.json or yarn.lock) to ensure dependency consistency across environments',
    );
  }

  if (hasLockFile && hasYarnLock) {
    recommendations.push(
      'Multiple lock files detected (package-lock.json and yarn.lock). Choose one package manager to avoid conflicts.',
    );
  }

  return recommendations;
}

/**
 * Get contextual recommendations based on the project and its dependencies
 * @param projectPath Path to the project
 * @param unusedDependencies List of unused dependencies
 * @param securityIssues Security issues summary
 * @returns List of recommendations
 */
export async function getContextualRecommendations(
  projectPath: string,
  unusedDependencies: string[],
  securityIssues: { total: number },
): Promise<string[]> {
  const recommendations: string[] = [];

  try {
    // Basic recommendations
    recommendations.push(...getUnusedDependencyRecommendations(unusedDependencies));
    recommendations.push(...getSecurityRecommendations(securityIssues));

    // Package.json analysis
    try {
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson: PackageJson = JSON.parse(packageJsonContent);

      const dependencies = packageJson.dependencies || {};
      const devDependencies = packageJson.devDependencies || {};
      const dependencyNames = [...Object.keys(dependencies), ...Object.keys(devDependencies)];

      // TypeScript recommendations
      recommendations.push(
        ...(await getTypeScriptRecommendations(projectPath, dependencies, devDependencies)),
      );

      // Framework-specific recommendations
      recommendations.push(...getReactRecommendations(dependencyNames));
      recommendations.push(...getExpressRecommendations(dependencyNames));

      // General best practices
      recommendations.push(...getDeprecatedPackageRecommendations(dependencyNames));
      recommendations.push(...getPeerDependencyRecommendations(packageJson));
      recommendations.push(...getDependencyCountRecommendations(dependencies, devDependencies));
      recommendations.push(...(await getLockFileRecommendations(projectPath)));
    } catch (packageJsonError) {
      logger.error(`Error analyzing package.json: ${packageJsonError}`);
    }

    return recommendations;
  } catch (error) {
    logger.error(`Error generating contextual recommendations: ${error}`);
    return recommendations;
  }
}
