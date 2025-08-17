/**
 * Build number management utilities for tracking deployments.
 *
 * WHY: We need to track builds to verify deployments are working correctly.
 * Build numbers help distinguish between different builds of the same version,
 * especially during development and testing phases where the semantic version
 * might not change but we need to know which exact build is deployed.
 *
 * DESIGN DECISION: Build numbers reset to 0 when the version changes.
 * This makes it clear when a new version starts and provides a clean
 * numbering sequence for each version release.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface BuildInfo {
  buildNumber: number;
  version: string;
  lastBuild: string;
}

/**
 * Get the path to the build-number.json file.
 *
 * WHY: Centralize path resolution to handle both development and
 * production environments correctly.
 */
function getBuildNumberPath(): string {
  // Try to find build-number.json in the package root
  const possiblePaths = [
    path.resolve(__dirname, '..', '..', 'build-number.json'), // From dist/utils/
    path.resolve(process.cwd(), 'build-number.json'), // Current directory
  ];

  for (const buildPath of possiblePaths) {
    if (fs.existsSync(buildPath)) {
      return buildPath;
    }
  }

  // Default to package root if not found
  return path.resolve(__dirname, '..', '..', 'build-number.json');
}

/**
 * Read the current build information.
 *
 * WHY: We need to check the current build number and version
 * to determine if we should increment or reset the counter.
 */
export function readBuildInfo(): BuildInfo | null {
  try {
    const buildPath = getBuildNumberPath();
    if (!fs.existsSync(buildPath)) {
      return null;
    }

    const content = fs.readFileSync(buildPath, 'utf8');
    return JSON.parse(content) as BuildInfo;
  } catch (error) {
    console.warn('Warning: Could not read build-number.json:', error);
    return null;
  }
}

/**
 * Write build information to disk.
 *
 * WHY: Persist the build number across builds so we maintain
 * an accurate count of deployments.
 */
export function writeBuildInfo(info: BuildInfo): void {
  try {
    const buildPath = getBuildNumberPath();
    fs.writeFileSync(buildPath, JSON.stringify(info, null, 2));
  } catch (error) {
    console.warn('Warning: Could not write build-number.json:', error);
  }
}

/**
 * Increment the build number for the current version.
 *
 * WHY: Called during the build process to track each build.
 * If the version has changed, the build number resets to 0.
 *
 * @param currentVersion The current version from package.json
 * @returns The new build number
 */
export function incrementBuildNumber(currentVersion: string): number {
  const existingInfo = readBuildInfo();

  let newBuildNumber: number;

  if (!existingInfo) {
    // First build ever
    newBuildNumber = 0;
  } else if (existingInfo.version !== currentVersion) {
    // Version changed, reset build number
    console.log(
      `Version changed from ${existingInfo.version} to ${currentVersion}, resetting build number`,
    );
    newBuildNumber = 0;
  } else {
    // Same version, increment build number
    newBuildNumber = existingInfo.buildNumber + 1;
  }

  const newInfo: BuildInfo = {
    buildNumber: newBuildNumber,
    version: currentVersion,
    lastBuild: new Date().toISOString(),
  };

  writeBuildInfo(newInfo);

  console.log(`Build number updated: ${currentVersion} (build ${newBuildNumber})`);

  return newBuildNumber;
}

/**
 * Get the current build number without incrementing.
 *
 * WHY: Used when displaying version information to users
 * without triggering a new build.
 */
export function getCurrentBuildNumber(): number {
  const info = readBuildInfo();
  return info ? info.buildNumber : 0;
}

/**
 * Format version string with build number.
 *
 * WHY: Provide a consistent format for displaying version
 * information throughout the application.
 *
 * @param version The semantic version
 * @param buildNumber The build number
 * @returns Formatted version string like "4.4.2 (build 1)"
 */
export function formatVersionWithBuild(version: string, buildNumber: number): string {
  return `${version} (build ${buildNumber})`;
}
