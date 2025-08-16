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
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

// Start diagnostic logging immediately
console.log('\x1b[35m[ENV-TRACE]\x1b[0m Starting application - checking environment variables');

// Before loading any modules that depend on environment variables,
// ensure we check for CLI debugging flag
const isDebugMode = process.argv.includes('--debug');
const debugEnvVar = process.env.AI_CODE_REVIEW_LOG_LEVEL?.toLowerCase() === 'debug';

if (isDebugMode) {
  console.log('\x1b[35m[ENV-TRACE]\x1b[0m Debug mode enabled via --debug CLI flag');
}

if (debugEnvVar) {
  console.log(
    '\x1b[35m[ENV-TRACE]\x1b[0m Debug mode enabled via AI_CODE_REVIEW_LOG_LEVEL environment variable',
  );
}

// Log all AI_CODE_REVIEW environment variables at startup
console.log('\x1b[35m[ENV-TRACE]\x1b[0m Current AI_CODE_REVIEW environment variables:');
Object.keys(process.env).forEach((key) => {
  if (key.startsWith('AI_CODE_REVIEW_')) {
    const value = key.includes('KEY') ? '[REDACTED]' : process.env[key];
    console.log(`\x1b[35m[ENV-TRACE]\x1b[0m ${key}=${value}`);
  }
});

// Import logger after initial environment check
import logger, { LogLevel } from './utils/logger';

// Helper function for debug logging
function debugLog(message: string): void {
  if (isDebugMode || debugEnvVar) {
    console.log(`\x1b[36m[DEBUG:STARTUP]\x1b[0m ${message}`);
  }
}

// Set log level explicitly - first based on command line
if (isDebugMode) {
  debugLog('Setting log level to DEBUG (from command line flag)');
  logger.setLogLevel(LogLevel.DEBUG);
} else {
  // Check current log level for diagnostic purposes
  const currentLevel = logger.getLogLevel();
  debugLog(`Initial log level: ${LogLevel[currentLevel]}`);

  // We'll update this again after loading .env.local
}

// First try to load from the tool's directory (not the target project directory)
// We need to handle both local development and global installation
// When installed globally, the structure might be different
const possibleToolDirectories = [
  path.resolve(__dirname, '..'), // Local development or npm link
  path.resolve(__dirname, '..', '..'), // Global npm installation
  '/opt/homebrew/lib/node_modules/@bobmatnyc/ai-code-review', // Homebrew global installation
];

// Check for environment variable specifying the tool directory
if (process.env.AI_CODE_REVIEW_DIR) {
  possibleToolDirectories.unshift(process.env.AI_CODE_REVIEW_DIR);
  debugLog(`Using tool directory from AI_CODE_REVIEW_DIR: ${process.env.AI_CODE_REVIEW_DIR}`);
}

// Find first directory that contains .env.local
let toolEnvPath = '';

