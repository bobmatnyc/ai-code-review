/**
 * @fileoverview Index file for client utilities.
 *
 * This module exports all client utilities for easy importing.
 */

export * from './apiKeyValidator';
export * from './directoryStructure';
export * from './languageDetection';
export * from './modelInitializer';
// Export everything except the conflicting functions from modelMaps
export {
  ENHANCED_MODEL_MAP,
  getApiNameFromKey,
  getEnhancedModelMapping,
  getModelMapping,
  getModels,
  getModelsByCategory,
  getModelsByProvider,
  getProviderFeatures,
  getRecommendedModelForCodeReview,
  parseModelString,
  supportsToolCalling,
  validateModelKey,
} from './modelMaps';
export * from './promptFormatter';
export * from './promptLoader';
// Export everything except the conflicting functions from tokenCounter
export {
  estimateTokenCount,
  getCostInfo,
  getCostInfoFromText,
} from './tokenCounter';

// Import and re-export with aliases to avoid conflicts
import { calculateCost as calculateModelCost, formatCost as formatModelCost } from './modelMaps';
import { calculateCost as calculateTokenCost, formatCost as formatTokenCost } from './tokenCounter';

export { calculateModelCost, formatModelCost, calculateTokenCost, formatTokenCost };
export * from './modelLister';
export * from './modelTester';
