/**
 * @fileoverview Multi-pass review strategy implementation.
 *
 * This strategy analyzes large codebases by splitting files into multiple chunks
 * and processing them sequentially, maintaining context between passes to ensure
 * a cohesive review. It's automatically used when token counts exceed model limits.
 */

import { ReviewContext } from '../analysis/context';
import { FindingsExtractor } from '../analysis/FindingsExtractor';
import { formatTokenAnalysis, type TokenAnalysisResult, TokenAnalyzer } from '../analysis/tokens';
import type { PassCostInfo } from '../clients/utils/tokenCounter';
import type { ApiClientConfig } from '../core/ApiClientSelector';
import { ConsolidationService } from '../core/ConsolidationService';
import { generateReview } from '../core/ReviewGenerator';
import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
import { MultiPassProgressTracker } from '../utils/review';
import { BaseReviewStrategy } from './ReviewStrategy';

// Helper function to accommodate the type mismatch with existing formatters
// const ensureString = (value: string | undefined): string => {
//   return value || 'unknown';
// };

/**
 * Strategy for performing multi-pass reviews of large codebases
 */
export class MultiPassReviewStrategy extends BaseReviewStrategy {
  private readonly consolidationService: ConsolidationService;
  private readonly findingsExtractor: FindingsExtractor;

  /**
   * Create a new multi-pass review strategy
   * @param reviewType Type of review to perform
   */
  constructor(reviewType: ReviewType) {
    super(reviewType);
    this.consolidationService = new ConsolidationService();
    this.findingsExtractor = new FindingsExtractor();
    logger.debug('Initialized MultiPassReviewStrategy with services');
  }

