/**
 * @fileoverview Architectural review strategy implementation.
 *
 * This module implements the architectural review strategy, which analyzes the entire
 * codebase structure and design patterns to provide high-level feedback.
 * 
 * The strategy now includes dependency analysis using dependency-cruiser to provide
 * a more comprehensive understanding of the codebase architecture.
 */

import { BaseReviewStrategy } from './ReviewStrategy';
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
import { analyzeDependencies, DependencyAnalysisResult } from '../utils/dependencies/dependencyAnalyzer';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Strategy for architectural reviews
 */
export class ArchitecturalReviewStrategy extends BaseReviewStrategy {
  /**
   * Create a new architectural review strategy
   */
  constructor() {
    super('architectural');
  }

  /**
   * Execute the architectural review strategy
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
    logger.info('Executing architectural review strategy...');

    // Determine the root directory of the project
    const targetDir = this.getTargetDirectory(files);
    
    // Run dependency analysis if enabled
    let dependencyAnalysis: DependencyAnalysisResult | null = null;
    if (options.includeDependencyAnalysis !== false) {
      try {
        dependencyAnalysis = await analyzeDependencies(targetDir);
        logger.info('Dependency analysis complete');
        
        // Enhance the project docs with dependency information
        if (projectDocs && projectDocs.addMetadata) {
          projectDocs.addMetadata('dependencyAnalysis', this.formatDependencyAnalysisForPrompt(dependencyAnalysis));
        }
      } catch (error) {
        logger.warn(`Dependency analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Generate the review using the selected API client with enhanced context
    return generateReview(
      files,
      projectName,
      this.reviewType,
      projectDocs,
      options,
      apiClientConfig
    );
  }
  
  /**
   * Get the target directory for dependency analysis based on file paths
   * @param files Files being reviewed
   * @returns Path to the target directory
   */
  private getTargetDirectory(files: FileInfo[]): string {
    if (files.length === 0) {
      return '.';
    }
    
    // Find common directory among files
    const directories = files.map(file => path.dirname(file.path));
    let commonDir = directories[0];
    
    for (const dir of directories) {
      while (!dir.startsWith(commonDir)) {
        commonDir = path.dirname(commonDir);
      }
    }
    
    // If common directory is just "/", use the first directory as fallback
    if (commonDir === '/' || commonDir === '.') {
      // Check if there's a src directory
      try {
        if (fs.existsSync('src')) {
          return 'src';
        }
      } catch (error) {
        logger.debug('Error checking for src directory:', error);
      }
      
      // Otherwise use the first file's directory
      return path.dirname(files[0].path);
    }
    
    return commonDir;
  }
  
  /**
   * Format dependency analysis results for inclusion in the prompt
   * @param analysis Dependency analysis results
   * @returns Formatted string for prompt inclusion
   */
  private formatDependencyAnalysisForPrompt(analysis: DependencyAnalysisResult): string {
    // Create a formatted string with the most important insights
    return `
## Dependency Analysis

### Overview
- Total modules: ${analysis.modulesCount}
- Total dependencies: ${analysis.dependenciesCount}
- Circular dependencies: ${analysis.circularDependencies.length}
- External dependencies: ${analysis.externalDependencies.length}

### Potential Issues
${analysis.circularDependencies.length > 0 ? `
#### Circular Dependencies
${analysis.circularDependencies.slice(0, 5).map(dep => `- ${dep}`).join('\n')}
${analysis.circularDependencies.length > 5 ? `...and ${analysis.circularDependencies.length - 5} more` : ''}
` : ''}

#### Highly Connected Modules
${analysis.highlyConnectedModules.slice(0, 5).map(module => 
  `- ${module.module} (${module.dependencyCount} dependencies)`
).join('\n')}

${analysis.violationSummary.error + analysis.violationSummary.warn > 0 ? `
#### Dependency Rule Violations
- Errors: ${analysis.violationSummary.error}
- Warnings: ${analysis.violationSummary.warn}
- Info: ${analysis.violationSummary.info}

${analysis.topViolations.length > 0 ? 
  analysis.topViolations.slice(0, 5).map(violation => 
    `- [${violation.severity.toUpperCase()}] ${violation.ruleName}: ${violation.from} → ${violation.to}`
  ).join('\n') : 'No specific violations to report.'}
` : ''}

#### Key External Dependencies
${analysis.externalDependencies.slice(0, 10).join(', ')}
${analysis.externalDependencies.length > 10 ? `...and ${analysis.externalDependencies.length - 10} more` : ''}
`;
  }
}
