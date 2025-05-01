
/**
 * @fileoverview Main entry point for the AI Code Review CLI tool.
 *
 * This file serves as the primary entry point for the AI Code Review command-line interface.
 * It handles environment variable loading, command-line argument parsing, and dispatches
 * to the appropriate command handlers. The tool supports multiple review types including
 * quick fixes, architectural reviews, security reviews, performance reviews, and unused code detection.
 *
 * Key responsibilities:
 * - Loading environment variables from .env.local
 * - Setting up command-line interface and argument parsing
 * - Dispatching to appropriate command handlers based on user input
 * - Providing help and usage information
 * - Handling model testing and verification
 * - Testing model functionality and API keys
 *
 * Usage: ai-code-review [file|directory] [options]
 *        ai-code-review model-test [provider:model] [options]
 *        ai-code-review test-build [options]
 */

// Load dotenv as early as possible
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Import logger after dotenv so it can use environment variables
import logger, { LogLevel } from './utils/logger';

// Check if debug mode is enabled
const isDebugMode = process.argv.includes('--debug');

// Helper function for debug logging
function debugLog(message: string): void {
  if (isDebugMode) {
    logger.debug(message);
  }
}

// Set log level based on debug mode
if (isDebugMode) {
  logger.setLogLevel(LogLevel.DEBUG);
} else {
  // In production builds, ensure we're at INFO level or higher
  // This prevents DEBUG messages from showing in production
  const currentLevel = logger.getLogLevel();
  if (currentLevel < LogLevel.INFO) {
    logger.setLogLevel(LogLevel.INFO);
  }
}

// First try to load from the tool's directory (not the target project directory)
// We need to handle both local development and global installation
// When installed globally, the structure might be different
let possibleToolDirectories = [
  path.resolve(__dirname, '..'), // Local development or npm link
  path.resolve(__dirname, '..', '..'), // Global npm installation
  '/opt/homebrew/lib/node_modules/@bobmatnyc/ai-code-review' // Homebrew global installation
];

// Check for environment variable specifying the tool directory
if (process.env.AI_CODE_REVIEW_DIR) {
  possibleToolDirectories.unshift(process.env.AI_CODE_REVIEW_DIR);
  debugLog(`Using tool directory from AI_CODE_REVIEW_DIR: ${process.env.AI_CODE_REVIEW_DIR}`);
}

// Find first directory that contains .env.local
let toolEnvPath = '';
let toolDirectory = '';

// Check each possible tool directory for .env.local
for (const dir of possibleToolDirectories) {
  const envPath = path.resolve(dir, '.env.local');
  debugLog(`Checking for tool .env.local in: ${envPath}`);

  try {
    if (fs.existsSync(envPath)) {
      toolEnvPath = envPath;
      toolDirectory = dir;
      debugLog(`Found tool .env.local at: ${toolEnvPath}`);
      break;
    }
  } catch (err) {
    // Continue to next directory
  }
}

