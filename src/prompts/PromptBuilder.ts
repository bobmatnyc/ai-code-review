/**
 * @fileoverview Prompt builder for constructing prompts from multiple components.
 *
 * This module provides functionality for building prompts from multiple components,
 * including templates, user-provided fragments, and model-specific optimizations.
 */

import { ReviewOptions, ReviewType } from '../types/review';
import { ProjectDocs } from '../utils/projectDocs';
import { PromptManager } from './PromptManager';
import { PromptCache } from './cache/PromptCache';
import { PromptStrategyFactory } from './strategies/PromptStrategyFactory';
import logger from '../utils/logger';

/**
 * Interface for a prompt component
 */
export interface PromptComponent {
  /**
   * Content of the component
   */
  content: string;
  
  /**
   * Position of the component in the prompt (start, middle, end)
   */
  position: 'start' | 'middle' | 'end';
  
  /**
   * Priority of the component (higher priority components are included first)
   */
  priority: number;
}

/**
 * Builder for constructing prompts
 */
export class PromptBuilder {
  private promptManager: PromptManager;
  private promptCache: PromptCache;
  private components: PromptComponent[] = [];
  
  /**
   * Create a new prompt builder
   * @param promptManager Prompt manager instance
   * @param promptCache Prompt cache instance
   */
  constructor(promptManager: PromptManager, promptCache: PromptCache) {
    this.promptManager = promptManager;
    this.promptCache = promptCache;
  }
  
  /**
   * Add a component to the prompt
   * @param component Prompt component to add
   * @returns This builder instance for chaining
   */
  addComponent(component: PromptComponent): PromptBuilder {
    this.components.push(component);
    return this;
  }
  
  /**
   * Add a user-provided fragment to the prompt
   * @param content Content of the fragment
   * @param position Position of the fragment in the prompt
   * @param priority Priority of the fragment
   * @returns This builder instance for chaining
   */
  addFragment(
    content: string,
    position: 'start' | 'middle' | 'end' = 'middle',
    priority: number = 5
  ): PromptBuilder {
    return this.addComponent({
      content,
      position,
      priority
    });
  }
  
  /**
   * Build a prompt for a review
   * @param reviewType Type of review
   * @param options Review options
   * @param projectDocs Project documentation
   * @returns Promise resolving to the built prompt
   */
  async buildPrompt(
    reviewType: ReviewType,
    options: ReviewOptions,
    projectDocs?: ProjectDocs | null
  ): Promise<string> {
    try {
      // Get the base prompt template
      const basePrompt = await this.promptManager.getPromptTemplate(reviewType, options);
      
      // Add the base prompt as a component
      this.addComponent({
        content: basePrompt,
        position: 'middle',
        priority: 10
      });
      
      // Apply model-specific optimizations if a model is specified
      if (options.model) {
        // Extract the provider from the model string
        const provider = options.model.split(':')[0];
        
        // Get the appropriate prompt strategy
        const strategy = PromptStrategyFactory.createStrategy(
          provider,
          this.promptManager,
          this.promptCache
        );
        
        // Format the prompt using the strategy
        const formattedPrompt = strategy.formatPrompt(basePrompt, options);
        
        // Replace the base prompt with the formatted prompt
        this.components = this.components.filter(c => c.content !== basePrompt);
        this.addComponent({
          content: formattedPrompt,
          position: 'middle',
          priority: 10
        });
      }
      
      // Sort components by position and priority
      const startComponents = this.components
        .filter(c => c.position === 'start')
        .sort((a, b) => b.priority - a.priority);
      
      const middleComponents = this.components
        .filter(c => c.position === 'middle')
        .sort((a, b) => b.priority - a.priority);
      
      const endComponents = this.components
        .filter(c => c.position === 'end')
        .sort((a, b) => b.priority - a.priority);
      
      // Combine components into a single prompt
      const prompt = [
        ...startComponents.map(c => c.content),
        ...middleComponents.map(c => c.content),
        ...endComponents.map(c => c.content)
      ].join('\n\n');
      
      return prompt;
    } catch (error) {
      logger.error(`Error building prompt: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }
  
  /**
   * Clear all components from the builder
   * @returns This builder instance for chaining
   */
  clear(): PromptBuilder {
    this.components = [];
    return this;
  }
}
