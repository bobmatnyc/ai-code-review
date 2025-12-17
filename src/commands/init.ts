/**
 * @fileoverview Initialize project configuration command
 *
 * This module implements the 'ai-code-review init' command which creates
 * project-level configuration and sets up API keys.
 */

import * as readline from 'node:readline/promises';
import logger from '../utils/logger';
import {
  configExists,
  ensureGitignore,
  fromLegacyConfig,
  type LegacyProjectConfig,
  loadProjectConfig,
  saveProjectConfig,
  validateApiKeyFormat,
} from '../utils/projectConfigManager';
import { detectToolchain, getToolchainDescription } from '../utils/toolchainDetector';

/**
 * Interactive prompt for user input
 * @param question Question to ask the user
 * @param defaultValue Default value (optional)
 * @returns User's response
 */
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    const displayQuestion = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;
    const answer = await rl.question(displayQuestion);
    return answer.trim() || defaultValue || '';
  } finally {
    rl.close();
  }
}

/**
 * Prompt for API key with validation
 * @param provider API provider name
 * @param providerKey Provider key for validation
 * @returns API key or undefined if skipped
 */
async function promptApiKey(
  provider: string,
  providerKey: 'openrouter' | 'anthropic' | 'google' | 'openai',
): Promise<string | undefined> {
  console.log(`\n${provider} API Key`);
  console.log('─'.repeat(50));

  const apiKey = await prompt(`Enter your ${provider} API key (or press Enter to skip)`);

  if (!apiKey) {
    return undefined;
  }

  // Validate key format
  if (!validateApiKeyFormat(providerKey, apiKey)) {
    console.log(`⚠️  Warning: API key format doesn't match expected pattern for ${provider}`);
    const confirm = await prompt('Continue anyway? (y/n)', 'n');
    if (confirm.toLowerCase() !== 'y') {
      return undefined;
    }
  }

  return apiKey;
}

/**
 * Test API key by making a simple API call
 * @param provider Provider key
 * @param apiKey API key to test
 * @returns True if the key is valid
 */
async function testApiKey(
  provider: 'openrouter' | 'anthropic' | 'google' | 'openai',
  apiKey: string,
): Promise<boolean> {
  console.log(`\nTesting ${provider} API key...`);

  try {
    // Temporarily set environment variable for testing
    const envVarName = `AI_CODE_REVIEW_${provider.toUpperCase()}_API_KEY`;
    const originalValue = process.env[envVarName];
    process.env[envVarName] = apiKey;

    // Import test function dynamically to avoid circular dependencies
    const { testProviderConnection } = await import('../clients/utils/apiTester');

    const result = await testProviderConnection(provider);

    // Restore original value
    if (originalValue) {
      process.env[envVarName] = originalValue;
    } else {
      delete process.env[envVarName];
    }

    if (result.success) {
      console.log(`✅ ${provider} API key is valid!`);
      return true;
    }
    console.log(`❌ ${provider} API key test failed: ${result.error}`);
    return false;
  } catch (error) {
    console.log(`❌ Error testing ${provider} API key: ${error}`);
    return false;
  }
}

/**
 * Handle the init command
 */
