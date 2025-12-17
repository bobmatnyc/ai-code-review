/**
 * @fileoverview Interactive API key recovery prompts
 *
 * This module provides interactive command-line prompts for recovering from
 * API key validation failures. Uses Node's built-in readline module.
 */

import * as readline from 'node:readline';
import type { ProjectConfig } from '../types/review';
import { validateApiKey } from './apiKeyHealthCheck';
import logger from './logger';
import { setApiKeyInProjectConfig, updateProjectConfig } from './projectConfigManager';

/**
 * Create readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 * @param question Question to ask
 * @returns User's response
 */
function question(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Prompt user to enter a new API key
 * @param provider Provider name (google, anthropic, openrouter, openai)
 * @returns API key entered by user or null if cancelled
 */
export async function promptForApiKey(provider: string): Promise<string | null> {
  const rl = createReadlineInterface();

  console.log(`\n📝 Enter your ${provider.toUpperCase()} API key:`);
  console.log('   (Press Ctrl+C to cancel)\n');

  const apiKey = await question(rl, '   API Key: ');
  rl.close();

  if (!apiKey || apiKey.length === 0) {
    console.log('   ❌ No API key entered.');
    return null;
  }

  // Validate the key
  console.log('\n🔍 Validating API key...');
  const result = await validateApiKey(provider, apiKey);

  if (result.valid) {
    console.log('   ✅ API key is valid!');
    return apiKey;
  }

  console.log(`   ❌ Invalid API key: ${result.error}`);
  return null;
}

/**
 * Prompt user to select a different provider
 * @param currentProvider Current provider that failed
 * @returns Selected provider or null if cancelled
 */
export async function promptProviderSelection(currentProvider: string): Promise<string | null> {
  const rl = createReadlineInterface();

  console.log('\n📌 Available providers:');
  console.log('   [1] Google (Gemini)');
  console.log('   [2] Anthropic (Claude)');
  console.log('   [3] OpenRouter');
  console.log('   [4] OpenAI (GPT)');
  console.log('   [5] Cancel\n');

  const choice = await question(rl, '   Select provider [1-5]: ');
  rl.close();

  switch (choice) {
    case '1':
      return 'google';
    case '2':
      return 'anthropic';
    case '3':
      return 'openrouter';
    case '4':
      return 'openai';
    case '5':
      return null;
    default:
      console.log(`   ❌ Invalid choice: ${choice}`);
      return null;
  }
}

/**
 * Prompt user if they want to save the API key
 * @returns true if user wants to save, false otherwise
 */
export async function promptSavePreference(): Promise<boolean> {
  const rl = createReadlineInterface();

  console.log('\n💾 Save this API key in project config (.ai-code-review/config.yaml)?');
  console.log('   ⚠️  Warning: This will store the key in plaintext (excluded from git)');

  const answer = await question(rl, '   Save key? [y/N]: ');
  rl.close();

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Recovery action chosen by user
 */
export enum RecoveryAction {
  ENTER_NEW_KEY = 'enter_new_key',
  SWITCH_PROVIDER = 'switch_provider',
  CONTINUE_ANYWAY = 'continue_anyway',
  EXIT = 'exit',
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  /** Action taken by user */
  action: RecoveryAction;
  /** New API key if entered */
  apiKey?: string;
  /** New provider if switched */
  provider?: string;
  /** Whether to save the key */
  saveKey?: boolean;
}

/**
 * Show recovery options and get user choice
 * @param provider Provider that failed
 * @param error Error message from validation
 * @returns User's recovery choice
 */
export async function promptKeyRecovery(provider: string, error: string): Promise<RecoveryResult> {
  const rl = createReadlineInterface();

  console.log('\n⚠️  API Key Validation Failed');
  console.log('═'.repeat(60));
  console.log(`\nProvider: ${provider.toUpperCase()}`);
  console.log(`Error: ${error}`);
  console.log('\nOptions:');
  console.log('  [1] Enter a new API key');
  console.log('  [2] Switch to a different provider');
  console.log('  [3] Continue anyway (review may fail)');
  console.log('  [4] Exit\n');

  const choice = await question(rl, 'Select [1-4]: ');
  rl.close();

  switch (choice) {
    case '1': {
      // Enter new API key
      const apiKey = await promptForApiKey(provider);
      if (!apiKey) {
        console.log('\n❌ Failed to get valid API key. Exiting...');
        return { action: RecoveryAction.EXIT };
      }

      const saveKey = await promptSavePreference();
      if (saveKey) {
        const saved = setApiKeyInProjectConfig(provider, apiKey);
        if (saved) {
          console.log(`\n✅ API key saved to project config`);
        } else {
          console.log(`\n⚠️  Failed to save API key to project config`);
        }
      }

      return {
        action: RecoveryAction.ENTER_NEW_KEY,
        apiKey,
        provider,
        saveKey,
      };
    }

    case '2': {
      // Switch provider
      const newProvider = await promptProviderSelection(provider);
      if (!newProvider) {
        console.log('\n❌ No provider selected. Exiting...');
        return { action: RecoveryAction.EXIT };
      }

      const apiKey = await promptForApiKey(newProvider);
      if (!apiKey) {
        console.log('\n❌ Failed to get valid API key. Exiting...');
        return { action: RecoveryAction.EXIT };
      }

      const saveKey = await promptSavePreference();
      if (saveKey) {
        // Save both the key and update the preferred provider
        const saved = setApiKeyInProjectConfig(newProvider, apiKey);
        if (saved) {
          updateProjectConfig({
            api: {
              preferred_provider: newProvider,
            },
          });
          console.log(`\n✅ API key saved and provider switched to ${newProvider}`);
        } else {
          console.log(`\n⚠️  Failed to save API key to project config`);
        }
      }

      return {
        action: RecoveryAction.SWITCH_PROVIDER,
        apiKey,
        provider: newProvider,
        saveKey,
      };
    }

    case '3':
      // Continue anyway
      console.log('\n⚠️  Continuing without valid API key. Review may fail.');
      return { action: RecoveryAction.CONTINUE_ANYWAY };

    case '4':
      // Exit
      console.log('\n👋 Exiting...');
      return { action: RecoveryAction.EXIT };

    default:
      console.log(`\n❌ Invalid choice: ${choice}. Exiting...`);
      return { action: RecoveryAction.EXIT };
  }
}

/**
 * Handle Ctrl+C gracefully
 */
process.on('SIGINT', () => {
  console.log('\n\n👋 Operation cancelled by user.');
  process.exit(0);
});
