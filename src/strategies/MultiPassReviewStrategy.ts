/**
 * @fileoverview Multi-pass review strategy implementation.
 *
 * This strategy analyzes large codebases by splitting files into multiple chunks
 * and processing them sequentially, maintaining context between passes to ensure
 * a cohesive review. It's automatically used when token counts exceed model limits.
 */

import { BaseReviewStrategy, IReviewStrategy } from './ReviewStrategy';
import {
  FileInfo,
  ReviewOptions,
  ReviewResult,
  ReviewType
} from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';
import { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import logger from '../utils/logger';
import {
  TokenAnalyzer,
  TokenAnalysisResult,
  formatTokenAnalysis
} from '../analysis/tokens';
import { ReviewContext } from '../analysis/context';
import { formatProjectDocs } from '../utils/projectDocs';
import { MultiPassProgressTracker } from '../utils/review';

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
    apiClientConfig: ApiClientConfig
  ): Promise<ReviewResult> {
    logger.info(`Executing multi-pass ${this.reviewType} review strategy...`);

    // Make sure API client is initialized
    if (!apiClientConfig.initialized) {
      throw new Error('API client not initialized');
    }

    // Create a progress tracker
    const progressTracker = new MultiPassProgressTracker(1, files.length, {
      quiet: options.quiet
    });
    
    // Start with analysis phase
    progressTracker.setPhase('analyzing');
    
    // Analyze token usage to determine chunking strategy
    const tokenAnalysisOptions = {
      reviewType: this.reviewType,
      modelName: apiClientConfig.modelName
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
        apiClientConfig
      );
    }
    
    // We need to use chunking
    logger.info(
      `Content exceeds context window (${tokenAnalysis.estimatedTotalTokens} > ${tokenAnalysis.contextWindowSize}), using multi-pass review`
    );
    logger.info(
      `Estimated ${tokenAnalysis.estimatedPassesNeeded} passes needed`
    );
    
    // Update progress tracker with actual pass count
    const totalPasses = tokenAnalysis.estimatedPassesNeeded;
    progressTracker.stopProgressUpdates();
    const newProgressTracker = new MultiPassProgressTracker(totalPasses, files.length, {
      quiet: options.quiet
    });
    
    // Create a consolidated result to aggregate findings
    let consolidatedResult: ReviewResult = {
      content: '',
      files: files.map(f => f.path),
      reviewType: this.reviewType,
      timestamp: new Date().toISOString(),
      costInfo: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        cost: 0
      }
    };
    
    // Create filtered subsets of files for each pass
    const chunks = tokenAnalysis.chunkingRecommendation.recommendedChunks;
    
    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const passNumber = i + 1;
      const chunkFiles = files.filter(f => chunk.files.includes(f.path));
      
      // Update progress tracker
      newProgressTracker.startPass(passNumber, chunkFiles.map(f => f.path));
      
      // Start a new pass in the context
      reviewContext.startPass();
      
      // Generate next-pass context
      const chunkContext = reviewContext.generateNextPassContext(
        chunkFiles.map(f => f.path)
      );
      
      // Append the next-pass context to project docs
      let enhancedProjectDocs = null;
      
      if (projectDocs) {
        enhancedProjectDocs = { ...projectDocs };
      } else {
        enhancedProjectDocs = { readme: '', other: [] };
      }
      
      // Add the review context to the project docs
      enhancedProjectDocs.other = [
        ...(enhancedProjectDocs.other || []),
        {
          name: 'REVIEW_CONTEXT.md',
          content: chunkContext
        }
      ];
      
      // Create a modified options object with metadata about the multi-pass process
      const chunkOptions = {
        ...options,
        multiPass: true,
        passNumber,
        totalPasses: chunks.length
      };
      
      // Generate review for this chunk
      const chunkResult = await generateReview(
        chunkFiles,
        projectName,
        this.reviewType,
        enhancedProjectDocs,
        chunkOptions,
        apiClientConfig
      );
      
      // Extract findings from this pass and update the context
      this.updateContextFromReviewResults(reviewContext, chunkResult, chunkFiles);
      
      // Accumulate costs
      consolidatedResult.costInfo.inputTokens += chunkResult.costInfo?.inputTokens || 0;
      consolidatedResult.costInfo.outputTokens += chunkResult.costInfo?.outputTokens || 0;
      consolidatedResult.costInfo.totalTokens += chunkResult.costInfo?.totalTokens || 0;
      consolidatedResult.costInfo.cost += chunkResult.costInfo?.cost || 0;
      
      // Accumulate content with pass information
      consolidatedResult.content += `\n## Pass ${passNumber}: Review of ${chunkFiles.length} Files\n\n`;
      consolidatedResult.content += chunkResult.content;
      consolidatedResult.content += '\n\n';
      
      // Mark the pass as complete
      newProgressTracker.completePass(passNumber);
    }
    
    // Set the final processing phase
    newProgressTracker.setPhase('processing');
    
    // Add a summary section
    consolidatedResult.content = this.generateMultiPassSummary(
      consolidatedResult,
      tokenAnalysis,
      reviewContext,
      files,
      apiClientConfig.modelName
    ) + consolidatedResult.content;
    
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
    modelName: string
  ): string {
    const findings = context.getFindings();
    const filesCount = files.length;
    const totalPassesCount = context.getCurrentPass();
    
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
- Context utilization: ${(tokenAnalysis.estimatedTotalTokens / tokenAnalysis.contextWindowSize * 100).toFixed(2)}%

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
    files: FileInfo[]
  ): void {
    // Add file summaries
    files.forEach(file => {
      context.addFileSummary({
        path: file.path,
        type: file.path.split('.').pop() || 'unknown',
        description: `File containing ${file.content.length} bytes of code`,
        keyElements: [],
        passNumber: context.getCurrentPass()
      });
    });
    
    // In a real implementation, we would parse the review result to extract:
    // - Code elements (functions, classes, etc.)
    // - Findings (bugs, suggestions, etc.)
    // - Relationships between files
    
    // For now, add a general note about the pass
    context.addGeneralNote(
      `Pass ${context.getCurrentPass()} analyzed ${files.length} files and generated a ${result.content.length} character review.`
    );
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
    files: FileInfo[]
  ): void {
    // Add file summaries for all files in this pass
    files.forEach(file => {
      // Extract the file extension
      const fileExtension = file.path.split('.').pop() || 'unknown';
      
      // Create a basic file summary
      context.addFileSummary({
        path: file.path,
        type: fileExtension,
        description: `${fileExtension.toUpperCase()} file with ${file.content.length} bytes`,
        keyElements: [],
        passNumber: context.getCurrentPass()
      });
    });
    
    // Simple heuristic to extract findings from the review content
    // In a real implementation, we would have a more structured approach to extract findings
    const findingPatterns = [
      { type: 'bug', regex: /bug|issue|error|fix needed|incorrect/gi, severity: 8 },
      { type: 'security', regex: /security|vulnerability|exploit|injection|xss|csrf/gi, severity: 9 },
      { type: 'performance', regex: /performance|slow|optimize|efficiency|bottleneck/gi, severity: 7 },
      { type: 'maintainability', regex: /maintainability|hard to read|complex|refactor/gi, severity: 6 }
    ];
    
    // Split the review content into paragraphs
    const paragraphs = result.content.split('\n\n');
    
    // Examine each paragraph for potential findings
    paragraphs.forEach(paragraph => {
      findingPatterns.forEach(pattern => {
        if (pattern.regex.test(paragraph)) {
          // Extract a short description from the paragraph
          let description = paragraph.substring(0, 100);
          if (description.length === 100) {
            description += '...';
          }
          
          // Determine which file this finding is about (if mentioned)
          let file: string | undefined = undefined;
          files.forEach(f => {
            if (paragraph.includes(f.path) || paragraph.includes(f.relativePath)) {
              file = f.path;
            }
          });
          
          // Add the finding to the context
          context.addFinding({
            type: pattern.type,
            description,
            file,
            severity: pattern.severity,
            passNumber: context.getCurrentPass()
          });
        }
      });
    });
    
    // Add a general note about this pass
    context.addGeneralNote(
      `Pass ${context.getCurrentPass()} reviewed ${files.length} files and identified approximate findings based on text heuristics.`
    );
  }
}