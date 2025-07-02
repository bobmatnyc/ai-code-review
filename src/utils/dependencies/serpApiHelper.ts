/**
 * @fileoverview SerpAPI helper for searching for dependency information
 *
 * This module provides utilities to search for information about dependencies
 * using the SerpAPI service.
 */

import logger from '../logger';
import type { PackageInfo } from './packageAnalyzer';

/**
 * Interface for dependency security information
 */
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

/**
 * Check if SerpAPI is configured correctly
 * @returns True if SerpAPI is available, false otherwise
 */
export function hasSerpApiConfig(): boolean {
  const hasKey = !!process.env.SERPAPI_KEY;
  logger.debug(`SERPAPI_KEY available: ${hasKey ? 'YES' : 'NO'}`);
  if (hasKey) {
    logger.debug(`SERPAPI_KEY first 5 chars: ${process.env.SERPAPI_KEY?.substring(0, 5)}...`);
  } else {
    logger.warn(
      'SERPAPI_KEY not found in environment variables. Set this key to enable package security analysis.',
    );
  }
  return hasKey;
}

/**
 * Search for security information about a package
 * @param packageInfo The package information to search for
 * @param ecosystem The package ecosystem (npm, composer, pip, gem)
 * @returns Security information about the package
 */
export async function searchPackageSecurity(
  packageInfo: PackageInfo,
  ecosystem: 'npm' | 'composer' | 'pip' | 'gem',
): Promise<DependencySecurityInfo | null> {
  try {
    if (!hasSerpApiConfig()) {
      logger.debug('SerpAPI is not configured. Skipping security search.');
      return null;
    }

    const apiKey = process.env.SERPAPI_KEY;
    const searchTerm = `${packageInfo.name} ${packageInfo.version || ''} security vulnerability ${ecosystem}`;

    logger.debug(`Searching for security information: ${searchTerm}`);

    const url = new URL('https://serpapi.com/search');
    url.searchParams.append('engine', 'google');
    url.searchParams.append('q', searchTerm);
    url.searchParams.append('api_key', apiKey as string);
    url.searchParams.append('num', '10');

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new Error(`SerpAPI request failed: ${response.statusText}`);
    }

    const data = await response.json();

    // Process the search results
    return processSecuritySearchResults(data, packageInfo);
  } catch (error) {
    logger.error(
      `Error searching for package security: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Process the search results from SerpAPI
 * @param data The search results data
 * @param packageInfo The package information
 * @returns Processed security information
 */
function processSecuritySearchResults(
  data: any,
  packageInfo: PackageInfo,
): DependencySecurityInfo | null {
  try {
    // Initialize the result structure
    const result: DependencySecurityInfo = {
      packageName: packageInfo.name,
      packageVersion: packageInfo.version,
      vulnerabilities: [],
      sources: [],
    };

    const organicResults = data.organic_results || [];

    // Extract information from search results
    for (const item of organicResults) {
      const title = item.title || '';
      const snippet = item.snippet || '';
      const link = item.link || '';

      // Skip results not related to security
      if (!isRelevantSecurityResult(title, snippet, packageInfo.name)) {
        continue;
      }

      // Add the source
      if (link && !result.sources.includes(link)) {
        result.sources.push(link);
      }

      // Extract vulnerability information
      const vulnerabilityInfo = extractVulnerabilityInfo(title, snippet, packageInfo.name);
      if (vulnerabilityInfo) {
        result.vulnerabilities.push(vulnerabilityInfo);
      }

      // Extract recommended version information
      const recommendedVersion = extractRecommendedVersion(
        title,
        snippet,
        packageInfo.name,
        packageInfo.version,
      );
      if (
        recommendedVersion &&
        (!result.recommendedVersion || isNewer(recommendedVersion, result.recommendedVersion))
      ) {
        result.recommendedVersion = recommendedVersion;
      }

      // Extract package health information
      const healthInfo = extractPackageHealth(title, snippet);
      if (healthInfo) {
        result.packageHealth = { ...result.packageHealth, ...healthInfo };
      }

      // Extract deprecation information
      const deprecationInfo = extractDeprecationInfo(title, snippet);
      if (deprecationInfo) {
        result.deprecationInfo = deprecationInfo;
      }
    }

    // If no vulnerabilities were found but we have sources, still return the result
    if (result.vulnerabilities.length === 0 && result.sources.length > 0) {
      result.vulnerabilities.push({
        description: 'No specific vulnerabilities found in search results',
        severity: 'unknown',
      });
    }

    return result.sources.length > 0 ? result : null;
  } catch (error) {
    logger.error(
      `Error processing security search results: ${error instanceof Error ? error.message : String(error)}`,
    );
    return null;
  }
}

/**
 * Check if a search result is relevant to security
 * @param title The result title
 * @param snippet The result snippet
 * @param packageName The package name
 * @returns True if the result is relevant, false otherwise
 */
function isRelevantSecurityResult(title: string, snippet: string, packageName: string): boolean {
  const lowerTitle = title.toLowerCase();
  const lowerSnippet = snippet.toLowerCase();
  const lowerPackageName = packageName.toLowerCase();

  // Check if the result mentions the package name
  if (!lowerTitle.includes(lowerPackageName) && !lowerSnippet.includes(lowerPackageName)) {
    return false;
  }

  // Check if the result is related to security
  const securityKeywords = [
    'vulnerability',
    'vulnerabilities',
    'security',
    'cve',
    'exploit',
    'patch',
    'advisory',
    'risk',
    'threat',
    'attack',
    'compromise',
    'breach',
    'unsafe',
    'malicious',
    'outdated',
    'deprecated',
  ];

  return securityKeywords.some(
    (keyword) => lowerTitle.includes(keyword) || lowerSnippet.includes(keyword),
  );
}

/**
 * Extract vulnerability information from search result
 * @param title The result title
 * @param snippet The result snippet
 * @param packageName The package name
 * @returns Vulnerability information or null if not found
 */
function extractVulnerabilityInfo(
  title: string,
  snippet: string,
  packageName: string,
): {
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  affectedVersions?: string;
  fixedVersions?: string;
  url?: string;
} | null {
  const combinedText = `${title} ${snippet}`.toLowerCase();
  const lowerPackageName = packageName.toLowerCase();

  // Skip if not directly related to the package
  if (!combinedText.includes(lowerPackageName)) {
    return null;
  }

  // Check for vulnerability mentions
  const hasVulnerability =
    /vulnerability|security issue|exploit|cve-|unsafe|risk|attack|breach/i.test(combinedText);

  if (!hasVulnerability) {
    return null;
  }

  // Determine severity
  let severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
  if (/critical|severe|urgent/i.test(combinedText)) {
    severity = 'critical';
  } else if (/high|important/i.test(combinedText)) {
    severity = 'high';
  } else if (/medium|moderate/i.test(combinedText)) {
    severity = 'medium';
  } else if (/low|minor/i.test(combinedText)) {
    severity = 'low';
  }

  // Extract affected versions
  let affectedVersions: string | undefined;
  const affectedMatch = combinedText.match(
    /affected.{1,20}(versions?|v\.?)\s*:?\s*([0-9.<>=~ -]+)/i,
  );
  if (affectedMatch) {
    affectedVersions = affectedMatch[2];
  }

  // Extract fixed versions
  let fixedVersions: string | undefined;
  const fixedMatch = combinedText.match(/fixed.{1,20}(versions?|v\.?)\s*:?\s*([0-9.<>=~ -]+)/i);
  if (fixedMatch) {
    fixedVersions = fixedMatch[2];
  }

  // Extract URL from links if available
  const urlMatch = title.match(/https?:\/\/[^\s]+/);
  const url = urlMatch ? urlMatch[0] : undefined;

  return {
    description: snippet,
    severity,
    affectedVersions,
    fixedVersions,
    url,
  };
}

/**
 * Extract recommended version information from search result
 * @param title The result title
 * @param snippet The result snippet
 * @param packageName The package name
 * @param currentVersion The current version
 * @returns Recommended version or null if not found
 */
function extractRecommendedVersion(
  title: string,
  snippet: string,
  packageName: string,
  currentVersion?: string,
): string | null {
  const combinedText = `${title} ${snippet}`;

  // Look for recommended version patterns
  const recommendedMatch = combinedText.match(
    new RegExp(
      `(update|upgrade|latest|recommended|stable).{1,30}${packageName}.{1,30}(version\\s*:?\\s*|v\\.?\\s*|to\\s+)([0-9.]+)`,
      'i',
    ),
  );

  if (recommendedMatch) {
    return recommendedMatch[3];
  }

  // Look for fixed in version patterns
  const fixedMatch = combinedText.match(
    /(fixed|patched|resolved).{1,30}(in|with).{1,30}(version\s*:?\s*|v\.?\s*|to\s+)([0-9.]+)/i,
  );

  if (fixedMatch) {
    return fixedMatch[4];
  }

  // Look for version comparison
  if (currentVersion) {
    const newerMatch = combinedText.match(
      new RegExp(`${packageName}.{1,50}${currentVersion}.{1,50}([0-9.]+)`, 'i'),
    );

    if (newerMatch && isNewer(newerMatch[1], currentVersion)) {
      return newerMatch[1];
    }
  }

  return null;
}

/**
 * Extract package health information from search result
 * @param title The result title
 * @param snippet The result snippet
 * @returns Package health information or null if not found
 */
function extractPackageHealth(
  title: string,
  snippet: string,
): {
  lastUpdated?: string;
  status?: 'active' | 'maintained' | 'deprecated' | 'abandoned' | 'unknown';
  popularity?: string;
} | null {
  const combinedText = `${title} ${snippet}`.toLowerCase();

  // Extract update information
  const lastUpdatedMatch = combinedText.match(/(last|latest)\s+update[ds]?\s*:?\s*([a-z0-9, ]+)/i);

  // Determine status
  let status: 'active' | 'maintained' | 'deprecated' | 'abandoned' | 'unknown' = 'unknown';
  if (/actively maintained|active development/i.test(combinedText)) {
    status = 'active';
  } else if (/maintained|supported/i.test(combinedText)) {
    status = 'maintained';
  } else if (/deprecated/i.test(combinedText)) {
    status = 'deprecated';
  } else if (/abandoned|unmaintained|no longer (maintained|supported)/i.test(combinedText)) {
    status = 'abandoned';
  }

  // Extract popularity information
  const popularityMatch = combinedText.match(/(([0-9,]+)\s+stars|popular|widely used)/i);
  const popularity = popularityMatch ? popularityMatch[0] : undefined;

  // Only return if we found some information
  if (lastUpdatedMatch || status !== 'unknown' || popularity) {
    return {
      lastUpdated: lastUpdatedMatch ? lastUpdatedMatch[2] : undefined,
      status,
      popularity,
    };
  }

  return null;
}

/**
 * Extract deprecation information from search result
 * @param title The result title
 * @param snippet The result snippet
 * @returns Deprecation information or null if not found
 */
function extractDeprecationInfo(title: string, snippet: string): string | null {
  const combinedText = `${title} ${snippet}`;

  if (/deprecated|no longer (maintained|supported)|end.of.life|unmaintained/i.test(combinedText)) {
    // Find the sentence containing the deprecation information
    const sentences = combinedText.split(/[.!?]+/);
    for (const sentence of sentences) {
      if (/deprecated|no longer (maintained|supported)|end.of.life|unmaintained/i.test(sentence)) {
        return sentence.trim();
      }
    }
    return 'Package appears to be deprecated';
  }

  return null;
}

/**
 * Check if version A is newer than version B
 * @param versionA Version A
 * @param versionB Version B
 * @returns True if A is newer than B, false otherwise
 */
function isNewer(versionA: string, versionB: string): boolean {
  const partsA = versionA.split('.').map((part) => parseInt(part, 10) || 0);
  const partsB = versionB.split('.').map((part) => parseInt(part, 10) || 0);

  // Compare each part of the version
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const a = partsA[i] || 0;
    const b = partsB[i] || 0;

    if (a > b) return true;
    if (a < b) return false;
  }

  return false; // Equal versions
}

/**
 * Search for multiple packages in batch
 * @param packages The packages to search for
 * @param ecosystem The package ecosystem
 * @param limit The maximum number of packages to search for
 * @returns Security information for the packages
 */
export async function batchSearchPackageSecurity(
  packages: PackageInfo[],
  ecosystem: 'npm' | 'composer' | 'pip' | 'gem',
  limit = 5,
): Promise<DependencySecurityInfo[]> {
  const results: DependencySecurityInfo[] = [];

  if (!hasSerpApiConfig()) {
    logger.debug('SerpAPI is not configured. Skipping batch security search.');
    return results;
  }

  // Limit the number of packages to search for
  const packagesToSearch = packages.slice(0, limit);

  // Search for each package
  for (const pkg of packagesToSearch) {
    const result = await searchPackageSecurity(pkg, ecosystem);
    if (result) {
      results.push(result);
    }

    // Add a small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Format security information for display
 * @param securityInfo The security information to format
 * @returns Formatted security information
 */
export function formatSecurityInfo(securityInfo: DependencySecurityInfo[]): string {
  if (securityInfo.length === 0) {
    return 'No security information found for dependencies.';
  }

  let output = '## Dependency Security Analysis\n\n';

  for (const info of securityInfo) {
    output += `### ${info.packageName} ${info.packageVersion ? `(${info.packageVersion})` : ''}\n\n`;

    // Add package health information
    if (info.packageHealth) {
      const healthInfo = [];
      if (info.packageHealth.status) {
        healthInfo.push(`Status: ${info.packageHealth.status}`);
      }
      if (info.packageHealth.lastUpdated) {
        healthInfo.push(`Last updated: ${info.packageHealth.lastUpdated}`);
      }
      if (info.packageHealth.popularity) {
        healthInfo.push(`Popularity: ${info.packageHealth.popularity}`);
      }

      if (healthInfo.length > 0) {
        output += `**Package Health:** ${healthInfo.join(', ')}\n\n`;
      }
    }

    // Add deprecation information
    if (info.deprecationInfo) {
      output += `⚠️ **Deprecation Warning:** ${info.deprecationInfo}\n\n`;
    }

    // Add recommended version
    if (info.recommendedVersion) {
      output += `✅ **Recommended Version:** ${info.recommendedVersion}\n\n`;
    }

    // Add vulnerabilities
    if (info.vulnerabilities.length > 0) {
      output += '#### Vulnerabilities\n\n';

      for (const vuln of info.vulnerabilities) {
        const severityEmoji = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢',
          unknown: '⚪',
        }[vuln.severity];

        output += `${severityEmoji} **Severity:** ${vuln.severity}\n\n`;
        output += `${vuln.description}\n\n`;

        if (vuln.affectedVersions) {
          output += `**Affected Versions:** ${vuln.affectedVersions}\n\n`;
        }

        if (vuln.fixedVersions) {
          output += `**Fixed in:** ${vuln.fixedVersions}\n\n`;
        }

        if (vuln.url) {
          output += `**More Info:** [${vuln.url}](${vuln.url})\n\n`;
        }
      }
    }

    // Add sources
    if (info.sources.length > 0) {
      output += '#### Sources\n\n';

      for (const source of info.sources) {
        output += `- [${new URL(source).hostname}](${source})\n`;
      }

      output += '\n';
    }

    output += '---\n\n';
  }

  return output;
}
