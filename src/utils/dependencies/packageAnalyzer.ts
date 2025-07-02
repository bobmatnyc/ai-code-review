/**
 * @fileoverview Package analyzer utility for extracting package information
 *
 * This module provides utilities to extract package information from
 * various package management files like package.json, composer.json,
 * requirements.txt, etc.
 */

import { promises as fs } from 'fs';
import path from 'path';
import logger from '../logger';

/**
 * Package information with name, version and optional constraint
 */
export interface PackageInfo {
  name: string;
  version?: string;
  constraint?: string;
  devDependency?: boolean;
}

/**
 * Result of package analysis containing dependencies by file type
 */
export interface PackageAnalysisResult {
  npm?: PackageInfo[];
  composer?: PackageInfo[];
  python?: PackageInfo[];
  ruby?: PackageInfo[];
  filename: string;
  filePath: string;
}

/**
 * Extract package information from package management files
 * @param projectPath The path to the project directory
 * @returns Array of package analysis results
 */
export async function extractPackageInfo(projectPath: string): Promise<PackageAnalysisResult[]> {
  const results: PackageAnalysisResult[] = [];

  try {
    // Try to find package.json (Node.js)
    const packageJsonPath = path.join(projectPath, 'package.json');
    try {
      logger.info(`Analyzing package.json at ${packageJsonPath}...`);
      const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
      const packageJsonResult = await parsePackageJson(packageJsonContent, packageJsonPath);
      logger.info(`Found ${packageJsonResult.npm?.length || 0} npm dependencies in package.json`);
      results.push(packageJsonResult);
    } catch (error) {
      // package.json not found or invalid
      logger.debug(`No valid package.json found at ${packageJsonPath}`);
    }

    // Try to find composer.json (PHP)
    const composerJsonPath = path.join(projectPath, 'composer.json');
    try {
      const composerJsonContent = await fs.readFile(composerJsonPath, 'utf8');
      const composerJsonResult = await parseComposerJson(composerJsonContent, composerJsonPath);
      results.push(composerJsonResult);
    } catch (error) {
      // composer.json not found or invalid
      logger.debug(`No valid composer.json found at ${composerJsonPath}`);
    }

    // Try to find requirements.txt (Python)
    const requirementsPath = path.join(projectPath, 'requirements.txt');
    try {
      const requirementsContent = await fs.readFile(requirementsPath, 'utf8');
      const requirementsResult = await parseRequirementsTxt(requirementsContent, requirementsPath);
      results.push(requirementsResult);
    } catch (error) {
      // requirements.txt not found or invalid
      logger.debug(`No valid requirements.txt found at ${requirementsPath}`);
    }

    // Try to find Gemfile (Ruby)
    const gemfilePath = path.join(projectPath, 'Gemfile');
    try {
      const gemfileContent = await fs.readFile(gemfilePath, 'utf8');
      const gemfileResult = await parseGemfile(gemfileContent, gemfilePath);
      results.push(gemfileResult);
    } catch (error) {
      // Gemfile not found or invalid
      logger.debug(`No valid Gemfile found at ${gemfilePath}`);
    }

    return results.filter(
      (result) =>
        (result.npm && result.npm.length > 0) ||
        (result.composer && result.composer.length > 0) ||
        (result.python && result.python.length > 0) ||
        (result.ruby && result.ruby.length > 0),
    );
  } catch (error) {
    logger.error(
      `Error extracting package information: ${error instanceof Error ? error.message : String(error)}`,
    );
    return [];
  }
}

/**
 * Parse package.json for npm dependencies
 * @param content The content of package.json
 * @param filePath The path to package.json
 * @returns Package analysis result
 */
