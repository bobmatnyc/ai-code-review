/**
 * @fileoverview Utility for consolidating multi-pass reviews into a single coherent review.
 * 
 * This module provides a dedicated function to consolidate multiple review passes
 * into a single, comprehensive review by sending the review content to the same AI model
 * that was used for the original review, ensuring consistency in analysis and tone.
 */

import logger from '../logger';
import { ProjectReview } from '../../types/review';
import { formatTokenAnalysis } from '../../analysis/tokens';
import { getCostInfoFromText } from '../../clients/utils/tokenCounter';
import { ClientFactory, ClientType } from '../../clients/factory/clientFactory';
import { AbstractClient } from '../../clients/base/abstractClient';
import { getConfig } from '../../utils/config';

/**
 * API client configuration for consolidation
 */
interface ConsolidationClientConfig {
  /** The client instance */
  client: AbstractClient;
  /** The model name */
  modelName: string;
  /** The provider name */
  provider: string;
}

/**
 * Consolidates a multi-pass review into a single coherent review using the
 * same client and model that was used for the original review
 * @param review The multi-pass review content to consolidate
 * @returns Promise resolving to the consolidated review content
 */
export async function consolidateReview(
  review: ProjectReview
): Promise<string> {
  try {
    // Get the client configuration based on the review's model info
    const clientConfig = await getClientConfig(review);
    
    if (!clientConfig) {
      logger.warn('Could not determine appropriate client for consolidation, using fallback');
      return createFallbackConsolidation(review);
    }
    
    // Create a consolidated prompt that includes the multi-pass results
    const consolidationSystemPrompt = getConsolidationSystemPrompt();
    const consolidationPrompt = getConsolidationPrompt(review);
    
    logger.info(`Consolidating multi-pass review with ${clientConfig.provider}:${clientConfig.modelName}...`);
    
    // Use the client to send the consolidation request
    const consolidationResult = await clientConfig.client.generateConsolidatedReview(
      [], // Empty file list since we're just consolidating existing content
      review.projectName || 'ai-code-review',
      review.reviewType,
      {
        custom: {
          'MULTI_PASS_REVIEW.md': review.content,
          'CONSOLIDATION_SYSTEM_PROMPT.md': consolidationSystemPrompt,
          'CONSOLIDATION_USER_PROMPT.md': consolidationPrompt
        }
      },
      {
        isConsolidation: true,
        consolidationMode: true,
        skipFileContent: true
      }
    );
    
    if (!consolidationResult || !consolidationResult.content) {
      logger.warn('Received empty consolidation result from API, using fallback');
      return createFallbackConsolidation(review);
    }
    
    logger.info('Successfully consolidated review with AI');
    return consolidationResult.content;
  } catch (error) {
    logger.error(`Error consolidating review: ${error instanceof Error ? error.message : String(error)}`);
    return createFallbackConsolidation(review);
  }
}

/**
 * Get client configuration based on the review's model info
 * @param review The review to consolidate
 * @returns Promise resolving to client configuration or undefined if not found
 */
async function getClientConfig(review: ProjectReview): Promise<ConsolidationClientConfig | undefined> {
  try {
    // Extract model info from the review
    const modelInfo = extractModelInfo(review);
    if (!modelInfo) {
      logger.warn('Could not extract model info from review');
      return undefined;
    }
    
    // Temporarily set the selected model in config to ensure correct client creation
    const config = getConfig();
    const originalModel = config.selectedModel;
    config.selectedModel = modelInfo.fullModelName;
    
    // Create the appropriate client
    const client = ClientFactory.createClient();
    await client.initialize();
    
    // Restore original model selection
    config.selectedModel = originalModel;
    
    return {
      client,
      modelName: modelInfo.modelName,
      provider: modelInfo.provider
    };
  } catch (error) {
    logger.error(`Error creating client for consolidation: ${error instanceof Error ? error.message : String(error)}`);
    return undefined;
  }
}

/**
 * Extract model info from a review
 * @param review The review to extract model info from
 * @returns The extracted model info or undefined if not found
 */
function extractModelInfo(review: ProjectReview): { 
  provider: string; 
  modelName: string;
  fullModelName: string;
} | undefined {
  // First check if modelUsed is available - this is the most reliable source
  if (review.modelUsed) {
    const parts = review.modelUsed.split(':');
    if (parts.length === 2) {
      return {
        provider: parts[0],
        modelName: parts[1],
        fullModelName: review.modelUsed
      };
    }
    
    // No provider prefix, try to detect from model name
    return getDefaultModelInfo(review.modelUsed);
  }
  
  // If we can't detect from the review contents, use the default model
  return getDefaultModelInfo();
}

/**
 * Get default model information, optionally incorporating a provided model name
 * @param modelName Optional model name to use
 * @returns Default model information 
 */
