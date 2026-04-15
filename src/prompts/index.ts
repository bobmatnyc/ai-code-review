/**
 * @fileoverview Public exports for the prompts module.
 *
 * Phase 2: The UnifiedPromptManager is the recommended entry point for prompt retrieval.
 * All prompts are served from HBS templates.
 */

export { getBundledPrompt, USE_TEMPLATE_SYSTEM } from './bundledPrompts';
export type { PromptTemplate, PromptTemplateMetadata } from './PromptManager';
export { PromptManager } from './PromptManager';
export { UnifiedPromptManager } from './UnifiedPromptManager';
