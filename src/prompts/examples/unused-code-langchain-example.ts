/**
 * @fileoverview Example usage of LangChain for unused code review with code tracing.
 *
 * This example demonstrates how to use LangChain for unused code review
 * with deep code tracing to verify unused code with high confidence by
 * analyzing the import graph and tracking references.
 */

import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import logger from '../../utils/logger';
import { PromptCache } from '../cache/PromptCache';
import { PromptManager } from '../PromptManager';
import { getCodeTracingUnusedCodeReviewFormatInstructions } from '../schemas/code-tracing-unused-code-schema';
import { getUnusedCodeReviewFormatInstructions } from '../schemas/unused-code-schema';
import { PromptStrategyFactory } from '../strategies/PromptStrategyFactory';

/**
 * Example function demonstrating LangChain usage for unused code review
 */
async function unusedCodeLangChainExample() {
  // Get the prompt manager instance
  const promptManager = PromptManager.getInstance();

  // Get the prompt cache instance
  const promptCache = PromptCache.getInstance();

  // Create a LangChain strategy
  PromptStrategyFactory.createStrategy('langchain', promptManager, promptCache);

  // Get a raw prompt template for unused code review
  const rawPrompt = await promptManager.getPromptTemplate('unused-code', {
    language: 'typescript',
    type: 'unused-code',
    includeTests: false,
    output: 'markdown',
    promptStrategy: 'langchain',
  });

  // Get format instructions for structured output
  const formatInstructions = getUnusedCodeReviewFormatInstructions();

  // Create a LangChain prompt template directly
  const template = new PromptTemplate({
    template: rawPrompt,
    inputVariables: ['CODE', 'LANGUAGE', 'SCHEMA_INSTRUCTIONS', 'LANGUAGE_INSTRUCTIONS'],
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
    LANGUAGE_INSTRUCTIONS:
      'This code is written in TypeScript. Please provide language-specific advice for identifying and removing unused TypeScript code.',
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
          title: 'Dead code path with feature flag',
          description:
            "The condition 'if (!useNewApi)' is never executed because 'useNewApi' is always true.",
          location: { file: 'useDataFetcher.ts', lineStart: 40, lineEnd: 44 },
          assessment:
            "100% confident. The 'useNewApi' variable is explicitly set to true and never modified.",
          suggestedAction: "Remove the conditional branch and keep only the 'else' block code.",
          riskLevel: 'low',
          impactLevel: 'high',
          category: 'featureFlag',
        },
      ],
      mediumImpactIssues: [
        {
          title: 'Unused transformData function',
          description:
            "The function 'transformData' is defined but never used anywhere in the code.",
          location: { file: 'useDataFetcher.ts', lineStart: 59, lineEnd: 64 },
          assessment: '95% confident. This function is not called anywhere in the visible code.',
          suggestedAction: "Remove this function if it's not used elsewhere in the codebase.",
          riskLevel: 'low',
          impactLevel: 'medium',
          category: 'deadCode',
        },
      ],
      lowImpactIssues: [
        {
          title: 'Unused debug variable',
          description: "The 'debug' variable is defined but never used in the code.",
          location: { file: 'useDataFetcher.ts', lineStart: 33, lineEnd: 33 },
          assessment: '100% confident. This variable is initialized but never referenced.',
          suggestedAction: 'Remove this variable.',
          riskLevel: 'low',
          impactLevel: 'low',
          category: 'deadCode',
        },
      ],
      summary:
        'The code contains several instances of unused code that can be safely removed, including a dead code path controlled by a feature flag, an unused function, and an unused variable.',
      recommendations: [
        'Use ESLint with the @typescript-eslint/no-unused-vars rule to automatically detect unused variables',
        'Set up TypeScript compiler options like noUnusedLocals to catch unused variables during build',
        'Regularly review and remove feature flags once features are fully released',
      ],
    },
  };
}

/**
 * Example function demonstrating LangChain usage for unused code review with code tracing
 */
