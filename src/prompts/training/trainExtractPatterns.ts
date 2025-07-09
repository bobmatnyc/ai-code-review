#!/usr/bin/env node

/**
 * @fileoverview Training script for extract-patterns prompt optimization
 *
 * This script uses LangChain and the training examples to systematically
 * improve the extract-patterns prompt to better identify:
 * - Specific design patterns (Factory, Strategy, Observer, etc.)
 * - Code structure metrics (file sizes, function sizes, inheritance)
 * - Code composition analysis (original vs library code ratios)
 * - Architectural and implementation patterns
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { ReviewOptions } from '../../types/review';
import logger from '../../utils/logger';
import { PromptManager } from '../PromptManager';
import { ExtractPatternsTrainer } from './ExtractPatternsTrainer';
import { PATTERN_TRAINING_EXAMPLES } from './patternTrainingExamples';

/**
 * Enhanced base prompt for pattern extraction
 */
const ENHANCED_BASE_PROMPT = `
# Advanced Pattern Extraction Analysis

You are an expert software architect and pattern analyst. Your task is to systematically identify and catalog specific coding patterns, architectural decisions, and code composition metrics.

## Primary Objectives

Identify and quantify these specific elements:

### 1. Design Patterns with specific examples and locations
- Factory Patterns: Object creation patterns, abstract factories, builders
- Strategy Patterns: Algorithm families, policy objects, pluggable behaviors
- Observer Patterns: Event systems, pub/sub, listeners, reactive patterns
- Dispatch Models: Command patterns, message routing, request handling
- Singleton Patterns: Single instances, service locators, registries
- Decorator Patterns: Wrapper classes, middleware, aspect-oriented features
- Adapter Patterns: Interface adapters, wrappers, bridge implementations

### 2. Code Structure Metrics provide exact numbers
- File Size Distribution: Count files by size ranges (under 50, 50-100, 100-200, 200+ lines)
- Function Size Distribution: Count functions by size ranges (under 10, 10-25, 25-50, 50+ lines)
- Class Metrics: Number of methods per class, properties per class, inheritance depth
- Complexity Indicators: Cyclomatic complexity estimates, nesting levels
- Import/Export Ratios: Local vs external dependencies per file

### 3. Code Composition Analysis provide percentages
- Original vs Library Code: Estimate percentage of custom business logic vs third-party code
- Code Reuse Patterns: How much code is duplicated vs abstracted
- Abstraction Layers: Number of distinct architectural layers
- Coupling Analysis: Tight vs loose coupling patterns with examples
- Dependency Injection: How dependencies are managed and injected

### 4. Architectural Patterns describe structure and relationships
- Layered Architecture: Identify presentation, business, data layers
- Modular Architecture: How modules are defined and interact
- Plugin Architecture: Extension points and plugin mechanisms
- Event-Driven Architecture: Event sourcing, CQRS, message patterns
- Hexagonal Architecture: Ports, adapters, dependency inversion

### 5. Implementation Patterns show specific examples
- Inheritance Hierarchies: Depth, breadth, abstract vs concrete classes
- Mixin Patterns: Trait-like behavior, multiple inheritance alternatives
- Composition Patterns: How objects collaborate and are composed
- Interface Design: How contracts are defined and implemented
- Polymorphism Usage: Runtime vs compile-time polymorphism

## Required Output Format

For each pattern category, provide:
1. Pattern Name: Specific pattern identified
2. Implementation Details: How it is implemented in this codebase
3. File Locations: Specific files and line ranges where pattern appears
4. Quantitative Metrics: Numbers, percentages, counts where applicable
5. Quality Assessment: How well the pattern is implemented (Excellent/Good/Adequate/Poor)

## Analysis Instructions

1. Be Specific: Do not just say "uses Factory pattern" - explain which factory pattern and how
2. Provide Evidence: Give file names, class names, function names as evidence
3. Quantify Everything: Provide actual numbers for metrics, not just qualitative descriptions
4. Show Relationships: Explain how patterns work together
5. Identify Anti-Patterns: Note any problematic patterns that are avoided

Focus on patterns that can be measured, catalogued, and reused in other projects.
`;

/**
 * Training configuration
 */
interface TrainingConfig {
  maxIterations: number;
  targetScore: number;
  outputPath: string;
  useExistingPrompt: boolean;
}

/**
 * Main training function
 */