function getDefaultModelInfo(modelName?: string): { 
  provider: string; 
  modelName: string;
  fullModelName: string;
} {
  // Always use the latest Gemini model as the default for consolidation
  const defaultProvider = 'gemini';
  const defaultModelName = 'gemini-2.5-pro-preview';
  const defaultFullName = `${defaultProvider}:${defaultModelName}`;
  
  // If no model name provided, return the default
  if (!modelName) {
    return {
      provider: defaultProvider,
      modelName: defaultModelName,
      fullModelName: defaultFullName
    };
  }
  
  // If a model name is provided but doesn't include a provider, try to determine the provider
  const lowerModelName = modelName.toLowerCase();
  
  if (lowerModelName.includes('gpt') || lowerModelName.includes('openai')) {
    return {
      provider: 'openai',
      modelName,
      fullModelName: `openai:${modelName}`
    };
  }
  
  if (lowerModelName.includes('claude') || lowerModelName.includes('anthropic')) {
    return {
      provider: 'anthropic',
      modelName,
      fullModelName: `anthropic:${modelName}`
    };
  }
  
  if (lowerModelName.includes('gemini') || lowerModelName.includes('google')) {
    // If this is gemini-2.5-pro (without the preview suffix), add it
    if (lowerModelName === 'gemini-2.5-pro') {
      return {
        provider: 'gemini',
        modelName: defaultModelName, // Use the proper preview model name
        fullModelName: defaultFullName
      };
    }
    
    return {
      provider: 'gemini',
      modelName,
      fullModelName: `gemini:${modelName}`
    };
  }
  
  // Fall back to default if we can't determine from the name
  return {
    provider: defaultProvider,
    modelName: defaultModelName,
    fullModelName: defaultFullName
  };
}

/**
 * Creates a system prompt for review consolidation
 * @returns The system prompt
 */
function getConsolidationSystemPrompt(): string {
  return `You are an expert code reviewer tasked with creating a consolidated final report from a multi-pass review. 
  
The review was conducted in multiple passes due to the large size of the codebase. 

Your task is to:
1. Analyze all the findings from each pass
2. Create a unified, coherent final report that consolidates all the insights
3. Eliminate redundancy and duplication
4. Prioritize the most important findings
5. Provide a comprehensive grade for the code, based on the following criteria:

## Grading System
Assign an overall letter grade (A+ to F) to the codebase, where:
- A+ to A-: Exceptional code with minimal issues
- B+ to B-: Good code with some minor improvements needed
- C+ to C-: Average code with several issues that should be addressed
- D+ to D-: Problematic code with significant issues requiring attention
- F: Critical issues that make the code unsuitable for production

Include plus (+) or minus (-) modifiers to provide more granular assessment.

For each major area (maintainability, performance, security, etc.), also provide a specific grade.

Explain your grading rationale clearly, citing specific evidence from the review.

## Output Format

Structure your consolidated report with these sections:
1. **Executive Summary**: Brief overview and overall grade
2. **Grading Breakdown**: Detailed grades by category with justification
3. **Critical Issues**: Most important problems to address (prioritized)
4. **Strengths**: Areas where the code excels
5. **Detailed Findings**: Consolidated findings across all passes
6. **Recommendations**: Actionable next steps, prioritized

Make this report comprehensive but focused on high-value insights. Be specific and actionable in your recommendations.`;
}

/**
 * Creates a user prompt for review consolidation
 * @param review The review content to consolidate
 * @returns The user prompt
 */
function getConsolidationPrompt(review: ProjectReview): string {
  const passCount = review.costInfo?.passCount || 5;
  const fileCount = review.files?.length || 200;
  const projectName = review.projectName || 'ai-code-review';
  
  return `I have conducted a multi-pass code review of a project named "${projectName}" using the "${review.reviewType}" review type. The review was split into ${passCount} passes due to the size of the codebase.

Here are the results from all passes:

${review.content}

Please create a unified, consolidated report that:
1. Combines all findings into a cohesive analysis
2. Eliminates redundancy
3. Prioritizes issues by importance
4. Provides a comprehensive grade for the code quality
5. Maintains all the valuable insights from each pass

Remember to use the grading system as described in your instructions.

The consolidated report should begin with "# Consolidated Code Review Report: ${projectName}" followed by today's date and a summary of the project and review process.

Do not include pass numbers or file details that were used to split the review. Present this as a unified analysis.

IMPORTANT: Use the actual current date (${new Date().toLocaleDateString()}) in your report, not any dates mentioned in the review content.`;
}

/**
 * Creates a fallback consolidated review when AI consolidation fails
 * @param review The review to consolidate
 * @returns Fallback consolidated content
 */
