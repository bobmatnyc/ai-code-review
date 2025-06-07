/**
 * @fileoverview Tests for the StrategyFactory class.
 */

import { StrategyFactory } from '../../strategies/StrategyFactory';
import { ConsolidatedReviewStrategy } from '../../strategies/ConsolidatedReviewStrategy';
import { ArchitecturalReviewStrategy } from '../../strategies/ArchitecturalReviewStrategy';
import { ReviewOptions } from '../../types/review';
import { PluginManager } from '../../plugins/PluginManager';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('../../plugins/PluginManager');
vi.mock('../../utils/logger');

describe('StrategyFactory', () => {
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Mock PluginManager.getInstance
    (PluginManager.getInstance as any).mockReturnValue({
      getPlugin: vi.fn()
    });
  });
  
  test('createStrategy should return ConsolidatedReviewStrategy for default options', () => {
    // Set up test data
    const options: ReviewOptions = {
      type: 'quick-fixes',
      includeTests: false,
      output: 'markdown'
    };
    
    // Create strategy
    const strategy = StrategyFactory.createStrategy(options);
    
    // Verify the strategy type
    expect(strategy).toBeInstanceOf(ConsolidatedReviewStrategy);
  });
  
  
  test('createStrategy should return ArchitecturalReviewStrategy for architectural review type', () => {
    // Set up test data
    const options: ReviewOptions = {
      type: 'architectural',
      includeTests: false,
      output: 'markdown'
    };
    
    // Create strategy
    const strategy = StrategyFactory.createStrategy(options);
    
    // Verify the strategy type
    expect(strategy).toBeInstanceOf(ArchitecturalReviewStrategy);
  });
  
  test('createStrategy should return custom strategy when strategy option is provided', () => {
    // Set up test data
    const options: ReviewOptions = {
      type: 'quick-fixes',
      includeTests: false,
      output: 'markdown',
      strategy: 'custom-strategy'
    };
    
    // Set up mock custom strategy
    const mockCustomStrategy = { execute: vi.fn() };
    const mockPluginManager = {
      getPlugin: vi.fn().mockReturnValue(mockCustomStrategy)
    };
    (PluginManager.getInstance as any).mockReturnValue(mockPluginManager);
    
    // Create strategy
    const strategy = StrategyFactory.createStrategy(options);
    
    // Verify the plugin manager was called
    expect(mockPluginManager.getPlugin).toHaveBeenCalledWith('custom-strategy');
    
    // Verify the strategy is the custom strategy
    expect(strategy).toBe(mockCustomStrategy);
  });
  
  test('createStrategy should fall back to default strategy when custom strategy is not found', () => {
    // Set up test data
    const options: ReviewOptions = {
      type: 'quick-fixes',
      includeTests: false,
      output: 'markdown',
      strategy: 'non-existent-strategy'
    };
    
    // Set up mock plugin manager to return undefined
    const mockPluginManager = {
      getPlugin: vi.fn().mockReturnValue(undefined)
    };
    (PluginManager.getInstance as any).mockReturnValue(mockPluginManager);
    
    // Create strategy
    const strategy = StrategyFactory.createStrategy(options);
    
    // Verify the plugin manager was called
    expect(mockPluginManager.getPlugin).toHaveBeenCalledWith('non-existent-strategy');
    
    // Verify the strategy falls back to ConsolidatedReviewStrategy
    expect(strategy).toBeInstanceOf(ConsolidatedReviewStrategy);
  });
});