export async function handleInitCommand(): Promise<void> {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         AI Code Review - Project Initialization               ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Check if config already exists
  if (configExists()) {
    console.log('⚠️  Configuration already exists for this project.');
    const overwrite = await prompt('Do you want to overwrite it? (y/n)', 'n');

    if (overwrite.toLowerCase() !== 'y') {
      console.log('\nConfiguration initialization cancelled.');
      return;
    }

    // Load existing config to preserve some settings
    const _existingConfig = loadProjectConfig();
    console.log('\n📋 Existing configuration will be updated...\n');
  }

  // Detect toolchain
  console.log('🔍 Detecting project toolchain...\n');
  const toolchainInfo = detectToolchain();
  const toolchainDesc = getToolchainDescription(toolchainInfo);

  console.log(`Detected: ${toolchainDesc}`);
  console.log(`Config files: ${toolchainInfo.configFiles.join(', ')}\n`);

  // Initialize config object
  const config: LegacyProjectConfig = {
    reviewSettings: {
      strictness: 'balanced',
      focusAreas: ['security', 'performance', 'maintainability'],
      autoFix: false,
    },
    mcp: {
      enabled: true,
      toolchainDetected: toolchainInfo.toolchain,
    },
  };

  // API Key Configuration
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                       API Key Setup');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('AI Code Review requires an API key from at least one provider.');
  console.log('Supported providers:');
  console.log('  • OpenRouter (recommended) - Access to multiple models');
  console.log('  • Anthropic Claude - Direct Claude API access');
  console.log('  • Google Gemini - Direct Gemini API access');
  console.log('  • OpenAI - Direct GPT API access\n');

  config.apiKeys = {};

  // Prompt for OpenRouter key (recommended)
  const openrouterKey = await promptApiKey('OpenRouter', 'openrouter');
  if (openrouterKey) {
    const isValid = await testApiKey('openrouter', openrouterKey);
    if (isValid) {
      config.apiKeys.openrouter = openrouterKey;
    } else {
      const saveAnyway = await prompt('Save API key anyway? (y/n)', 'n');
      if (saveAnyway.toLowerCase() === 'y') {
        config.apiKeys.openrouter = openrouterKey;
      }
    }
  }

  // Prompt for other providers if OpenRouter wasn't configured
  if (!config.apiKeys.openrouter) {
    console.log('\n💡 Tip: You can also configure Anthropic, Google, or OpenAI directly.\n');

    // Anthropic
    const anthropicKey = await promptApiKey('Anthropic Claude', 'anthropic');
    if (anthropicKey) {
      const isValid = await testApiKey('anthropic', anthropicKey);
      if (isValid) {
        config.apiKeys.anthropic = anthropicKey;
      }
    }

    // Google (if no other keys yet)
    if (!config.apiKeys.anthropic) {
      const googleKey = await promptApiKey('Google Gemini', 'google');
      if (googleKey) {
        const isValid = await testApiKey('google', googleKey);
        if (isValid) {
          config.apiKeys.google = googleKey;
        }
      }
    }

    // OpenAI (if no other keys yet)
    if (!config.apiKeys.anthropic && !config.apiKeys.google) {
      const openaiKey = await promptApiKey('OpenAI', 'openai');
      if (openaiKey) {
        const isValid = await testApiKey('openai', openaiKey);
        if (isValid) {
          config.apiKeys.openai = openaiKey;
        }
      }
    }
  }

  // Check if we have at least one API key
  const hasApiKey = Object.keys(config.apiKeys).length > 0;
  if (!hasApiKey) {
    console.log('\n⚠️  No API keys configured. You will need to set one later.');
    console.log('You can:');
    console.log('  1. Run this command again: ai-code-review init');
    console.log('  2. Set environment variable: OPENROUTER_API_KEY=your_key');
    console.log('  3. Manually edit .ai-code-review/config.json\n');
  }

  // Model Selection
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                     Default Model Selection');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (config.apiKeys.openrouter) {
    console.log('Recommended models for OpenRouter:');
    console.log('  • anthropic/claude-4-opus (best quality)');
    console.log('  • anthropic/claude-4-sonnet (balanced)');
    console.log('  • openai/gpt-4o (multimodal)');
    console.log('  • google/gemini-2.0-pro (large context)\n');

    const model = await prompt('Enter default model', 'openrouter:anthropic/claude-4-sonnet');
    config.defaultModel = model;
  } else if (config.apiKeys.anthropic) {
    const model = await prompt('Enter default model', 'anthropic:claude-4-sonnet');
    config.defaultModel = model;
  } else if (config.apiKeys.google) {
    const model = await prompt('Enter default model', 'gemini:gemini-2.0-pro');
    config.defaultModel = model;
  } else if (config.apiKeys.openai) {
    const model = await prompt('Enter default model', 'openai:gpt-4o');
    config.defaultModel = model;
  }

  // Review Settings
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                       Review Settings');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const strictness = await prompt('Review strictness (strict/balanced/lenient)', 'balanced');
  if (['strict', 'balanced', 'lenient'].includes(strictness)) {
    config.reviewSettings!.strictness = strictness as 'strict' | 'balanced' | 'lenient';
  }

  const autoFix = await prompt('Enable auto-fix suggestions? (y/n)', 'n');
  config.reviewSettings!.autoFix = autoFix.toLowerCase() === 'y';

  // Save configuration
  console.log('\n💾 Saving configuration...');
  saveProjectConfig(fromLegacyConfig(config));

  // Update .gitignore
  console.log('📝 Updating .gitignore to exclude config file...');
  ensureGitignore();

  // Summary
  console.log('\n✅ Project initialized successfully!\n');
  console.log('Configuration saved to: .ai-code-review/config.json');
  console.log('Added to .gitignore: .ai-code-review/config.json\n');

  console.log('Next steps:');
  console.log('  1. Run: ai-code-review install    (optional: register MCP server)');
  console.log('  2. Run: ai-code-review .          (perform a code review)\n');

  if (hasApiKey) {
    console.log("🎉 You're all set! Start reviewing your code with:");
    console.log('   ai-code-review . --type comprehensive\n');
  } else {
    console.log('⚠️  Remember to configure an API key before running reviews!\n');
  }
}
