/**
 * @fileoverview Mock implementation of SerpAPI helper for testing
 *
 * This module provides mock responses for known vulnerable packages
 * to test the tool calling functionality without real API calls.
 */

import logger from '../logger';
import type { PackageInfo } from './packageAnalyzer';

export interface DependencySecurityInfo {
  packageName: string;
  packageVersion?: string;
  vulnerabilities: {
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
    affectedVersions?: string;
    fixedVersions?: string;
    url?: string;
  }[];
  recommendedVersion?: string;
  deprecationInfo?: string;
  packageHealth?: {
    lastUpdated?: string;
    status?: 'active' | 'maintained' | 'deprecated' | 'abandoned' | 'unknown';
    stars?: number;
    popularity?: string;
  };
  sources: string[];
}

// Mock data for common vulnerable packages
const MOCK_DATA: Record<string, DependencySecurityInfo> = {
  // NPM packages
  axios: {
    packageName: 'axios',
    packageVersion: '0.21.1',
    vulnerabilities: [
      {
        description:
          'Axios before 0.21.1 contains a Server-Side Request Forgery (SSRF) vulnerability where URLs with a protocol that resolves to localhost are not restricted by the url parser.',
        severity: 'high',
        affectedVersions: '<0.21.1',
        fixedVersions: '>=0.21.1',
        url: 'https://github.com/advisories/GHSA-xvch-5gv4-984h',
      },
    ],
    recommendedVersion: '1.3.4',
    packageHealth: {
      lastUpdated: 'March 2023',
      status: 'active',
      popularity: '94,000 stars',
    },
    sources: ['https://github.com/advisories/GHSA-xvch-5gv4-984h'],
  },
  log4js: {
    packageName: 'log4js',
    packageVersion: '5.0.0',
    vulnerabilities: [
      {
        description:
          'Log4js before 6.4.0 is vulnerable to a ReDoS (Regular Expression Denial of Service) attack in the dateFormat function.',
        severity: 'medium',
        affectedVersions: '<6.4.0',
        fixedVersions: '>=6.4.0',
        url: 'https://github.com/log4js-node/log4js-node/security/advisories/GHSA-2qrg-x229-3v8q',
      },
    ],
    recommendedVersion: '6.7.1',
    packageHealth: {
      lastUpdated: 'November 2022',
      status: 'maintained',
      popularity: '5,600 stars',
    },
    sources: ['https://github.com/log4js-node/log4js-node/security/advisories/GHSA-2qrg-x229-3v8q'],
  },
  'node-forge': {
    packageName: 'node-forge',
    packageVersion: '0.9.0',
    vulnerabilities: [
      {
        description:
          'node-forge before 0.10.0 is vulnerable to Prototype Pollution via the util.setPath function.',
        severity: 'high',
        affectedVersions: '<0.10.0',
        fixedVersions: '>=0.10.0',
        url: 'https://github.com/advisories/GHSA-92xj-mqp7-vmcj',
      },
    ],
    recommendedVersion: '1.3.1',
    packageHealth: {
      lastUpdated: 'February 2023',
      status: 'maintained',
      popularity: '3,800 stars',
    },
    sources: ['https://github.com/advisories/GHSA-92xj-mqp7-vmcj'],
  },
  // Python packages
  django: {
    packageName: 'django',
    packageVersion: '2.2.13',
    vulnerabilities: [
      {
        description:
          'Django 2.2 before 2.2.24 has a potential directory traversal via django.contrib.admindocs.',
        severity: 'medium',
        affectedVersions: '>=2.2,<2.2.24',
        fixedVersions: '>=2.2.24',
        url: 'https://github.com/advisories/GHSA-8xwc-wf8f-4vxr',
      },
    ],
    recommendedVersion: '4.2.4',
    packageHealth: {
      lastUpdated: 'June 2023',
      status: 'active',
      popularity: 'Very popular',
    },
    sources: ['https://github.com/advisories/GHSA-8xwc-wf8f-4vxr'],
  },
  pillow: {
    packageName: 'pillow',
    packageVersion: '8.0.0',
    vulnerabilities: [
      {
        description: 'Pillow before 8.3.0 has a buffer overflow via a crafted TIFF file.',
        severity: 'high',
        affectedVersions: '<8.3.0',
        fixedVersions: '>=8.3.0',
        url: 'https://github.com/advisories/GHSA-8vj2-vxx3-667w',
      },
    ],
    recommendedVersion: '10.0.1',
    packageHealth: {
      lastUpdated: 'August 2023',
      status: 'active',
      popularity: 'Very popular',
    },
    sources: ['https://github.com/advisories/GHSA-8vj2-vxx3-667w'],
  },
  // PHP packages
  'symfony/http-foundation': {
    packageName: 'symfony/http-foundation',
    packageVersion: '4.4.0',
    vulnerabilities: [
      {
        description:
          'In Symfony HttpFoundation before 4.4.7, 5.0.7, a vulnerability exists where client-sent headers are trusted and can be leveraged for cache poisoning.',
        severity: 'medium',
        affectedVersions: '<4.4.7',
        fixedVersions: '>=4.4.7',
        url: 'https://github.com/advisories/GHSA-754h-5r27-7x3r',
      },
    ],
    recommendedVersion: '6.3.0',
    packageHealth: {
      lastUpdated: 'July 2023',
      status: 'active',
      popularity: 'Very popular',
    },
    sources: ['https://github.com/advisories/GHSA-754h-5r27-7x3r'],
  },
};

/**
 * Always returns true for testing
 */
export function hasSerpApiConfig(): boolean {
  return true;
}

/**
 * Mock implementation that returns predefined data for known packages
 */
export async function searchPackageSecurity(
  packageInfo: PackageInfo,
  _ecosystem: 'npm' | 'composer' | 'pip' | 'gem',
): Promise<DependencySecurityInfo | null> {
  logger.debug(
    `[MOCK] Searching for security info for ${packageInfo.name} ${packageInfo.version || ''}`,
  );

  // Add a small delay to simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Check if we have mock data for this package
  if (MOCK_DATA[packageInfo.name]) {
    return MOCK_DATA[packageInfo.name];
  }

  // Return a generic response for unknown packages
  return {
    packageName: packageInfo.name,
    packageVersion: packageInfo.version,
    vulnerabilities: [
      {
        description: `This is a mock security response for ${packageInfo.name}. In a real environment, security information would be fetched from the SERPAPI service.`,
        severity: 'unknown',
      },
    ],
    packageHealth: {
      status: 'maintained',
      lastUpdated: 'Recently',
    },
    sources: ['https://example.com/mock-security-source'],
  };
}

/**
 * Mock implementation of batch search
 */
export async function batchSearchPackageSecurity(
  packages: PackageInfo[],
  ecosystem: 'npm' | 'composer' | 'pip' | 'gem',
  limit = 5,
): Promise<DependencySecurityInfo[]> {
  logger.debug(`[MOCK] Batch searching for security info for ${packages.length} packages`);

  // Add a small delay to simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Limit the number of packages to search for
  const packagesToSearch = packages.slice(0, limit);

  // Search for each package
  const results: DependencySecurityInfo[] = [];
  for (const pkg of packagesToSearch) {
    const result = await searchPackageSecurity(pkg, ecosystem);
    if (result) {
      results.push(result);
    }
  }

  return results;
}
