/**
 * @fileoverview Client for interacting with the Anthropic API.
 *
 * This module provides a client for interacting with Anthropic's Claude models.
 * It re-exports functionality from specialized modules to maintain a clean API
 * while adhering to the Single Responsibility Principle.
 *
 * Key features:
 * - Support for various Claude models (Claude 3 Opus, Sonnet, Haiku)
 * - Streaming and non-streaming responses
 * - Robust error handling and rate limit management
 * - Cost estimation for API usage
 * - Support for different review types
 * - Tool calling capabilities for enhanced reviews
 */

// Export model detection and initialization functions
export {
  initializeAnthropicClient,
  isAnthropicModel,
} from './utils/anthropicModelHelpers';

// Export review generation functions
export {
  generateAnthropicConsolidatedReview,
  generateAnthropicReview,
} from './utils/anthropicReviewGenerators';

// Export architectural review with tool calling
export { generateArchitecturalAnthropicReview } from './utils/anthropicToolCalling';
