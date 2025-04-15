/**
 * @fileoverview Strategy for unused code review.
 *
 * This module implements the strategy for unused code review, which identifies
 * and suggests removal of unused or dead code.
 */

import { BaseReviewStrategy } from './ReviewStrategy';
import { FileInfo, ReviewOptions, ReviewResult } from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';
import { ApiClientConfig } from '../core/ApiClientSelector';
import { generateReview } from '../core/ReviewGenerator';
import logger from '../utils/logger';
import { PromptStrategyFactory } from '../prompts/strategies/PromptStrategyFactory';
import { PromptManager } from '../prompts/PromptManager';
import { PromptCache } from '../prompts/cache/PromptCache';
import { getUnusedCodeReviewFormatInstructions } from '../prompts/schemas/unused-code-schema';
import { getImprovedUnusedCodeReviewFormatInstructions } from '../prompts/schemas/improved-unused-code-schema';
import {
  formatUnusedCodeReviewAsMarkdown,
  generateRemovalScript
} from '../formatters/unusedCodeFormatter';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Strategy for unused code review
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
      eslint: null
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
   * Run ts-prune to find unused exports
   * @returns Results from ts-prune
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
        const unusedExports = lines.map(line => {
          const match = line.match(/([^:]+):(\d+) - (\w+)( \(([^)]+)\))?/);
          if (match) {
            return {
              file: match[1],
              line: parseInt(match[2]),
              export: match[3],
              note: match[5] || null
            };
          }
          return null;
        }).filter(Boolean);
        
        resolve({
          unusedExports,
          totalCount: unusedExports.length
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
                  severity: message.severity === 2 ? 'error' : 'warning'
                });
              }
            }
          }
          
          resolve({
            unusedVariables: unusedVars,
            totalCount: totalUnusedCount
          });
        } catch (error) {
          logger.error('Error parsing eslint output:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Execute the unused code review strategy
   * @param files Files to review
   * @param projectName Project name
   * @param projectDocs Project documentation
   * @param options Review options
   * @param apiClientConfig API client configuration
   * @returns Promise resolving to review result
   */
  async execute(
    files: FileInfo[],
    projectName: string,
    projectDocs: ProjectDocs | null,
    options: ReviewOptions,
    apiClientConfig: ApiClientConfig
  ): Promise<ReviewResult> {
    logger.info(
      `Executing unused code review strategy for ${files.length} files...`
    );

    // Add tooling insights from ts-prune and eslint if configured
    let toolingMetadata = {};
    if (options.useTsPrune || options.useEslint) {
      toolingMetadata = await this.getToolingData(options);
      if (projectDocs?.addMetadata) {
        projectDocs.addMetadata('unusedCodeTooling', 
          `## Static Analysis Tool Results\n\n${JSON.stringify(toolingMetadata, null, 2)}`);
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
          : `${process.cwd()}/prompts/improved-unused-code-review.md`
    };

    // Use LangChain prompt strategy if available
    if (!enhancedOptions.promptStrategy) {
      enhancedOptions.promptStrategy = 'langchain';

      // Get LangChain prompt strategy
      const promptManager = PromptManager.getInstance();
      const promptCache = PromptCache.getInstance();
      const strategy = PromptStrategyFactory.createStrategy(
        'langchain',
        promptManager,
        promptCache
      );

      logger.info('Using LangChain prompt strategy for unused code review');
    }

    // Generate the review
    const reviewResult = await generateReview(
      files,
      projectName,
      this.reviewType,
      projectDocs,
      enhancedOptions,
      apiClientConfig
    );

    // If we have a response and it's in JSON format, try to reformat it
    if (reviewResult.response && reviewResult.outputFormat === 'json') {
      try {
        // Parse the JSON response
        const parsedResult = JSON.parse(reviewResult.response);

        // If it's a valid result with the expected structure, format it
        if (
          parsedResult.highImpactIssues &&
          parsedResult.mediumImpactIssues &&
          parsedResult.lowImpactIssues
        ) {
          // Format the response using our specialized formatter
          const formattedMarkdown =
            formatUnusedCodeReviewAsMarkdown(parsedResult);

          // Also generate a removal script
          const removalScript = generateRemovalScript(parsedResult);

          // Update the response with our formatted version
          reviewResult.response = formattedMarkdown;
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
