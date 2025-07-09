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
    // Add recommendation for unused dependencies
    if (unusedDependencies.length > 0 && !unusedDependencies[0].startsWith('Error')) {
      recommendations.push(
        `Remove ${unusedDependencies.length} unused dependencies to improve maintenance and reduce security exposure`,
      );
    }

    // Add recommendation for security issues
    if (securityIssues.total > 0) {
      if (securityIssues.total > 5) {
        recommendations.push(
          'Run `npm audit fix --force` to address critical security vulnerabilities',
        );
      } else {
        recommendations.push('Run `npm audit fix` to address security vulnerabilities');
      }
    }

    try {
      // Read package.json
      const packageJsonPath = path.join(projectPath, 'package.json');
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageJson = JSON.parse(packageJsonContent);

      const dependencies = packageJson.dependencies ? { ...packageJson.dependencies } : {};
      const devDependencies = packageJson.devDependencies ? { ...packageJson.devDependencies } : {};

      // Check for TypeScript projects
      const isTypeScriptProject = await fs
        .access(path.join(projectPath, 'tsconfig.json'))
        .then(() => true)
        .catch(() => false);

      if (isTypeScriptProject) {
        logger.info('TypeScript project detected, checking for type definitions');

        // Look for dependencies that might need @types packages
        const missingTypes: string[] = [];

        for (const [dep] of Object.entries(dependencies)) {
          if (
            !dep.startsWith('@types/') &&
            !devDependencies?.[`@types/${dep}`] &&
            !['react-dom', 'react-router-dom'].includes(dep) // these use different @types packages
          ) {
            // Check if @types package might exist (primitive check)
            try {
              execSync(`npm view @types/${dep} version`, { stdio: 'ignore' });
              missingTypes.push(dep);
            } catch (_e) {
              // No @types package exists, skip
            }
          }
        }

        if (missingTypes.length > 0) {
          recommendations.push(
            `Consider adding TypeScript type definitions (@types/*) for: ${missingTypes.join(', ')}`,
          );
        }

        // Check for TypeScript-specific patterns
        if (
          !devDependencies['ts-node'] &&
          (dependencies.typescript || devDependencies.typescript)
        ) {
          recommendations.push(
            'Consider adding ts-node as a dev dependency for better TypeScript development experience',
          );
        }
      }

      // Check for framework-specific recommendations
      const dependencyNames = [...Object.keys(dependencies), ...Object.keys(devDependencies)];

      // React-specific recommendations
      if (dependencyNames.includes('react')) {
        logger.info('React project detected, providing React-specific recommendations');

        // Check for React testing library
        if (
          !dependencyNames.includes('@testing-library/react') &&
          !dependencyNames.includes('react-testing-library')
        ) {
          recommendations.push(
            'Consider adding @testing-library/react for better React component testing',
          );
        }

        // Check for React performance tools
        if (
          !dependencyNames.includes('react-query') &&
          !dependencyNames.includes('@tanstack/react-query') &&
          !dependencyNames.includes('swr')
        ) {
          recommendations.push(
            'Consider using a data fetching library like react-query or SWR for better performance and caching',
          );
        }
      }

      // Express-specific recommendations
      if (dependencyNames.includes('express')) {
        logger.info('Express project detected, providing Express-specific recommendations');

        // Basic express security packages
        const securityPackages = ['helmet', 'cors', 'express-rate-limit'];
        const missingSecurity = securityPackages.filter((pkg) => !dependencyNames.includes(pkg));

        if (missingSecurity.length > 0) {
          recommendations.push(`Add security packages for Express: ${missingSecurity.join(', ')}`);
        }
      }

      // Check for outdated/deprecated patterns
      if (dependencyNames.includes('request') || dependencyNames.includes('request-promise')) {
        recommendations.push(
          'Replace deprecated "request" library with modern alternatives like fetch, axios, or got',
        );
      }

      // Check for package duplication risk with peer dependencies
      const peerDependencies = packageJson.peerDependencies || {};
      for (const [peer] of Object.entries(peerDependencies)) {
        if (dependencies[peer]) {
          recommendations.push(
            `Avoid duplicate installations by removing "${peer}" from direct dependencies since it's already a peer dependency`,
          );
        }
      }

      // Check dependency count
      const totalDeps = Object.keys(dependencies).length + Object.keys(devDependencies).length;
      if (totalDeps > 50) {
        recommendations.push(
          'Consider auditing and reducing your overall dependency count to improve build performance and reduce security risks',
        );
      }

      // Lock files recommendations
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
    } catch (packageJsonError) {
      logger.error(`Error analyzing package.json: ${packageJsonError}`);
    }

    return recommendations;
  } catch (error) {
    logger.error(`Error generating contextual recommendations: ${error}`);
    return recommendations;
  }
}
