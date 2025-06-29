/**
 * @fileoverview Tests for file discovery parameter validation
 */

import { discoverFiles } from '../../core/fileDiscovery';
import * as fileSystem from '../../utils/fileSystem';
import * as fileFilters from '../../utils/fileFilters';
import * as smartFileSelector from '../../utils/smartFileSelector';
import { vi } from 'vitest';

// Mock the dependencies
vi.mock('../../utils/fileSystem');
vi.mock('../../utils/fileFilters');
vi.mock('../../utils/smartFileSelector');
vi.mock('../../utils/logger', () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };
  return {
    __esModule: true,
    default: mockLogger
  };
});

describe('fileDiscovery parameter validation', () => {
  const mockProjectPath = '/test/project';
  
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default mocks
    (fileSystem.pathExists as any).mockResolvedValue(true);
    (fileSystem.isDirectory as any).mockResolvedValue(false);
    (fileSystem.isPathWithinCwd as any).mockReturnValue(true);
    (fileFilters.loadGitignorePatterns as any).mockResolvedValue([]);
    (fileFilters.getFilesToReview as any).mockResolvedValue(['test.ts']);
    (smartFileSelector.applySmartFiltering as any).mockResolvedValue(['test.ts']);
  });
  
  describe('validateTargetParameter', () => {
    it('should throw error for parameter with = format', async () => {
      await expect(discoverFiles('type=performance', mockProjectPath))
        .rejects.toThrow(/Invalid parameter format: 'type=performance'/);
    });
    
    it('should provide helpful suggestion for known options with =', async () => {
      await expect(discoverFiles('type=performance', mockProjectPath))
        .rejects.toThrow(/Did you mean: --type performance/);
    });
    
    it('should provide examples in error message', async () => {
      await expect(discoverFiles('type=performance', mockProjectPath))
        .rejects.toThrow(/Example usage:/);
    });
    
    it('should handle unknown parameters with =', async () => {
      await expect(discoverFiles('foo=bar', mockProjectPath))
        .rejects.toThrow(/Parameters should use '--' prefix, not '=' format/);
    });
    
    it('should throw error for options without -- prefix', async () => {
      await expect(discoverFiles('type', mockProjectPath))
        .rejects.toThrow(/'type' looks like an option but is missing '--' prefix/);
    });
    
    it('should provide suggestion for missing -- prefix', async () => {
      await expect(discoverFiles('debug', mockProjectPath))
        .rejects.toThrow(/Did you mean: --debug/);
    });
    
    it('should handle single dash options', async () => {
      await expect(discoverFiles('-type', mockProjectPath))
        .rejects.toThrow(/Options should use double dashes/);
    });
    
    it('should not throw error for valid file paths', async () => {
      // Should not throw validation error for valid paths
      await expect(discoverFiles('src/index.ts', mockProjectPath))
        .resolves.toEqual(['test.ts']);
    });
    
    it('should not throw error for paths with equals in them', async () => {
      // File paths that legitimately contain = should be allowed
      await expect(discoverFiles('src/file=name.ts', mockProjectPath))
        .resolves.toEqual(['test.ts']);
    });
    
    it('should handle multiple equals signs correctly', async () => {
      const error = await discoverFiles('type=performance=high', mockProjectPath)
        .catch(e => e);
      expect(error.message).toContain("Did you mean: --type performance=high");
    });
  });
  
  describe('error message quality', () => {
    it('should include help command suggestion', async () => {
      await expect(discoverFiles('type=performance', mockProjectPath))
        .rejects.toThrow(/Run 'ai-code-review --help' for more options/);
    });
    
    it('should show common usage patterns', async () => {
      await expect(discoverFiles('foo=bar', mockProjectPath))
        .rejects.toThrow(/Common usage patterns:/);
    });
    
    it('should show example for specific option', async () => {
      const error = await discoverFiles('output=json', mockProjectPath)
        .catch(e => e);
      expect(error.message).toContain('ai-code-review --output json');
    });
  });
});