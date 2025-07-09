/**
 * @fileoverview Example usage of improved LangChain-based quick fixes review.
 *
 * This example demonstrates how to use the enhanced LangChain integration
 * for more effective quick fixes review.
 */

import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import logger from '../../utils/logger';
import { PromptManager } from '../PromptManager';
// import { PromptStrategyFactory } from '../strategies/PromptStrategyFactory';
// import { PromptCache } from '../cache/PromptCache';
import { getQuickFixesReviewFormatInstructions } from '../schemas/quick-fixes-schema';

// Sample code with various quick fixes opportunities
const typescriptSampleWithIssues = `
import React, { useState, useEffect } from 'react';
import axios from 'axios';

// API endpoint
const API_URL = 'https://api.example.com/data';

interface DataItem {
  id: number;
  name: string;
  value: number;
  status: string;
}

export function DataDisplay() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Fetch data from API
    setLoading(true);
    axios.get(API_URL)
      .then(response => {
        setData(response.data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);
  
  // Calculate total value
  function calculateTotal() {
    let total = 0;
    for (let i = 0; i < data.length; i++) {
      total += data[i].value;
    }
    return total;
  }
  
  // Render loading state
  if (loading) return <div>Loading...</div>;
  
  // Render error state
  if (error) return <div>Error loading data.</div>;
  
  // Render empty state
  if (data.length == 0) return <div>No data available.</div>;
  
  // Render data
  return (
    <div className="data-display">
      <h1>Data Items</h1>
      <div className="data-list">
        {data.map(item => (
          <div className="data-item" key={item.id}>
            <h3>{item.name}</h3>
            <p>Value: {item.value}</p>
            <p>Status: <span className={item.status}>{item.status}</span></p>
          </div>
        ))}
      </div>
      <div className="data-summary">
        <p>Total Value: {calculateTotal()}</p>
      </div>
    </div>
  );
}
`;

/**
 * Example function demonstrating improved LangChain-based quick fixes review
 */
