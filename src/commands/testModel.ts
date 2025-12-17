#!/usr/bin/env node

import chalk from 'chalk';
import { Command } from 'commander';
import { getModelMapping, getModelsByProvider, type Provider } from '../clients/utils/modelMaps';
import {
  type TestResult,
  testAnthropicModel,
  testGeminiModel,
  testOpenAIModel,
  testOpenRouterModel,
} from '../clients/utils/modelTester';
import logger from '../utils/logger';

/**
 * Command for testing AI models
 */
export const testModelCommand = new Command('model-test')
  .description('Test AI models to verify API keys and model availability')
  .argument(
    '[provider:model]',
    'Provider and model to test (e.g. gemini:gemini-1.5-pro, anthropic:claude-3-opus)',
  )
  .option('--all', 'Test all available models')
  .option('-p, --provider <provider>', 'Test all models for a specific provider')
  .action(async (modelStr, options) => {
    try {
      if (options.all) {
        await testAllModels();
        return;
      }

      if (options.provider) {
        await testProviderModels(options.provider);
        return;
      }

      if (modelStr) {
        await testSpecificModel(modelStr);
        return;
      }

      // Default behavior: test one model from each provider
      await testDefaultModels();
    } catch (error) {
      logger.error('Error testing models:', error);
      process.exit(1);
    }
  });

/**
 * Test a specific model identified by provider:model string
 */
async function testSpecificModel(modelStr: string): Promise<void> {
  // Extract provider and model name
  const [provider, modelName] = modelStr.split(':');

  if (!provider || !modelName) {
    logger.error(
      'Invalid model string. Format should be provider:model (e.g. gemini:gemini-1.5-pro)',
    );
    return;
  }

  const fullModelKey = `${provider}:${modelName}`;
  const modelMapping = getModelMapping(fullModelKey);

  if (!modelMapping) {
    logger.error(`Model ${fullModelKey} not found in model registry`);
    return;
  }

  logger.info(
    `Testing model: ${chalk.cyan(modelMapping.displayName)} (${chalk.gray(fullModelKey)})`,
  );

  let result: TestResult;
  switch (provider as Provider) {
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
    default:
      logger.error(`Unknown provider: ${provider}`);
      return;
  }

  if (result.success) {
    logger.info(chalk.green(`✓ ${result.message}`));
    if (result.response) {
      logger.info(`Response: ${chalk.gray(result.response)}`);
    }
  } else {
    logger.error(chalk.red(`✗ ${result.message}`));
  }
}

/**
 * Test all models from all providers
 */
async function testAllModels(): Promise<void> {
  const providers: Provider[] = ['gemini', 'anthropic', 'openai', 'openrouter'];
  const results = [];

  logger.info(chalk.bold('Testing all models from all providers...\n'));

  for (const provider of providers) {
    const modelKeys = getModelsByProvider(provider);
    logger.info(chalk.bold(`\nTesting ${modelKeys.length} ${provider} models:`));

    for (const modelKey of modelKeys) {
      const modelMapping = getModelMapping(modelKey);
      if (!modelMapping) continue;

      process.stdout.write(
        `  ${chalk.cyan(modelMapping.displayName)} (${chalk.gray(modelKey)})... `,
      );

      let result: TestResult;
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

      results.push({
        provider,
        modelKey,
        displayName: modelMapping.displayName,
        result,
      });

      if (result.success) {
        process.stdout.write(chalk.green('✓\n'));
      } else {
        process.stdout.write(chalk.red('✗\n'));
      }
    }
  }

  // Print summary
  const successful = results.filter((r) => r.result.success).length;
  const failed = results.length - successful;

  logger.info(chalk.bold('\nSummary:'));
  logger.info(`  ${chalk.green(`${successful} models available`)}`);
  logger.info(`  ${chalk.red(`${failed} models unavailable`)}`);

  if (failed > 0) {
    logger.info(chalk.bold('\nFailed models:'));
    results
      .filter((r) => !r.result.success)
      .forEach((r) => {
        logger.info(
          `  ${chalk.cyan(r.displayName)} (${chalk.gray(r.modelKey)}): ${chalk.red(r.result.message)}`,
        );
      });
  }
}

/**
 * Test all models from a specific provider
 */
async function testProviderModels(providerStr: string) {
  const provider = providerStr as Provider;
  const modelKeys = getModelsByProvider(provider);

  if (modelKeys.length === 0) {
    logger.error(`Unknown provider: ${provider}`);
    return;
  }

  logger.info(chalk.bold(`Testing ${modelKeys.length} ${provider} models:\n`));
  const results = [];

  for (const modelKey of modelKeys) {
    const modelMapping = getModelMapping(modelKey);
    if (!modelMapping) continue;

    process.stdout.write(`  ${chalk.cyan(modelMapping.displayName)} (${chalk.gray(modelKey)})... `);

    let result: TestResult;
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

    results.push({
      modelKey,
      displayName: modelMapping.displayName,
      result,
    });

    if (result.success) {
      process.stdout.write(chalk.green('✓\n'));
    } else {
      process.stdout.write(chalk.red('✗\n'));
    }
  }

  // Print summary
  const successful = results.filter((r) => r.result.success).length;
  const failed = results.length - successful;

  logger.info(chalk.bold('\nSummary:'));
  logger.info(`  ${chalk.green(`${successful} models available`)}`);
  logger.info(`  ${chalk.red(`${failed} models unavailable`)}`);

  if (failed > 0) {
    logger.info(chalk.bold('\nFailed models:'));
    results
      .filter((r) => !r.result.success)
      .forEach((r) => {
        logger.info(
          `  ${chalk.cyan(r.displayName)} (${chalk.gray(r.modelKey)}): ${chalk.red(r.result.message)}`,
        );
      });
  }
}

/**
 * Test one model from each provider
 */
async function testDefaultModels() {
  const providers: Provider[] = ['gemini', 'anthropic', 'openai', 'openrouter'];
  const results = [];

  logger.info(chalk.bold('Testing default models from each provider:\n'));

  for (const provider of providers) {
    const modelKeys = getModelsByProvider(provider);
    if (modelKeys.length === 0) continue;

    const defaultModelKey = modelKeys[0]; // Just use the first one
    const modelMapping = getModelMapping(defaultModelKey);
    if (!modelMapping) continue;

    process.stdout.write(
      `  ${chalk.cyan(modelMapping.displayName)} (${chalk.gray(defaultModelKey)})... `,
    );

    let result: TestResult;
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

    results.push({
      provider,
      modelKey: defaultModelKey,
      displayName: modelMapping.displayName,
      result,
    });

    if (result.success) {
      process.stdout.write(chalk.green('✓\n'));
    } else {
      process.stdout.write(chalk.red('✗\n'));
    }
  }

  // Print summary
  const successful = results.filter((r) => r.result.success).length;
  const failed = results.length - successful;

  logger.info(chalk.bold('\nSummary:'));
  logger.info(`  ${chalk.green(`${successful} providers available`)}`);
  logger.info(`  ${chalk.red(`${failed} providers unavailable`)}`);

  if (failed > 0) {
    logger.info(chalk.bold('\nUnavailable providers:'));
    results
      .filter((r) => !r.result.success)
      .forEach((r) => {
        logger.info(`  ${chalk.cyan(r.provider)}: ${chalk.red(r.result.message)}`);
      });
  }
}
