/**
 * @fileoverview Install MCP server command
 *
 * This module implements the 'ai-code-review install' command which registers
 * the AI Code Review MCP server in Claude Desktop and other coding tools.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import logger from '../utils/logger';
import { configExists, loadProjectConfig, toLegacyConfig } from '../utils/projectConfigManager';
import { detectToolchain, getToolchainDescription } from '../utils/toolchainDetector';

/**
 * MCP server configuration for Claude Desktop
 */
interface ClaudeDesktopConfig {
  mcpServers?: {
    [key: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}

/**
 * Get the path to Claude Desktop config file
 * @returns Path to Claude Desktop config
 */
function getClaudeDesktopConfigPath(): string {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json',
    );
  }
  if (platform === 'win32') {
    // Windows
    return path.join(os.homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
  }
  // Linux
  return path.join(os.homedir(), '.config', 'Claude', 'claude_desktop_config.json');
}

/**
 * Load Claude Desktop configuration
 * @returns Configuration object
 */
function loadClaudeDesktopConfig(): ClaudeDesktopConfig {
  const configPath = getClaudeDesktopConfigPath();

  if (!fs.existsSync(configPath)) {
    return { mcpServers: {} };
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content) as ClaudeDesktopConfig;
  } catch (error) {
    logger.error(`Failed to load Claude Desktop config: ${error}`);
    return { mcpServers: {} };
  }
}

/**
 * Save Claude Desktop configuration
 * @param config Configuration to save
 */
function saveClaudeDesktopConfig(config: ClaudeDesktopConfig): void {
  const configPath = getClaudeDesktopConfigPath();
  const configDir = path.dirname(configPath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  // Write config file
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Get the command to run ai-code-review MCP server
 * @returns Command array [command, ...args]
 */
function getMcpServerCommand(): { command: string; args: string[] } {
  // Detect if ai-code-review is installed globally or locally
  const globalNpxPath = '/usr/local/bin/npx';
  const homebrewNpxPath = '/opt/homebrew/bin/npx';

  // Check for npx availability
  let npxCommand = 'npx';

  if (fs.existsSync(homebrewNpxPath)) {
    npxCommand = homebrewNpxPath;
  } else if (fs.existsSync(globalNpxPath)) {
    npxCommand = globalNpxPath;
  }

  return {
    command: npxCommand,
    args: ['@bobmatnyc/ai-code-review', 'mcp'],
  };
}

/**
 * Create project-level MCP configuration
 * @param projectPath Path to the project root
 */
function createProjectMcpConfig(projectPath: string): void {
  const mcpConfigPath = path.join(projectPath, '.mcp.json');

  const { command, args } = getMcpServerCommand();

  const mcpConfig = {
    mcpServers: {
      'ai-code-review': {
        command,
        args,
        env: {
          PROJECT_PATH: projectPath,
        },
      },
    },
  };

  fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2), 'utf-8');
  console.log(`✅ Created project-level MCP config: ${mcpConfigPath}`);
}

/**
 * Handle the install command
 */
export async function handleInstallCommand(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         AI Code Review - MCP Server Installation              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Check if project is initialized
  if (!configExists()) {
    console.log('⚠️  Project not initialized. Run "ai-code-review init" first.\n');
    console.log('However, you can still install the MCP server...\n');
  }

  // Detect toolchain
  console.log('🔍 Detecting project toolchain...\n');
  const toolchainInfo = detectToolchain();
  const toolchainDesc = getToolchainDescription(toolchainInfo);

  console.log(`Detected: ${toolchainDesc}`);
  console.log(`Config files: ${toolchainInfo.configFiles.join(', ')}\n`);

  // Get MCP server command
  const { command, args } = getMcpServerCommand();

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                 MCP Server Configuration');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Server Command:');
  console.log(`  ${command} ${args.join(' ')}\n`);

  // Create project-level MCP config
  console.log('📝 Creating project-level MCP configuration...');
  createProjectMcpConfig(process.cwd());

  // Register with Claude Desktop
  console.log('\n📝 Registering with Claude Desktop...');

  try {
    const config = loadClaudeDesktopConfig();

    // Initialize mcpServers if not present
    if (!config.mcpServers) {
      config.mcpServers = {};
    }

    // Add or update ai-code-review server
    const projectName = path.basename(process.cwd());
    const serverKey = `ai-code-review-${projectName}`;

    config.mcpServers[serverKey] = {
      command,
      args,
      env: {
        PROJECT_PATH: process.cwd(),
      },
    };

    // Add API keys from project config if available
    const projectConfig = loadProjectConfig();
    if (projectConfig) {
      const legacyConfig = toLegacyConfig(projectConfig);
      if (legacyConfig.apiKeys) {
        if (!config.mcpServers[serverKey].env) {
          config.mcpServers[serverKey].env = {};
        }

        if (legacyConfig.apiKeys.openrouter) {
          config.mcpServers[serverKey].env!.OPENROUTER_API_KEY = legacyConfig.apiKeys.openrouter;
        }
        if (legacyConfig.apiKeys.anthropic) {
          config.mcpServers[serverKey].env!.ANTHROPIC_API_KEY = legacyConfig.apiKeys.anthropic;
        }
        if (legacyConfig.apiKeys.google) {
          config.mcpServers[serverKey].env!.GOOGLE_API_KEY = legacyConfig.apiKeys.google;
        }
        if (legacyConfig.apiKeys.openai) {
          config.mcpServers[serverKey].env!.OPENAI_API_KEY = legacyConfig.apiKeys.openai;
        }
      }
    }

    saveClaudeDesktopConfig(config);

    const configPath = getClaudeDesktopConfigPath();
    console.log(`✅ Registered with Claude Desktop: ${configPath}`);
    console.log(`   Server key: ${serverKey}\n`);
  } catch (error) {
    console.log(`❌ Failed to register with Claude Desktop: ${error}`);
    console.log('You may need to manually configure Claude Desktop.\n');
  }

  // Display success message and next steps
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    Installation Complete!');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('✅ MCP server installed successfully!\n');

  console.log('Configuration files created:');
  console.log('  • .mcp.json (project-level MCP config)');
  console.log(`  • ${getClaudeDesktopConfigPath()} (Claude Desktop config)\n`);

  console.log('How coding apps can connect:');
  console.log('  1. Claude Desktop: Restart the app to load the new MCP server');
  console.log('  2. VS Code with Claude extension: Configure MCP in settings');
  console.log('  3. Other MCP-compatible tools: Use .mcp.json configuration\n');

  console.log('Available MCP Tools:');
  console.log('  • code-review: Perform comprehensive code reviews');
  console.log('  • pr-review: Review GitHub pull requests');
  console.log('  • file-analysis: Analyze individual files');
  console.log('  • git-analysis: Analyze git repository history\n');

  console.log('Next steps:');
  console.log('  1. Restart Claude Desktop to load the MCP server');
  console.log('  2. In Claude, ask: "Review the file src/index.ts"');
  console.log('  3. Or: "Review the changes in PR #123"\n');

  console.log('💡 Tip: The MCP server will automatically use your project');
  console.log('   configuration from .ai-code-review/config.json\n');
}
