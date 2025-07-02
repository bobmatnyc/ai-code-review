/**
 * @fileoverview Example usage of improved LangChain-based unused code review.
 *
 * This example demonstrates how to use the enhanced LangChain integration
 * for more effective unused code detection and analysis.
 */

import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import logger from '../../utils/logger';
import { PromptManager } from '../PromptManager';
// import { PromptStrategyFactory } from '../strategies/PromptStrategyFactory';
// import { PromptCache } from '../cache/PromptCache';
import { getImprovedUnusedCodeReviewFormatInstructions } from '../schemas/improved-unused-code-schema';

// Sample code with various unused code patterns
const typescriptSampleWithUnusedCode = `
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { debounce } from 'lodash';
import axios from 'axios';

// Old implementation that was replaced but kept for backward compatibility
function fetchDataLegacy(url: string): Promise<any> {
  return axios.get(url).then(res => res.data);
}

// Constants for deprecated feature
// TODO: Remove these after migration is complete (Added: Jan 2023)
const LEGACY_API_VERSION = 'v1';
const LEGACY_AUTH_HEADER = 'X-Auth-Token';

// Current implementation
async function fetchData(url: string, options?: RequestInit): Promise<any> {
  const response = await fetch(url, options);
  return await response.json();
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  // Deprecated fields from old API version
  legacyId?: number;
  permissions?: string[];
}

// Feature flag for new API
const USE_NEW_API = true;

export function UserProfile({ userId }: { userId: string }) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const { t } = useTranslation();
  
  // Unused debug variable
  const isDebugMode = process.env.NODE_ENV === 'development';
  
  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      try {
        // Dead code path - USE_NEW_API is always true
        if (!USE_NEW_API) {
          const headers = {
            [LEGACY_AUTH_HEADER]: localStorage.getItem('token') || ''
          };
          const result = await fetchDataLegacy(\`/api/\${LEGACY_API_VERSION}/users/\${userId}\`);
          
          // Transform legacy data
          const transformedData: UserData = {
            id: result.id.toString(),
            name: result.userName,
            email: result.email,
            role: result.isAdmin ? 'admin' : 'user',
            legacyId: result.id,
            permissions: result.permissionList
          };
          
          setUserData(transformedData);
        } else {
          const result = await fetchData(\`/api/v2/users/\${userId}\`);
          setUserData(result);
        }
      } catch (err) {
        setError(err as Error);
        
        // Commented out debugging code
        /*
        console.group('User Data Fetch Error');
        console.error('Failed to fetch user data:', err);
        console.error('User ID:', userId);
        console.error('API Version:', USE_NEW_API ? 'v2' : LEGACY_API_VERSION);
        console.groupEnd();
        */
      } finally {
        setLoading(false);
      }
    }
    
    loadUser();
  }, [userId]);
  
  // Unused function - was part of a feature that was never implemented
  function formatUserRole(role: string): string {
    return role === 'admin' ? t('roles.administrator') : t('roles.standardUser');
  }
  
  // Redundant function - duplicate of formatUserRole but with different naming
  const getUserRoleDisplay = (role: string): string => {
    return role === 'admin' ? t('roles.administrator') : t('roles.standardUser');
  };
  
  // Unnecessary memoization - return value is never used
  const userPermissions = useMemo(() => {
    if (!userData) return [];
    return userData.permissions || [];
  }, [userData]);
  
  const handleUserUpdate = useCallback(
    debounce((data: Partial<UserData>) => {
      if (!userData) return;
      
      // This function would update the user but is never called
      const updatedUser = { ...userData, ...data };
      fetchData(\`/api/v2/users/\${userData.id}\`, {
        method: 'PATCH',
        body: JSON.stringify(updatedUser)
      });
    }, 500),
    [userData]
  );
  
  if (loading) return <div>{t('common.loading')}</div>;
  if (error) return <div>{t('errors.userFetchFailed')}</div>;
  if (!userData) return <div>{t('errors.noUserData')}</div>;
  
  return (
    <div className="user-profile">
      <h1>{userData.name}</h1>
      <p>{userData.email}</p>
      <p>{t('userProfile.role')}: {userData.role === 'admin' ? t('roles.administrator') : t('roles.standardUser')}</p>
    </div>
  );
}
`;

/**
 * Example function demonstrating improved LangChain-based unused code review
 */
