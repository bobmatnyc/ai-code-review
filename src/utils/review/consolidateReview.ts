/**
 * @fileoverview Utility for consolidating multi-pass reviews into a single coherent review.
 *
 * This module provides a dedicated function to consolidate multiple review passes
 * into a single, comprehensive review by sending the review content to the same AI model
 * that was used for the original review, ensuring consistency in analysis and tone.
 */

import { ClientFactory } from '../../clients/factory/clientFactory';
import type { ReviewResult } from '../../types/review';
import { getConfig } from '../../utils/config';
import logger from '../logger';

/**
 * Consolidates a multi-pass review into a single coherent review using the
 * configured client and model from environment/arguments
 * @param review The multi-pass review content to consolidate
 * @returns Promise resolving to the consolidated review content
 */
export async function consolidateReview(review: ReviewResult): Promise<string> {
  try {
    logger.debug('[CONSOLIDATION] Starting consolidation with:', {
      hasContent: !!review.content,
      contentLength: review.content?.length || 0,
      projectName: review.projectName,
      modelUsed: review.modelUsed,
      reviewType: review.reviewType,
      firstChars: review.content?.substring(0, 200) || 'N/A',
    });

    // Use the writer model if configured, otherwise fall back to the main model
    const config = getConfig();
    const consolidationModel = config.writerModel || config.selectedModel;

    logger.info(`Creating client with model ${consolidationModel} for consolidation`);

    // Temporarily override the model environment variable for client initialization
    const originalModel = process.env.AI_CODE_REVIEW_MODEL;
    logger.debug('[CONSOLIDATION] Original model:', originalModel || 'not set');
    logger.debug('[CONSOLIDATION] Consolidation model:', consolidationModel);
    process.env.AI_CODE_REVIEW_MODEL = consolidationModel;

    try {
      // Create and initialize the client with the consolidation model
      const client = ClientFactory.createClient(consolidationModel);
      logger.debug('[CONSOLIDATION] Created client:', {
        clientType: client.constructor.name,
        model: consolidationModel,
        isInitialized: client.getIsInitialized ? client.getIsInitialized() : 'unknown',
      });

      try {
        await client.initialize();
        logger.debug('[CONSOLIDATION] Client initialized successfully');
      } catch (initError) {
        logger.error('[CONSOLIDATION] Failed to initialize client:', initError);
        throw new Error(
          `Failed to initialize ${consolidationModel} client for consolidation: ${initError instanceof Error ? initError.message : String(initError)}`,
        );
      }

      // Extract provider from the configured model
      // const [_provider] = consolidationModel.split(':'); // Not used in this implementation

      // Create a consolidated prompt that includes the multi-pass results
      const consolidationSystemPrompt = getConsolidationSystemPrompt();
      const consolidationPrompt = getConsolidationPrompt(review);

      logger.debug('[CONSOLIDATION] Prompts created:', {
        systemPromptLength: consolidationSystemPrompt.length,
        userPromptLength: consolidationPrompt.length,
      });

      logger.info(`Consolidating multi-pass review with ${consolidationModel}...`);

      logger.debug('[CONSOLIDATION] Sending to generateConsolidatedReview with:', {
        filesCount: 1,
        fileName: 'MULTI_PASS_REVIEW.md',
        contentLength: review.content?.length || 0,
        projectName: review.projectName || 'ai-code-review',
        reviewType: review.reviewType,
        options: {
          type: review.reviewType,
          includeTests: false,
          output: 'markdown',
          isConsolidation: true,
          consolidationMode: true,
          skipFileContent: false,
          interactive: false,
        },
      });

      // Make a direct API call with our custom prompts for consolidation
      // This is necessary because the standard generateConsolidatedReview doesn't support custom prompts
      const [provider, modelName] = consolidationModel.split(':');

      if (provider === 'openai') {
        // Use direct OpenAI API call with custom prompts
        const apiKey = process.env.AI_CODE_REVIEW_OPENAI_API_KEY;
        if (!apiKey) {
          throw new Error('OpenAI API key not found');
        }

        const { fetchWithRetry } = await import('../../clients/base/httpClient');

        const requestBody: {
          model: string;
          messages: Array<{ role: string; content: string }>;
          max_tokens?: number;
          max_completion_tokens?: number;
          temperature?: number;
        } = {
          model: modelName,
          messages: [
            {
              role: 'system',
              content: consolidationSystemPrompt,
            },
            {
              role: 'user',
              content: consolidationPrompt,
            },
          ],
        };

        // Add appropriate max tokens parameter based on model
        if (modelName.startsWith('o3')) {
          requestBody.max_completion_tokens = 4096;
        } else {
          requestBody.max_tokens = 4096;
          requestBody.temperature = 0.2;
        }

        logger.debug('[CONSOLIDATION] Making direct OpenAI API call with custom prompts');

        // Retry logic for API calls with JSON validation
        let retryCount = 0;
        const maxRetries = 3;
        let data: any = null;

        while (retryCount < maxRetries && !data) {
          try {
            const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify(requestBody),
            });

            const responseText = await response.text();

            // Validate that we have actual content before parsing
            if (!responseText || responseText.trim() === '') {
              throw new Error('Empty response from API');
            }

            // Check if response looks like JSON
            const trimmedResponse = responseText.trim();
            if (!trimmedResponse.startsWith('{') && !trimmedResponse.startsWith('[')) {
              logger.warn(`[CONSOLIDATION] Non-JSON response on attempt ${retryCount + 1}`);
              throw new Error('Response is not valid JSON');
            }

            // Try to parse JSON
            try {
              data = JSON.parse(responseText);

              // Validate the structure
              if (!data || typeof data !== 'object') {
                throw new Error('Parsed data is not an object');
              }

              if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
                throw new Error('Response missing choices array');
              }

              if (!data.choices[0].message || !data.choices[0].message.content) {
                throw new Error('Response missing message content');
              }

              // Successfully parsed and validated
              logger.debug(`[CONSOLIDATION] Successfully parsed JSON on attempt ${retryCount + 1}`);
              break;
            } catch (jsonError) {
              logger.error(
                `[CONSOLIDATION] JSON parse error on attempt ${retryCount + 1}:`,
                jsonError,
              );
              logger.debug(
                '[CONSOLIDATION] Raw response (first 1000 chars):',
                responseText.substring(0, 1000),
              );

              // Try to recover partial content from malformed JSON
              if (retryCount === maxRetries - 1) {
                // Last attempt - try to extract content
                const patterns = [
                  /"content":\s*"([^"]+(?:\\.[^"]+)*)"/, // Standard JSON string
                  /"content":\s*'([^']+(?:\\.[^']+)*)'/, // Single quotes (non-standard)
                  /content['":\s]+([^,}]+)/, // Loose pattern
                ];

                for (const pattern of patterns) {
                  const match = responseText.match(pattern);
                  if (match?.[1]) {
                    logger.warn(
                      '[CONSOLIDATION] Attempting to extract partial content from malformed JSON',
                    );
                    let extractedContent = match[1];

                    // Unescape common sequences
                    extractedContent = extractedContent
                      .replace(/\\n/g, '\n')
                      .replace(/\\r/g, '\r')
                      .replace(/\\t/g, '\t')
                      .replace(/\\"/g, '"')
                      .replace(/\\\\/g, '\\');

                    if (extractedContent && extractedContent.trim().length > 100) {
                      logger.warn('[CONSOLIDATION] Successfully extracted partial content');
                      return extractedContent;
                    }
                  }
                }
              }

              throw jsonError;
            }
          } catch (error) {
            retryCount++;
            logger.warn(
              `[CONSOLIDATION] Attempt ${retryCount} failed: ${error instanceof Error ? error.message : String(error)}`,
            );

            if (retryCount < maxRetries) {
              const waitTime = Math.min(1000 * 2 ** retryCount, 5000);
              logger.info(
                `[CONSOLIDATION] Waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`,
              );
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            } else {
              logger.error('[CONSOLIDATION] All retry attempts exhausted');
              throw new Error(
                `Failed after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          }
        }

        // Data should be validated by this point
        if (!data || !data.choices?.[0]?.message?.content) {
          logger.error('[CONSOLIDATION] Unexpected: data validation passed but content missing');
          logger.debug('[CONSOLIDATION] Response data:', JSON.stringify(data).substring(0, 500));
          throw new Error('Invalid API response structure after validation');
        }

        const consolidatedContent = data.choices[0].message.content;

        logger.debug('[CONSOLIDATION] Received direct API response:', {
          contentLength: consolidatedContent.length,
          firstChars: consolidatedContent.substring(0, 200),
        });

        if (!consolidatedContent || consolidatedContent.trim() === '') {
          logger.warn('Received empty consolidation from direct API call');
          return createFallbackConsolidation(review);
        }

        logger.info('Successfully consolidated review with AI using direct API call');
        return consolidatedContent;
      }
      // For non-OpenAI providers, we need to use a different approach
      // We'll send the consolidation as a single review request with custom prompt
      logger.info(`Using custom consolidation approach for ${provider} provider`);

      // Create a custom prompt that includes both system and user prompts
      const fullConsolidationPrompt = `${consolidationSystemPrompt}

---

${consolidationPrompt}`;

      // For Gemini and other providers, we'll use generateReview with a special prompt
      // This avoids the issue of the content being treated as source code
      if (client.generateReview) {
        logger.debug(
          '[CONSOLIDATION] Using generateReview method with custom consolidation prompt',
        );

        let consolidationResult;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          try {
            consolidationResult = await client.generateReview(
              fullConsolidationPrompt, // Use our custom consolidation prompt as the file content
              'CONSOLIDATION_TASK', // Special file path to indicate this is a consolidation
              'architectural', // Use architectural review type as it's most comprehensive
              null, // No project docs needed
              {
                type: 'architectural',
                skipFileContent: true, // Don't try to include file content in the prompt
                isConsolidation: true,
                includeTests: false,
                output: 'markdown',
                interactive: false,
              },
            );

            // Validate the response
            if (consolidationResult?.content && consolidationResult.content.trim() !== '') {
              return consolidationResult.content;
            }

            logger.warn(
              `[CONSOLIDATION] Attempt ${retryCount + 1} returned empty content, retrying...`,
            );
          } catch (retryError) {
            logger.warn(`[CONSOLIDATION] Attempt ${retryCount + 1} failed:`, retryError);
          }

          retryCount++;
          if (retryCount < maxRetries) {
            // Wait before retrying (exponential backoff)
            const waitTime = Math.min(1000 * 2 ** retryCount, 5000);
            logger.info(
              `[CONSOLIDATION] Waiting ${waitTime}ms before retry ${retryCount + 1}/${maxRetries}`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }

        logger.error(`[CONSOLIDATION] All ${maxRetries} attempts failed, using fallback`);
        return createFallbackConsolidation(review);
      }
      // If generateReview is not available, try a direct API approach
      logger.warn(
        `Provider ${provider} does not support generateReview method, attempting direct API call`,
      );

      // For now, fall back to the problematic approach with a warning
      // TODO: Implement direct API calls for other providers
      const consolidationResult = await client.generateConsolidatedReview(
        [
          {
            path: 'CONSOLIDATION_REQUEST.md',
            relativePath: 'CONSOLIDATION_REQUEST.md',
            content: fullConsolidationPrompt,
          },
        ],
        review.projectName || 'ai-code-review',
        'architectural', // Use architectural type
        null,
        {
          type: 'architectural',
          includeTests: false,
          output: 'markdown',
          isConsolidation: true,
          skipFileContent: true,
          interactive: false,
        },
      );

      return consolidationResult?.content || createFallbackConsolidation(review);
    } finally {
      // Restore the original model environment variable
      if (originalModel !== undefined) {
        process.env.AI_CODE_REVIEW_MODEL = originalModel;
      } else {
        delete process.env.AI_CODE_REVIEW_MODEL;
      }
    }
  } catch (error) {
    logger.error(
      `[CONSOLIDATION] Error consolidating review: ${error instanceof Error ? error.message : String(error)}`,
    );
    logger.debug('[CONSOLIDATION] Error details:', {
      errorType: error?.constructor?.name,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
    });
    logger.warn('[CONSOLIDATION] Falling back to automatic consolidation without AI');
    return createFallbackConsolidation(review);
  }
}

/**
 * Creates a system prompt for review consolidation
 * @returns The system prompt
 */
function getConsolidationSystemPrompt(): string {
  return `You are an expert code reviewer tasked with creating a consolidated final report from a multi-pass review. 
  
The review was conducted in multiple passes due to the large size of the codebase. You will receive the complete multi-pass review content and need to:

1. Extract and deduplicate all findings across all passes
2. Organize findings by priority (High/Critical, Medium/Important, Low/Minor)
3. Create a coherent executive summary
4. Provide overall grading and recommendations

The input contains multiple review passes in the format "## Pass X: Review of Y Files" followed by the review content for that pass.

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
function getConsolidationPrompt(review: ReviewResult): string {
  const passCount = review.costInfo?.passCount || 5;
  // const _fileCount = review.files?.length || 200; // Not used in this prompt
  const projectName = review.projectName || 'ai-code-review';

  return `I have conducted a multi-pass code review of a project named "${projectName}" using the "${review.reviewType}" review type. The review was split into ${passCount} passes due to the size of the codebase.

Here are the results from all passes:

${review.content}

Please create a unified, consolidated report that:
1. Extracts ALL issues from each pass (look for sections like "### High Priority", "### Medium Priority", "### Low Priority", "#### Issue Title", etc.)
2. Deduplicates issues that appear in multiple passes
3. Organizes all issues into three clear sections:
   - **Critical Issues (High Priority)**: List all high-priority/critical findings
   - **Important Issues (Medium Priority)**: List all medium-priority/important findings  
   - **Minor Issues (Low Priority)**: List all low-priority/minor findings
4. Provides a comprehensive grade for the code quality with detailed category breakdowns
5. Maintains all the valuable insights from each pass

IMPORTANT: Make sure to actually extract and list the specific issues found in each pass. Do not leave the issue sections empty.

The consolidated report should begin with "# Consolidated Code Review Report: ${projectName}"

Present this as a unified analysis without mentioning individual pass numbers.

IMPORTANT: Use the actual current date (${new Date().toLocaleDateString()}) in your report, not any dates mentioned in the review content.`;
}

/**
 * Creates a fallback consolidated review when AI consolidation fails
 * @param review The review to consolidate
 * @returns Fallback consolidated content
 */
function createFallbackConsolidation(review: ReviewResult): string {
  logger.info('Creating fallback consolidation from multi-pass results...');

  // Extract project name
  const projectName = review.projectName || 'ai-code-review';

  // Extract key information from each pass - more flexible regex
  const passRegex = /## Pass (\d+): Review of (\d+) Files([\s\S]*?)(?=## Pass \d+:|$)/g;
  const passes: { passNumber: number; fileCount: number; content: string }[] = [];

  let match;
  while ((match = passRegex.exec(review.content)) !== null) {
    const [, passNumberStr, fileCountStr, passContent] = match;
    passes.push({
      passNumber: parseInt(passNumberStr, 10),
      fileCount: parseInt(fileCountStr, 10),
      content: passContent.trim(),
    });
  }

  logger.debug(`Found ${passes.length} passes in multi-pass review`);

  // If we couldn't extract passes, try alternative format
  if (passes.length === 0) {
    logger.warn('Could not extract passes using standard format, trying alternative patterns');
    // Try simpler pass detection
    const altPassRegex = /Pass (\d+)[:\s]+([\s\S]*?)(?=Pass \d+|$)/gi;
    let altMatch;
    while ((altMatch = altPassRegex.exec(review.content)) !== null) {
      const [, passNumberStr, passContent] = altMatch;
      passes.push({
        passNumber: parseInt(passNumberStr, 10),
        fileCount: 0, // Unknown
        content: passContent.trim(),
      });
    }
    logger.debug(`Found ${passes.length} passes using alternative pattern`);
  }

  // Deduplicate findings across passes
  const highPriorityFindings = new Set<string>();
  const mediumPriorityFindings = new Set<string>();
  const lowPriorityFindings = new Set<string>();

  // Regular expressions to extract findings from each pass - support multiple formats
  const highPriorityRegex = /### (?:High Priority|Critical Issues?)([\s\S]*?)(?=###|## Pass|$)/gi;
  const mediumPriorityRegex =
    /### (?:Medium Priority|Important Issues?)([\s\S]*?)(?=###|## Pass|$)/gi;
  const lowPriorityRegex = /### (?:Low Priority|Minor Issues?)([\s\S]*?)(?=###|## Pass|$)/gi;

  // Extract issue titles from content blocks - support multiple formats
  const extractIssueTitles = (content: string): string[] => {
    const titles: string[] = [];

    // Format 1: - **Issue title:** <title>
    const issueTitleRegex1 = /- \*\*Issue title:\*\* (.*?)(?=\n|$)/g;
    let match1;
    while ((match1 = issueTitleRegex1.exec(content)) !== null) {
      titles.push(match1[1].trim());
    }

    // Format 2: #### <title> (o3 format)
    const issueTitleRegex2 = /####\s+([^\n]+)/g;
    let match2;
    while ((match2 = issueTitleRegex2.exec(content)) !== null) {
      titles.push(match2[1].trim());
    }

    // Format 3: Simple bullet points starting with issues
    const issueTitleRegex3 = /^[\s-]*\*?\s*(.+?)$/gm;
    if (titles.length === 0) {
      // Only use this if no other format found
      let match3;
      while ((match3 = issueTitleRegex3.exec(content)) !== null) {
        const line = match3[1].trim();
        // Filter out meta lines
        if (
          line &&
          !line.startsWith('Location:') &&
          !line.startsWith('Type:') &&
          !line.startsWith('Description:') &&
          !line.startsWith('Impact:')
        ) {
          titles.push(line);
        }
      }
    }

    return titles;
  };

  // Process each pass to extract findings
  passes.forEach((pass) => {
    const passContent = pass.content;

    // Extract findings by priority
    let highMatch;
    highPriorityRegex.lastIndex = 0; // Reset regex
    while ((highMatch = highPriorityRegex.exec(passContent)) !== null) {
      extractIssueTitles(highMatch[1]).forEach((title) => highPriorityFindings.add(title));
    }

    let mediumMatch;
    mediumPriorityRegex.lastIndex = 0; // Reset regex
    while ((mediumMatch = mediumPriorityRegex.exec(passContent)) !== null) {
      extractIssueTitles(mediumMatch[1]).forEach((title) => mediumPriorityFindings.add(title));
    }

    let lowMatch;
    lowPriorityRegex.lastIndex = 0; // Reset regex
    while ((lowMatch = lowPriorityRegex.exec(passContent)) !== null) {
      extractIssueTitles(lowMatch[1]).forEach((title) => lowPriorityFindings.add(title));
    }
  });

  logger.debug(
    `Extracted findings - High: ${highPriorityFindings.size}, Medium: ${mediumPriorityFindings.size}, Low: ${lowPriorityFindings.size}`,
  );

  // Create a consolidated review
  return `# Consolidated ${review.reviewType.charAt(0).toUpperCase() + review.reviewType.slice(1)} Review Report: ${projectName}

## Executive Summary

This consolidated review was generated from ${passes.length} passes analyzing a total of ${passes.reduce((sum, pass) => sum + pass.fileCount, 0)} files. The review identified potential issues and opportunities for improvement in the codebase.

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

${Array.from(highPriorityFindings)
  .map((issue) => `- ${issue}`)
  .join('\n')}

## Important Issues (Medium Priority)

${Array.from(mediumPriorityFindings)
  .map((issue) => `- ${issue}`)
  .join('\n')}

## Minor Issues (Low Priority)

${Array.from(lowPriorityFindings)
  .map((issue) => `- ${issue}`)
  .join('\n')}

## Recommendations

1. Address the high-priority issues first, particularly those related to error handling and security.
2. Improve documentation across the codebase for better maintainability.
3. Enhance test coverage, especially for error scenarios.
4. Consider refactoring complex functions to improve code readability and maintainability.

---

**Note:** This is a fallback consolidated report generated automatically. The individual pass findings are included below for reference.
`;
}