async function trainExtractPatternsPrompt(config: TrainingConfig): Promise<void> {
  logger.info('Starting extract-patterns prompt training...');

  const trainer = new ExtractPatternsTrainer();
  const promptManager = PromptManager.getInstance();

  // Get the current prompt or use the enhanced base prompt
  let currentPrompt: string;
  if (config.useExistingPrompt) {
    try {
      currentPrompt = await promptManager.getPromptTemplate('extract-patterns', {
        type: 'extract-patterns',
        language: 'typescript',
      });
      logger.info('Using existing extract-patterns prompt as starting point');
    } catch (_error) {
      logger.warn('Could not load existing prompt, using enhanced base prompt');
      currentPrompt = ENHANCED_BASE_PROMPT;
    }
  } else {
    currentPrompt = ENHANCED_BASE_PROMPT;
    logger.info('Using enhanced base prompt as starting point');
  }

  // Set up review options for training
  const reviewOptions: ReviewOptions = {
    type: 'extract-patterns',
    language: 'typescript',
    includeTests: true,
    output: 'json',
    schemaInstructions: 'Use the extract-patterns schema for structured output',
  };

  // Phase 1: Create few-shot prompt with training examples
  logger.info('Phase 1: Creating few-shot prompt with training examples...');
  const fewShotPrompt = await trainer.trainWithExamples(PATTERN_TRAINING_EXAMPLES, currentPrompt);

  // Phase 2: Iterative improvement based on evaluation
  logger.info('Phase 2: Starting iterative improvement...');
  const optimizedPrompt = await trainer.iterativeImprovement(
    fewShotPrompt,
    PATTERN_TRAINING_EXAMPLES,
    reviewOptions,
    config.maxIterations,
  );

  // Phase 3: Final evaluation
  logger.info('Phase 3: Final evaluation of optimized prompt...');
  const finalFeedbacks = await trainer.evaluatePrompt(
    optimizedPrompt,
    PATTERN_TRAINING_EXAMPLES,
    reviewOptions,
  );

  const finalScore =
    finalFeedbacks.reduce((sum, f) => sum + f.overallScore, 0) / finalFeedbacks.length;
  logger.info(`Final training score: ${finalScore.toFixed(2)}/10`);

  // Save the optimized prompt
  await saveOptimizedPrompt(optimizedPrompt, config.outputPath, finalScore);

  // Generate training report
  await generateTrainingReport(finalFeedbacks, config.outputPath, finalScore);

  logger.info('Training completed successfully!');
}

/**
 * Save the optimized prompt to file
 */
async function saveOptimizedPrompt(
  prompt: string,
  outputPath: string,
  score: number,
): Promise<void> {
  const promptPath = path.join(outputPath, 'optimized-extract-patterns-prompt.md');

  const promptContent = `---
name: Optimized Extract Patterns Review
description: AI-trained prompt for extracting coding patterns and architectural decisions
version: 2.0.0
author: AI Code Review Tool (LangChain Trained)
reviewType: extract-patterns
language: typescript
trainingScore: ${score.toFixed(2)}
tags: patterns, architecture, design, metrics, composition, analysis, trained
lastModified: '${new Date().toISOString().split('T')[0]}'
---

${prompt}
`;

  await fs.writeFile(promptPath, promptContent, 'utf-8');
  logger.info(`Optimized prompt saved to: ${promptPath}`);
}

/**
 * Generate training report
 */
async function generateTrainingReport(
  feedbacks: any[],
  outputPath: string,
  finalScore: number,
): Promise<void> {
  const reportPath = path.join(outputPath, 'training-report.md');

  const report = `# Extract Patterns Prompt Training Report

## Training Summary
- **Final Score**: ${finalScore.toFixed(2)}/10
- **Training Examples**: ${PATTERN_TRAINING_EXAMPLES.length}
- **Training Date**: ${new Date().toISOString()}

## Training Examples Used
${PATTERN_TRAINING_EXAMPLES.map(
  (example, index) => `
### Example ${index + 1}: ${example.description}
- **Expected Patterns**: ${example.expectedPatterns.designPatterns.length} design patterns
- **Code Metrics**: ${example.expectedPatterns.codeMetrics.averageFileSize} avg file size
- **Complexity**: ${example.expectedPatterns.codeMetrics.complexityLevel}
`,
).join('')}

## Performance Metrics
${feedbacks
  .map(
    (feedback, index) => `
### Example ${index + 1} Results
- **Pattern Identification**: ${feedback.patternIdentificationScore}/10
- **Metrics Accuracy**: ${feedback.metricsAccuracyScore}/10
- **Architectural Analysis**: ${feedback.architecturalAnalysisScore}/10
- **Overall Score**: ${feedback.overallScore}/10
`,
  )
  .join('')}

## Next Steps
1. Test the optimized prompt on real codebases
2. Collect feedback from actual usage
3. Iterate further based on production results
4. Consider adding more training examples for edge cases
`;

  await fs.writeFile(reportPath, report, 'utf-8');
  logger.info(`Training report saved to: ${reportPath}`);
}

/**
 * CLI interface
 */
async function main(): Promise<void> {
  const config: TrainingConfig = {
    maxIterations: parseInt(process.env.MAX_ITERATIONS || '3'),
    targetScore: parseFloat(process.env.TARGET_SCORE || '8.0'),
    outputPath: process.env.OUTPUT_PATH || './ai-code-review-docs/training',
    useExistingPrompt: process.env.USE_EXISTING_PROMPT === 'true',
  };

  // Ensure output directory exists
  await fs.mkdir(config.outputPath, { recursive: true });

  try {
    await trainExtractPatternsPrompt(config);
    process.exit(0);
  } catch (error) {
    logger.error(`Training failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { trainExtractPatternsPrompt, ENHANCED_BASE_PROMPT };
