#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { getModelsByProvider, MODEL_MAP, type Provider } from '../clients/utils/modelMaps';
import {
  testAnthropicModel,
  testGeminiModel,
  testOpenAIModel,
  testOpenRouterModel,
} from '../clients/utils/modelTester';
import logger from '../utils/logger';

/**
 * Command for testing all AI models on build
 */
export const testBuildCommand = new Command('test-build')
  .description('Test all AI models to verify API keys and model availability during build')
  .option('--fail-on-error', 'Exit with error code if any model test fails')
  .option('--json', 'Output results in JSON format')
  .option('-p, --provider <provider>', 'Test only models for a specific provider')
  .action(async (options) => {
    try {
      if (options.provider) {
        await testProviderModels(options.provider as Provider, options);
      } else {
        await testAllModels(options);
      }
    } catch (error) {
      logger.error('Error testing models:', error);
      process.exit(1);
    }
  });

/**
 * Test all models from all providers
 */
async function testAllModels(options: any): Promise<void> {
  const providers: Provider[] = ['gemini', 'anthropic', 'openai', 'openrouter'];
  const results = [];
  let hasFailures = false;

  if (!options.json) {
    logger.info(chalk.bold('Testing all models from all providers...\n'));
  }

  for (const provider of providers) {
    const modelKeys = getModelsByProvider(provider);

    if (!options.json) {
      logger.info(chalk.bold(`\nTesting ${modelKeys.length} ${provider} models:`));
    }

    for (const modelKey of modelKeys) {
      const modelMapping = MODEL_MAP[modelKey];

      if (!options.json) {
        process.stdout.write(
          `  ${chalk.cyan(modelMapping.displayName)} (${chalk.gray(modelKey)})... `,
        );
      }

      let result;
      switch (provider) {
        case 'gemini':
          result = await testGeminiModel(modelMapping.apiIdentifier);
          break;
        case 'anthropic':
          result = await testAnthropicModel(modelMapping.apiIdentifier);
          break;
        case 'openai':
          result = await testOpenAIModel(modelMapping.apiIdentifier);
          break;
        case 'openrouter':
          result = await testOpenRouterModel(modelMapping.apiIdentifier);
          break;
      }

      if (!result.success) {
        hasFailures = true;
      }

      results.push({
        provider,
        modelKey,
        displayName: modelMapping.displayName,
        apiIdentifier: modelMapping.apiIdentifier,
        success: result.success,
        message: result.message,
        response: result.response,
      });

      if (!options.json) {
        if (result.success) {
          process.stdout.write(chalk.green('✓\n'));
        } else {
          process.stdout.write(chalk.red('✗\n'));
        }
      }
    }
  }

  if (options.json) {
    // Output JSON results
    console.log(
      JSON.stringify(
        {
          results,
          summary: {
            total: results.length,
            successful: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
          },
        },
        null,
        2,
      ),
    );
  } else {
    // Print summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    logger.info(chalk.bold('\nSummary:'));
    logger.info(`  ${chalk.green(`${successful} models available`)}`);
    logger.info(`  ${chalk.red(`${failed} models unavailable`)}`);

    if (failed > 0) {
      logger.info(chalk.bold('\nFailed models:'));
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          logger.info(
            `  ${chalk.cyan(r.displayName)} (${chalk.gray(r.modelKey)}): ${chalk.red(r.message)}`,
          );
        });
    }
  }

  if (hasFailures && options.failOnError) {
    process.exit(1);
  }
}

/**
 * Test all models from a specific provider
 */
async function testProviderModels(provider: Provider, options: any): Promise<void> {
  const modelKeys = getModelsByProvider(provider);
  const results = [];
  let hasFailures = false;

  if (modelKeys.length === 0) {
    logger.error(`Unknown provider: ${provider}`);
    process.exit(1);
  }

  if (!options.json) {
    logger.info(chalk.bold(`Testing ${modelKeys.length} ${provider} models:\n`));
  }

  for (const modelKey of modelKeys) {
    const modelMapping = MODEL_MAP[modelKey];

    if (!options.json) {
      process.stdout.write(
        `  ${chalk.cyan(modelMapping.displayName)} (${chalk.gray(modelKey)})... `,
      );
    }

    let result;
    switch (provider) {
      case 'gemini':
        result = await testGeminiModel(modelMapping.apiIdentifier);
        break;
      case 'anthropic':
        result = await testAnthropicModel(modelMapping.apiIdentifier);
        break;
      case 'openai':
        result = await testOpenAIModel(modelMapping.apiIdentifier);
        break;
      case 'openrouter':
        result = await testOpenRouterModel(modelMapping.apiIdentifier);
        break;
    }

    if (!result.success) {
      hasFailures = true;
    }

    results.push({
      provider,
      modelKey,
      displayName: modelMapping.displayName,
      apiIdentifier: modelMapping.apiIdentifier,
      success: result.success,
      message: result.message,
      response: result.response,
    });

    if (!options.json) {
      if (result.success) {
        process.stdout.write(chalk.green('✓\n'));
      } else {
        process.stdout.write(chalk.red('✗\n'));
      }
    }
  }

  if (options.json) {
    // Output JSON results
    console.log(
      JSON.stringify(
        {
          provider,
          results,
          summary: {
            total: results.length,
            successful: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
          },
        },
        null,
        2,
      ),
    );
  } else {
    // Print summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    logger.info(chalk.bold('\nSummary:'));
    logger.info(`  ${chalk.green(`${successful} models available`)}`);
    logger.info(`  ${chalk.red(`${failed} models unavailable`)}`);

    if (failed > 0) {
      logger.info(chalk.bold('\nFailed models:'));
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          logger.info(
            `  ${chalk.cyan(r.displayName)} (${chalk.gray(r.modelKey)}): ${chalk.red(r.message)}`,
          );
        });
    }
  }

  if (hasFailures && options.failOnError) {
    process.exit(1);
  }
}
