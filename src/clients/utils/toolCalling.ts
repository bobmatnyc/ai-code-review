/**
 * @fileoverview Tool calling abstractions for LLM clients
 *
 * This module provides interfaces and utilities for tool calling
 * across different LLM providers.
 */

import type { PackageInfo } from '../../utils/dependencies/packageAnalyzer';
import type { DependencySecurityInfo } from '../../utils/dependencies/serpApiHelper';

/**
 * Base interface for all tool definitions
 */
export interface ToolDefinition {
  type: string;
  name: string;
  description: string;
}

/**
 * Function-style tool definition (OpenAI style)
 */
export interface FunctionToolDefinition extends ToolDefinition {
  type: 'function';
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Result of a tool call
 */
export interface ToolCallResult {
  toolName: string;
  result: any;
}

/**
 * Definition for the dependency security search tool
 */
export const DEPENDENCY_SECURITY_TOOL: FunctionToolDefinition = {
  type: 'function',
  name: 'search_dependency_security',
  description: 'Search for security information about a software package dependency',
  parameters: {
    type: 'object',
    properties: {
      package_name: {
        type: 'string',
        description: 'The name of the package to search for',
      },
      package_version: {
        type: 'string',
        description: 'The version of the package (optional)',
      },
      ecosystem: {
        type: 'string',
        enum: ['npm', 'composer', 'pip', 'gem'],
        description:
          'The package ecosystem (npm for JavaScript, composer for PHP, pip for Python, gem for Ruby)',
      },
    },
    required: ['package_name', 'ecosystem'],
  },
};

/**
 * Definition for the batch dependency security search tool
 */
export const BATCH_DEPENDENCY_SECURITY_TOOL: FunctionToolDefinition = {
  type: 'function',
  name: 'batch_search_dependency_security',
  description:
    'Search for security information about multiple package dependencies (limited to 5 packages)',
  parameters: {
    type: 'object',
    properties: {
      packages: {
        type: 'array',
        description: 'The packages to search for',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'The name of the package',
            },
            version: {
              type: 'string',
              description: 'The version of the package (optional)',
            },
          },
          required: ['name'],
        },
      },
      ecosystem: {
        type: 'string',
        enum: ['npm', 'composer', 'pip', 'gem'],
        description:
          'The package ecosystem (npm for JavaScript, composer for PHP, pip for Python, gem for Ruby)',
      },
      limit: {
        type: 'number',
        description: 'The maximum number of packages to search for (default: 5)',
      },
    },
    required: ['packages', 'ecosystem'],
  },
};

/**
 * Define all available tools
 */
export const ALL_TOOLS: FunctionToolDefinition[] = [
  DEPENDENCY_SECURITY_TOOL,
  BATCH_DEPENDENCY_SECURITY_TOOL,
];

/**
 * Interface for tool calling handlers for each LLM provider
 */
export interface ToolCallingHandler {
  /**
   * Prepare tool definitions in the format expected by the LLM provider
   * @param tools The tools to prepare
   * @returns The prepared tools
   */
  prepareTools(tools: FunctionToolDefinition[]): any;

  /**
   * Process a tool call response from the LLM
   * @param response The LLM response
   * @returns The processed tool calls
   */
  processToolCallsFromResponse(response: any): {
    toolCalls: Array<{
      id?: string;
      name: string;
      arguments: any;
    }>;
    responseMessage: string;
  };

  /**
   * Create the final request with tool results
   * @param conversation The conversation so far
   * @param toolResults The results of the tool calls
   * @returns The final request
   */
  createToolResultsRequest(
    conversation: Array<{
      role: string;
      content: string | null;
      toolCalls?: any;
      toolCallId?: string;
      name?: string;
    }>,
    toolResults: ToolCallResult[],
  ): any;
}

/**
 * Helper to extract package information from tool call arguments
 * @param args The tool call arguments
 * @returns The package information
 */
export function packageInfoFromToolArgs(args: any): PackageInfo {
  return {
    name: args.package_name,
    version: args.package_version,
  };
}

/**
 * Helper to extract package information from batch tool call arguments
 * @param args The tool call arguments
 * @returns The package information array
 */
export function packageInfosFromBatchToolArgs(args: any): PackageInfo[] {
  return (args.packages || []).map((pkg: any) => ({
    name: pkg.name,
    version: pkg.version,
  }));
}

/**
 * Format dependency security information for the model
 * @param info The security information
 * @returns Formatted information
 */
export function formatDependencySecurityInfo(info: DependencySecurityInfo | null): string {
  if (!info) {
    return 'No security information found for this dependency.';
  }

  let result = `## ${info.packageName} ${info.packageVersion ? `(${info.packageVersion})` : ''}`;

  // Add package health information
  if (info.packageHealth) {
    result += '\n\n### Package Health\n\n';
    if (info.packageHealth.status) {
      result += `- Status: ${info.packageHealth.status}\n`;
    }
    if (info.packageHealth.lastUpdated) {
      result += `- Last updated: ${info.packageHealth.lastUpdated}\n`;
    }
    if (info.packageHealth.popularity) {
      result += `- Popularity: ${info.packageHealth.popularity}\n`;
    }
  }

  // Add deprecation information
  if (info.deprecationInfo) {
    result += `\n\n### ⚠️ Deprecation Warning\n\n${info.deprecationInfo}`;
  }

  // Add recommended version
  if (info.recommendedVersion) {
    result += `\n\n### ✅ Recommended Version\n\n${info.recommendedVersion}`;
  }

  // Add vulnerabilities
  if (info.vulnerabilities.length > 0) {
    result += '\n\n### Vulnerabilities\n\n';

    for (const vuln of info.vulnerabilities) {
      const severityEmoji = {
        critical: '🔴',
        high: '🟠',
        medium: '🟡',
        low: '🟢',
        unknown: '⚪',
      }[vuln.severity];

      result += `${severityEmoji} **Severity:** ${vuln.severity}\n\n`;
      result += `${vuln.description}\n\n`;

      if (vuln.affectedVersions) {
        result += `**Affected Versions:** ${vuln.affectedVersions}\n\n`;
      }

      if (vuln.fixedVersions) {
        result += `**Fixed in:** ${vuln.fixedVersions}\n\n`;
      }

      if (vuln.url) {
        result += `**More Info:** [${vuln.url}](${vuln.url})\n\n`;
      }
    }
  }

  // Add sources
  if (info.sources.length > 0) {
    result += '\n\n### Sources\n\n';

    for (const source of info.sources) {
      result += `- [${new URL(source).hostname}](${source})\n`;
    }
  }

  return result;
}

/**
 * Format batch dependency security information for the model
 * @param infos The security information array
 * @returns Formatted information
 */
export function formatBatchDependencySecurityInfo(infos: DependencySecurityInfo[]): string {
  if (infos.length === 0) {
    return 'No security information found for any dependencies.';
  }

  return infos.map(formatDependencySecurityInfo).join('\n\n---\n\n');
}
