/**
 * @fileoverview Handler for streaming AI model responses to the console.
 *
 * This module provides a handler for processing streaming responses from the Gemini API
 * and displaying them in real-time to the console. It supports interactive mode where
 * users can see review feedback as it's being generated rather than waiting for the
 * complete response.
 *
 * Key responsibilities:
 * - Processing streaming chunks from the Gemini API
 * - Displaying content to the console in real-time with formatting
 * - Accumulating content for final storage
 * - Providing progress indicators and timing information
 * - Handling different review types with appropriate formatting
 *
 * The StreamHandler improves the user experience by providing immediate feedback
 * during the review process, especially for larger codebases where reviews may
 * take significant time to complete.
 */

import chalk from 'chalk';
import type { ReviewType } from '../types/review';

/**
 * Handler for streaming review content to the console
 */
export class StreamHandler {
  private content = '';
  private startTime: number;
  private modelName: string;

  /**
   * Create a new stream handler
   * @param reviewType Type of review being performed
   * @param modelName Name of the model being used
   */
  constructor(reviewType: ReviewType, modelName: string) {
    this.startTime = Date.now();
    this.modelName = modelName;

    // Print header
    console.log('\n');
    console.log(chalk.bgBlue.white.bold(` ${reviewType.toUpperCase()} REVIEW `));
    console.log(chalk.dim(`Using model: ${modelName}`));
    console.log(chalk.dim('Streaming response...\n'));
    console.log(chalk.yellow('─'.repeat(process.stdout.columns || 80)));
    console.log('\n');
  }

  /**
   * Handle a chunk of streamed content
   * @param chunk Text chunk from the stream
   */
  public handleChunk(chunk: string): void {
    // Add the chunk to the accumulated content
    this.content += chunk;

    // Print the chunk to the console
    process.stdout.write(chunk);
  }

  /**
   * Complete the stream and return the full content
   * @returns The complete content
   */
  public complete(): string {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(2);

    console.log('\n');
    console.log(chalk.yellow('─'.repeat(process.stdout.columns || 80)));
    console.log(chalk.dim(`\nReview completed in ${duration} seconds using ${this.modelName}`));
    console.log('\n');

    return this.content;
  }
}