async function improvedQuickFixesExample() {
  // Get the prompt manager instance
  const promptManager = PromptManager.getInstance();

  // Get the prompt cache instance
  // const promptCache = PromptCache.getInstance();

  // Create a LangChain strategy
  // const strategy = PromptStrategyFactory.createStrategy(
  //   'langchain',
  //   promptManager,
  //   promptCache
  // );

  // Try to get the improved prompt template, fallback to standard if not found
  let rawPrompt;
  try {
    rawPrompt = await promptManager.getPromptTemplate('quick-fixes', {
      language: 'typescript',
      promptFile:
        '/Users/masa/Projects/ai-code-review/prompts/typescript/improved-quick-fixes-review.md',
      promptStrategy: 'langchain',
      type: 'quick-fixes',
      includeTests: false,
      output: 'markdown',
    });
  } catch (_error) {
    logger.warn('Could not find improved prompt template, using standard template');
    rawPrompt = await promptManager.getPromptTemplate('quick-fixes', {
      language: 'typescript',
      promptStrategy: 'langchain',
      type: 'quick-fixes',
      includeTests: false,
      output: 'markdown',
    });
  }

  // Get format instructions for structured output
  const formatInstructions = getQuickFixesReviewFormatInstructions();

  // Create examples for few-shot learning
  const examples = [
    {
      code: `
function processItems(items) {
  let total = 0;
  for (let i = 0; i < items.length; i++) {
    total += items[i].value;
  }
  return total;
}
      `,
      analysis: `
Issues found:
1. Missing type annotations for function parameter and return type
2. No null/undefined checks for items parameter
3. No type checking for items[i].value
      `,
    },
    {
      code: `
const API_KEY = "1234567890abcdef";

function fetchData(url) {
  return fetch(url, {
    headers: {
      "Authorization": \`Bearer \${API_KEY}\`
    }
  });
}
      `,
      analysis: `
Issues found:
1. Hardcoded API key should be moved to environment variable
2. Missing type annotation for function parameter and return type
3. No error handling for fetch operation
      `,
    },
  ];

  // Create an example template
  const exampleTemplate = new PromptTemplate({
    template: 'Code example:\n```typescript\n{code}\n```\n\nAnalysis:\n{analysis}',
    inputVariables: ['code', 'analysis'],
  });

  // Create a few-shot prompt template
  const fewShotPromptTemplate = new FewShotPromptTemplate({
    prefix:
      'You are a TypeScript expert analyzing code for quick fixes. Here are some examples of common issues and their analysis:',
    examples,
    examplePrompt: exampleTemplate,
    suffix:
      'Now, analyze the following TypeScript code for quick fixes, using the same structured approach as in the examples:\n\nCode to analyze:\n```typescript\n{CODE}\n```\n\n{{SCHEMA_INSTRUCTIONS}}',
    inputVariables: ['CODE', 'SCHEMA_INSTRUCTIONS'],
  });

  // Format the few-shot prompt with our sample code
  const formattedFewShotPrompt = await fewShotPromptTemplate.format({
    CODE: typescriptSampleWithIssues,
    SCHEMA_INSTRUCTIONS: formatInstructions,
  });

  // Create a standard prompt template for comparison
  const standardTemplate = new PromptTemplate({
    template: rawPrompt,
    inputVariables: ['CODE', 'LANGUAGE', 'SCHEMA_INSTRUCTIONS', 'LANGUAGE_INSTRUCTIONS'],
  });

  // Format the standard prompt
  const formattedStandardPrompt = await standardTemplate.format({
    CODE: typescriptSampleWithIssues,
    LANGUAGE: 'TypeScript',
    SCHEMA_INSTRUCTIONS: formatInstructions,
    LANGUAGE_INSTRUCTIONS:
      'This code is written in TypeScript. Please provide language-specific advice for quick improvements.',
  });

  logger.info('Improved LangChain-based Few-Shot Prompt for Quick Fixes Review:');
  logger.info('----------------------------------------------------------------');
  logger.info(`${formattedFewShotPrompt.substring(0, 500)}...`);

  logger.info('\nStandard Prompt for Quick Fixes Review:');
  logger.info('---------------------------------------');
  logger.info(`${formattedStandardPrompt.substring(0, 500)}...`);

  return {
    fewShotPrompt: formattedFewShotPrompt,
    standardPrompt: formattedStandardPrompt,
    // Example output demonstrating the structured format
    exampleStructuredOutput: {
      highPriorityIssues: [
        {
          title: 'Missing TypeScript type for useState',
          description: 'The useState hook is not properly typed, which could lead to type errors.',
          location: {
            file: 'DataDisplay.tsx',
            lineStart: 14,
            lineEnd: 14,
            codeSnippet: 'const [data, setData] = useState([]);',
          },
          suggestedFix: {
            code: 'const [data, setData] = useState<DataItem[]>([]);',
            explanation:
              'Adding the correct type annotation ensures type safety throughout the component.',
          },
          impact:
            'Prevents potential runtime errors and improves developer experience with better IntelliSense.',
          effort: 1,
          priority: 'high',
          category: 'typing',
          tags: ['typescript', 'react', 'useState'],
        },
      ],
      mediumPriorityIssues: [
        {
          title: 'Using loose equality operator',
          description:
            'Using == instead of === can lead to unexpected behavior due to type coercion.',
          location: {
            file: 'DataDisplay.tsx',
            lineStart: 38,
            lineEnd: 38,
            codeSnippet: 'if (data.length == 0) return <div>No data available.</div>;',
          },
          suggestedFix: {
            code: 'if (data.length === 0) return <div>No data available.</div>;',
            explanation: 'Using strict equality prevents unexpected type coercion issues.',
          },
          impact: 'Ensures consistent behavior and follows TypeScript best practices.',
          effort: 1,
          priority: 'medium',
          category: 'bug',
          tags: ['typescript', 'equality', 'best-practice'],
        },
      ],
      lowPriorityIssues: [
        {
          title: 'Add descriptive error message',
          description: "Generic error message doesn't provide useful information to the user.",
          location: {
            file: 'DataDisplay.tsx',
            lineStart: 35,
            lineEnd: 35,
            codeSnippet: 'if (error) return <div>Error loading data.</div>;',
          },
          suggestedFix: {
            code: "if (error) return <div>Error loading data: {error.message || 'Unknown error'}</div>;",
            explanation:
              'Displaying the actual error message helps with debugging and provides more context to users.',
          },
          impact: 'Improves user experience and makes debugging easier.',
          effort: 1,
          priority: 'low',
          category: 'error-handling',
          tags: ['ux', 'debugging'],
        },
      ],
      summary:
        'The code has several type safety issues, potential bugs, and areas for improvement in error handling and user experience.',
      recommendations: [
        'Enable stricter TypeScript compiler options in tsconfig.json',
        'Add ESLint with typescript-eslint for automatic detection of similar issues',
        'Consider using React Query or SWR for better data fetching patterns',
      ],
      positiveAspects: [
        'Good component structure with clear separation of states (loading, error, empty, data)',
        'Proper use of React hooks (useState, useEffect)',
      ],
      recommendedTools: [
        {
          tool: 'typescript-eslint',
          description: 'ESLint plugin for TypeScript-specific linting rules',
          configuration: '{\n  "extends": ["plugin:@typescript-eslint/recommended"]\n}',
        },
        {
          tool: 'React Query',
          description:
            'Data fetching library for React that handles loading, error, and caching states',
          configuration: 'npm install @tanstack/react-query',
        },
      ],
    },
  };
}

export default improvedQuickFixesExample;