async function codeTracingUnusedCodeExample() {
  // Get the prompt manager instance
  const promptManager = PromptManager.getInstance();

  // Get the prompt cache instance
  const promptCache = PromptCache.getInstance();

  // Create a LangChain strategy
  PromptStrategyFactory.createStrategy('langchain', promptManager, promptCache);

  // Get a raw prompt template for code tracing unused code review
  await promptManager.getPromptTemplate('code-tracing-unused-code', {
    language: 'typescript',
    type: 'code-tracing-unused-code',
    includeTests: false,
    output: 'markdown',
    promptStrategy: 'langchain',
  });

  // Get format instructions for structured output
  const formatInstructions = getCodeTracingUnusedCodeReviewFormatInstructions();

  // Sample examples for few-shot prompting
  const fewShotExamples = [
    {
      code: `// src/utils/helpers.ts
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  return age;
}

// src/utils/index.ts
export { formatDate } from './helpers';

// src/components/Profile.tsx
import { formatDate } from '../utils';`,
      analysis: `The \`calculateAge\` function in src/utils/helpers.ts is unused:
1. It's defined and exported in helpers.ts
2. However, it's not re-exported in the utils/index.ts barrel file
3. I searched the entire codebase and found no direct imports from './helpers'
4. Only formatDate is imported via the barrel file in Profile.tsx
5. No dynamic imports or requires use this function
6. No references to this function name exist in string literals or comments that would indicate dynamic usage
7. HIGH confidence: This function can be safely removed as it's not referenced anywhere in the codebase.`,
    },
    {
      code: `// src/types/common.ts
export interface UserConfig {
  id: string;
  preferences: Record<string, unknown>;
}

export interface AdminConfig extends UserConfig {
  permissions: string[];
}

// Usage across files
import { AdminConfig } from './types/common';

function setupAdmin(config: AdminConfig) {
  // Implementation
}`,
      analysis: `The \`UserConfig\` interface is actively used:
1. It's defined and exported in types/common.ts
2. While there are no direct imports of UserConfig
3. It's extended by AdminConfig which is imported and used
4. The interface forms part of the type hierarchy
5. LOW confidence: Cannot be removed as it's indirectly used via inheritance`,
    },
  ];

  // Create an example prompt template
  const exampleTemplate = new PromptTemplate({
    inputVariables: ['code', 'analysis'],
    template: 'Code:\n{code}\n\nAnalysis:\n{analysis}',
  });

  // Create the few-shot prompt template
  const fewShotPrompt = new FewShotPromptTemplate({
    examples: fewShotExamples,
    examplePrompt: exampleTemplate,
    prefix: `You are an expert code reviewer specializing in finding unused code. Your task is to carefully trace through the codebase to find code elements that are never used and can be safely removed.

For each potentially unused element, you should analyze:
1. Where it's defined
2. How it's exported
3. Whether it's imported elsewhere
4. Whether it's called or referenced
5. Any edge cases that might hide usage

Please follow a multi-pass approach:
- PASS 1: Map entry points and dependencies
- PASS 2: Trace references through imports, exports, and usage
- PASS 3: Verify findings and assess confidence

${formatInstructions}

Here are examples of high-quality analyses:`,
    suffix: `Now analyze the following code:

{code}

Provide a detailed analysis with evidence for each element you identify as unused. Focus specifically on analyzing the import graph with barrel files (index.ts) and how modules are imported and re-exported.`,
    inputVariables: ['code'],
  });

  // Example input for an utility-heavy example
  const codeToAnalyze = `
// src/utils/stringUtils.ts
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w-]+/g, '');
}

// src/utils/index.ts
export { capitalize, truncate } from './stringUtils';

// src/utils/files/pathUtils.ts
export function getExtension(filename: string): string {
  return filename.slice(filename.lastIndexOf('.') + 1);
}

export function joinPaths(...paths: string[]): string {
  return paths.join('/').replace(/\\/+/g, '/');
}

// src/utils/files/index.ts
export { getExtension } from './pathUtils';

// src/utils/formatters.ts
import { capitalize } from './index';

export function formatName(firstName: string, lastName: string): string {
  return \`\${capitalize(firstName)} \${capitalize(lastName)}\`;
}

export function formatCurrency(amount: number): string {
  return \`$\${amount.toFixed(2)}\`;
}

// src/components/UserProfile.tsx
import { truncate } from '../utils';
import { formatName, formatCurrency } from '../utils/formatters';

function UserProfile() {
  const displayName = formatName('john', 'doe');
  const bio = truncate('This is a user bio that might be very long...', 50);
  return (
    <div>
      <h1>{displayName}</h1>
      <p>{bio}</p>
      <p>Balance: {formatCurrency(125.50)}</p>
    </div>
  );
}
  `;

  // Format the prompt with the example
  const formattedPrompt = await fewShotPrompt.format({
    code: codeToAnalyze,
  });

  logger.info('Code Tracing LangChain Prompt for Unused Code Review:');
  logger.info('-------------------------------------------------');
  logger.info(formattedPrompt);

  // This would be passed to the AI model in a real implementation
  // const result = await model.invoke(formattedPrompt);
  // const parsedResult = await codeTracingUnusedCodeReviewParser.parse(result);

  return {
    prompt: formattedPrompt,
    // Example of what the parsed output might look like
    exampleOutput: {
      unusedFiles: [],
      unusedFunctions: [
        {
          elementType: 'function',
          name: 'slugify',
          filePath: 'src/utils/stringUtils.ts',
          location: {
            startLine: 9,
            endLine: 11,
          },
          codeSnippet:
            "export function slugify(str: string): string {\n  return str.toLowerCase().replace(/\\s+/g, '-').replace(/[^\\w-]+/g, '');\n}",
          confidence: 'high',
          confidenceReason: 'Not exported in barrel file and no direct imports found',
          evidence: {
            definition: {
              file: 'src/utils/stringUtils.ts',
              line: 9,
              codeSnippet: 'export function slugify(str: string): string {',
            },
            importSearch: {
              searchedIn: [
                'All project files',
                'src/utils/index.ts',
                'Direct imports from stringUtils.ts',
              ],
              noImportsFound: true,
              searchMethod: 'Analyzed all import statements and barrel files',
            },
            referenceSearch: {
              searchedIn: ['All project files', 'String literals', 'Dynamic imports'],
              noReferencesFound: true,
              searchMethod: 'Searched for function name references',
            },
            edgeCasesConsidered: [
              {
                case: 'Re-export through barrel files',
                verification: 'Not re-exported in src/utils/index.ts',
              },
              {
                case: 'Dynamic function calls',
                verification: 'No string literals matching function name found',
              },
            ],
          },
        },
        {
          elementType: 'function',
          name: 'joinPaths',
          filePath: 'src/utils/files/pathUtils.ts',
          location: {
            startLine: 15,
            endLine: 17,
          },
          codeSnippet:
            "export function joinPaths(...paths: string[]): string {\n  return paths.join('/').replace(/\\/+/g, '/');\n}",
          confidence: 'high',
          confidenceReason: 'Not exported in barrel file and no direct imports found',
          evidence: {
            definition: {
              file: 'src/utils/files/pathUtils.ts',
              line: 15,
              codeSnippet: 'export function joinPaths(...paths: string[]): string {',
            },
            importSearch: {
              searchedIn: [
                'All project files',
                'src/utils/files/index.ts',
                'Direct imports from pathUtils.ts',
              ],
              noImportsFound: true,
              searchMethod: 'Analyzed all import statements and barrel files',
            },
            referenceSearch: {
              searchedIn: ['All project files', 'String literals', 'Dynamic imports'],
              noReferencesFound: true,
              searchMethod: 'Searched for function name references',
            },
            edgeCasesConsidered: [
              {
                case: 'Re-export through barrel files',
                verification: 'Not re-exported in src/utils/files/index.ts',
              },
            ],
          },
        },
      ],
      unusedClasses: [],
      unusedTypesAndInterfaces: [],
      deadCodeBranches: [],
      unusedVariablesAndImports: [],
      analysisMethodology: {
        entryPoints: ['src/components/UserProfile.tsx'],
        moduleResolution: 'Analyzed TypeScript module resolution including barrel files',
        referenceTracking: 'Traced through all imports, re-exports, and function calls',
        limitations: [
          'Limited to static analysis of the provided code',
          'Cannot detect runtime dynamic imports or eval usage',
        ],
      },
      summary: {
        totalUnusedElements: 2,
        highConfidenceCount: 2,
        filesWithUnusedCode: 2,
        potentialCodeReduction: '~15%',
      },
    },
  };
}

export default {
  unusedCodeLangChainExample,
  codeTracingUnusedCodeExample,
};