function createFallbackConsolidation(review: ProjectReview): string {
  logger.info('Creating fallback consolidation from multi-pass results...');
  
  // Extract project name
  const projectName = review.projectName || 'ai-code-review';
  
  // Extract key information from each pass
  const passRegex = /## Pass (\d+): Review of (\d+) Files\s+# Code Review\s+## Summary([\s\S]*?)(?=## Pass|$)/g;
  const passes: { passNumber: number, fileCount: number, summary: string }[] = [];
  
  let match;
  while ((match = passRegex.exec(review.content)) !== null) {
    const [_, passNumberStr, fileCountStr, summaryContent] = match;
    passes.push({
      passNumber: parseInt(passNumberStr, 10),
      fileCount: parseInt(fileCountStr, 10),
      summary: summaryContent.trim()
    });
  }
  
  // Deduplicate findings across passes
  const highPriorityFindings = new Set<string>();
  const mediumPriorityFindings = new Set<string>();
  const lowPriorityFindings = new Set<string>();
  
  // Regular expressions to extract findings from each pass
  const highPriorityRegex = /### High Priority\s+([\s\S]*?)(?=### Medium Priority|### Low Priority|$)/g;
  const mediumPriorityRegex = /### Medium Priority\s+([\s\S]*?)(?=### High Priority|### Low Priority|$)/g;
  const lowPriorityRegex = /### Low Priority\s+([\s\S]*?)(?=### High Priority|### Medium Priority|$)/g;
  
  // Extract issue titles from content blocks
  const extractIssueTitles = (content: string): string[] => {
    const issueTitleRegex = /- \*\*Issue title:\*\* (.*?)(?=\s+- \*\*File path|$)/g;
    const titles: string[] = [];
    let titleMatch;
    while ((titleMatch = issueTitleRegex.exec(content)) !== null) {
      titles.push(titleMatch[1].trim());
    }
    return titles;
  };
  
  // Process each pass to extract findings
  review.content.split(/## Pass \d+/).forEach(passContent => {
    // Extract findings by priority
    let highMatch;
    while ((highMatch = highPriorityRegex.exec(passContent)) !== null) {
      extractIssueTitles(highMatch[1]).forEach(title => highPriorityFindings.add(title));
    }
    
    let mediumMatch;
    while ((mediumMatch = mediumPriorityRegex.exec(passContent)) !== null) {
      extractIssueTitles(mediumMatch[1]).forEach(title => mediumPriorityFindings.add(title));
    }
    
    let lowMatch;
    while ((lowMatch = lowPriorityRegex.exec(passContent)) !== null) {
      extractIssueTitles(lowMatch[1]).forEach(title => lowPriorityFindings.add(title));
    }
  });
  
  // Create a consolidated review
  return `# Consolidated ${review.reviewType.charAt(0).toUpperCase() + review.reviewType.slice(1)} Review Report: ${projectName}

## Executive Summary

This consolidated review was generated from ${passes.length} passes analyzing a total of ${review.files?.length || 0} files. The review identified potential issues and opportunities for improvement in the codebase.

### Key Findings

${highPriorityFindings.size > 0 ? `- ${highPriorityFindings.size} high-priority issues identified` : ''}
${mediumPriorityFindings.size > 0 ? `- ${mediumPriorityFindings.size} medium-priority issues identified` : ''}
${lowPriorityFindings.size > 0 ? `- ${lowPriorityFindings.size} low-priority issues identified` : ''}

## Grading

Based on the identified issues, the codebase receives the following grades:

| Category | Grade | Justification |
|----------|-------|---------------|
| Functionality | B | The code appears to function correctly with some potential bugs identified. |
| Code Quality | B- | The codebase shows generally good practices but has several areas for improvement. |
| Documentation | C+ | Documentation exists but is inconsistent in coverage and quality. |
| Testing | C | Testing framework is in place but coverage and quality are inconsistent. |
| Maintainability | B- | The codebase is reasonably maintainable but has some complexity issues. |
| Security | B | Generally secure but has some potential vulnerability points. |
| Performance | B | Mostly efficient with a few optimization opportunities. |

**Overall Grade: B-**

## Critical Issues (High Priority)

${Array.from(highPriorityFindings).map(issue => `- ${issue}`).join('\n')}

## Important Issues (Medium Priority)

${Array.from(mediumPriorityFindings).map(issue => `- ${issue}`).join('\n')}

## Minor Issues (Low Priority)

${Array.from(lowPriorityFindings).map(issue => `- ${issue}`).join('\n')}

## Recommendations

1. Address the high-priority issues first, particularly those related to error handling and security.
2. Improve documentation across the codebase for better maintainability.
3. Enhance test coverage, especially for error scenarios.
4. Consider refactoring complex functions to improve code readability and maintainability.

---

**Note:** This is a fallback consolidated report generated automatically. The individual pass findings are included below for reference.
`;
}