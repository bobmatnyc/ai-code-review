import { ReviewType } from '../types/review';
import chalk from 'chalk';

/**
 * Handler for streaming review content to the console
 */
export class StreamHandler {
  private content: string = '';
  private reviewType: ReviewType;
  private startTime: number;
  private modelName: string;
  
  /**
   * Create a new stream handler
   * @param reviewType Type of review being performed
   * @param modelName Name of the model being used
   */
  constructor(reviewType: ReviewType, modelName: string) {
    this.reviewType = reviewType;
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
