/**
 * @fileoverview Token tracking service for multi-pass reviews.
 *
 * This module provides detailed token tracking and reporting functionality
 * for multi-pass reviews, recording token usage across passes and providing
 * comprehensive statistics for reporting.
 */

import { calculateCost, formatCost } from '../../clients/utils/tokenCounter';
import { countTokens } from '../../tokenizers';
import logger from '../../utils/logger';

/**
 * Token usage for a single pass in a multi-pass review
 */
export interface PassTokenUsage {
  /** Pass number */
  passNumber: number;
  /** Number of input tokens for this pass */
  inputTokens: number;
  /** Number of output tokens for this pass */
  outputTokens: number;
  /** Total tokens for this pass */
  totalTokens: number;
  /** Estimated cost for this pass */
  estimatedCost: number;
  /** Time taken for this pass in milliseconds */
  timeTakenMs: number;
  /** Files processed in this pass */
  files: string[];
  /** Whether this was a consolidation pass */
  isConsolidation: boolean;
}

/**
 * Consolidated token usage across all passes
 */
export interface ConsolidatedTokenUsage {
  /** Total input tokens across all passes */
  totalInputTokens: number;
  /** Total output tokens across all passes */
  totalOutputTokens: number;
  /** Total tokens across all passes */
  totalTokens: number;
  /** Total estimated cost across all passes */
  totalEstimatedCost: number;
  /** Formatted total cost */
  formattedTotalCost: string;
  /** Token usage for each pass */
  passTokenUsage: PassTokenUsage[];
  /** Total time taken across all passes in milliseconds */
  totalTimeTakenMs: number;
  /** Average tokens per file */
  averageTokensPerFile: number;
  /** Total number of files processed */
  totalFiles: number;
  /** Number of passes */
  passCount: number;
  /** Context maintenance factor used in multi-pass reviews */
  contextMaintenanceFactor: number;
  /** Model name used for review */
  modelName: string;
  /** Whether a consolidation pass was included */
  includedConsolidation: boolean;
}

/**
 * Real-time token statistics for monitoring
 */
export interface TokenStatistics {
  /** Current token usage rate (tokens per second) */
  currentTokenRate: number;
  /** Average token usage rate (tokens per second) */
  averageTokenRate: number;
  /** Estimated tokens remaining */
  estimatedTokensRemaining: number;
  /** Estimated time remaining in milliseconds */
  estimatedTimeRemainingMs: number;
  /** Estimated total cost so far */
  estimatedCostSoFar: number;
  /** Formatted estimated cost so far */
  formattedEstimatedCostSoFar: string;
}

/**
 * Service for tracking and reporting token usage in multi-pass reviews
 */
export class TokenTracker {
  /** Token usage for each pass */
  private passTokenUsage: PassTokenUsage[] = [];
  /** Start time of tracking */
  private startTime: number;
  /** Model name for cost estimation */
  private modelName: string;
  /** Context maintenance factor used in multi-pass reviews */
  private contextMaintenanceFactor: number;
  /** Whether the tracker is active */
  private isActive = true;
  /** Pass currently being tracked */
  private currentPass = 0;
  /** Current pass start time */
  private currentPassStartTime = 0;
  // We don't need to track this separately as it's already stored in passTokenUsage

  /**
   * Create a new token tracker
   * @param modelName Model name
   * @param contextMaintenanceFactor Context maintenance factor (0-1)
   */
  constructor(modelName: string, contextMaintenanceFactor = 0.15) {
    this.startTime = Date.now();
    this.modelName = modelName;
    this.contextMaintenanceFactor = contextMaintenanceFactor;
    logger.debug(
      `Initialized TokenTracker for model: ${modelName} with context maintenance factor: ${contextMaintenanceFactor}`,
    );
  }

  /**
   * Start tracking a new pass
   * @param passNumber Pass number
   * @param files Files being processed in this pass
   * @param isConsolidation Whether this is a consolidation pass
   */
  public startPass(passNumber: number, files: string[], isConsolidation = false): void {
    if (!this.isActive) {
      logger.warn('TokenTracker is not active, cannot start new pass');
      return;
    }

    this.currentPass = passNumber;
    this.currentPassStartTime = Date.now();

    logger.debug(`TokenTracker: Started tracking pass ${passNumber} with ${files.length} files`);

    // Initialize the pass token usage with all required properties
    this.passTokenUsage[passNumber - 1] = {
      passNumber: passNumber, // Explicit assignment to avoid type issues
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      timeTakenMs: 0,
      files: [...files],
      isConsolidation: isConsolidation,
    };
  }

