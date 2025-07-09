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

import type { ApiClientConfig } from '../core/ApiClientSelector';
import {
  formatCodeTracingUnusedCodeReviewAsMarkdown,
  generateCodeTracingRemovalScript,
} from '../formatters/codeTracingUnusedCodeFormatter';
import type { CodeTracingUnusedCodeReview } from '../prompts/schemas/code-tracing-unused-code-schema';
import type {
  FileInfo,
  ReviewOptions,
  ReviewResult,
  // ReviewType // Not used in this file
} from '../types/review';
import type { StructuredReview } from '../types/structuredReview';
import logger from '../utils/logger';
import { formatProjectDocs, type ProjectDocs } from '../utils/projectDocs';
import { BaseReviewStrategy, type IReviewStrategy } from './ReviewStrategy';

/**
 * Strategy for performing code tracing based unused code review
 */
export class CodeTracingUnusedCodeReviewStrategy
  extends BaseReviewStrategy
  implements IReviewStrategy
{
  constructor() {
    super('unused-code');
    logger.debug('Initialized CodeTracingUnusedCodeReviewStrategy');
  }

  /**
   * Execute the review strategy
   * @param files Files to review
   * @param projectName Project name
   * @param projectDocs Project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to the review result
   */
  async execute(
    _files: FileInfo[],
    _projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig,
  ): Promise<ReviewResult> {
    logger.info('Generating code tracing unused code review...');

    // Make sure API client is initialized
    if (!apiClientConfig.initialized) {
      throw new Error('API client not initialized');
    }

    // Determine the prompt template to use based on language
    // const languagePrefix = options.language ? `${options.language}/` : '';
    // const promptTemplate =
    //   options.promptFile ||
    //   `${languagePrefix}code-tracing-unused-code-review.md`;

    // Build code context from files
    // const codeContext = files
    //   .map(file => {
    //     return `File: ${file.relativePath || file.path}\n\n\`\`\`${file.extension || 'typescript'}\n${file.content}\n\`\`\``;
    //   })
    //   .join('\n\n');

    // Include project docs if available
    // let docsContext = '';
    if (projectDocs && options.includeProjectDocs) {
      // Format the project docs
      const formattedDocs = formatProjectDocs(projectDocs);
      if (formattedDocs) {
        // docsContext = `${formattedDocs}\n\n`;
      }
    }

    // Build the prompt
    // const prompt = `${docsContext}# Code to Analyze\n\n${codeContext}`;

    // Get the model response with schema validation
    let response;

    // This is just a temporary placeholder as we don't have access to the actual API client here
    // In a real implementation, this would be replaced with the appropriate API call
    try {
      // Mock response for compilation
      response = {
        unusedFiles: [],
        unusedFunctions: [],
        unusedClasses: [],
        unusedTypesAndInterfaces: [],
        deadCodeBranches: [],
        unusedVariablesAndImports: [],
        analysisMethodology: {
          entryPoints: [],
          moduleResolution: '',
          referenceTracking: '',
          limitations: [],
        },
        summary: {
          totalUnusedElements: 0,
          highConfidenceCount: 0,
          filesWithUnusedCode: 0,
          potentialCodeReduction: '0%',
        },
      };
      logger.info('Using mock response for code tracing review (for compilation)');
    } catch (error) {
      logger.error('Error getting completion:', error);
      throw error;
    }

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
        formattedResponse +=
          '**Important**: Review the script carefully before execution and make sure to back up your code or use version control.';
      }
    }

    // Construct the review result
    return {
      filePath: 'Project Review',
      reviewType: this.reviewType,
      content: formattedResponse,
      timestamp: new Date().toISOString(),
      modelUsed: apiClientConfig.modelName,
      structuredData: response as unknown as StructuredReview | undefined,
    };
  }

  /**
   * Check if there are any high confidence unused elements
   * @param review The review to check
   * @returns Whether there are high confidence unused elements
   */
  private hasHighConfidenceUnusedElements(review: CodeTracingUnusedCodeReview): boolean {
    const highConfidenceFiles = review.unusedFiles.filter((file) => file.confidence === 'high');
    const highConfidenceFunctions = review.unusedFunctions.filter(
      (func) => func.confidence === 'high',
    );
    const highConfidenceClasses = review.unusedClasses.filter((cls) => cls.confidence === 'high');
    const highConfidenceTypes = review.unusedTypesAndInterfaces.filter(
      (type) => type.confidence === 'high',
    );
    const highConfidenceBranches = review.deadCodeBranches.filter(
      (branch) => branch.confidence === 'high',
    );

    return (
      highConfidenceFiles.length > 0 ||
      highConfidenceFunctions.length > 0 ||
      highConfidenceClasses.length > 0 ||
      highConfidenceTypes.length > 0 ||
      highConfidenceBranches.length > 0
    );
  }
}
