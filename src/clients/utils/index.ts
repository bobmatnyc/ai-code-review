/**
 * @fileoverview Index file for client utilities.
 *
 * This module exports all client utilities for easy importing.
 */

export * from './apiKeyValidator';
export * from './modelInitializer';
export * from './promptFormatter';
export * from './directoryStructure';
export * from './promptLoader';
// Export everything except the conflicting functions from tokenCounter
export { 
  getCostInfoFromText,
  estimateTokenCount,
  getCostInfo
} from './tokenCounter';

export * from './languageDetection';

// Export everything except the conflicting functions from modelMaps
export {
  MODEL_MAP,
  MODELS,
  ENHANCED_MODEL_MAP,
  getModelMapping,
  getEnhancedModelMapping,
  parseModelString,
  getApiNameFromKey,
  getModelsByProvider,
  getModelsByCategory,
  validateModelKey,
  supportsToolCalling,
  getProviderFeatures,
  getRecommendedModelForCodeReview
} from './modelMaps';

// Import and re-export with aliases to avoid conflicts
import { calculateCost as calculateModelCost, formatCost as formatModelCost } from './modelMaps';
import { calculateCost as calculateTokenCost, formatCost as formatTokenCost } from './tokenCounter';

export { 
  calculateModelCost,
  formatModelCost,
  calculateTokenCost,
  formatTokenCost
};
export * from './modelLister';
export * from './modelTester';