  /**
   * Record token usage for the current pass
   * @param inputText Input text sent to the model
   * @param outputText Output text received from the model
   * @param passNumber Optional specific pass number (defaults to current pass)
   * @returns Updated token usage for the pass
   */
  public recordTokenUsage(
    inputText: string,
    outputText: string,
    passNumber: number = this.currentPass,
  ): PassTokenUsage {
    if (!this.isActive) {
      logger.warn('TokenTracker is not active, cannot record token usage');
      // Return empty usage with explicit property assignments
      return {
        passNumber: passNumber,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        timeTakenMs: 0,
        files: [],
        isConsolidation: false,
      };
    }

    // Ensure the pass exists
    if (!this.passTokenUsage[passNumber - 1]) {
      this.passTokenUsage[passNumber - 1] = {
        passNumber: passNumber,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        timeTakenMs: 0,
        files: [],
        isConsolidation: false,
      };
    }

    // Count tokens
    const inputTokens = countTokens(inputText, this.modelName);
    const outputTokens = countTokens(outputText, this.modelName);
    const totalTokens = inputTokens + outputTokens;
    const estimatedCost = calculateCost(inputTokens, outputTokens, this.modelName);

    // Update the pass token usage
    const passUsage = this.passTokenUsage[passNumber - 1];
    if (passUsage) {
      passUsage.inputTokens += inputTokens;
      passUsage.outputTokens += outputTokens;
      passUsage.totalTokens += totalTokens;
      passUsage.estimatedCost += estimatedCost;

      // Calculate time taken if this is the current pass
      if (passNumber === this.currentPass) {
        passUsage.timeTakenMs = Date.now() - this.currentPassStartTime;
      }
    } else {
      logger.warn(`Pass ${passNumber} does not exist in TokenTracker during token recording`);
    }

    logger.debug(
      `TokenTracker: Recorded ${inputTokens} input, ${outputTokens} output tokens for pass ${passNumber}`,
    );

    return passUsage
      ? { ...passUsage }
      : {
          passNumber: passNumber,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          timeTakenMs: 0,
          files: [],
          isConsolidation: false,
        };
  }

  /**
   * Complete the current pass
   * @param passNumber Optional specific pass number (defaults to current pass)
   * @returns Token usage for the completed pass
   */
  public completePass(passNumber: number = this.currentPass): PassTokenUsage {
    if (!this.isActive) {
      logger.warn('TokenTracker is not active, cannot complete pass');
      // Return empty usage with explicit property assignments
      return {
        passNumber: passNumber,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        timeTakenMs: 0,
        files: [],
        isConsolidation: false,
      };
    }

    // Ensure the pass exists
    if (!this.passTokenUsage[passNumber - 1]) {
      logger.warn(`Pass ${passNumber} does not exist in TokenTracker`);
      return {
        passNumber: passNumber,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        timeTakenMs: 0,
        files: [],
        isConsolidation: false,
      };
    }

    // Complete the pass
    const passUsage = this.passTokenUsage[passNumber - 1];
    if (passUsage) {
      passUsage.timeTakenMs = Date.now() - this.currentPassStartTime;

      logger.info(
        `TokenTracker: Completed pass ${passNumber} with ${passUsage.totalTokens} tokens (${passUsage.inputTokens} input, ${passUsage.outputTokens} output)`,
      );
      logger.info(
        `TokenTracker: Pass ${passNumber} estimated cost: ${formatCost(passUsage.estimatedCost)}`,
      );

      return { ...passUsage };
    }
    logger.warn(`Pass ${passNumber} does not exist in TokenTracker during completion`);
    return {
      passNumber: passNumber,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      timeTakenMs: 0,
      files: [],
      isConsolidation: false,
    };
  }

  /**
   * Start a consolidation pass
   * @param files Files being consolidated (typically just the review file)
   * @returns Pass number for the consolidation pass
   */
  public startConsolidationPass(files: string[]): number {
    if (!this.isActive) {
      logger.warn('TokenTracker is not active, cannot start consolidation pass');
      return 0;
    }

    // The consolidation pass is always the last pass + 1
    const consolidationPassNumber = this.passTokenUsage.length + 1;

    this.startPass(consolidationPassNumber, files, true);

    logger.info(`TokenTracker: Started consolidation pass ${consolidationPassNumber}`);

    return consolidationPassNumber;
  }

  /**
   * Get token usage for a specific pass
   * @param passNumber Pass number
   * @returns Token usage for the pass
   */
  public getPassTokenUsage(passNumber: number): PassTokenUsage | undefined {
    return this.passTokenUsage[passNumber - 1];
  }

