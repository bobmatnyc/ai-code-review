/**
 * @fileoverview Type definitions for MCP (Model Context Protocol) integration
 *
 * This module defines types for the AI Code Review MCP server, including
 * tool definitions, request/response types, and configuration interfaces.
 */

import type { ReviewOptions, ReviewType } from '../../types/review';

/**
 * MCP Tool definitions for AI Code Review
 */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Code review tool input parameters
 */
export interface CodeReviewToolInput {
  /** Path to file or directory to review */
  target: string;
  /** Type of review to perform */
  reviewType?: ReviewType;
  /** Output format (markdown or json) */
  outputFormat?: 'markdown' | 'json';
  /** Model to use for the review */
  model?: string;
  /** Whether to include tests in the review */
  includeTests?: boolean;
  /** Whether to include project documentation */
  includeProjectDocs?: boolean;
  /** Programming language hint */
  language?: string;
  /** Framework context */
  framework?: string;
  /** Additional review options */
  options?: Partial<ReviewOptions>;
}

/**
 * PR review tool input parameters
 */
export interface PrReviewToolInput {
  /** GitHub repository URL or local git repository path */
  repository: string;
  /** PR number (for GitHub) or branch name (for local) */
  prNumber?: number;
  /** Base branch to compare against */
  baseBranch?: string;
  /** Head branch to review */
  headBranch?: string;
  /** Type of review to perform */
  reviewType?: ReviewType;
  /** Focus areas for the review */
  focusAreas?: string[];
  /** Whether to generate PR comments */
  generateComments?: boolean;
}

/**
 * Git analysis tool input parameters
 */
export interface GitAnalysisToolInput {
  /** Repository path */
  repository: string;
  /** Number of commits to analyze */
  commitCount?: number;
  /** Branch to analyze */
  branch?: string;
  /** Analysis type */
  analysisType?: 'commits' | 'changes' | 'patterns' | 'quality';
  /** Date range for analysis */
  since?: string;
  until?: string;
}

/**
 * File analysis tool input parameters
 */
export interface FileAnalysisToolInput {
  /** File path to analyze */
  filePath: string;
  /** Analysis type */
  analysisType?: 'syntax' | 'complexity' | 'security' | 'performance' | 'patterns';
  /** Programming language (auto-detected if not provided) */
  language?: string;
  /** Framework context */
  framework?: string;
}

/**
 * MCP server configuration
 */
export interface McpServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Available tools */
  tools: McpTool[];
  /** Default model configuration */
  defaultModel?: string;
  /** API key configuration */
  apiKeys?: {
    google?: string;
    anthropic?: string;
    openai?: string;
    openrouter?: string;
  };
  /** Server settings */
  settings?: {
    /** Maximum concurrent requests */
    maxConcurrentRequests?: number;
    /** Request timeout in milliseconds */
    requestTimeout?: number;
    /** Enable debug logging */
    debug?: boolean;
  };
}

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
  /** Whether the execution was successful */
  success: boolean;
  /** Result data */
  data?: any;
  /** Error message if execution failed */
  error?: string;
  /** Execution metadata */
  metadata?: {
    /** Execution time in milliseconds */
    executionTime?: number;
    /** Model used */
    model?: string;
    /** Token usage */
    tokenUsage?: {
      input: number;
      output: number;
      total: number;
    };
  };
}

/**
 * MCP request context
 */
export interface McpRequestContext {
  /** Request ID */
  requestId: string;
  /** Tool name being executed */
  toolName: string;
  /** Request timestamp */
  timestamp: Date;
  /** Client information */
  client?: {
    name?: string;
    version?: string;
  };
}
