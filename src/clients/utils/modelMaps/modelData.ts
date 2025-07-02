/**
 * @fileoverview Aggregates all provider model configurations
 */

import { ANTHROPIC_MODELS } from './anthropic';
import { GEMINI_MODELS } from './gemini';
import { OPENAI_MODELS } from './openai';
import { OPENROUTER_MODELS } from './openrouter';
import type { EnhancedModelMapping } from './types';

/**
 * Enhanced model map with comprehensive metadata.
 * This is the source of truth for all model configurations.
 */
export const ENHANCED_MODEL_MAP: Record<string, EnhancedModelMapping> = {
  ...GEMINI_MODELS,
  ...ANTHROPIC_MODELS,
  ...OPENAI_MODELS,
  ...OPENROUTER_MODELS,
};
