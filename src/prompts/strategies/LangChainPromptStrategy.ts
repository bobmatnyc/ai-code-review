/**
 * @fileoverview LangChain prompt strategy implementation.
 *
 * This module implements a prompt strategy using LangChain for enhanced prompt
 * management, templating, and chain capabilities.
 */

import { FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import type { ReviewOptions } from '../../types/review';
import { formatCIDataForPrompt } from '../../utils/ciDataCollector';
import logger from '../../utils/logger';
import type { PromptCache } from '../cache/PromptCache';
import type { PromptManager } from '../PromptManager';
import { PromptStrategy } from './PromptStrategy';

/**
 * LangChain-based prompt strategy implementation
 */
export class LangChainPromptStrategy extends PromptStrategy {
  /**
   * Create a new LangChain prompt strategy
   * @param promptManager Prompt manager instance
   * @param promptCache Prompt cache instance
   */
  constructor(promptManager: PromptManager, promptCache: PromptCache) {
    super(promptManager, promptCache);
  }

  /**
   * Format a prompt using LangChain
   * @param prompt Raw prompt
   * @param options Review options
   * @returns Formatted prompt
   */
  async formatPrompt(prompt: string, options: ReviewOptions): Promise<string> {
    try {
      // Get input variables from the template
      const inputVariables = this.extractInputVariables(prompt);

      // Create a template
      const template = new PromptTemplate({
        template: prompt,
        inputVariables: inputVariables,
      });

      // Create input values from options
      const inputValues = this.createInputValuesFromOptions(options, inputVariables);

      // Format the prompt
      return await template.format(inputValues);
    } catch (error) {
      logger.error(
        `Error formatting prompt with LangChain: ${error instanceof Error ? error.message : String(error)}`,
      );

      // Fallback to basic string replacement
      return this.basicFormatPrompt(prompt, options);
    }
  }

  /**
   * Create a few-shot prompt template
   * @param prefix The prefix text for the prompt
   * @param examples The few-shot examples to include
   * @param suffix The suffix text for the prompt
   * @param options Review options
   * @returns FewShotPromptTemplate
   */
  createFewShotTemplate(
    prefix: string,
    examples: Array<Record<string, string>>,
    suffix: string,
    _options: ReviewOptions,
  ): FewShotPromptTemplate {
    // Create the example template with variables from the first example
    const exampleVariables = Object.keys(examples[0] || {});

    const exampleTemplate = new PromptTemplate({
      template: this.createExampleTemplateString(exampleVariables),
      inputVariables: exampleVariables,
    });

    // Create the few-shot template
    return new FewShotPromptTemplate({
      prefix,
      suffix,
      examplePrompt: exampleTemplate,
      examples,
      inputVariables: this.extractInputVariables(prefix + suffix),
    });
  }

  /**
   * Create a template string for examples
   * @param variables The variables in the example
   * @returns Example template string
   */
  private createExampleTemplateString(variables: string[]): string {
    const parts: string[] = [];

    for (const variable of variables) {
      parts.push(`${variable.toUpperCase()}: {${variable}}`);
    }

    return parts.join('\n');
  }

  /**
   * Create input values from review options
   * @param options Review options
   * @param inputVariables Input variables from the template
   * @returns Input values
   */
  private createInputValuesFromOptions(
    options: ReviewOptions,
    inputVariables: string[],
  ): Record<string, string> {
    const inputValues: Record<string, string> = {};

    // Map common option fields to template variables
    const optionsMap: Record<string, keyof ReviewOptions | string> = {
      LANGUAGE: 'language',
      FILE_PATH: 'filePath',
      CODE: 'code',
      TYPE: 'type',
      MODEL: 'models',
      SCHEMA_INSTRUCTIONS: 'schemaInstructions',
      LANGUAGE_INSTRUCTIONS: 'languageInstructions',
      CI_DATA: 'ciData',
    };

    // Fill in the input values from the options
    for (const variable of inputVariables) {
      const optionKey = optionsMap[variable];
      if (optionKey && typeof optionKey === 'string' && optionKey in options) {
        // Special handling for CI data
        if (optionKey === 'ciData' && options.ciData) {
          // Use the mapped FILE_PATH value if available, otherwise default to undefined
          // This ensures we don't try to access a property that doesn't exist on ReviewOptions
          const filePath = inputValues['FILE_PATH'] || undefined;
          inputValues[variable] = formatCIDataForPrompt(options.ciData, filePath);
        } else {
          inputValues[variable] = String(options[optionKey as keyof ReviewOptions]);
        }
      } else {
        // Try to look up directly in options
        if (variable in options) {
          inputValues[variable] = String(options[variable as keyof ReviewOptions]);
        }
      }
    }

    return inputValues;
  }

  /**
   * Basic prompt formatting fallback
   * @param prompt Raw prompt
   * @param options Review options
   * @returns Formatted prompt
   */
  private basicFormatPrompt(prompt: string, options: ReviewOptions): string {
    let formattedPrompt = prompt;

    // Replace common placeholders
    if (options.language) {
      formattedPrompt = formattedPrompt.replace(/{{LANGUAGE}}/g, options.language);
      formattedPrompt = formattedPrompt.replace(
        /{{LANGUAGE_INSTRUCTIONS}}/g,
        `This code is written in ${options.language.toUpperCase()}. Please provide language-specific advice.`,
      );
    } else {
      formattedPrompt = formattedPrompt.replace(/{{LANGUAGE_INSTRUCTIONS}}/g, '');
    }

    if (options.schemaInstructions) {
      formattedPrompt = formattedPrompt.replace(
        /{{SCHEMA_INSTRUCTIONS}}/g,
        options.schemaInstructions,
      );
    } else {
      formattedPrompt = formattedPrompt.replace(/{{SCHEMA_INSTRUCTIONS}}/g, '');
    }

    return formattedPrompt;
  }

  /**
   * Get the name of the strategy
   * @returns Strategy name
   */
  getName(): string {
    return 'langchain';
  }

  /**
   * Get the description of the strategy
   * @returns Strategy description
   */
  getDescription(): string {
    return 'LangChain-based prompt strategy for enhanced template capabilities';
  }
}
