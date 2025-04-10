#!/usr/bin/env node

/**
 * @fileoverview Main entry point for the AI Code Review CLI tool.
 *
 * This file serves as the primary entry point for the AI Code Review command-line interface.
 * It handles environment variable loading, command-line argument parsing, and dispatches
 * to the appropriate command handlers. The tool supports multiple review types including
 * quick fixes, architectural reviews, security reviews, and performance reviews.
 *
 * Key responsibilities:
 * - Loading environment variables from .env.local
 * - Setting up command-line interface and argument parsing
 * - Dispatching to appropriate command handlers based on user input
 * - Providing help and usage information
 * - Handling model testing and verification
 *
 * Usage: ai-code-review [file|directory] [options]
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

// Set log level to DEBUG if debug mode is enabled
if (isDebugMode) {
  logger.setLogLevel(LogLevel.DEBUG);
}

// First try to load from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
debugLog(`Attempting to load environment variables from: ${envLocalPath}`);

// Check if .env.local exists
let envFileExists = false;
try {
  envFileExists = fs.existsSync(envLocalPath);
} catch (err) {
  logger.error('Error checking if .env.local exists:', err);
}

if (envFileExists) {
  // Load .env.local
  const result = dotenv.config({ path: envLocalPath });

  if (result.error) {
    console.error('Error parsing .env.local file:', result.error);
  } else {
    debugLog('Successfully loaded environment variables from .env.local');
  }

  // Read the file content for debugging
  try {
    if (isDebugMode) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      debugLog('Variables found in .env.local (names only):');
      const varNames = envContent
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.split('=')[0]);
      debugLog(varNames.join(', '));
    }
  } catch (err) {
    console.error('Error reading .env.local file:', err);
  }
} else {
  console.warn('.env.local file not found. Trying to load from .env');
  // Try to load from .env as fallback
  const envPath = path.resolve(process.cwd(), '.env');
  try {
    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.error('Error loading .env file:', result.error);
    } else {
      debugLog('Successfully loaded environment variables from .env');
    }
  } catch (err) {
    console.error('Error loading any environment files:', err);
  }
}

// Import other dependencies after environment setup
import { getConfig, validateConfigForSelectedModel, hasAnyApiKey } from './utils/config';

import { reviewCode } from './commands/reviewCode';
import { runApiConnectionTests } from './tests/apiConnectionTest';
import { getCommandLineArguments } from './cli/argumentParser';
import { initI18n, t } from './utils/i18n';
import { PluginManager } from './plugins/PluginManager';
import { PromptManager } from './prompts/PromptManager';

// Hardcoded version number to ensure --version flag works correctly
// This is more reliable than requiring package.json which can be affected by npm installation issues
const VERSION = '1.5.5';

// Main function to run the application
async function main() {
  try {
    // Parse command-line arguments
    const args = await getCommandLineArguments();

    // Check for version flag first, before any other processing
    if (args.version) {
      console.log(VERSION);
      return;
    }

    // Load and validate configuration with CLI overrides
    const config = getConfig(args);

    // Check if we have any API keys
    if (!hasAnyApiKey()) {
      console.error('No API keys are available. Please add at least one API key.');
      console.error('Please make sure your .env.local file contains one of:');
      console.error('- AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here');
      console.error('- AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here');
      console.error('- AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here');
      console.error('Or provide an API key via command-line flags:');
      console.error('- --google-api-key=your_google_api_key_here');
      console.error('- --openrouter-api-key=your_openrouter_api_key_here');
      console.error('- --anthropic-api-key=your_anthropic_api_key_here');
      console.error('- --openai-api-key=your_openai_api_key_here');
      process.exit(1);
    }

    // Validate that we have the required API key for the selected model
    const validationResult = validateConfigForSelectedModel();
    if (!validationResult.valid) {
      console.error(validationResult.message);
      process.exit(1);
    }

    // Log the selected model
    const [provider, model] = config.selectedModel.split(':');
    console.log(`Using ${provider} API with model: ${model}`);

    // Initialize i18n with the selected UI language
    await initI18n(args.uiLanguage);

    // Log the selected language
    if (args.uiLanguage && args.uiLanguage !== 'en') {
      const languageName = args.uiLanguage === 'es' ? 'Español' :
                          args.uiLanguage === 'fr' ? 'Français' :
                          args.uiLanguage === 'de' ? 'Deutsch' :
                          args.uiLanguage === 'ja' ? '日本語' :
                          args.uiLanguage;
      logger.info(t('app.language_selected', { language: languageName }));
    }

    // Load plugins
    const pluginManager = PluginManager.getInstance();

    // First try to load plugins from the current directory
    const localPluginsDir = path.resolve(process.cwd(), 'plugins');
    await pluginManager.loadPlugins(localPluginsDir);

    // Then try to load plugins from the package directory
    const packagePluginsDir = path.resolve(__dirname, '..', 'plugins', 'examples');
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
    const localTemplatesDir = path.resolve(process.cwd(), 'prompts', 'templates');
    await promptManager.loadTemplates(localTemplatesDir);

    // Then try to load templates from the package directory
    const packageTemplatesDir = path.resolve(__dirname, 'prompts', 'templates');
    await promptManager.loadTemplates(packageTemplatesDir);

    // Log the loaded templates
    const templates = promptManager.listTemplates();
    if (templates.length > 0) {
      logger.info(`Loaded ${templates.length} prompt templates:`);
      templates.forEach(template => {
        logger.info(`- ${template.name}: ${template.description} (${template.reviewType})`);
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
        logger.error(t('errors.api_test_failed', { message: error instanceof Error ? error.message : String(error) }));

        // Add a helpful message about common API issues
        logger.info('\n' + t('errors.common_solutions.title'));
        logger.info(t('errors.common_solutions.check_api_keys'));
        logger.info(t('errors.common_solutions.check_internet'));
        logger.info(t('errors.common_solutions.check_services'));
        logger.info(t('errors.common_solutions.check_rate_limits'));

        process.exit(1);
      }
    }

    // Run the code review
    await reviewCode(args.target, args);
  } catch (error) {
    // Format the error message for better readability
    logger.error(t('errors.review_failed', { message: error instanceof Error ? error.message : String(error) }));

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
  logger.error(t('errors.unhandled', { message: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
