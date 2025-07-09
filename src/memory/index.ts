/**
 * Memory System for AI Code Review
 *
 * This module provides the core memory infrastructure for the ai-code-review project,
 * implementing the MEM-001/MEM-002 memory foundation for high-activity development environments.
 */

export { ClaudePMMemory } from './ClaudePMMemory';
export { CodeReviewMemoryPatterns } from './patterns';
export { MemorySchemas } from './schemas';
export type {
  CodeReviewMemoryEntry,
  MemoryConfig,
  MemoryOperation,
  PerformanceMetrics,
} from './types';
