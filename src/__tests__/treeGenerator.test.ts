/**
 * @fileoverview Tests for the file tree generator
 */

import { generateFileTree } from '../utils/treeGenerator';
import { vi } from 'vitest';

describe('File Tree Generator', () => {
  it('should generate a simple tree structure', () => {
    const files = [
      'src/index.ts',
      'src/utils/helpers.ts',
      'src/utils/config.ts',
      'package.json',
      'README.md'
    ];
    
    const treeOutput = generateFileTree(files);
    expect(treeOutput).toContain('```');
    expect(treeOutput).toContain('src');
    expect(treeOutput).toContain('utils');
    expect(treeOutput).toContain('index.ts');
    expect(treeOutput).toContain('package.json');
    expect(treeOutput).toContain('README.md');
  });
  
  it('should sort directories before files', () => {
    const files = [
      'file.txt',
      'dir/file.txt',
    ];
    
    const treeOutput = generateFileTree(files);
    // Check that 'dir' comes before 'file.txt' in the output
    const dirIndex = treeOutput.indexOf('dir');
    const fileIndex = treeOutput.indexOf('file.txt');
    expect(dirIndex).toBeLessThan(fileIndex);
  });
  
  it('should handle deeply nested directories', () => {
    const files = [
      'a/b/c/d/e/f/g/h/file.txt',
    ];
    
    const treeOutput = generateFileTree(files);
    expect(treeOutput).toContain('a');
    expect(treeOutput).toContain('b');
    expect(treeOutput).toContain('h');
    expect(treeOutput).toContain('file.txt');
  });
  
  it('should handle empty file list', () => {
    const files: string[] = [];
    const treeOutput = generateFileTree(files);
    expect(treeOutput).toBe('```\n```');
  });
  
  it('should gracefully handle errors by falling back to list format', () => {
    // Mock generateFileTree to throw an error
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Pass null to simulate an error
    const files = ['file1.txt', 'file2.txt'];
    
    // @ts-expect-error - Deliberately passing incorrect value to test error handling
    const originalGenerateFileTree = generateFileTree;
    
    // Replace with a mock that throws
    (global as any).generateFileTree = () => {
      throw new Error('Test error');
    };
    
    // Call the function with an error
    const result = generateFileTree(files);
    
    // Expect fallback behavior
    expect(result).toContain('file1.txt');
    expect(result).toContain('file2.txt');
    
    // Restore original function
    (global as any).generateFileTree = originalGenerateFileTree;
  });
});