// Check each possible tool directory for .env.local
for (const dir of possibleToolDirectories) {
  const envPath = path.resolve(dir, '.env.local');
  debugLog(`Checking for tool .env.local in: ${envPath}`);

  try {
    if (fs.existsSync(envPath)) {
      toolEnvPath = envPath;
      // Store the tool directory in a variable we'll actually use
      debugLog(`Found tool .env.local at: ${toolEnvPath}`);
      break;
    }
  } catch (_err) {
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
        .filter((line) => line.trim() && !line.startsWith('#'))
        .map((line) => line.split('=')[0]);
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
        console.log(
          'Could not parse .env.local file. Will use environment variables or command-line arguments.',
        );
        debugLog(`Parse error: ${result.error.message}`);
      } else {
        debugLog(`Successfully loaded environment variables from ${envLocalPath}`);

        // Check if AI_CODE_REVIEW_LOG_LEVEL was loaded
        if (result.parsed?.AI_CODE_REVIEW_LOG_LEVEL) {
          debugLog(
            `Found AI_CODE_REVIEW_LOG_LEVEL in .env.local: ${result.parsed.AI_CODE_REVIEW_LOG_LEVEL}`,
          );
        }

        // Dump all environment variables for debugging (not values)
        if (isDebugMode) {
          const envVars = Object.keys(result.parsed || {});
          debugLog(`Loaded ${envVars.length} variables from .env.local: ${envVars.join(', ')}`);
        }
      }
    } else {
      // Give a clearer message when no env files are found
      console.log(
        'No .env.local file found. Using environment variables and command-line arguments only.',
      );
      console.log(
        'You can create a .env.local file with your API keys or specify them via command-line flags.',
      );
      debugLog('Continuing without local environment file.');
    }
  } catch (err) {
    console.log(
      'No .env.local file found. Using environment variables and command-line arguments only.',
    );
    debugLog(
      `Error checking for environment files: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

// Re-initialize the logger with the environment variables now loaded
// This ensures that AI_CODE_REVIEW_LOG_LEVEL from .env.local is applied
console.log(
  '\x1b[35m[ENV-TRACE]\x1b[0m After loading .env.local, AI_CODE_REVIEW environment variables:',
);
Object.keys(process.env).forEach((key) => {
  if (key.startsWith('AI_CODE_REVIEW_')) {
    const value = key.includes('KEY') ? '[REDACTED]' : process.env[key];
    console.log(`\x1b[35m[ENV-TRACE]\x1b[0m ${key}=${value}`);
  }
});

console.log('Current environment variables for logging:');
console.log(`- AI_CODE_REVIEW_LOG_LEVEL=${process.env.AI_CODE_REVIEW_LOG_LEVEL || 'not set'}`);
console.log(`- Debug flag in arguments: ${process.argv.includes('--debug')}`);

// Now that environment variables are fully loaded, make sure we apply them
// Force debug level if debug flag is present (highest priority)
if (process.argv.includes('--debug')) {
  console.log('Setting log level to DEBUG (from command line flag)');
  logger.setLogLevel('debug');
} else if (process.env.AI_CODE_REVIEW_LOG_LEVEL) {
  // Apply environment variable log level
  const logLevel = process.env.AI_CODE_REVIEW_LOG_LEVEL.toLowerCase();
  console.log(`Setting log level to: ${logLevel.toUpperCase()} (from environment variable)`);
  logger.setLogLevel(logLevel);
} else {
  // Verify current log level
  const currentLevel = logger.getLogLevel();
  console.log(`Current log level: ${LogLevel[currentLevel]} (default)`);

  // In production builds, ensure we're at INFO level or higher
  // This prevents DEBUG messages from showing in production
  if (currentLevel < LogLevel.INFO) {
    console.log(`Adjusting log level to INFO (from ${LogLevel[currentLevel]})`);
    logger.setLogLevel('info');
  }
}

import { runApiConnectionTests } from './__tests__/apiConnection.test';
import { type CliOptions, mapArgsToReviewOptions, parseArguments } from './cli/argumentParser';
import { listModelConfigs } from './clients/utils/modelLister';
import { handleGenerateConfigCommand } from './commands/generateConfig';
import { reviewCode } from './commands/reviewCode';
import { handleSyncGitHubProjectsCommand } from './commands/syncGithubProjects';
import { testBuildCommand } from './commands/testBuild';
import { testModelCommand } from './commands/testModel';
import { PluginManager } from './plugins/PluginManager';
import { PromptManager } from './prompts/PromptManager';
// Import other dependencies after environment setup
import { getConfig, hasAnyApiKey, validateConfigForSelectedModel } from './utils/config';
import { initI18n, t } from './utils/i18n';
import { VERSION, VERSION_WITH_BUILD } from './version';

// Main function to run the application
async function main() {
  try {
    // Always display version at startup with build number
    logger.info(`AI Code Review Tool v${VERSION_WITH_BUILD}`);

    // Initialize i18n early with default language
    // This ensures translations are available for error messages
    await initI18n('en');

    // Parse command-line arguments
    let argv;
    try {
      argv = parseArguments();
    } catch (parseError) {
      // Log the actual error for debugging
      console.error('Error parsing command line arguments:', parseError);
      throw parseError;
    }

    // Map to review options
    let args = mapArgsToReviewOptions(argv);

    // Store CLI-specified options to prevent config override
    const cliSpecifiedOptions = {
      debug: process.argv.includes('--debug'),
      type: process.argv.includes('--type'),
      target:
        process.argv.some((arg) => arg === './recess-test') ||
        (process.argv.length > 2 && !process.argv[2].startsWith('--')),
    };

    // Apply YAML configuration to review options if available
    const { loadConfigFile, applyConfigToOptions } = await import('./utils/configFileManager');
    const yamlConfig = loadConfigFile();
    if (yamlConfig) {
      args = applyConfigToOptions(yamlConfig, args, cliSpecifiedOptions) as typeof args;
    }

    // Check for version flag first, before any other processing
    if ((argv as any).version || (argv as any)['show-version']) {
      console.log(VERSION_WITH_BUILD);
      return;
    }

    // Check for which-dir flag to show installation directory
    if ((argv as any)['which-dir']) {
      console.log('\nAI Code Review Tool Installation Directory:');
      console.log('------------------------------------------');

      // Find all possible env file locations
      const possibleLocations = [
        path.resolve(__dirname, '..'), // Local development or npm link
        path.resolve(__dirname, '..', '..'), // Global npm installation
        '/opt/homebrew/lib/node_modules/@bobmatnyc/ai-code-review', // Homebrew global installation
      ];

      // Tool directory (where index.js is located)
      console.log(`Tool executable directory: ${__dirname}`);

      // Check each possible location for .env.local
      for (const dir of possibleLocations) {
        const envPath = path.join(dir, '.env.local');
        try {
          if (fs.existsSync(envPath)) {
            console.log(`\nFound .env.local at:`);
            console.log(envPath);
            console.log(`\nThis is the correct location for your environment variables.`);
            console.log(`Add AI_CODE_REVIEW_LOG_LEVEL=debug to this file for debug logging.`);
            break;
          }
        } catch (_err) {
          // Skip errors
        }
      }

      // Also show current directory
      console.log(`\nCurrent working directory: ${process.cwd()}`);
      console.log(`You can also create .env.local in this directory.`);

      return;
    }

    // Check for models flag to list all supported models and their configuration names
    if ((argv as any).models) {
      listModelConfigs();
      return;
    }

    // Handle generate-config command early (before API key validation)
    const modelTestArgs = process.argv.slice(2);
    if (modelTestArgs[0] === 'generate-config') {
      await handleGenerateConfigCommand(argv);
      return;
    }

    // First, load the project's .env.local file before getting config
    // This ensures project-level environment variables take precedence
    const { loadEnvVariables } = await import('./utils/envLoader');
    await loadEnvVariables();

    // Load and validate configuration with CLI overrides
    const config = getConfig(args as CliOptions);

    // Check if we have any API keys
    if (!hasAnyApiKey()) {
      console.log('\n=== API Key Required ===');
      console.log('No API keys were found in environment variables or command-line arguments.');
      console.log('\nTo provide an API key, you can:');

      console.log('\n1. Create a .env.local file with one of these entries:');
      console.log('   - AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_api_key_here');
      console.log('   - AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_api_key_here');
      console.log('   - AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_api_key_here');
      console.log('   - AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here');

      console.log('\n2. Or specify an API key via command-line flag:');
      console.log('   - --google-api-key=your_google_api_key_here');
      console.log('   - --openrouter-api-key=your_openrouter_api_key_here');
      console.log('   - --anthropic-api-key=your_anthropic_api_key_here');
      console.log('   - --openai-api-key=your_openai_api_key_here');

      console.log('\n3. Or set an environment variable in your shell:');
      console.log('   export AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_api_key_here\n');
      process.exit(1);
    }

    // Validate that we have the required API key for the selected model
    const validationResult = validateConfigForSelectedModel();
    if (!validationResult.valid) {
      console.log('\n=== API Key Missing for Selected Model ===');
      console.log(validationResult.message);
      console.log('\nPlease provide the appropriate API key for your selected model.');
      console.log('You can override the model with --model=provider:model');
      console.log('Example: --model=openai:gpt-4.1 or --model=gemini:gemini-1.5-pro\n');
      process.exit(1);
    }

    // Log the selected model
    const [provider, model] = config.selectedModel.split(':');
    console.log(`Using ${provider} API with model: ${model}`);

    // Re-initialize i18n with the user's selected UI language if different
    if (args.uiLanguage && args.uiLanguage !== 'en') {
      await initI18n(args.uiLanguage);
    }

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
    const packagePluginsDir = path.resolve(__dirname, '..', 'plugins', 'examples');
    await pluginManager.loadPlugins(packagePluginsDir);

    // Log the loaded plugins
    const plugins = pluginManager.listPlugins();
    if (plugins.length > 0) {
      logger.info(`Loaded ${plugins.length} plugins:`);
      plugins.forEach((plugin) => {
        logger.info(`- ${plugin.name}: ${plugin.description}`);
      });
    }

    // Initialize the prompt manager
    const promptManager = PromptManager.getInstance();

    // Log that we're using bundled prompts
    logger.info('Using bundled prompts as the primary source for templates');

    // Optionally load custom templates from the current directory
    // These are only used as fallbacks if bundled prompts are not available
    const localTemplatesDir = path.resolve(process.cwd(), 'prompts', 'templates');
    await promptManager.loadTemplates(localTemplatesDir);

    // Log the loaded custom templates
    const templates = promptManager.listTemplates();
    if (templates.length > 0) {
      logger.info(`Loaded ${templates.length} custom prompt templates:`);
      templates.forEach((template) => {
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
        logger.error(
          t('errors.api_test_failed', {
            message: error instanceof Error ? error.message : String(error),
          }),
        );

        // Add a helpful message about common API issues
        logger.info(`\n${t('errors.common_solutions.title')}`);
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
    // modelTestArgs already declared above
    if (modelTestArgs[0] === 'model-test' || modelTestArgs[0] === 'test-build') {
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
        message: error instanceof Error ? error.message : String(error),
      }),
    );

    // Add a helpful message about common issues
    logger.info(`\n${t('errors.common_solutions.title')}`);
    logger.info(t('errors.common_solutions.check_directory'));
    logger.info(t('errors.common_solutions.check_target_path'));
    logger.info(t('errors.common_solutions.run_test_api'));

    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  // Use a fallback message if translation isn't available
  const errorMessage = error instanceof Error ? error.message : String(error);

  try {
    const translatedMessage = t('errors.unhandled', { message: errorMessage });
    // Check if translation returned undefined
    if (translatedMessage && translatedMessage !== 'undefined') {
      logger.error(translatedMessage);
    } else {
      logger.error(`Unhandled error: ${errorMessage}`);
    }
  } catch (_translationError) {
    // If translation fails, use plain English
    logger.error(`Unhandled error: ${errorMessage}`);
  }

  process.exit(1);
});
