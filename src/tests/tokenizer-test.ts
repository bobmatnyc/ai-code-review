/**
 * @fileoverview Test script for tokenizer implementations.
 *
 * This script tests the various tokenizer implementations to ensure they
 * correctly count tokens for different models.
 */

import { TokenizerRegistry, countTokens, getTokenizer } from '../tokenizers';
import { getCostInfoFromText } from '../clients/utils/tokenCounter';

// Sample text to test with
const sampleText = `
function calculateFactorial(n: number): number {
  if (n <= 1) return 1;
  return n * calculateFactorial(n - 1);
}

// Calculate factorial of 5
const result = calculateFactorial(5);
console.log(\`Factorial of 5 is \${result}\`);
`;

// Test all registered tokenizers
console.log('Testing all registered tokenizers:');
console.log('----------------------------------');
console.log(`Sample text (${sampleText.length} characters):`);
console.log(sampleText);
console.log('----------------------------------');

const tokenizers = TokenizerRegistry.getAllTokenizers();
for (const tokenizer of tokenizers) {
  const modelName = tokenizer.getModelName();
  const tokenCount = tokenizer.countTokens(sampleText);
  console.log(`${modelName.padEnd(10)}: ${tokenCount} tokens`);
}

console.log('----------------------------------');

// Test specific model tokenization
const models = [
  'gemini-1.5-pro',
  'anthropic/claude-3-sonnet',
  'openai/gpt-4-turbo',
  'unknown-model'
];

console.log('Testing specific model tokenization:');
console.log('----------------------------------');
for (const model of models) {
  const tokenCount = countTokens(sampleText, model);
  const tokenizer = getTokenizer(model);
  console.log(
    `${model.padEnd(25)}: ${tokenCount} tokens (using ${tokenizer.getModelName()} tokenizer)`
  );
}

console.log('----------------------------------');

// Test cost estimation

console.log('Testing cost estimation:');
console.log('----------------------------------');
for (const model of models) {
  const costInfo = getCostInfoFromText(sampleText, 'Sample output', model);
  console.log(
    `${model.padEnd(25)}: ${costInfo.inputTokens} input tokens, ${costInfo.outputTokens} output tokens, ${costInfo.formattedCost}`
  );
}

console.log('----------------------------------');
