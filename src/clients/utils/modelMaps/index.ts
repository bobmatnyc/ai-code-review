/**
 * @fileoverview Enhanced model mapping system for AI Code Review tool.
 * 
 * This module provides a comprehensive model configuration system that includes:
 * - Verified model specifications as of June 2025
 * - Pricing information for accurate cost estimation
 * - Deprecation tracking with migration guidance
 * - Backwards compatibility with existing codebase
 * - Provider-specific feature detection
 * - Model categorization and capability mapping
 * 
 * @version 4.0.0
 * @since 3.2.8
 */

// Export all types
export * from './types';

// Export enhanced model map
export { ENHANCED_MODEL_MAP } from './modelData';

// Export legacy compatibility
export { MODEL_MAP, MODELS } from './legacy';

// Export all functions
export * from './functions';