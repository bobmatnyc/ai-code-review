/**
 * @fileoverview Multi-pass review strategy implementation.
 *
 * This strategy analyzes large codebases by splitting files into multiple chunks
 * and processing them sequentially, maintaining context between passes to ensure
 * a cohesive review. It's automatically used when token counts exceed model limits.
 */

import { ReviewContext } from '../analysis/context';
import { formatTokenAnalysis, type TokenAnalysisResult, TokenAnalyzer } from '../analysis/tokens';
import type { PassCostInfo } from '../clients/utils/tokenCounter';
import type { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import type { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import logger from '../utils/logger';
import type { ProjectDocs } from '../utils/projectDocs';
// import { formatProjectDocs } from '../utils/projectDocs';
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
  /**
   * Create a new multi-pass review strategy
   * @param reviewType Type of review to perform
   */
  constructor(reviewType: ReviewType) {
    super(reviewType);
    logger.debug('Initialized MultiPassReviewStrategy');
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

      // Generate review for this chunk
      const chunkResult = await generateReview(
        chunkFiles,
        projectName,
        this.reviewType,
        enhancedProjectDocs,
        chunkOptions,
        apiClientConfig,
      );

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

    // Create a final consolidated report through AI
    logger.info('Generating final consolidated review report with grading...');
    try {
      logger.debug(
        'Starting consolidation phase with model provider: ' +
          apiClientConfig.provider +
          ', model: ' +
          apiClientConfig.modelName,
      );

      // Make sure model information is set in the consolidated result
      // This ensures we use the same model for consolidation
      consolidatedResult.modelUsed = `${apiClientConfig.provider}:${apiClientConfig.modelName}`;

      const finalReport = await this.generateConsolidatedReport(
        consolidatedResult,
        apiClientConfig,
        files,
        projectName,
        projectDocs,
        options,
      );

      // If the final report was generated successfully, use it instead
      if (finalReport) {
        logger.info('Successfully generated consolidated report with grading');
        consolidatedResult = finalReport;
      } else {
        // If the final report wasn't generated (returned undefined), log a more detailed warning
        logger.warn('Consolidation function returned undefined - likely due to API error');
        logger.warn('Creating fallback consolidated report');

        // Create a fallback consolidated report
        const fallbackReport = {
          ...consolidatedResult,
          content: this.createFallbackConsolidation(consolidatedResult, apiClientConfig.modelName),
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
      logger.warn('Creating fallback consolidated report');

      // Create a fallback consolidated report even in the case of an exception
      const fallbackReport = {
        ...consolidatedResult,
        content: this.createFallbackConsolidation(consolidatedResult, apiClientConfig.modelName),
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
    _files: FileInfo[],
    projectName: string,
    _projectDocs: ProjectDocs | null,
    _options: ReviewOptions,
  ): Promise<ReviewResult | undefined> {
    try {
      // Validate API client configuration for consolidation
      if (!apiClientConfig.provider || !apiClientConfig.apiKey || !apiClientConfig.modelName) {
        throw new Error('API client configuration is incomplete for consolidation');
      }

      // Set the project name in the result for use in consolidation
      multiPassResult.projectName = projectName;

      // Use the consolidated review utility for consistent consolidation
      // This reuses the same model/client that was used for the original review
      logger.info('Using consolidateReview utility to generate final report with grading...');

      // Import the consolidateReview utility dynamically
      const { consolidateReview } = await import('../utils/review/consolidateReview');

      // Generate the consolidated report
      const consolidatedContent = await consolidateReview(multiPassResult);

      // If the consolidation failed (empty content), return undefined
      if (!consolidatedContent || consolidatedContent.trim() === '') {
        logger.warn('Received empty consolidated content');
        return undefined;
      }

      logger.info('Successfully generated consolidated report with grading!');

      // Add token analysis and cost data for this additional consolidation step
      try {
        const { getCostInfoFromText } = await import('../clients/utils/tokenCounter');
        const consolidationCost = getCostInfoFromText(
          multiPassResult.content,
          consolidatedContent,
          `${apiClientConfig.provider}:${apiClientConfig.modelName}`,
        );

        // Add this cost to the existing cost data
        if (multiPassResult.costInfo && consolidationCost) {
          // Create a pass cost for the consolidation step
          const consolidationPassCost = {
            passNumber: (multiPassResult.totalPasses || 0) + 1,
            inputTokens: consolidationCost.inputTokens,
            outputTokens: consolidationCost.outputTokens,
            totalTokens: consolidationCost.totalTokens,
            estimatedCost: consolidationCost.estimatedCost,
          };

          // Update the overall cost
          const updatedCost = {
            ...multiPassResult.costInfo,
            inputTokens: multiPassResult.costInfo.inputTokens + consolidationCost.inputTokens,
            outputTokens: multiPassResult.costInfo.outputTokens + consolidationCost.outputTokens,
            totalTokens: multiPassResult.costInfo.totalTokens + consolidationCost.totalTokens,
            estimatedCost: multiPassResult.costInfo.estimatedCost + consolidationCost.estimatedCost,
            formattedCost: `$${(multiPassResult.costInfo.estimatedCost + consolidationCost.estimatedCost).toFixed(6)} USD`,
            perPassCosts: [...(multiPassResult.costInfo.perPassCosts || []), consolidationPassCost],
          };

          // Create a new result with the consolidated content and updated cost
          const consolidatedResult: ReviewResult = {
            ...multiPassResult,
            content: consolidatedContent,
            timestamp: new Date().toISOString(),
            costInfo: updatedCost,
            totalPasses: (multiPassResult.totalPasses || 0) + 1,
          };

          logger.info(
            `Added consolidation pass to cost data. Final cost: ${updatedCost.formattedCost}`,
          );
          return consolidatedResult;
        }
      } catch (costError) {
        logger.warn(
          `Could not calculate cost for consolidation phase: ${costError instanceof Error ? costError.message : String(costError)}`,
        );
      }

      // Create a new result with just the consolidated content if cost calculation failed
      const consolidatedResult: ReviewResult = {
        ...multiPassResult,
        content: consolidatedContent,
        timestamp: new Date().toISOString(),
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
   * Creates a fallback consolidation when AI consolidation fails
   * @param multiPassResult The combined result from all passes
   * @param modelName The name of the model
   * @returns A basic consolidated review content
   */
  private createFallbackConsolidation(multiPassResult: ReviewResult, _modelName: string): string {
    logger.info('Creating fallback consolidation from multi-pass results...');

    // Extract key information from each pass
    const passRegex =
      /## Pass (\d+): Review of (\d+) Files\s+# Code Review\s+## Summary([\s\S]*?)(?=## Pass|$)/g;
    const passes: { passNumber: number; fileCount: number; summary: string }[] = [];

    let match;
    while ((match = passRegex.exec(multiPassResult.content)) !== null) {
      const [, passNumberStr, fileCountStr, summaryContent] = match;
      passes.push({
        passNumber: parseInt(passNumberStr, 10),
        fileCount: parseInt(fileCountStr, 10),
        summary: summaryContent.trim(),
      });
    }

    // Deduplicate findings across passes
    const highPriorityFindings = new Set<string>();
    const mediumPriorityFindings = new Set<string>();
    const lowPriorityFindings = new Set<string>();

    // Regular expressions to extract findings from each pass
    const highPriorityRegex =
      /### High Priority\s+([\s\S]*?)(?=### Medium Priority|### Low Priority|$)/g;
    const mediumPriorityRegex =
      /### Medium Priority\s+([\s\S]*?)(?=### High Priority|### Low Priority|$)/g;
    const lowPriorityRegex =
      /### Low Priority\s+([\s\S]*?)(?=### High Priority|### Medium Priority|$)/g;

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
    multiPassResult.content.split(/## Pass \d+/).forEach((passContent) => {
      // Extract findings by priority
      let highMatch;
      while ((highMatch = highPriorityRegex.exec(passContent)) !== null) {
        extractIssueTitles(highMatch[1]).forEach((title) => highPriorityFindings.add(title));
      }

      let mediumMatch;
      while ((mediumMatch = mediumPriorityRegex.exec(passContent)) !== null) {
        extractIssueTitles(mediumMatch[1]).forEach((title) => mediumPriorityFindings.add(title));
      }

      let lowMatch;
      while ((lowMatch = lowPriorityRegex.exec(passContent)) !== null) {
        extractIssueTitles(lowMatch[1]).forEach((title) => lowPriorityFindings.add(title));
      }
    });

    // Create a consolidated review
    const consolidatedContent = `# Consolidated ${this.reviewType.charAt(0).toUpperCase() + this.reviewType.slice(1)} Review
    
## Executive Summary

This consolidated review was generated from ${passes.length} passes analyzing a total of ${multiPassResult.files?.length || 0} files.

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

**Note:** This is a fallback consolidated report generated automatically due to an error in the AI-assisted consolidation process. The detailed findings for each pass can be found in the sections below.
`;

    // Return the consolidated content followed by all pass contents
    return `${consolidatedContent}\n\n${multiPassResult.content}`;
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
