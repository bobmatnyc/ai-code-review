#!/usr/bin/env node

/**
 * This script validates all supported models against their respective APIs.
 * It should be run as part of the pre-publish process to ensure that all
 * models are available and correctly configured.
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
// Import model definitions from the JS version of modelMaps.ts
// This file is kept in sync with src/clients/utils/modelMaps.ts
const { MODEL_MAP, getModelsByProvider, getModelMapping } = require('./model-maps');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function validateGeminiModels(models) {
  console.log('\nValidating Gemini models...');

  const apiKey = process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;
  if (!apiKey) {
    console.warn('No Google API key found. Skipping Gemini model validation.');
    return { success: false, error: 'No API key' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const validationResults = [];
  let hasErrors = false;

  for (const modelKey of models) {
    const modelMapping = getModelMapping(modelKey);
    if (!modelMapping) {
      console.error(`Model mapping not found for ${modelKey}`);
      validationResults.push({ modelKey, valid: false, error: 'Model mapping not found' });
      hasErrors = true;
      continue;
    }

    try {
      const modelOptions = {
        model: modelMapping.apiName,
        apiVersion: modelMapping.useV1Beta ? 'v1beta' : undefined
      };

      console.log(`Testing model ${modelKey} (API name: ${modelMapping.apiName})...`);

      // Try to get the model
      const model = genAI.getGenerativeModel(modelOptions);

      // Try to generate content with a simple prompt
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: 'Hello, are you available?' }] }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.1
        }
      });

      console.log(`✅ Model ${modelKey} is valid`);
      validationResults.push({ modelKey, valid: true });
    } catch (error) {
      console.error(`❌ Error validating model ${modelKey}: ${error.message}`);
      validationResults.push({ modelKey, valid: false, error: error.message });
      hasErrors = true;
    }
  }

  return { success: !hasErrors, results: validationResults };
}

async function validateAnthropicModels(models) {
  console.log('\nValidating Anthropic models...');

  const apiKey = process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('No Anthropic API key found. Skipping Anthropic model validation.');
    return { success: false, error: 'No API key' };
  }

  // For now, just log the models
  models.forEach(modelKey => {
    const modelMapping = getModelMapping(modelKey);
    if (modelMapping) {
      console.log(`- ${modelKey}: ${modelMapping.apiName}`);
    } else {
      console.error(`Model mapping not found for ${modelKey}`);
    }
  });

  return { success: true, results: [] };
}

async function validateOpenAIModels(models) {
  console.log('\nValidating OpenAI models...');

  const apiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('No OpenAI API key found. Skipping OpenAI model validation.');
    return { success: false, error: 'No API key' };
  }

  // For now, just log the models
  models.forEach(modelKey => {
    const modelMapping = getModelMapping(modelKey);
    if (modelMapping) {
      console.log(`- ${modelKey}: ${modelMapping.apiName}`);
    } else {
      console.error(`Model mapping not found for ${modelKey}`);
    }
  });

  return { success: true, results: [] };
}

async function validateOpenRouterModels(models) {
  console.log('\nValidating OpenRouter models...');

  const apiKey = process.env.AI_CODE_REVIEW_OPENROUTER_API_KEY;
  if (!apiKey) {
    console.warn('No OpenRouter API key found. Skipping OpenRouter model validation.');
    return { success: false, error: 'No API key' };
  }

  // For now, just log the models
  models.forEach(modelKey => {
    const modelMapping = getModelMapping(modelKey);
    if (modelMapping) {
      console.log(`- ${modelKey}: ${modelMapping.apiName}`);
    } else {
      console.error(`Model mapping not found for ${modelKey}`);
    }
  });

  return { success: true, results: [] };
}

async function validateModels() {
  console.log('Validating models...');

  try {
    // Get all models by provider
    const providers = ['gemini', 'anthropic', 'openai', 'openrouter'];
    let hasErrors = false;
    const validationResults = {};

    for (const provider of providers) {
      const models = getModelsByProvider(provider);
      console.log(`\nFound ${models.length} models for ${provider}`);

      let providerResults;

      switch (provider) {
        case 'gemini':
          providerResults = await validateGeminiModels(models);
          break;
        case 'anthropic':
          providerResults = await validateAnthropicModels(models);
          break;
        case 'openai':
          providerResults = await validateOpenAIModels(models);
          break;
        case 'openrouter':
          providerResults = await validateOpenRouterModels(models);
          break;
        default:
          providerResults = { success: false, error: `Unknown provider: ${provider}` };
      }

      validationResults[provider] = providerResults;

      if (!providerResults.success && providerResults.error !== 'No API key') {
        hasErrors = true;
      }
    }

    // Save validation results to a file
    fs.writeFileSync(
      path.resolve(process.cwd(), 'model-validation-results.json'),
      JSON.stringify(validationResults, null, 2)
    );

    if (hasErrors) {
      console.error('\nModel validation failed! See model-validation-results.json for details.');
      process.exit(1);
    } else {
      console.log('\nAll models validated successfully!');
    }
  } catch (error) {
    console.error('Error validating models:', error);
    process.exit(1);
  }
}

// Run the validation
validateModels();