// If we found a tool .env.local, use it
if (toolEnvPath) {
  // Load .env.local from tool directory
  const result = dotenv.config({ path: toolEnvPath });

  if (result.error) {
    console.error('Error parsing tool .env.local file:', result.error);
  } else {
    debugLog(`Successfully loaded environment variables from ${toolEnvPath}`);
  }

  // Read the file content for debugging
  try {
    if (isDebugMode) {
      const envContent = fs.readFileSync(toolEnvPath, 'utf8');
      debugLog('Variables found in tool .env.local (names only):');
      const varNames = envContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.split('=')[0]);
      debugLog(varNames.join(', '));
    }
  } catch (err) {
    console.error('Error reading tool .env.local file:', err);
  }
} else {
  // If not found in any tool directory, fall back to current working directory
  console.log('No .env.local found in tool directory. Looking in current directory...');
  const envLocalPath = path.resolve(process.cwd(), '.env.local');

  try {
    const cwdEnvExists = fs.existsSync(envLocalPath);
    if (cwdEnvExists) {
      const result = dotenv.config({ path: envLocalPath });
      if (result.error) {
        console.log('Could not parse .env.local file. Will use environment variables or command-line arguments.');
        debugLog(`Parse error: ${result.error.message}`);
      } else {
        debugLog(`Successfully loaded environment variables from ${envLocalPath}`);
      }
    } else {
      // Give a clearer message when no env files are found
      console.log('No .env.local file found. Using environment variables and command-line arguments only.');
      console.log('You can create a .env.local file with your API keys or specify them via command-line flags.');
      debugLog('Continuing without local environment file.');
    }
  } catch (err) {
    console.log('No .env.local file found. Using environment variables and command-line arguments only.');
    debugLog(`Error checking for environment files: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// Import other dependencies after environment setup
import {
  getConfig,
  validateConfigForSelectedModel,
  hasAnyApiKey
} from './utils/config';

import { reviewCode } from './commands/reviewCode';
import { testModelCommand } from './commands/testModel';
import { testBuildCommand } from './commands/testBuild';
import { runApiConnectionTests } from './tests/apiConnectionTest';
import { getCommandLineArguments } from './cli/argumentParser';
import { initI18n, t } from './utils/i18n';
import { PluginManager } from './plugins/PluginManager';
import { PromptManager } from './prompts/PromptManager';
import { listModelConfigs } from './clients/utils/modelLister';
import { handleSyncGitHubProjectsCommand } from './commands/syncGithubProjects';

// Hardcoded version number to ensure --version flag works correctly
// This is more reliable than requiring package.json which can be affected by npm installation issues
const VERSION = '2.1.5';

// Main function to run the application
async function main() {
  try {
    // Always display version at startup
    logger.info(`AI Code Review Tool v${VERSION}`);

    // Parse command-line arguments
    const args = await getCommandLineArguments();

    // Check for version flag first, before any other processing
    if (args.version || (args as any)['show-version']) {
      console.log(VERSION);
      return;
    }

    // Check for models flag to list all supported models and their configuration names
    if (args.models) {
      listModelConfigs();
      return;
    }

    // Load and validate configuration with CLI overrides
    const config = getConfig(args);

    // Check if we have any API keys
    if (!hasAnyApiKey()) {
      console.log("\n=== API Key Required ===");
      console.log("No API keys were found in environment variables or command-line arguments.");
      console.log("\nTo provide an API key, you can:");

      console.log("\n1. Create a .env.local file with one of these entries:");
      console.log("   - AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here");
      console.log("   - AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here");
      console.log("   - AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here");
      console.log("   - AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here");

      console.log("\n2. Or specify an API key via command-line flag:");
      console.log("   - --google-api-key=your_google_api_key_here");
      console.log("   - --openrouter-api-key=your_openrouter_api_key_here");
      console.log("   - --anthropic-api-key=your_anthropic_api_key_here");
      console.log("   - --openai-api-key=your_openai_api_key_here");

      console.log("\n3. Or set an environment variable in your shell:");
      console.log("   export AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here\n");
      process.exit(1);
    }

    // Validate that we have the required API key for the selected model
    const validationResult = validateConfigForSelectedModel();
    if (!validationResult.valid) {
      console.log("\n=== API Key Missing for Selected Model ===");
      console.log(validationResult.message);
      console.log("\nPlease provide the appropriate API key for your selected model.");
      console.log("You can override the model with --model=provider:model");
      console.log("Example: --model=openai:gpt-4.1 or --model=gemini:gemini-1.5-pro\n");
      process.exit(1);
    }

    // Log the selected model
    const [provider, model] = config.selectedModel.split(':');
    console.log(`Using ${provider} API with model: ${model}`);

    // Initialize i18n with the selected UI language
    await initI18n(args.uiLanguage);

    // Log the selected language
    if (args.uiLanguage && args.uiLanguage !== 'en') {
      const languageName =
        args.uiLanguage === 'es'
          ? 'Español'
          : args.uiLanguage === 'fr'
            ? 'Français'
            : args.uiLanguage === 'de'
              ? 'Deutsch'
              : args.uiLanguage === 'ja'
                ? '日本語'
                : args.uiLanguage;
      logger.info(t('app.language_selected', { language: languageName }));
    }

    // Load plugins
    const pluginManager = PluginManager.getInstance();

    // First try to load plugins from the current directory
    const localPluginsDir = path.resolve(process.cwd(), 'plugins');
    await pluginManager.loadPlugins(localPluginsDir);

    // Then try to load plugins from the package directory
    const packagePluginsDir = path.resolve(
      __dirname,
      '..',
      'plugins',
      'examples'
    );
    await pluginManager.loadPlugins(packagePluginsDir);

    // Log the loaded plugins
    const plugins = pluginManager.listPlugins();
    if (plugins.length > 0) {
      logger.info(`Loaded ${plugins.length} plugins:`);
      plugins.forEach(plugin => {
        logger.info(`- ${plugin.name}: ${plugin.description}`);
      });
    }

    // Load prompt templates
    const promptManager = PromptManager.getInstance();

    // First try to load templates from the current directory
    const localTemplatesDir = path.resolve(
      process.cwd(),
      'prompts',
      'templates'
    );
    await promptManager.loadTemplates(localTemplatesDir);

    // Then try to load templates from the package directory
    const packageTemplatesDir = path.resolve(__dirname, 'prompts', 'templates');
    await promptManager.loadTemplates(packageTemplatesDir);

    // Log the loaded templates
    const templates = promptManager.listTemplates();
    if (templates.length > 0) {
      logger.info(`Loaded ${templates.length} prompt templates:`);
      templates.forEach(template => {
        logger.info(
          `- ${template.name}: ${template.description} (${template.reviewType})`
        );
      });
    }

    // Version flag is now checked at the beginning of the function

    // Check for test-api command
    if (args.testApi) {
      try {
        await runApiConnectionTests();
        // If we're only testing the API, exit after the test
        if (args.target === '.') {
          return;
        }
      } catch (error) {
        // Format the error message for better readability
        logger.error(
          t('errors.api_test_failed', {
            message: error instanceof Error ? error.message : String(error)
          })
        );

        // Add a helpful message about common API issues
        logger.info('\n' + t('errors.common_solutions.title'));
        logger.info(t('errors.common_solutions.check_api_keys'));
        logger.info(t('errors.common_solutions.check_internet'));
        logger.info(t('errors.common_solutions.check_services'));
        logger.info(t('errors.common_solutions.check_rate_limits'));

        process.exit(1);
      }
    }

    // Command line processing for model testing commands
    const { Command } = await import('commander');
    const program = new Command();

    // Register the model-test command
    program.addCommand(testModelCommand);

    // Register the test-build command
    program.addCommand(testBuildCommand);

    // Process model testing commands if specified
    const modelTestArgs = process.argv.slice(2);
    if (
      modelTestArgs[0] === 'model-test' ||
      modelTestArgs[0] === 'test-build'
    ) {
      program.parse(process.argv);
      return;
    }

    // Handle GitHub Projects sync command
    if (modelTestArgs[0] === 'sync-github-projects') {
      await handleSyncGitHubProjectsCommand();
      return;
    }

    // Run the code review
    await reviewCode(args.target, args);
  } catch (error) {
    // Format the error message for better readability
    logger.error(
      t('errors.review_failed', {
        message: error instanceof Error ? error.message : String(error)
      })
    );

    // Add a helpful message about common issues
    logger.info('\n' + t('errors.common_solutions.title'));
    logger.info(t('errors.common_solutions.check_directory'));
    logger.info(t('errors.common_solutions.check_target_path'));
    logger.info(t('errors.common_solutions.run_test_api'));

    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  logger.error(
    t('errors.unhandled', {
      message: error instanceof Error ? error.message : String(error)
    })
  );
  process.exit(1);
});
