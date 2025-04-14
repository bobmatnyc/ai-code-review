/**
 * @fileoverview Code tracing strategy for identifying unused code with high confidence.
 *
 * This strategy uses a multi-pass approach to trace code paths and identify unused code:
 * 1. Maps entry points and dependencies
 * 2. Traces references through the codebase
 * 3. Verifies findings and assesses confidence
 *
 * It collects detailed evidence for each identified unused element to ensure high confidence
 * in recommendations for removal.
 */

import { IReviewStrategy } from './ReviewStrategy';
import { FileInfo, ReviewOptions, ReviewResult, ReviewType } from '../types/review';
import { PromptManager } from '../prompts/PromptManager';
import { PromptStrategyFactory } from '../prompts/strategies/PromptStrategyFactory';
import { CodeTracingUnusedCodeReview } from '../prompts/schemas/code-tracing-unused-code-schema';
import { formatCodeTracingUnusedCodeReviewAsMarkdown, generateCodeTracingRemovalScript } from '../formatters/codeTracingUnusedCodeFormatter';
import logger from '../utils/logger';

/**
 * Strategy for performing code tracing based unused code review
 */
export class CodeTracingUnusedCodeReviewStrategy implements IReviewStrategy {
  private reviewType: ReviewType = 'unused-code';
  private promptManager: PromptManager;

  constructor() {
    this.promptManager = new PromptManager();
    logger.debug('Initialized CodeTracingUnusedCodeReviewStrategy');
  }

  /**
   * Generate a review based on the provided files and options
   * @param files Files to review
   * @param options Review options
   * @returns The review result
   */
  async generateReview(files: FileInfo[], options: ReviewOptions): Promise<ReviewResult> {
    logger.info('Generating code tracing unused code review...');

    const promptStrategy = PromptStrategyFactory.createStrategy(
      options.promptStrategy || 'langchain',
      options
    );

    // Determine the prompt template to use based on language
    const languagePrefix = options.language ? `${options.language}/` : '';
    const promptTemplate = options.promptFile || 
      `${languagePrefix}code-tracing-unused-code-review.md`;

    // Generate the prompt
    const promptText = await this.promptManager.getPrompt(
      promptTemplate,
      files,
      options,
      promptStrategy
    );

    // Get the response from the model
    const response = await promptStrategy.getCompletionWithSchema(
      promptText,
      'code-tracing-unused-code-schema'
    );

    // Type the response properly
    const typedResponse = response as unknown as CodeTracingUnusedCodeReview;

    // Format the review for output
    let formattedResponse: string;
    if (options.output === 'json') {
      formattedResponse = JSON.stringify(response, null, 2);
    } else {
      formattedResponse = formatCodeTracingUnusedCodeReviewAsMarkdown(typedResponse);
      
      // Add removal script if there are high confidence unused elements
      const hasHighConfidenceUnused = this.hasHighConfidenceUnusedElements(typedResponse);
      if (hasHighConfidenceUnused) {
        formattedResponse += '\n\n## Removal Script\n\n';
        formattedResponse += '```bash\n';
        formattedResponse += generateCodeTracingRemovalScript(typedResponse);
        formattedResponse += '\n```\n\n';
        formattedResponse += '**Important**: Review the script carefully before execution and make sure to back up your code or use version control.';
      }
    }

    // Construct the review result
    return {
      filePath: 'Project Review',
      reviewType: this.reviewType,
      content: formattedResponse,
      timestamp: new Date().toISOString(),
      modelUsed: response.model || 'unknown',
      structuredData: response
    };
  }
  
  /**
   * Check if there are any high confidence unused elements
   * @param review The review to check
   * @returns Whether there are high confidence unused elements
   */
  private hasHighConfidenceUnusedElements(review: CodeTracingUnusedCodeReview): boolean {
    const highConfidenceFiles = review.unusedFiles.filter(file => file.confidence === 'high');
    const highConfidenceFunctions = review.unusedFunctions.filter(func => func.confidence === 'high');
    const highConfidenceClasses = review.unusedClasses.filter(cls => cls.confidence === 'high');
    const highConfidenceTypes = review.unusedTypesAndInterfaces.filter(type => type.confidence === 'high');
    const highConfidenceBranches = review.deadCodeBranches.filter(branch => branch.confidence === 'high');
    
    return highConfidenceFiles.length > 0 || 
           highConfidenceFunctions.length > 0 || 
           highConfidenceClasses.length > 0 ||
           highConfidenceTypes.length > 0 || 
           highConfidenceBranches.length > 0;
  }
}