  /**
   * Execute the multi-pass review strategy
   * @param files Files to review
   * @param projectName Project name
   * @param projectDocs Project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the review result
   */
  async execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig,
  ): Promise<ReviewResult> {
    logger.info(`Executing multi-pass ${this.reviewType} review strategy...`);

    // Make sure API client is initialized
    if (!apiClientConfig.initialized) {
      throw new Error('API client not initialized');
    }

    // Create a progress tracker
    const progressTracker = new MultiPassProgressTracker(1, files.length, {
      quiet: options.quiet,
    });

    // Start with analysis phase
    progressTracker.setPhase('analyzing');

    // Analyze token usage to determine chunking strategy
    const tokenAnalysisOptions = {
      reviewType: this.reviewType,
      modelName: apiClientConfig.modelName,
      batchTokenLimit: options.batchTokenLimit,
    };

    const tokenAnalysis = TokenAnalyzer.analyzeFiles(files, tokenAnalysisOptions);

    // Log token analysis results
    logger.info('Token analysis completed:');
    logger.info(formatTokenAnalysis(tokenAnalysis, apiClientConfig.modelName));

    // Create or get the review context
    const reviewContext = new ReviewContext(projectName, this.reviewType, files);

    // Determine if we need to use chunking
    if (!tokenAnalysis.chunkingRecommendation.chunkingRecommended) {
      logger.info('Content fits within context window, using standard review');
      progressTracker.complete();

      // If chunking is not needed, delegate to standard review process
      return generateReview(
        files,
        projectName,
        this.reviewType,
        projectDocs,
        options,
        apiClientConfig,
      );
    }

    // We need to use chunking
    logger.info(
      `Content exceeds context window (${tokenAnalysis.estimatedTotalTokens} > ${tokenAnalysis.contextWindowSize}), using multi-pass review`,
    );
    logger.info(`Estimated ${tokenAnalysis.estimatedPassesNeeded} passes needed`);

    // Update progress tracker with actual pass count
    const totalPasses = tokenAnalysis.estimatedPassesNeeded;
    progressTracker.stopProgressUpdates();
    const newProgressTracker = new MultiPassProgressTracker(totalPasses, files.length, {
      quiet: options.quiet,
    });

    // Create a consolidated result to aggregate findings
    let consolidatedResult: ReviewResult = {
      content: '',
      filePath: 'multi-pass-review',
      files: files,
      reviewType: this.reviewType,
      timestamp: new Date().toISOString(),
      costInfo: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        formattedCost: '$0.00 USD',
        cost: 0,
        passCount: totalPasses,
        perPassCosts: [],
        contextMaintenanceFactor: options.contextMaintenanceFactor || 0.15,
      },
      totalPasses: totalPasses,
    };

    // Create filtered subsets of files for each pass
    const chunks = tokenAnalysis.chunkingRecommendation.recommendedChunks;

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const passNumber = i + 1;
      const chunkFiles = files.filter((f) => chunk.files.includes(f.path));

      // Update progress tracker
      newProgressTracker.startPass(
        passNumber,
        chunkFiles.map((f) => f.path),
      );

      // Start a new pass in the context
      reviewContext.startPass();

      // Generate next-pass context
      const chunkContext = reviewContext.generateNextPassContext(chunkFiles.map((f) => f.path));

      // Append the next-pass context to project docs
      let enhancedProjectDocs = null;

      if (projectDocs) {
        enhancedProjectDocs = { ...projectDocs };
      } else {
        enhancedProjectDocs = { readme: '' };
      }

      // Add the review context to the project docs
      enhancedProjectDocs.custom = {
        ...(enhancedProjectDocs.custom || {}),
        'REVIEW_CONTEXT.md': chunkContext,
      };

      // Create a modified options object with metadata about the multi-pass process
      const chunkOptions = {
        ...options,
        multiPass: true,
        passNumber,
        totalPasses: chunks.length,
      };

      // Generate review for this chunk with error handling
      let chunkResult: ReviewResult | undefined;
      let chunkRetryCount = 0;
      const maxChunkRetries = 2;

      while (chunkRetryCount <= maxChunkRetries) {
        try {
          // Enhanced logging before API call
          logger.debug(
            `Attempting to generate review for pass ${passNumber}, attempt ${chunkRetryCount + 1}/${maxChunkRetries + 1}`,
          );
          logger.debug(`  Files in chunk: ${chunkFiles.length}`);
          logger.debug(`  API client: ${apiClientConfig.clientType}:${apiClientConfig.modelName}`);
          logger.debug(`  Review type: ${this.reviewType}`);

          chunkResult = await generateReview(
            chunkFiles,
            projectName,
            this.reviewType,
            enhancedProjectDocs,
            chunkOptions,
            apiClientConfig,
          );

          // Log the result immediately after the API call
          logger.debug(`API call completed for pass ${passNumber}, attempt ${chunkRetryCount + 1}`);
          logger.debug(`  Result exists: ${!!chunkResult}`);
          logger.debug(`  Content exists: ${!!(chunkResult && chunkResult.content)}`);
          logger.debug(
            `  Content length: ${chunkResult && chunkResult.content ? chunkResult.content.length : 'N/A'}`,
          );
          logger.debug(
            `  Model used: ${chunkResult && chunkResult.modelUsed ? chunkResult.modelUsed : 'N/A'}`,
          );

          // Validate that we got valid content
          if (!chunkResult || !chunkResult.content || chunkResult.content.trim() === '') {
            // Enhanced error logging for debugging
            logger.error(`Empty or invalid chunk result for pass ${passNumber}:`);
            logger.error(`  chunkResult exists: ${!!chunkResult}`);
            logger.error(`  chunkResult.content exists: ${!!(chunkResult && chunkResult.content)}`);
            logger.error(
              `  chunkResult.content length: ${chunkResult && chunkResult.content ? chunkResult.content.length : 'N/A'}`,
            );
            logger.error(
              `  chunkResult.modelUsed: ${chunkResult && chunkResult.modelUsed ? chunkResult.modelUsed : 'N/A'}`,
            );
            logger.error(`  chunkFiles count: ${chunkFiles.length}`);
            logger.error(`  chunkFiles paths: ${chunkFiles.map((f) => f.path).join(', ')}`);
            logger.error(`  apiClientConfig: ${JSON.stringify(apiClientConfig)}`);

            // Log the full chunkResult for debugging (but limit size)
            if (chunkResult) {
              const resultForLogging = {
                ...chunkResult,
                content: chunkResult.content
                  ? `[${chunkResult.content.length} chars]: ${chunkResult.content.substring(0, 200)}...`
                  : 'null/undefined',
              };
              logger.error(`  Full chunkResult: ${JSON.stringify(resultForLogging, null, 2)}`);
            }

            throw new Error(`Empty or invalid chunk result for pass ${passNumber}`);
          }

          // Success - break out of retry loop
          break;
        } catch (chunkError) {
          chunkRetryCount++;
          logger.error(
            `Error generating review for pass ${passNumber} (attempt ${chunkRetryCount}/${maxChunkRetries + 1}): ${
              chunkError instanceof Error ? chunkError.message : String(chunkError)
            }`,
          );

          if (chunkRetryCount > maxChunkRetries) {
            // Create a fallback result for this chunk
            logger.warn(
              `Creating fallback result for pass ${passNumber} after ${maxChunkRetries + 1} attempts`,
            );
            chunkResult = {
              content: `## Error in Pass ${passNumber}\n\nFailed to generate review for ${chunkFiles.length} files after ${maxChunkRetries + 1} attempts.\n\nFiles attempted:\n${chunkFiles.map((f) => `- ${f.path}`).join('\n')}\n\nError: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`,
              filePath: 'error-pass',
              files: chunkFiles,
              reviewType: this.reviewType,
              timestamp: new Date().toISOString(),
              costInfo: {
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
                estimatedCost: 0,
                formattedCost: '$0.00 USD',
                cost: 0,
              },
            };
            break;
          }

          // Wait before retrying
          const waitTime = Math.min(2000 * 2 ** (chunkRetryCount - 1), 8000);
          logger.info(
            `Waiting ${waitTime}ms before retry ${chunkRetryCount + 1}/${maxChunkRetries + 1} for pass ${passNumber}`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        }
      }

      // Ensure we have a valid result
      if (!chunkResult) {
        // This should never happen, but provide a safety fallback
        logger.error(
          `No chunk result generated for pass ${passNumber} - creating emergency fallback`,
        );
        chunkResult = {
          content: `## Error in Pass ${passNumber}\n\nNo result generated for ${chunkFiles.length} files.\n\nFiles attempted:\n${chunkFiles.map((f) => `- ${f.path}`).join('\n')}\n\nEmergency fallback result.`,
          filePath: 'emergency-fallback',
          files: chunkFiles,
          reviewType: this.reviewType,
          timestamp: new Date().toISOString(),
          costInfo: {
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            estimatedCost: 0,
            formattedCost: '$0.00 USD',
            cost: 0,
          },
        };
      }

      // Extract findings from this pass and update the context
      this.updateContextFromReviewResults(reviewContext, chunkResult, chunkFiles);

      // Accumulate costs
      if (consolidatedResult.costInfo && chunkResult.costInfo) {
        consolidatedResult.costInfo.inputTokens += chunkResult.costInfo.inputTokens || 0;
        consolidatedResult.costInfo.outputTokens += chunkResult.costInfo.outputTokens || 0;
        consolidatedResult.costInfo.totalTokens += chunkResult.costInfo.totalTokens || 0;
        consolidatedResult.costInfo.estimatedCost += chunkResult.costInfo.estimatedCost || 0;

        // Update formatted cost
        consolidatedResult.costInfo.formattedCost = `$${consolidatedResult.costInfo.estimatedCost.toFixed(6)} USD`;

        // Add per-pass cost information
        if (
          consolidatedResult.costInfo.perPassCosts &&
          Array.isArray(consolidatedResult.costInfo.perPassCosts)
        ) {
          consolidatedResult.costInfo.perPassCosts.push({
            passNumber: passNumber,
            inputTokens: chunkResult.costInfo.inputTokens || 0,
            outputTokens: chunkResult.costInfo.outputTokens || 0,
            totalTokens: chunkResult.costInfo.totalTokens || 0,
            estimatedCost: chunkResult.costInfo.estimatedCost || 0,
          });
        }
      }

      // Accumulate content with pass information
      consolidatedResult.content += `\n## Pass ${passNumber}: Review of ${chunkFiles.length} Files\n\n`;
      consolidatedResult.content += chunkResult.content;
      consolidatedResult.content += '\n\n';

      // Mark the pass as complete
      newProgressTracker.completePass(passNumber);
    }

    // Set the initial processing phase
    newProgressTracker.setPhase('processing');

    // Add a summary section based on token analysis
    const initialSummary = this.generateMultiPassSummary(
      consolidatedResult,
      tokenAnalysis,
      reviewContext,
      files,
      apiClientConfig.modelName,
    );

    // Add the initial summary to the consolidated result
    consolidatedResult.content = initialSummary + consolidatedResult.content;

    // Set the consolidation phase for the final AI analysis
    newProgressTracker.setPhase('consolidating');

    // Create a final consolidated report through AI with robust error handling
    logger.info('Generating final consolidated review report with grading...');

    // Check if we have enough valid content to consolidate
    const validPassCount = consolidatedResult.content.split('## Pass').length - 1;
    const errorPassCount = consolidatedResult.content.split('## Error in Pass').length - 1;

    if (validPassCount === 0) {
      logger.error('No valid passes to consolidate - all passes failed');
      consolidatedResult = {
        ...consolidatedResult,
        content: `# Review Failed\n\nAll ${totalPasses} passes failed to generate valid reviews. Please check the logs for details.\n\n${consolidatedResult.content}`,
      };
    } else if (errorPassCount > validPassCount * 0.5) {
      logger.warn(`High error rate: ${errorPassCount}/${totalPasses} passes failed`);
    }

    try {
      logger.debug(
        'Starting consolidation phase with model provider: ' +
          apiClientConfig.provider +
          ', model: ' +
          apiClientConfig.modelName,
      );

      // Make sure model information is set in the consolidated result
      // This ensures we use the same model for consolidation
      // Note: apiClientConfig.modelName already contains the full model string (e.g., "openrouter:anthropic/claude-3-haiku")
      consolidatedResult.modelUsed = apiClientConfig.modelName;

      const finalReport = await this.generateConsolidatedReport(
        consolidatedResult,
        apiClientConfig,
        files,
        projectName,
        projectDocs,
        options,
      );

      // If the final report was generated successfully, use it instead
      if (finalReport?.content && finalReport.content.trim() !== '') {
        logger.info('Successfully generated consolidated report with grading');
        consolidatedResult = finalReport;
      } else {
        // If the final report wasn't generated (returned undefined), log a more detailed warning
        logger.warn('Consolidation function returned empty or undefined result');
        logger.warn('Creating enhanced fallback consolidated report');

        // Create an enhanced fallback consolidated report
        const passResults = this.extractPassResults(consolidatedResult);
        const fallbackContent = await this.consolidationService.generateConsolidatedReport(
          consolidatedResult,
          apiClientConfig,
          {
            projectName,
            modelName: apiClientConfig.modelName,
            totalPasses: consolidatedResult.totalPasses || 1,
            passResults,
          },
        );
        const fallbackReport = {
          ...consolidatedResult,
          content: fallbackContent,
        };
        consolidatedResult = fallbackReport;
      }
    } catch (error) {
      logger.error(
        `Failed to generate final consolidated report: ${error instanceof Error ? error.message : String(error)}`,
      );
      logger.error('Error occurred during consolidated report generation. Stack trace:');
      if (error instanceof Error && error.stack) {
        logger.error(error.stack);
      }
      logger.warn('Creating enhanced fallback consolidated report');

      // Create an enhanced fallback consolidated report even in the case of an exception
      const passResults = this.extractPassResults(consolidatedResult);
      const fallbackContent = await this.consolidationService.generateConsolidatedReport(
        consolidatedResult,
        apiClientConfig,
        {
          projectName,
          modelName: apiClientConfig.modelName,
          totalPasses: consolidatedResult.totalPasses || 1,
          passResults,
        },
      );
      const fallbackReport = {
        ...consolidatedResult,
        content: fallbackContent,
      };
      consolidatedResult = fallbackReport;
    }

    // Mark the review as complete
    newProgressTracker.complete();

    return consolidatedResult;
  }

  /**
   * Generate a summary for the multi-pass review
   * @param result Consolidated review result
   * @param tokenAnalysis Token analysis result
   * @param context Review context
   * @param files All files in the review
   * @param modelName Model name
   * @returns Summary string
   */
  private generateMultiPassSummary(
    result: ReviewResult,
    tokenAnalysis: TokenAnalysisResult,
    context: ReviewContext,
    files: FileInfo[],
    modelName: string,
  ): string {
    const findings = context.getFindings();
    const filesCount = files.length;
    const totalPassesCount = context.getCurrentPass();

    // Get cost info for detailed reporting
    const costInfo = result.costInfo;
    const costBreakdown = costInfo?.perPassCosts
      ? costInfo.perPassCosts
          .map(
            (passCost: PassCostInfo) =>
              `- Pass ${passCost.passNumber}: ${passCost.inputTokens.toLocaleString()} input + ${passCost.outputTokens.toLocaleString()} output = ${passCost.totalTokens.toLocaleString()} tokens ($${passCost.estimatedCost.toFixed(4)} USD)`,
          )
          .join('\n')
      : 'N/A';

    return `# Multi-Pass ${this.reviewType.charAt(0).toUpperCase() + this.reviewType.slice(1)} Review Summary

This review was conducted in **${totalPassesCount} passes** to analyze **${filesCount} files** (${tokenAnalysis.totalSizeInBytes.toLocaleString()} bytes) due to the large size of the codebase.

## Review Statistics
- Files analyzed: ${filesCount}
- Total passes: ${totalPassesCount}
- Model used: ${modelName}
- Key findings identified: ${findings.length}

## Token Usage
- Content tokens: ${tokenAnalysis.totalTokens.toLocaleString()}
- Context window size: ${tokenAnalysis.contextWindowSize.toLocaleString()}
- Context utilization: ${((tokenAnalysis.estimatedTotalTokens / tokenAnalysis.contextWindowSize) * 100).toFixed(2)}%
${
  costInfo
    ? `- Total tokens used: ${costInfo.totalTokens.toLocaleString()} (input: ${costInfo.inputTokens.toLocaleString()}, output: ${costInfo.outputTokens.toLocaleString()})
- Estimated cost: ${costInfo.formattedCost}`
    : ''
}

### Per-Pass Token Usage
${costBreakdown}

## Multi-Pass Methodology
This review used a multi-pass approach with context maintenance between passes to ensure a cohesive analysis despite the large codebase size. Each pass analyzed a subset of files while maintaining awareness of findings and relationships from previous passes.

`;
  }

  /**
   * Update the review context with findings from a review result
   * @param context Review context to update
   * @param result Review result to extract findings from
   * @param files Files included in this pass
   */
  private updateContextFromReviewResult(
    context: ReviewContext,
    result: ReviewResult,
    files: FileInfo[],
  ): void {
    // Add file summaries
    files.forEach((file) => {
      context.addFileSummary({
        path: file.path,
        type: file.path.split('.').pop() || 'unknown',
        description: `File containing ${file.content.length} bytes of code`,
        keyElements: [],
        passNumber: context.getCurrentPass(),
      });
    });

    // In a real implementation, we would parse the review result to extract:
    // - Code elements (functions, classes, etc.)
    // - Findings (bugs, suggestions, etc.)
    // - Relationships between files

    // For now, add a general note about the pass
    context.addGeneralNote(
      `Pass ${context.getCurrentPass()} analyzed ${files.length} files and generated a ${result.content.length} character review.`,
    );
  }

  /**
   * Generate a consolidated report from the multi-pass review results
   * @param multiPassResult Combined result from all passes
   * @param apiClientConfig API client configuration
   * @param files All files included in the review
   * @param projectName Name of the project
   * @param projectDocs Project documentation
   * @param options Review options
   * @returns Promise resolving to a consolidated review result, or undefined if consolidation fails
   */
  private async generateConsolidatedReport(
    multiPassResult: ReviewResult,
    apiClientConfig: ApiClientConfig,
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
  ): Promise<ReviewResult | undefined> {
    try {
      // Validate API client configuration for consolidation
      if (!apiClientConfig.provider || !apiClientConfig.apiKey || !apiClientConfig.modelName) {
        throw new Error('API client configuration is incomplete for consolidation');
      }

      // Set the project name in the result for use in consolidation
      multiPassResult.projectName = projectName;

      // Extract pass results for consolidation
      const passResults = this.extractPassResults(multiPassResult);

      // Use the ConsolidationService to generate the final report
      const consolidatedContent = await this.consolidationService.generateConsolidatedReport(
        multiPassResult,
        apiClientConfig,
        {
          projectName,
          modelName: apiClientConfig.modelName,
          totalPasses: multiPassResult.totalPasses || 1,
          passResults,
        },
      );

      // If the consolidation failed (empty content), return undefined
      if (!consolidatedContent || consolidatedContent.trim() === '') {
        logger.warn('Received empty consolidated content');
        return undefined;
      }

      logger.info('Successfully generated consolidated report with grading!');

      // Create a new result with the consolidated content
      const consolidatedResult: ReviewResult = {
        ...multiPassResult,
        content: consolidatedContent,
        timestamp: new Date().toISOString(),
        totalPasses: (multiPassResult.totalPasses || 0) + 1,
      };

      // Return the consolidated result
      return consolidatedResult;
    } catch (error) {
      logger.error(
        `Error generating consolidated report: ${error instanceof Error ? error.message : String(error)}`,
      );
      return undefined;
    }
  }

  /**
   * Extract individual pass results from the consolidated multi-pass result
   * @param multiPassResult The consolidated result containing all passes
   * @returns Array of individual pass results
   */
  private extractPassResults(multiPassResult: ReviewResult): ReviewResult[] {
    const passResults: ReviewResult[] = [];
    const content = multiPassResult.content || '';

    // Split content by pass markers
    const passSections = content.split(/## Pass \d+:/);

    for (let i = 1; i < passSections.length; i++) {
      const passContent = passSections[i].trim();
      if (passContent) {
        passResults.push({
          content: passContent,
          filePath: `pass-${i}`,
          reviewType: multiPassResult.reviewType,
          timestamp: multiPassResult.timestamp,
          files: multiPassResult.files,
        });
      }
    }

    // If no passes were found, return the original result as a single pass
    if (passResults.length === 0) {
      passResults.push(multiPassResult);
    }

    return passResults;
  }

  /**
   * Extract findings from valid passes using the FindingsExtractor service
   */
  private extractFindingsFromPasses(validPasses: Array<{ content: string }>) {
    return this.findingsExtractor.extractFindingsFromPasses(validPasses);
  }

  /**
   * Calculate overall grade using the FindingsExtractor service
   */
  private calculateOverallGrade(findings: {
    high: Set<string>;
    medium: Set<string>;
    low: Set<string>;
  }): string {
    return this.findingsExtractor.calculateOverallGrade(findings);
  }

  /**
   * Generate recommendations based on findings using the FindingsExtractor service
   */
  private generateRecommendations(
    findings: { high: Set<string>; medium: Set<string>; low: Set<string> },
    hasErrors: boolean,
  ): string[] {
    return this.findingsExtractor.generateRecommendations(findings, hasErrors);
  }

  /**
   * Update the review context with findings from multiple review results
   * @param context Review context to update
   * @param result Review result to extract findings from
   * @param files Files included in this pass
   */
  private updateContextFromReviewResults(
    context: ReviewContext,
    result: ReviewResult,
    files: FileInfo[],
  ): void {
    // Add file summaries for all files in this pass
    files.forEach((file) => {
      if (!file.path) return;

      // Extract the file extension
      const fileExtension = file.path.split('.').pop() || 'unknown';

      // Create a basic file summary
      context.addFileSummary({
        path: file.path,
        type: fileExtension,
        description: `${fileExtension.toUpperCase()} file with ${file.content.length} bytes`,
        keyElements: [],
        passNumber: context.getCurrentPass(),
      });
    });

    // Simple heuristic to extract findings from the review content
    // In a real implementation, we would have a more structured approach to extract findings
    const findingPatterns = [
      { type: 'bug', regex: /bug|issue|error|fix needed|incorrect/gi, severity: 8 },
      {
        type: 'security',
        regex: /security|vulnerability|exploit|injection|xss|csrf/gi,
        severity: 9,
      },
      {
        type: 'performance',
        regex: /performance|slow|optimize|efficiency|bottleneck/gi,
        severity: 7,
      },
      {
        type: 'maintainability',
        regex: /maintainability|hard to read|complex|refactor/gi,
        severity: 6,
      },
    ];

    // Split the review content into paragraphs
    const paragraphs = result.content.split('\n\n');

    // Examine each paragraph for potential findings
    paragraphs.forEach((paragraph) => {
      findingPatterns.forEach((pattern) => {
        if (pattern.regex.test(paragraph)) {
          // Extract a short description from the paragraph
          let description = paragraph.substring(0, 100);
          if (description.length === 100) {
            description += '...';
          }

          // Determine which file this finding is about (if mentioned)
          let file: string | undefined;
          files.forEach((f) => {
            if (
              f.path &&
              (paragraph.includes(f.path) || (f.relativePath && paragraph.includes(f.relativePath)))
            ) {
              file = f.path;
            }
          });

          // Add the finding to the context
          context.addFinding({
            type: pattern.type,
            description,
            file,
            severity: pattern.severity,
            passNumber: context.getCurrentPass(),
          });
        }
      });
    });

    // Add a general note about this pass
    context.addGeneralNote(
      `Pass ${context.getCurrentPass()} reviewed ${files.length} files and identified approximate findings based on text heuristics.`,
    );
  }
}
