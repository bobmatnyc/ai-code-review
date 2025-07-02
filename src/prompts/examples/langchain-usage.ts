/**
 * @fileoverview Example usage of LangChain prompt templates.
 *
 * This example demonstrates how to use LangChain for prompt construction
 * and optimization with the AI Code Review tool.
 */

import { PromptCache } from '../cache/PromptCache';
import { PromptManager } from '../PromptManager';
import { PromptStrategyFactory } from '../strategies/PromptStrategyFactory';
import { LangChainUtils } from '../utils/LangChainUtils';

/**
 * Example function demonstrating LangChain usage with the AI Code Review tool
 */
async function langChainExample() {
  // Get the prompt manager instance
  const promptManager = PromptManager.getInstance();

  // Get the prompt cache instance
  const promptCache = PromptCache.getInstance();

  // Create a LangChain strategy
  const strategy = PromptStrategyFactory.createStrategy('langchain', promptManager, promptCache);

  // Get a raw prompt template for a security review
  const rawPrompt = await promptManager.getPromptTemplate('security', {
    language: 'typescript',
    promptStrategy: 'langchain',
    type: 'security',
    includeTests: false,
    output: 'markdown',
  });

  // Convert to a LangChain template
  const template = await strategy.getLangChainTemplate(rawPrompt, {
    language: 'typescript',
    type: 'security',
    includeTests: false,
    output: 'markdown',
  });

  // Create a structured output parser
  const parser = LangChainUtils.createReviewOutputParser('security');

  // Format instructions for structured output
  const formatInstructions = parser.getFormatInstructions();

  // Create example code to review
  const codeToReview = `
function authenticateUser(username, password) {
  if (username === 'admin' && password === 'password123') {
    return { authenticated: true, role: 'admin' };
  }
  return { authenticated: false };
}
  `;

  // Prepare the prompt variables
  const promptVariables = {
    CODE: codeToReview,
    LANGUAGE: 'JavaScript',
    SCHEMA_INSTRUCTIONS: formatInstructions,
    LANGUAGE_INSTRUCTIONS:
      'This code is written in JavaScript. Please provide language-specific security advice.',
  };

  // Format the prompt
  const formattedPrompt = await template.format(promptVariables);

  console.log('Formatted LangChain Prompt:');
  console.log('--------------------------');
  console.log(formattedPrompt);
  console.log('--------------------------');

  // This would be passed to the AI model in a real implementation
  // const result = await model.invoke(formattedPrompt);
  // const parsedResult = await parser.parse(result);

  return formattedPrompt;
}

export default langChainExample;
