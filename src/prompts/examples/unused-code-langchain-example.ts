/**
 * @fileoverview Example usage of LangChain for unused code review.
 * 
 * This example demonstrates how to use LangChain for unused code review
 * with the AI Code Review tool.
 */

import { PromptTemplate } from '@langchain/core/prompts';
import { PromptManager } from '../PromptManager';
import { PromptStrategyFactory } from '../strategies/PromptStrategyFactory';
import { PromptCache } from '../cache/PromptCache';
import { getUnusedCodeReviewFormatInstructions, unusedCodeReviewParser } from '../schemas/unused-code-schema';
import logger from '../../utils/logger';

/**
 * Example function demonstrating LangChain usage for unused code review
 */
async function unusedCodeLangChainExample() {
  // Get the prompt manager instance
  const promptManager = PromptManager.getInstance();
  
  // Get the prompt cache instance
  const promptCache = PromptCache.getInstance();
  
  // Create a LangChain strategy
  const strategy = PromptStrategyFactory.createStrategy('langchain', promptManager, promptCache);
  
  // Get a raw prompt template for unused code review
  const rawPrompt = await promptManager.getPromptTemplate('unused-code', {
    language: 'typescript',
    promptStrategy: 'langchain'
  });
  
  // Get format instructions for structured output
  const formatInstructions = getUnusedCodeReviewFormatInstructions();
  
  // Create a LangChain prompt template directly
  const template = new PromptTemplate({
    template: rawPrompt,
    inputVariables: [
      'CODE', 
      'LANGUAGE', 
      'SCHEMA_INSTRUCTIONS', 
      'LANGUAGE_INSTRUCTIONS'
    ]
  });
  
  // Create example code to review
  const codeToReview = `
import { useState, useEffect, useCallback } from 'react';

// Old implementation - kept for backward compatibility
function fetchDataLegacy(url: string): Promise<any> {
  return fetch(url).then(res => res.json());
}

// Current implementation
async function fetchData(url: string): Promise<any> {
  const response = await fetch(url);
  return await response.json();
}

// TODO: Remove this after migration is complete
const API_VERSION = 'v1';
const LEGACY_ENDPOINTS = {
  users: '/api/users',
  products: '/api/products',
  orders: '/api/orders'
};

export function useDataFetcher(endpoint: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Unused debug variable
  const debug = process.env.NODE_ENV === 'development';
  
  // Feature flag for new API - always true now
  const useNewApi = true;
  
  const fetchFromApi = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let url = \`/api/\${API_VERSION}/\${endpoint}\`;
      
      // Dead code path - useNewApi is always true
      if (!useNewApi) {
        url = LEGACY_ENDPOINTS[endpoint as keyof typeof LEGACY_ENDPOINTS] || url;
        const result = await fetchDataLegacy(url);
        setData(result);
      } else {
        const result = await fetchData(url);
        setData(result);
      }
    } catch (err) {
      setError(err as Error);
      // Commented out debugging code
      // console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);
  
  useEffect(() => {
    fetchFromApi();
  }, [fetchFromApi]);
  
  // Unused function - was part of a feature that was never implemented
  function transformData(rawData: any) {
    return {
      ...rawData,
      timestamp: new Date().toISOString()
    };
  }
  
  return { data, loading, error, refetch: fetchFromApi };
}
  `;
  
  // Prepare the prompt variables
  const promptVariables = {
    CODE: codeToReview,
    LANGUAGE: 'TypeScript',
    SCHEMA_INSTRUCTIONS: formatInstructions,
    LANGUAGE_INSTRUCTIONS: 'This code is written in TypeScript. Please provide language-specific advice for identifying and removing unused TypeScript code.'
  };
  
  // Format the prompt
  const formattedPrompt = await template.format(promptVariables);
  
  logger.info('Formatted LangChain Prompt for Unused Code Review:');
  logger.info('-------------------------------------------------');
  logger.info(formattedPrompt);
  
  // This would be passed to the AI model in a real implementation
  // const result = await model.invoke(formattedPrompt);
  // const parsedResult = await unusedCodeReviewParser.parse(result);
  
  return {
    prompt: formattedPrompt,
    // Example of what the parsed output might look like
    exampleOutput: {
      highImpactIssues: [
        {
          title: "Dead code path with feature flag",
          description: "The condition 'if (!useNewApi)' is never executed because 'useNewApi' is always true.",
          location: { file: "useDataFetcher.ts", lineStart: 40, lineEnd: 44 },
          assessment: "100% confident. The 'useNewApi' variable is explicitly set to true and never modified.",
          suggestedAction: "Remove the conditional branch and keep only the 'else' block code.",
          riskLevel: "low",
          impactLevel: "high",
          category: "featureFlag"
        }
      ],
      mediumImpactIssues: [
        {
          title: "Unused transformData function",
          description: "The function 'transformData' is defined but never used anywhere in the code.",
          location: { file: "useDataFetcher.ts", lineStart: 59, lineEnd: 64 },
          assessment: "95% confident. This function is not called anywhere in the visible code.",
          suggestedAction: "Remove this function if it's not used elsewhere in the codebase.",
          riskLevel: "low",
          impactLevel: "medium",
          category: "deadCode"
        }
      ],
      lowImpactIssues: [
        {
          title: "Unused debug variable",
          description: "The 'debug' variable is defined but never used in the code.",
          location: { file: "useDataFetcher.ts", lineStart: 33, lineEnd: 33 },
          assessment: "100% confident. This variable is initialized but never referenced.",
          suggestedAction: "Remove this variable.",
          riskLevel: "low",
          impactLevel: "low",
          category: "deadCode"
        }
      ],
      summary: "The code contains several instances of unused code that can be safely removed, including a dead code path controlled by a feature flag, an unused function, and an unused variable.",
      recommendations: [
        "Use ESLint with the @typescript-eslint/no-unused-vars rule to automatically detect unused variables",
        "Set up TypeScript compiler options like noUnusedLocals to catch unused variables during build",
        "Regularly review and remove feature flags once features are fully released"
      ]
    }
  };
}

export default unusedCodeLangChainExample;