  /**
   * Get consolidated token usage across all passes
   * @returns Consolidated token usage
   */
  public getConsolidatedTokenUsage(): ConsolidatedTokenUsage {
    const passTokenUsage = [...this.passTokenUsage];

    // Calculate totals
    const totalInputTokens = passTokenUsage.reduce((sum, pass) => sum + pass.inputTokens, 0);
    const totalOutputTokens = passTokenUsage.reduce((sum, pass) => sum + pass.outputTokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const totalEstimatedCost = passTokenUsage.reduce((sum, pass) => sum + pass.estimatedCost, 0);
    const totalTimeTakenMs = passTokenUsage.reduce((sum, pass) => sum + pass.timeTakenMs, 0);

    // Calculate unique files (files may appear in multiple passes due to context maintenance)
    const uniqueFiles = new Set<string>();
    passTokenUsage.forEach((pass) => {
      pass.files.forEach((file) => uniqueFiles.add(file));
    });

    const totalFiles = uniqueFiles.size;
    const averageTokensPerFile = totalFiles > 0 ? totalTokens / totalFiles : 0;

    // Check if a consolidation pass was included
    const includedConsolidation = passTokenUsage.some((pass) => pass.isConsolidation);

    return {
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalEstimatedCost,
      formattedTotalCost: formatCost(totalEstimatedCost),
      passTokenUsage,
      totalTimeTakenMs,
      averageTokensPerFile,
      totalFiles,
      passCount: passTokenUsage.length,
      contextMaintenanceFactor: this.contextMaintenanceFactor,
      modelName: this.modelName,
      includedConsolidation,
    };
  }

  /**
   * Get current token statistics for real-time monitoring
   * @returns Current token statistics
   */
  public getTokenStatistics(): TokenStatistics {
    const consolidated = this.getConsolidatedTokenUsage();
    const elapsedTimeSeconds = (Date.now() - this.startTime) / 1000;

    // Calculate token rate
    const currentPassUsage = this.getPassTokenUsage(this.currentPass);
    const currentPassTimeSeconds = currentPassUsage ? currentPassUsage.timeTakenMs / 1000 : 0;
    const currentTokenRate =
      currentPassTimeSeconds > 0 && currentPassUsage
        ? currentPassUsage.totalTokens / currentPassTimeSeconds
        : 0;

    const averageTokenRate =
      elapsedTimeSeconds > 0 ? consolidated.totalTokens / elapsedTimeSeconds : 0;

    // Estimate tokens remaining (very rough estimate)
    // In a real implementation, we would have better metrics based on the review type and files
    const estimatedTokensRemaining = 0; // Not implemented yet

    // Estimate time remaining
    const estimatedTimeRemainingMs =
      averageTokenRate > 0 ? (estimatedTokensRemaining / averageTokenRate) * 1000 : 0;

    return {
      currentTokenRate,
      averageTokenRate,
      estimatedTokensRemaining,
      estimatedTimeRemainingMs,
      estimatedCostSoFar: consolidated.totalEstimatedCost,
      formattedEstimatedCostSoFar: consolidated.formattedTotalCost,
    };
  }

  /**
   * Generate a formatted report of token usage
   * @returns Formatted token usage report in Markdown format
   */
  public generateTokenUsageReport(): string {
    const consolidated = this.getConsolidatedTokenUsage();

    // Format times
    const formatTime = (ms: number): string => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    };

    let report = `## Token Usage Report

### Overview
- **Model Used**: ${consolidated.modelName}
- **Total Tokens**: ${consolidated.totalTokens.toLocaleString()} (${consolidated.totalInputTokens.toLocaleString()} input, ${consolidated.totalOutputTokens.toLocaleString()} output)
- **Estimated Cost**: ${consolidated.formattedTotalCost}
- **Total Time**: ${formatTime(consolidated.totalTimeTakenMs)}
- **Passes**: ${consolidated.passCount} ${consolidated.includedConsolidation ? '(including consolidation)' : ''}
- **Files Processed**: ${consolidated.totalFiles}
- **Context Maintenance Factor**: ${(consolidated.contextMaintenanceFactor * 100).toFixed(1)}%

### Per-Pass Breakdown
| Pass | Files | Input Tokens | Output Tokens | Total Tokens | Cost | Time |
|------|-------|--------------|---------------|--------------|------|------|
`;

    // Add each pass to the report
    consolidated.passTokenUsage.forEach((pass) => {
      report += `| ${pass.passNumber}${pass.isConsolidation ? ' (Consolidation)' : ''} | ${pass.files.length} | ${pass.inputTokens.toLocaleString()} | ${pass.outputTokens.toLocaleString()} | ${pass.totalTokens.toLocaleString()} | ${formatCost(pass.estimatedCost)} | ${formatTime(pass.timeTakenMs)} |\n`;
    });

    // Add token rate information
    const stats = this.getTokenStatistics();
    report += `\n### Performance
- **Average Token Rate**: ${stats.averageTokenRate.toFixed(2)} tokens/second
- **Average Cost Rate**: $${(stats.estimatedCostSoFar / (consolidated.totalTimeTakenMs / 1000)).toFixed(6)}/second
`;

    return report;
  }

  /**
   * Stop the tracker
   * @returns Final consolidated token usage
   */
  public stop(): ConsolidatedTokenUsage {
    this.isActive = false;
    logger.debug('TokenTracker: Stopped');
    return this.getConsolidatedTokenUsage();
  }
}
