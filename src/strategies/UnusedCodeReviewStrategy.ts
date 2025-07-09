/**
 * @fileoverview Strategy for identifying and removing unused/dead code.
 *
 * This module implements a comprehensive strategy for detecting and recommending
 * removal of unused code, including functions, variables, classes, and entire files.
 * It integrates with static analysis tools like ts-prune and ESLint to provide
 * additional insights and improve detection accuracy.
 *
 * Key responsibilities:
 * - Running static analysis tools (ts-prune, ESLint) to identify unused code
 * - Generating AI-based unused code reviews using specialized prompts
 * - Reformatting reviews into user-friendly output
 * - Generating removal scripts for easy cleanup
 *
 * The strategy leverages LangChain for improved prompting and can use either
 * standard or enhanced unused code review templates based on availability.
 */

import { exec } from 'node:child_process';
import type { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import {
  formatUnusedCodeReviewAsMarkdown,
  generateRemovalScript,
} from '../formatters/unusedCodeFormatter';
import { PromptCache } from '../prompts/cache/PromptCache';
import { PromptManager } from '../prompts/PromptManager';
import { getImprovedUnusedCodeReviewFormatInstructions } from '../prompts/schemas/improved-unused-code-schema';
import { PromptStrategyFactory } from '../prompts/strategies/PromptStrategyFactory';
import type { FileInfo, ReviewOptions, ReviewResult } from '../types/review';
import logger from '../utils/logger';
import { addMetadataToProjectDocs, type ProjectDocs } from '../utils/projectDocs';
import { BaseReviewStrategy } from './ReviewStrategy';

/**
 * Strategy for detecting and suggesting removal of unused code.
 *
 * This strategy combines AI-based code analysis with static analysis tools
 * to identify unused code with high confidence. It can utilize ts-prune
 * for finding unused exports and ESLint for detecting unused variables.
 *
 * The strategy prioritizes findings by impact level (high, medium, low)
 * and can generate removal scripts to help with cleanup.
 *
 * @example
 * const strategy = new UnusedCodeReviewStrategy();
 * const result = await strategy.execute(files, projectName, projectDocs, options, apiConfig);
 *
 * @extends {BaseReviewStrategy}
 */
export class UnusedCodeReviewStrategy extends BaseReviewStrategy {
  /**
   * Create a new unused code review strategy
   */
  constructor() {
    super('unused-code');
  }

  /**
   * Run static analysis tools to get data about unused code
   * @param options Review options
   * @returns Metadata from static analysis tools
   */
  private async getToolingData(options: ReviewOptions): Promise<any> {
    const result: any = {
      tsPrune: null,
      eslint: null,
    };

    try {
      // Check if ts-prune is installed
      if (options.useTsPrune) {
        result.tsPrune = await this.runTsPrune();
      }

      // Check if eslint is configured
      if (options.useEslint) {
        result.eslint = await this.runEslint();
      }
    } catch (error) {
      logger.error('Error running static analysis tools:', error);
    }

    return result;
  }

  /**
   * Executes ts-prune to find unused TypeScript exports in the project.
   *
   * This method runs the ts-prune tool via npx, which analyzes TypeScript
   * files to identify exports that are not imported anywhere else in the project.
   * The output is parsed into a structured format for use in the review.
   *
   * @returns {Promise<any>} Object containing:
   *   - unusedExports: Array of objects with file, line, export name, and notes
   *   - totalCount: Total number of unused exports found
   *
   * @throws Will reject with an error if ts-prune execution fails
   * @example
   * const tsPruneData = await strategy.runTsPrune();
   * // Example result:
   * // {
   * //   unusedExports: [
   * //     { file: "src/utils/helpers.ts", line: 42, export: "unusedFunction", note: null }
   * //   ],
   * //   totalCount: 1
   * // }
   */
  private async runTsPrune(): Promise<any> {
    return new Promise((resolve, reject) => {
      exec('npx ts-prune', (error, stdout, stderr) => {
        if (error && error.code !== 0 && error.code !== 1) {
          // ts-prune exits with code 1 when it finds unused exports, which is normal
          logger.warn(`ts-prune execution error: ${stderr}`);
          reject(error);
          return;
        }

        // Parse ts-prune output
        const lines = stdout.trim().split('\n');
        const unusedExports = lines
          .map((line) => {
            const match = line.match(/([^:]+):(\d+) - (\w+)( \(([^)]+)\))?/);
            if (match) {
              return {
                file: match[1],
                line: parseInt(match[2]),
                export: match[3],
                note: match[5] || null,
              };
            }
            return null;
          })
          .filter(Boolean);

        resolve({
          unusedExports,
          totalCount: unusedExports.length,
        });
      });
    });
  }

  /**
   * Run eslint to find unused variables
   * @returns Results from eslint
   */
  private async runEslint(): Promise<any> {
    return new Promise((resolve, reject) => {
      exec('npx eslint . --ext .ts,.tsx --format json', (error, stdout, stderr) => {
        if (error && error.code !== 0 && error.code !== 1) {
          // eslint exits with code 1 when it finds issues, which is normal
          logger.warn(`eslint execution error: ${stderr}`);
          reject(error);
          return;
        }

        try {
          // Parse eslint JSON output
          const results = JSON.parse(stdout);

          // Filter for unused variables
          const unusedVars = [];
          let totalUnusedCount = 0;

          for (const result of results) {
            for (const message of result.messages) {
              if (message.ruleId === '@typescript-eslint/no-unused-vars') {
                totalUnusedCount++;
                unusedVars.push({
                  file: result.filePath,
                  line: message.line,
                  column: message.column,
                  variable: message.message.match(/'([^']+)'/)?.[1] || 'unknown',
                  severity: message.severity === 2 ? 'error' : 'warning',
                });
              }
            }
          }

          resolve({
            unusedVariables: unusedVars,
            totalCount: totalUnusedCount,
          });
        } catch (error) {
          logger.error('Error parsing eslint output:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Performs a comprehensive unused code review on the provided files.
   *
   * This method:
   * 1. Runs static analysis tools if configured (ts-prune, ESLint)
   * 2. Enhances review options with language-specific settings
   * 3. Applies specialized LangChain prompt strategies
   * 4. Generates an AI-based review of unused code
   * 5. Post-processes the result to format it for user consumption
   * 6. Generates removal scripts for identified unused code
   *
   * @param {FileInfo[]} files - Array of files to analyze for unused code
   * @param {string} projectName - Name of the project being reviewed
   * @param {ProjectDocs | null} projectDocs - Project documentation or null if not available
   * @param {ReviewOptions} options - Configuration options for the review
   * @param {ApiClientConfig} apiClientConfig - Configuration for the AI API client
   * @returns {Promise<ReviewResult>} Review result with detailed unused code findings
   *
   * @throws Will log but not throw errors from static analysis tools
   */
  async execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig,
  ): Promise<ReviewResult> {
    logger.info(`Executing unused code review strategy for ${files.length} files...`);

    // Add tooling insights from ts-prune and eslint if configured
    let toolingMetadata = {};
    if (options.useTsPrune || options.useEslint) {
      toolingMetadata = await this.getToolingData(options);
      // Use the addMetadataToProjectDocs function if projectDocs exists
      if (projectDocs) {
        addMetadataToProjectDocs(
          projectDocs,
          'unusedCodeTooling',
          `## Static Analysis Tool Results\n\n${JSON.stringify(toolingMetadata, null, 2)}`,
        );
      }
    }

    // Enhance options with LangChain-specific settings
    const enhancedOptions: ReviewOptions = {
      ...options,
      type: this.reviewType,
      // Use improved schema instructions if available, fall back to standard
      schemaInstructions: getImprovedUnusedCodeReviewFormatInstructions(),
      // Try to use the improved prompt template
      promptFile:
        options.language === 'typescript'
          ? `${process.cwd()}/prompts/typescript/improved-unused-code-review.md`
          : `${process.cwd()}/prompts/improved-unused-code-review.md`,
    };

    // Use LangChain prompt strategy if available
    if (!enhancedOptions.promptStrategy) {
      enhancedOptions.promptStrategy = 'langchain';

      // Get LangChain prompt strategy
      const promptManager = PromptManager.getInstance();
      const promptCache = PromptCache.getInstance();
      PromptStrategyFactory.createStrategy('langchain', promptManager, promptCache);

      logger.info('Using LangChain prompt strategy for unused code review');
    }

    // Generate the review
    const reviewResult = await generateReview(
      files,
      projectName,
      this.reviewType,
      projectDocs,
      enhancedOptions,
      apiClientConfig,
    );

    // If we have a response and it's in JSON format, try to reformat it
    if (reviewResult.response && reviewResult.outputFormat === 'json') {
      try {
        // Parse the JSON response
        const parsedResult =
          typeof reviewResult.response === 'string'
            ? JSON.parse(reviewResult.response)
            : reviewResult.response;

        // If it's a valid result with the expected structure, format it
        if (
          parsedResult.highImpactIssues &&
          parsedResult.mediumImpactIssues &&
          parsedResult.lowImpactIssues
        ) {
          // Format the response using our specialized formatter
          const formattedMarkdown = formatUnusedCodeReviewAsMarkdown(parsedResult);

          // Also generate a removal script
          const removalScript = generateRemovalScript(parsedResult);

          // Update the response with our formatted version
          reviewResult.content = formattedMarkdown;
          reviewResult.outputFormat = 'markdown';

          // Store the removal script in the metadata
          if (!reviewResult.metadata) {
            reviewResult.metadata = {};
          }
          reviewResult.metadata.removalScript = removalScript;

          logger.info('Reformatted unused code review for improved usability');
        }
      } catch (error) {
        logger.warn('Failed to reformat unused code review response:', error);
        // Continue with the original response
      }
    }

    return reviewResult;
  }
}