async function parsePackageJson(content: string, filePath: string): Promise<PackageAnalysisResult> {
  try {
    const packageJson = JSON.parse(content);
    const dependencies: PackageInfo[] = [];

    // Parse dependencies
    if (packageJson.dependencies) {
      Object.entries(packageJson.dependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version: String(version).replace(/[\^~]/g, ''),
          constraint: String(version),
          devDependency: false,
        });
      });
    }

    // Parse devDependencies
    if (packageJson.devDependencies) {
      Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
        dependencies.push({
          name,
          version: String(version).replace(/[\^~]/g, ''),
          constraint: String(version),
          devDependency: true,
        });
      });
    }

    return {
      npm: dependencies,
      filename: 'package.json',
      filePath,
    };
  } catch (error) {
    logger.error(
      `Error parsing package.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { filename: 'package.json', filePath };
  }
}

/**
 * Parse composer.json for PHP dependencies
 * @param content The content of composer.json
 * @param filePath The path to composer.json
 * @returns Package analysis result
 */
async function parseComposerJson(
  content: string,
  filePath: string,
): Promise<PackageAnalysisResult> {
  try {
    const composerJson = JSON.parse(content);
    const dependencies: PackageInfo[] = [];

    // Parse require
    if (composerJson.require) {
      Object.entries(composerJson.require).forEach(([name, version]) => {
        // Skip php itself as a dependency
        if (name !== 'php') {
          dependencies.push({
            name,
            constraint: String(version),
            devDependency: false,
          });
        }
      });
    }

    // Parse require-dev
    if (composerJson['require-dev']) {
      Object.entries(composerJson['require-dev']).forEach(([name, version]) => {
        dependencies.push({
          name,
          constraint: String(version),
          devDependency: true,
        });
      });
    }

    return {
      composer: dependencies,
      filename: 'composer.json',
      filePath,
    };
  } catch (error) {
    logger.error(
      `Error parsing composer.json: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { filename: 'composer.json', filePath };
  }
}

/**
 * Parse requirements.txt for Python dependencies
 * @param content The content of requirements.txt
 * @param filePath The path to requirements.txt
 * @returns Package analysis result
 */
async function parseRequirementsTxt(
  content: string,
  filePath: string,
): Promise<PackageAnalysisResult> {
  try {
    const lines = content.split('\n');
    const dependencies: PackageInfo[] = [];

    for (const line of lines) {
      // Skip empty lines and comments
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Parse package==version or package>=version format
      const versionMatch = trimmedLine.match(
        /^([a-zA-Z0-9_.-]+)\s*([=<>]+)\s*([a-zA-Z0-9_.-]+)(.*)$/,
      );
      if (versionMatch) {
        const [, name, operator, version] = versionMatch;
        dependencies.push({
          name,
          version,
          constraint: `${operator}${version}`,
        });
      } else {
        // Just package name without version constraint
        dependencies.push({
          name: trimmedLine,
        });
      }
    }

    return {
      python: dependencies,
      filename: 'requirements.txt',
      filePath,
    };
  } catch (error) {
    logger.error(
      `Error parsing requirements.txt: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { filename: 'requirements.txt', filePath };
  }
}

/**
 * Parse Gemfile for Ruby dependencies
 * @param content The content of Gemfile
 * @param filePath The path to Gemfile
 * @returns Package analysis result
 */
async function parseGemfile(content: string, filePath: string): Promise<PackageAnalysisResult> {
  try {
    const lines = content.split('\n');
    const dependencies: PackageInfo[] = [];
    let inGroup = false;
    let isDevGroup = false;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }

      // Check for group definitions
      if (trimmedLine.startsWith('group')) {
        inGroup = true;
        isDevGroup = trimmedLine.includes(':development') || trimmedLine.includes(':test');
      } else if (inGroup && trimmedLine === 'end') {
        inGroup = false;
        isDevGroup = false;
      }

      // Parse gem declarations
      const gemMatch = trimmedLine.match(/gem\s+['"]([^'"]+)['"](,\s*['"]([^'"]+)['"])?/);
      if (gemMatch) {
        const name = gemMatch[1];
        const version = gemMatch[3];

        dependencies.push({
          name,
          version,
          constraint: version,
          devDependency: isDevGroup,
        });
      }
    }

    return {
      ruby: dependencies,
      filename: 'Gemfile',
      filePath,
    };
  } catch (error) {
    logger.error(
      `Error parsing Gemfile: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { filename: 'Gemfile', filePath };
  }
}