async function improvedUnusedCodeExample() {
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
    rawPrompt = await promptManager.getPromptTemplate('unused-code', {
      language: 'typescript',
      promptFile:
        '/Users/masa/Projects/ai-code-review/prompts/typescript/improved-unused-code-review.md',
      promptStrategy: 'langchain',
      type: 'unused-code',
      includeTests: false,
      output: 'markdown',
    });
  } catch (error) {
    logger.warn('Could not find improved prompt template, using standard template');
    rawPrompt = await promptManager.getPromptTemplate('unused-code', {
      language: 'typescript',
      promptStrategy: 'langchain',
      type: 'unused-code',
      includeTests: false,
      output: 'markdown',
    });
  }

  // Get format instructions for structured output
  const formatInstructions = getImprovedUnusedCodeReviewFormatInstructions();

  // Create examples for few-shot learning
  const examples = [
    {
      code: `
function calculateTotal(items) {
  let total = 0;
  // Unused variable
  const tax = 0.08;
  
  for (let i = 0; i < items.length; i++) {
    total += items[i].price;
  }
  
  // Commented out code
  /*
  if (applyDiscount) {
    total = total * 0.9;
  }
  */
  
  return total;
}
      `,
      analysis: `
This code contains:
1. An unused variable 'tax' declared but never used
2. Commented out code block that should be removed or implemented
      `,
    },
    {
      code: `
// Feature flag for new API - always true now
const useNewApi = true;

function fetchData(url) {
  if (!useNewApi) {
    // Old implementation
    return fetch(url).then(res => res.json());
  } else {
    // New implementation
    return axios.get(url).then(res => res.data);
  }
}
      `,
      analysis: `
This code contains:
1. A dead code path because 'useNewApi' is always true
2. The entire if branch is unreachable and should be removed
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
      'You are a TypeScript expert analyzing code for unused patterns. Here are some examples of unused code patterns and their analysis:',
    examples,
    examplePrompt: exampleTemplate,
    suffix:
      'Now, analyze the following TypeScript code for unused patterns, using the same structured approach as in the examples:\n\nCode to analyze:\n```typescript\n{CODE}\n```\n\n{{SCHEMA_INSTRUCTIONS}}',
    inputVariables: ['CODE', 'SCHEMA_INSTRUCTIONS'],
  });

  // Format the few-shot prompt with our sample code
  const formattedFewShotPrompt = await fewShotPromptTemplate.format({
    CODE: typescriptSampleWithUnusedCode,
    SCHEMA_INSTRUCTIONS: formatInstructions,
  });

  // Create a standard prompt template for comparison
  const standardTemplate = new PromptTemplate({
    template: rawPrompt,
    inputVariables: ['CODE', 'LANGUAGE', 'SCHEMA_INSTRUCTIONS', 'LANGUAGE_INSTRUCTIONS'],
  });

  // Format the standard prompt
  const formattedStandardPrompt = await standardTemplate.format({
    CODE: typescriptSampleWithUnusedCode,
    LANGUAGE: 'TypeScript',
    SCHEMA_INSTRUCTIONS: formatInstructions,
    LANGUAGE_INSTRUCTIONS:
      'This code is written in TypeScript. Please provide language-specific advice for identifying and removing unused TypeScript code.',
  });

  logger.info('Improved LangChain-based Few-Shot Prompt for Unused Code Review:');
  logger.info('----------------------------------------------------------------');
  logger.info(formattedFewShotPrompt.substring(0, 500) + '...');

  logger.info('\nStandard Prompt for Unused Code Review:');
  logger.info('-------------------------------------');
  logger.info(formattedStandardPrompt.substring(0, 500) + '...');

  return {
    fewShotPrompt: formattedFewShotPrompt,
    standardPrompt: formattedStandardPrompt,
    // This example output shows how much more detailed the improved schema is
    exampleStructuredOutput: {
      highImpactIssues: [
        {
          title: 'Dead code path with feature flag',
          description:
            'The code path when USE_NEW_API is false is never executed because USE_NEW_API is always true.',
          location: {
            file: 'UserProfile.tsx',
            lineStart: 40,
            lineEnd: 56,
            codeSnippet: 'if (!USE_NEW_API) { ... }',
          },
          assessment: {
            confidence: 'high',
            reasoning:
              'USE_NEW_API is explicitly set to true as a constant and never modified anywhere in the code.',
            staticAnalysisHint:
              "ESLint's no-unreachable rule could detect this with proper configuration.",
          },
          suggestedAction: {
            action: 'remove',
            replacement:
              '// Remove the if/else and keep only the code in the else block\nconst result = await fetchData(`/api/v2/users/${userId}`);\nsetUserData(result);',
            explanation:
              'Since USE_NEW_API is always true, we can remove the conditional and keep only the code in the else block.',
          },
          riskLevel: 'low',
          impactLevel: 'high',
          category: 'unreachableCode',
          relatedChecks: ['Check if USE_NEW_API is modified elsewhere in the codebase'],
        },
      ],
      // Additional sections omitted for brevity
      summary:
        'The code contains multiple instances of unused, redundant, and dead code that can be safely removed to improve maintainability and performance.',
      recommendations: [
        'Use ESLint with the @typescript-eslint/no-unused-vars rule to automatically detect unused variables',
        'Enable TypeScript compiler options like noUnusedLocals and noUnusedParameters',
      ],
      codebasePatterns: [
        {
          pattern: 'Feature flags as constants',
          impact: 'Creates dead code paths when set to constant values',
          suggestion:
            'Use environment variables or configuration objects for feature flags instead of hard-coded constants',
        },
      ],
      recommendedTools: [
        {
          tool: 'ESLint',
          description: 'Static code analysis tool',
          configuration:
            '{\n  "rules": {\n    "@typescript-eslint/no-unused-vars": "error",\n    "no-unreachable": "error"\n  }\n}',
        },
      ],
    },
  };
}

export default improvedUnusedCodeExample;
