/**
 * @fileoverview Tool executor for executing LLM tool calls
 *
 * This module provides utilities to execute tool calls from LLMs
 * and return the results.
 */

import {
  batchSearchPackageSecurity,
  hasSerpApiConfig,
  searchPackageSecurity,
} from '../../utils/dependencies/serpApiHelper';
import logger from '../../utils/logger';
import {
  formatBatchDependencySecurityInfo,
  formatDependencySecurityInfo,
  packageInfoFromToolArgs,
  packageInfosFromBatchToolArgs,
} from './toolCalling';

/**
 * Execute a tool call and return the result
 * @param toolName The name of the tool to execute
 * @param args The arguments for the tool
 * @returns The result of the tool call
 */
export async function executeToolCall(toolName: string, args: any): Promise<any> {
  logger.debug(`Executing tool call: ${toolName} with arguments: ${JSON.stringify(args)}`);
  logger.info(`Executing dependency analysis tool: ${toolName}`);

  // Ensure SERPAPI_KEY is available
  if (!hasSerpApiConfig()) {
    logger.error(
      `SERPAPI_KEY not found in environment variables. Tool calling requires this key to be set.`,
    );
    return 'No SERPAPI_KEY configured. Tool call execution skipped.';
  }

  logger.debug(`SERPAPI_KEY is configured, proceeding with tool execution`);

  try {
    // Log detailed information about the call
    logger.info(
      `Tool call context: ${JSON.stringify({
        toolName,
        argumentsProvided: Object.keys(args),
        serpApiConfigured: hasSerpApiConfig(),
        environmentVarsAvailable: Object.keys(process.env)
          .filter((key) => key.startsWith('SERPAPI') || key.includes('API_KEY'))
          .join(', '),
      })}`,
    );

    switch (toolName) {
      case 'search_dependency_security': {
        const securityResult = await executeDependencySecuritySearch(args);
        logger.info(`Dependency security search completed for ${args.package_name}`);
        return securityResult;
      }

      case 'batch_search_dependency_security': {
        const batchResult = await executeBatchDependencySecuritySearch(args);
        logger.info(
          `Batch dependency security search completed for ${args.packages?.length || 0} packages`,
        );
        return batchResult;
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    logger.error(
      `Error executing tool call ${toolName}: ${error instanceof Error ? error.message : String(error)}`,
    );
    logger.error(
      `Error details: ${error instanceof Error && error.stack ? error.stack : 'No stack trace available'}`,
    );
    return `Error executing tool call: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}

/**
 * Execute a dependency security search
 * @param args The tool arguments
 * @returns Formatted security information
 */
async function executeDependencySecuritySearch(args: any): Promise<string> {
  // Check required arguments
  if (!args.package_name || !args.ecosystem) {
    return 'Error: package_name and ecosystem are required arguments.';
  }

  // Execute the search
  const packageInfo = packageInfoFromToolArgs(args);
  const result = await searchPackageSecurity(
    packageInfo,
    args.ecosystem as 'npm' | 'composer' | 'pip' | 'gem',
  );

  // Format the result
  return formatDependencySecurityInfo(result);
}

/**
 * Execute a batch dependency security search
 * @param args The tool arguments
 * @returns Formatted security information
 */
async function executeBatchDependencySecuritySearch(args: any): Promise<string> {
  // Check required arguments
  if (!args.packages || !Array.isArray(args.packages) || !args.ecosystem) {
    return 'Error: packages array and ecosystem are required arguments.';
  }

  // Extract package info
  const packageInfos = packageInfosFromBatchToolArgs(args);

  // Skip if no packages
  if (packageInfos.length === 0) {
    return 'No packages provided for analysis.';
  }

  // Execute the search
  const limit = args.limit && typeof args.limit === 'number' ? Math.min(args.limit, 5) : 5;

  const results = await batchSearchPackageSecurity(
    packageInfos,
    args.ecosystem as 'npm' | 'composer' | 'pip' | 'gem',
    limit,
  );

  // Format the results
  return formatBatchDependencySecurityInfo(results);
}
