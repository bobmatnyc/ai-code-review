/**
 * @fileoverview Enhancements to automatically detect project language
 * 
 * This script integrates project type detection into the CLI
 * to automatically determine the programming language without
 * requiring manual flags.
 */

import path from 'path';
import { detectProjectType } from './detectProjectType';
import logger from '../src/utils/logger';

/**
 * Update CLI arguments with autodetected project language
 * 
 * @param args Command-line arguments
 * @returns Updated arguments with auto-detected language if not specified
 */
export async function updateCLIWithLanguageDetection(args: Record<string, unknown>): Promise<Record<string, unknown>> {
  const target = args.target || '.';
  const targetPath = path.resolve(process.cwd(), target);
  
  // Skip detection if language is already specified
  if (args.language) {
    return args;
  }
  
  try {
    logger.debug(`Auto-detecting project language for: ${targetPath}`);
    const detection = await detectProjectType(targetPath);
    
    if (detection) {
      logger.debug(
        `Detected project language: ${detection.language} (${detection.confidence} confidence)` + 
        (detection.projectType ? ` - Project type: ${detection.projectType}` : '')
      );
      
      // Set the detected language in the arguments
      args.language = detection.language;
      
      // Show info message for medium/high confidence detections
      if (detection.confidence !== 'low') {
        logger.info(
          `Auto-detected project language: ${detection.language}` +
          (detection.projectType ? ` (${detection.projectType})` : '')
        );
      }
    }
  } catch (error) {
    // Log error but continue with default language
    logger.debug(
      `Error auto-detecting project language: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  
  return args;
}

/**
 * Update the review orchestrator to include language detection
 * 
 * This function patches the existing orchestrateReview function
 * to automatically detect the project language before starting
 * the review process.
 */
export function patchOrchestrator() {
  // This function would patch the orchestrateReview function
  // to integrate language detection before starting the review
  // 
  // Typically this would use monkey patching or a more elegant
  // dependency injection approach, but the implementation would
  // depend on how the codebase is structured.
  
  // For example, if orchestrateReview is exported from a module:
  // 
  // const originalOrchestrateReview = require('../src/core/reviewOrchestrator').orchestrateReview;
  // 
  // module.exports.orchestrateReview = async function(target, options) {
  //   // Auto-detect language if not specified
  //   if (!options.language) {
  //     const targetPath = path.resolve(process.cwd(), target);
  //     const detection = await detectProjectType(targetPath);
  //     if (detection) {
  //       options.language = detection.language;
  //     }
  //   }
  //   
  //   // Call the original function with updated options
  //   return originalOrchestrateReview(target, options);
  // };
}