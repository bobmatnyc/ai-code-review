/**
 * @fileoverview Progress tracker for multi-pass reviews.
 *
 * This module provides utilities for tracking and displaying progress
 * during multi-pass reviews.
 */

import logger from '../logger';
import readline from 'readline';

/**
 * Progress state for a multi-pass review
 */
export interface MultiPassProgress {
  /** Total number of passes */
  totalPasses: number;
  /** Current pass number */
  currentPass: number;
  /** Files being processed in the current pass */
  currentFiles: string[];
  /** Total number of files */
  totalFiles: number;
  /** Number of files processed so far */
  processedFiles: number;
  /** Start time of the review */
  startTime: Date;
  /** Estimated completion time */
  estimatedCompletionTime?: Date;
  /** Whether the review is complete */
  isComplete: boolean;
  /** Current phase of the review */
  currentPhase: 'preparing' | 'analyzing' | 'reviewing' | 'processing' | 'complete';
}

/**
 * Progress tracker for multi-pass reviews
 */
export class MultiPassProgressTracker {
  private progress: MultiPassProgress;
  private updateInterval: NodeJS.Timeout | null = null;
  private useAnsiEscapes: boolean;

  /**
   * Create a new progress tracker
   * @param totalPasses Total number of passes
   * @param totalFiles Total number of files
   * @param options Options for the progress tracker
   */
  constructor(
    totalPasses: number,
    totalFiles: number,
    options: {
      useAnsiEscapes?: boolean;
      quiet?: boolean;
    } = {}
  ) {
    this.progress = {
      totalPasses,
      currentPass: 0,
      currentFiles: [],
      totalFiles,
      processedFiles: 0,
      startTime: new Date(),
      isComplete: false,
      currentPhase: 'preparing'
    };
    
    this.useAnsiEscapes = options.useAnsiEscapes !== false;
    
    // Start the progress update interval if not in quiet mode
    if (!options.quiet) {
      this.startProgressUpdates();
    }
  }
  
  /**
   * Start the progress update interval
   */
  private startProgressUpdates(): void {
    // Update the progress display every 1 second
    this.updateInterval = setInterval(() => {
      this.updateProgressDisplay();
    }, 1000);
  }
  
  /**
   * Stop the progress update interval
   */
  public stopProgressUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  /**
   * Update the progress display
   */
  private updateProgressDisplay(): void {
    if (this.progress.isComplete) {
      return;
    }
    
    const { currentPass, totalPasses, processedFiles, totalFiles, currentPhase, startTime } = this.progress;
    
    // Calculate elapsed time
    const elapsed = Math.floor((new Date().getTime() - startTime.getTime()) / 1000);
    const elapsedMinutes = Math.floor(elapsed / 60);
    const elapsedSeconds = elapsed % 60;
    
    // Clear the previous line if terminal supports ANSI escapes
    if (this.useAnsiEscapes) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
    }
    
    // Create the progress message
    let progressMessage = '';
    
    if (currentPhase === 'preparing') {
      progressMessage = `Preparing multi-pass review...`;
    } else if (currentPhase === 'analyzing') {
      progressMessage = `Analyzing files for multi-pass review...`;
    } else if (currentPhase === 'reviewing') {
      const passProgress = (currentPass / totalPasses) * 100;
      progressMessage = `Pass ${currentPass}/${totalPasses} (${passProgress.toFixed(1)}%)`;
      
      if (this.progress.currentFiles.length > 0) {
        const fileNames = this.progress.currentFiles.map(f => f.split('/').pop()).join(', ');
        progressMessage += ` | Processing: ${fileNames.length > 50 ? fileNames.substring(0, 50) + '...' : fileNames}`;
      }
    } else if (currentPhase === 'processing') {
      progressMessage = `Processing results...`;
    }
    
    // Add timing information
    progressMessage += ` | Elapsed: ${elapsedMinutes}m ${elapsedSeconds}s`;
    
    // Print the progress message without a newline if terminal supports ANSI escapes
    if (this.useAnsiEscapes) {
      process.stdout.write(progressMessage);
    } else {
      // Otherwise, just log the progress
      logger.info(progressMessage);
    }
  }
  
  /**
   * Start a new pass
   * @param passNumber Pass number
   * @param files Files being processed in this pass
   */
  public startPass(passNumber: number, files: string[]): void {
    this.progress.currentPass = passNumber;
    this.progress.currentFiles = files;
    this.progress.currentPhase = 'reviewing';
    
    // Log the start of a new pass (with a newline to avoid overwriting the progress bar)
    if (this.useAnsiEscapes) {
      process.stdout.write('\n');
    }
    
    logger.info(`Starting pass ${passNumber}/${this.progress.totalPasses} with ${files.length} files`);
  }
  
  /**
   * Complete a pass
   * @param passNumber Pass number
   */
  public completePass(passNumber: number): void {
    if (passNumber !== this.progress.currentPass) {
      logger.warn(`Completed pass ${passNumber} but current pass is ${this.progress.currentPass}`);
    }
    
    this.progress.processedFiles += this.progress.currentFiles.length;
    this.progress.currentFiles = [];
    
    // Log the completion of a pass (with a newline to avoid overwriting the progress bar)
    if (this.useAnsiEscapes) {
      process.stdout.write('\n');
    }
    
    logger.info(`Completed pass ${passNumber}/${this.progress.totalPasses}`);
    
    // If this was the last pass, mark the review as complete
    if (passNumber === this.progress.totalPasses) {
      this.complete();
    }
  }
  
  /**
   * Set the current phase
   * @param phase Current phase
   */
  public setPhase(phase: MultiPassProgress['currentPhase']): void {
    this.progress.currentPhase = phase;
    
    if (phase === 'complete') {
      this.complete();
    }
  }
  
  /**
   * Complete the review
   */
  public complete(): void {
    this.progress.isComplete = true;
    this.progress.currentPhase = 'complete';
    
    // Calculate total time
    const elapsed = Math.floor((new Date().getTime() - this.progress.startTime.getTime()) / 1000);
    const elapsedMinutes = Math.floor(elapsed / 60);
    const elapsedSeconds = elapsed % 60;
    
    // Clear the progress bar
    if (this.useAnsiEscapes) {
      readline.clearLine(process.stdout, 0);
      readline.cursorTo(process.stdout, 0);
    }
    
    // Log the completion message
    logger.info(`Multi-pass review completed in ${elapsedMinutes}m ${elapsedSeconds}s`);
    
    // Stop the progress updates
    this.stopProgressUpdates();
  }
  
  /**
   * Get the current progress
   * @returns Current progress state
   */
  public getProgress(): MultiPassProgress {
    return { ...this.progress };
  }
}