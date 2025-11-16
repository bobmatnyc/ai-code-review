/**
 * @fileoverview MCP (Model Context Protocol) Server for AI Code Review
 *
 * This module implements the core MCP server that provides AI code review
 * capabilities through the Model Context Protocol, making the tool accessible
 * to MCP-compatible AI assistants like Claude Desktop.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  type CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import logger from '../../utils/logger';
import { CodeReviewTool } from '../tools/CodeReviewTool';
import { FileAnalysisTool } from '../tools/FileAnalysisTool';
import { GitAnalysisTool } from '../tools/GitAnalysisTool';
import { PrReviewTool } from '../tools/PrReviewTool';
import { ReviewTool } from '../tools/ReviewTool';
import type { McpRequestContext, McpServerConfig, ToolExecutionResult } from '../types';

/**
 * AI Code Review MCP Server
 *
 * Provides code review capabilities through the Model Context Protocol,
 * enabling AI assistants to perform code reviews, PR analysis, and
 * git repository analysis.
 */
export class McpServer {
  private server: Server;
  private config: McpServerConfig;
  private tools: Map<string, any>;

  constructor(config: McpServerConfig) {
    this.config = config;
    this.tools = new Map();

    // Initialize MCP server
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.initializeTools();
    this.setupHandlers();
  }

  /**
   * Initialize available tools
   */
  private initializeTools(): void {
    // Register unified review tool (primary interface)
    this.tools.set('review', new ReviewTool());

    // Register specialized code review tools
    this.tools.set('code-review', new CodeReviewTool());
    this.tools.set('pr-review', new PrReviewTool());
    this.tools.set('git-analysis', new GitAnalysisTool());
    this.tools.set('file-analysis', new FileAnalysisTool());

    logger.info(`Initialized ${this.tools.size} MCP tools`);
  }

  /**
   * Setup MCP request handlers
   */
  private setupHandlers(): void {
    // Handle tool listing requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.values()).map((tool) => tool.getDefinition());

      logger.debug(`Listing ${tools.length} available tools`);

      return {
        tools,
      };
    });

    // Handle tool execution requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;

      const context: McpRequestContext = {
        requestId: Math.random().toString(36).substring(7),
        toolName: name,
        timestamp: new Date(),
      };

      logger.info(`Executing tool: ${name} with request ID: ${context.requestId}`);

      try {
        const tool = this.tools.get(name);
        if (!tool) {
          throw new Error(`Unknown tool: ${name}`);
        }

        const startTime = Date.now();
        const result = await tool.execute(args, context);
        const executionTime = Date.now() - startTime;

        logger.info(`Tool ${name} executed successfully in ${executionTime}ms`);

        return {
          content: [
            {
              type: 'text',
              text: this.formatToolResult(result, executionTime),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Tool execution failed for ${name}: ${errorMessage}`);

        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Format tool execution result for MCP response
   */
  private formatToolResult(result: ToolExecutionResult, executionTime: number): string {
    if (!result.success) {
      return `❌ **Execution Failed**\n\nError: ${result.error}`;
    }

    let output = `✅ **Execution Successful**\n\n`;

    if (result.metadata?.model) {
      output += `**Model Used:** ${result.metadata.model}\n`;
    }

    output += `**Execution Time:** ${executionTime}ms\n\n`;

    if (result.metadata?.tokenUsage) {
      const { input, output: outputTokens, total } = result.metadata.tokenUsage;
      output += `**Token Usage:**\n- Input: ${input}\n- Output: ${outputTokens}\n- Total: ${total}\n\n`;
    }

    output += `**Result:**\n\n${result.data}`;

    return output;
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();

    logger.info(`Starting AI Code Review MCP Server v${this.config.version}`);
    logger.info(`Available tools: ${Array.from(this.tools.keys()).join(', ')}`);

    await this.server.connect(transport);

    logger.info('MCP Server started successfully');
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    logger.info('Stopping MCP Server...');
    await this.server.close();
    logger.info('MCP Server stopped');
  }

  /**
   * Get server configuration
   */
  getConfig(): McpServerConfig {
    return { ...this.config };
  }

  /**
   * Get available tools
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }
}
