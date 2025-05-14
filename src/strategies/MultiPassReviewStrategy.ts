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

// Helper function to accommodate the type mismatch with existing formatters
const ensureString = (value: string | undefined): string => {
  return value || 'unknown';
};

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
        estimatedCost: 0,
        formattedCost: '$0.00 USD',
        passCount: totalPasses,
        perPassCosts: [],
        contextMaintenanceFactor: options.contextMaintenanceFactor || 0.15
      },
      isMultiPass: true,
      totalPasses: totalPasses
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
        enhancedProjectDocs = { readme: '' };
      }
      
      // Add the review context to the project docs
      enhancedProjectDocs.custom = {
        ...(enhancedProjectDocs.custom || {}),
        'REVIEW_CONTEXT.md': chunkContext
      };
      
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
      if (consolidatedResult.costInfo && chunkResult.costInfo) {
        consolidatedResult.costInfo.inputTokens += chunkResult.costInfo.inputTokens || 0;
        consolidatedResult.costInfo.outputTokens += chunkResult.costInfo.outputTokens || 0;
        consolidatedResult.costInfo.totalTokens += chunkResult.costInfo.totalTokens || 0;
        consolidatedResult.costInfo.estimatedCost += chunkResult.costInfo.estimatedCost || 0;
        
        // Update formatted cost
        consolidatedResult.costInfo.formattedCost = 
          `$${consolidatedResult.costInfo.estimatedCost.toFixed(6)} USD`;
        
        // Add per-pass cost information
        if (consolidatedResult.costInfo.perPassCosts && Array.isArray(consolidatedResult.costInfo.perPassCosts)) {
          consolidatedResult.costInfo.perPassCosts.push({
            passNumber: passNumber,
            inputTokens: chunkResult.costInfo.inputTokens || 0,
            outputTokens: chunkResult.costInfo.outputTokens || 0,
            totalTokens: chunkResult.costInfo.totalTokens || 0,
            estimatedCost: chunkResult.costInfo.estimatedCost || 0
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
      apiClientConfig.modelName
    );
    
    // Add the initial summary to the consolidated result
    consolidatedResult.content = initialSummary + consolidatedResult.content;
    
    // Set the consolidation phase for the final AI analysis
    newProgressTracker.setPhase('consolidating');
    
    // Create a final consolidated report through AI
    logger.info('Generating final consolidated review report with grading...');
    try {
      const finalReport = await this.generateConsolidatedReport(
        consolidatedResult,
        apiClientConfig,
        files,
        projectName,
        projectDocs,
        options
      );
      
      // If the final report was generated successfully, use it instead
      if (finalReport) {
        consolidatedResult = finalReport;
      }
    } catch (error) {
      logger.warn(
        `Failed to generate final consolidated report: ${error instanceof Error ? error.message : String(error)}`
      );
      logger.warn('Using original multi-pass report instead');
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
    modelName: string
  ): string {
    const findings = context.getFindings();
    const filesCount = files.length;
    const totalPassesCount = context.getCurrentPass();
    
    // Get cost info for detailed reporting
    const costInfo = result.costInfo;
    const costBreakdown = costInfo && costInfo.perPassCosts 
      ? costInfo.perPassCosts.map(passCost => 
          `- Pass ${passCost.passNumber}: ${passCost.inputTokens.toLocaleString()} input + ${passCost.outputTokens.toLocaleString()} output = ${passCost.totalTokens.toLocaleString()} tokens ($${passCost.estimatedCost.toFixed(4)} USD)`
        ).join('\n')
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
- Context utilization: ${(tokenAnalysis.estimatedTotalTokens / tokenAnalysis.contextWindowSize * 100).toFixed(2)}%
${costInfo ? `- Total tokens used: ${costInfo.totalTokens.toLocaleString()} (input: ${costInfo.inputTokens.toLocaleString()}, output: ${costInfo.outputTokens.toLocaleString()})
- Estimated cost: ${costInfo.formattedCost}` : ''}

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
    options: ReviewOptions
  ): Promise<ReviewResult | undefined> {
    try {
      // Validate API client configuration for consolidation
      if (!apiClientConfig.provider || !apiClientConfig.apiKey || !apiClientConfig.modelName) {
        throw new Error('API client configuration is incomplete for consolidation');
      }
      
      // Extract information about the passes
      const passCount = multiPassResult.totalPasses || 1;
      
      // Create a prompt for consolidation
      const consolidationSystemPrompt = `You are an expert code reviewer tasked with creating a consolidated final report from a multi-pass review. 
      
The review was conducted in ${passCount} passes due to the large size of the codebase. 

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

      // Create a consolidated prompt that includes the multi-pass results
      const consolidationPrompt = `I have conducted a multi-pass code review of a project named "${projectName}" using the "${this.reviewType}" review type. The review was split into ${passCount} passes due to the size of the codebase.

Here are the results from all passes:

${multiPassResult.content}

Please create a unified, consolidated report that:
1. Combines all findings into a cohesive analysis
2. Eliminates redundancy
3. Prioritizes issues by importance
4. Provides a comprehensive grade for the code quality
5. Maintains all the valuable insights from each pass

Remember to use the grading system as described in your instructions.`;

      // Generate the consolidated report
      logger.info('Sending multi-pass results to AI for final consolidation and grading...');
      
      // Different models might have different ways of handling this consolidation
      let consolidatedContent: string;
      
      // Handle each provider differently if needed
      if (apiClientConfig.provider === 'anthropic') {
        // For Claude models - use Anthropic API
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiClientConfig.apiKey}`,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'messages-2023-12-15'
          },
          body: JSON.stringify({
            model: apiClientConfig.modelName,
            system: consolidationSystemPrompt,
            messages: [{ role: 'user', content: consolidationPrompt }],
            max_tokens: 4000
          })
        });
        
        // Process the response
        const responseData = await response.json();
        consolidatedContent = responseData.content?.[0]?.text || '';
        
      } else if (apiClientConfig.provider === 'openai') {
        // For OpenAI models - use OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiClientConfig.apiKey}`
          },
          body: JSON.stringify({
            model: apiClientConfig.modelName,
            messages: [
              { role: 'system', content: consolidationSystemPrompt },
              { role: 'user', content: consolidationPrompt }
            ],
            temperature: 0.2,
            max_tokens: 4000
          })
        });
        
        // Process the response
        const responseData = await response.json();
        consolidatedContent = responseData.choices?.[0]?.message?.content || '';
        
      } else if (apiClientConfig.provider === 'openrouter') {
        // For OpenRouter - use OpenRouter API
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiClientConfig.apiKey}`,
            'HTTP-Referer': 'https://ai-code-review-tool.local',
            'X-Title': 'AI Code Review Multi-Pass Consolidation'
          },
          body: JSON.stringify({
            model: apiClientConfig.modelName,
            messages: [
              { role: 'system', content: consolidationSystemPrompt },
              { role: 'user', content: consolidationPrompt }
            ],
            temperature: 0.2,
            max_tokens: 4000
          })
        });
        
        // Process the response
        const responseData = await response.json();
        consolidatedContent = responseData.choices?.[0]?.message?.content || '';
        
      } else if (apiClientConfig.provider === 'gemini') {
        try {
          // For Gemini, we need to use the Google AI SDK
          // Dynamically import the Google AI SDK to avoid dependency issues
          const { GoogleGenerativeAI } = await import('@google/generative-ai');
          
          // Get the API model name from the model mapping
          const { getModelMapping } = await import('../clients/utils/modelMaps');
          const fullModelKey = `gemini:${apiClientConfig.modelName}`;
          const modelMapping = getModelMapping(fullModelKey);
          const modelId = modelMapping?.apiIdentifier || apiClientConfig.modelName;
          
          logger.info(`Using Gemini model for consolidation: ${modelId}`);
          
          // Initialize the Google AI client
          const genAI = new GoogleGenerativeAI(apiClientConfig.apiKey);
          const model = genAI.getGenerativeModel({ 
            model: modelId,
            apiVersion: modelMapping?.useV1Beta ? 'v1beta' : undefined
          });
          
          // Generate content
          const result = await model.generateContent({
            contents: [
              {
                role: 'user',
                parts: [{ text: `${consolidationSystemPrompt}\n\n${consolidationPrompt}` }]
              }
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4000
            }
          });
          
          // Get the response text
          consolidatedContent = result.response.text();
        } catch (error) {
          logger.error(`Error using Gemini API for consolidation: ${error instanceof Error ? error.message : String(error)}`);
          logger.error('Make sure your model mapping in modelMaps.ts has the correct API identifier');
          return undefined;
        }
      } else {
        // Fallback for other providers
        logger.warn(`Consolidation not supported for provider: ${apiClientConfig.provider}`);
        return undefined;
      }
      
      // If we didn't get any content, return undefined
      if (!consolidatedContent || consolidatedContent.trim() === '') {
        logger.warn('Received empty consolidated content from API');
        return undefined;
      }
      
      logger.info('Successfully generated consolidated report with grading!');
      
      // Add token analysis and cost data for this additional consolidation step
      try {
        const { getCostInfoFromText } = await import('../clients/utils/tokenCounter');
        const consolidationCost = getCostInfoFromText(
          consolidationPrompt, 
          consolidatedContent, 
          `${apiClientConfig.provider}:${apiClientConfig.modelName}`
        );
        
        // Add this cost to the existing cost data
        if (multiPassResult.costInfo && consolidationCost) {
          // Create a pass cost for the consolidation step
          const consolidationPassCost = {
            passNumber: (multiPassResult.totalPasses || 0) + 1,
            inputTokens: consolidationCost.inputTokens,
            outputTokens: consolidationCost.outputTokens,
            totalTokens: consolidationCost.totalTokens,
            estimatedCost: consolidationCost.estimatedCost
          };
          
          // Update the overall cost
          const updatedCost = {
            ...multiPassResult.costInfo,
            inputTokens: multiPassResult.costInfo.inputTokens + consolidationCost.inputTokens,
            outputTokens: multiPassResult.costInfo.outputTokens + consolidationCost.outputTokens,
            totalTokens: multiPassResult.costInfo.totalTokens + consolidationCost.totalTokens,
            estimatedCost: multiPassResult.costInfo.estimatedCost + consolidationCost.estimatedCost,
            formattedCost: `$${(multiPassResult.costInfo.estimatedCost + consolidationCost.estimatedCost).toFixed(6)} USD`,
            perPassCosts: [
              ...(multiPassResult.costInfo.perPassCosts || []),
              consolidationPassCost
            ]
          };
          
          // Create a new result with the consolidated content and updated cost
          const consolidatedResult: ReviewResult = {
            ...multiPassResult,
            content: consolidatedContent,
            timestamp: new Date().toISOString(),
            costInfo: updatedCost,
            totalPasses: (multiPassResult.totalPasses || 0) + 1
          };
          
          logger.info(`Added consolidation pass to cost data. Final cost: ${updatedCost.formattedCost}`);
          return consolidatedResult;
        }
      } catch (costError) {
        logger.warn(`Could not calculate cost for consolidation phase: ${costError instanceof Error ? costError.message : String(costError)}`);
      }
      
      // Create a new result with just the consolidated content if cost calculation failed
      const consolidatedResult: ReviewResult = {
        ...multiPassResult,
        content: consolidatedContent,
        timestamp: new Date().toISOString()
      };
      
      // Return the consolidated result
      return consolidatedResult;
    } catch (error) {
      logger.error(`Error generating consolidated report: ${error instanceof Error ? error.message : String(error)}`);
      return undefined;
    }
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
      if (!file.path) return;
      
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
            if (f.path && (paragraph.includes(f.path) || 
                (f.relativePath && paragraph.includes(f.relativePath)))) {
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