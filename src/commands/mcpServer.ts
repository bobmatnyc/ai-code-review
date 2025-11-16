/**
 * @fileoverview MCP Server Command
 *
 * This module implements the command to start the AI Code Review MCP server,
 * making the tool accessible through the Model Context Protocol.
 */

import chalk from 'chalk';
import { Command } from 'commander';
import { McpServer } from '../mcp/server/McpServer';
import type { McpServerConfig } from '../mcp/types';
import { getConfig } from '../utils/config';
import logger from '../utils/logger';
import { VERSION_WITH_BUILD } from '../version';

/**
 * MCP Server command
 */
export const mcpServerCommand = new Command('mcp')
  .description('Start the AI Code Review MCP (Model Context Protocol) server')
  .option('--debug', 'Enable debug logging', false)
  .option('--name <name>', 'Server name', 'ai-code-review')
  .option('--max-requests <number>', 'Maximum concurrent requests', '5')
  .option('--timeout <number>', 'Request timeout in milliseconds', '300000')
  .action(async (options) => {
    try {
      await startMcpServer(options);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to start MCP server: ${errorMessage}`);
      process.exit(1);
    }
  });

/**
 * Start the MCP server
 */
async function startMcpServer(options: {
  debug?: boolean;
  name?: string;
  maxRequests?: string;
  timeout?: string;
}): Promise<void> {
  const { debug = false, name = 'ai-code-review', maxRequests = '5', timeout = '300000' } = options;

  // Set debug logging if requested
  if (debug) {
    process.env.DEBUG = 'true';
    logger.info('Debug logging enabled');
  }

  // Load configuration
  const config = getConfig();

  // Build MCP server configuration
  const mcpConfig: McpServerConfig = {
    name,
    version: VERSION_WITH_BUILD,
    tools: [], // Will be populated by the server
    defaultModel: config.selectedModel,
    apiKeys: {
      google: config.googleApiKey,
      anthropic: config.anthropicApiKey,
      openai: config.openAIApiKey,
      openrouter: config.openRouterApiKey,
    },
    settings: {
      maxConcurrentRequests: parseInt(maxRequests, 10),
      requestTimeout: parseInt(timeout, 10),
      debug,
    },
  };

  // Display startup information
  console.log(chalk.blue.bold('\n🤖 AI Code Review MCP Server\n'));
  console.log(chalk.gray(`Version: ${VERSION_WITH_BUILD}`));
  console.log(chalk.gray(`Server Name: ${name}`));
  console.log(chalk.gray(`Max Concurrent Requests: ${maxRequests}`));
  console.log(chalk.gray(`Request Timeout: ${timeout}ms`));

  if (mcpConfig.defaultModel) {
    console.log(chalk.gray(`Default Model: ${mcpConfig.defaultModel}`));
  }

  console.log(chalk.gray(`Debug Mode: ${debug ? 'enabled' : 'disabled'}`));
  console.log();

  // Check API key configuration
  const availableProviders = [];
  if (mcpConfig.apiKeys?.google) availableProviders.push('Google Gemini');
  if (mcpConfig.apiKeys?.anthropic) availableProviders.push('Anthropic Claude');
  if (mcpConfig.apiKeys?.openai) availableProviders.push('OpenAI');
  if (mcpConfig.apiKeys?.openrouter) availableProviders.push('OpenRouter');

  if (availableProviders.length === 0) {
    console.log(chalk.yellow('⚠️  Warning: No API keys configured. Some features may not work.'));
    console.log(chalk.gray('   Configure API keys in .env.local or environment variables.'));
  } else {
    console.log(chalk.green(`✅ Available Providers: ${availableProviders.join(', ')}`));
  }

  console.log();

  // Display available tools
  console.log(chalk.cyan.bold('📋 Available Tools:'));
  console.log(chalk.cyan('  • code-review     - Comprehensive code analysis and review'));
  console.log(chalk.cyan('  • pr-review       - Pull Request diff analysis and review'));
  console.log(chalk.cyan('  • git-analysis    - Git repository history and pattern analysis'));
  console.log(chalk.cyan('  • file-analysis   - Individual file analysis and metrics'));
  console.log();

  // Display usage information
  console.log(chalk.magenta.bold('🔗 MCP Integration:'));
  console.log(chalk.magenta('  Add this server to your MCP client configuration:'));
  console.log();
  console.log(chalk.gray('  Claude Desktop (config.json):'));
  console.log(chalk.gray('  {'));
  console.log(chalk.gray('    "mcpServers": {'));
  console.log(chalk.gray(`      "ai-code-review": {`));
  console.log(chalk.gray(`        "command": "ai-code-review",`));
  console.log(chalk.gray(`        "args": ["mcp"]`));
  console.log(chalk.gray('      }'));
  console.log(chalk.gray('    }'));
  console.log(chalk.gray('  }'));
  console.log();

  // Create and start the MCP server
  const server = new McpServer(mcpConfig);

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down MCP server...'));
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log(chalk.yellow('\n🛑 Shutting down MCP server...'));
    await server.stop();
    process.exit(0);
  });

  // Start the server
  console.log(chalk.green.bold('🚀 Starting MCP server...\n'));
  await server.start();
}

/**
 * Display MCP installation instructions
 */
export function displayMcpInstructions(): void {
  console.log(chalk.blue.bold('\n📖 MCP Integration Instructions\n'));

  console.log(chalk.cyan.bold('1. Claude Desktop Integration:'));
  console.log(chalk.gray('   Edit your Claude Desktop configuration file:'));
  console.log(
    chalk.gray('   • macOS: ~/Library/Application Support/Claude/claude_desktop_config.json'),
  );
  console.log(chalk.gray('   • Windows: %APPDATA%\\Claude\\claude_desktop_config.json'));
  console.log();

  console.log(chalk.gray('   Add the AI Code Review server:'));
  console.log(chalk.gray('   {'));
  console.log(chalk.gray('     "mcpServers": {'));
  console.log(chalk.gray('       "ai-code-review": {'));
  console.log(chalk.gray('         "command": "ai-code-review",'));
  console.log(chalk.gray('         "args": ["mcp"]'));
  console.log(chalk.gray('       }'));
  console.log(chalk.gray('     }'));
  console.log(chalk.gray('   }'));
  console.log();

  console.log(chalk.cyan.bold('2. Environment Setup:'));
  console.log(chalk.gray('   Configure your API keys in .env.local:'));
  console.log(chalk.gray('   AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_key'));
  console.log(chalk.gray('   AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_key'));
  console.log(chalk.gray('   AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_key'));
  console.log(chalk.gray('   AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_key'));
  console.log();

  console.log(chalk.cyan.bold('3. Usage:'));
  console.log(chalk.gray('   Once configured, you can use these tools in Claude Desktop:'));
  console.log(chalk.gray('   • "Review this code file for security issues"'));
  console.log(chalk.gray('   • "Analyze the git history of this repository"'));
  console.log(chalk.gray('   • "Perform a comprehensive code review"'));
  console.log(chalk.gray('   • "Review this pull request for performance issues"'));
  console.log();

  console.log(chalk.green.bold('🎉 Ready to enhance your coding workflow with AI!'));
  console.log();
}
