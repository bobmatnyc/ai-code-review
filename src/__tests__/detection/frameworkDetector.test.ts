/**
 * @fileoverview Tests for framework detection functionality
 */

import path from 'path';
import { detectFramework } from '../../utils/detection';

// Get the absolute path to test-projects directory
const testProjectsPath = path.resolve(__dirname, '../../../tests/integration-tests/test-projects');

describe('Framework Detection', () => {
  
  // Test detection for TypeScript/JavaScript frameworks
  describe('TypeScript/JavaScript Frameworks', () => {
    it('should detect React framework', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'node/react-app'));
      expect(result).not.toBeNull();
      expect(result?.language).toBe('typescript');
      expect(result?.framework).toBe('react');
      expect(result?.confidence).toBeGreaterThan(0.6);
    });

    it('should detect Angular framework', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'node/angular-app'));
      expect(result).not.toBeNull();
      expect(result?.language).toBe('typescript');
      expect(result?.framework).toBe('angular');
      expect(result?.confidence).toBeGreaterThan(0.6);
    });

    it('should detect Vue.js framework', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'node/vue-app'));
      expect(result).not.toBeNull();
      expect(result?.language).toBe('typescript');
      expect(result?.framework).toBe('vue');
      expect(result?.confidence).toBeGreaterThan(0.6);
    });

    it('should detect Express.js framework', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'node/express-app'));
      expect(result).not.toBeNull();
      expect(result?.language).toBe('typescript');
      expect(result?.framework).toBe('express');
      expect(result?.confidence).toBeGreaterThan(0.6);
    });
  });

  // Test detection for Python frameworks
  describe('Python Frameworks', () => {
    it('should detect Django framework', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'python/django-app'));
      expect(result).not.toBeNull();
      expect(result?.language).toBe('python');
      expect(result?.framework).toBe('django');
      expect(result?.confidence).toBeGreaterThan(0.6);
    });

    it('should detect Flask framework in Python project', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'python'));
      expect(result).not.toBeNull();
      expect(result?.language).toBe('python');
      expect(result?.framework).toBe('flask');
    });
  });

  // Test detection for PHP frameworks
  describe('PHP Frameworks', () => {
    it('should detect Laravel framework', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'php/laravel-app'));
      expect(result).not.toBeNull();
      expect(result?.language).toBe('php');
      expect(result?.framework).toBe('laravel');
      expect(result?.confidence).toBeGreaterThan(0.6);
    });

    it('should detect PHP with Laravel framework', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'php'));
      expect(result).not.toBeNull();
      expect(result?.language).toBe('php');
      expect(result?.framework).toBe('laravel');
    });
  });

  // Test detection for Ruby frameworks
  describe('Ruby Frameworks', () => {
    it('should detect Ruby on Rails framework', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'ruby'));
      expect(result).not.toBeNull();
      expect(result?.language).toBe('ruby');
      expect(result?.framework).toBe('rails');
      expect(result?.confidence).toBeGreaterThan(0.6);
    });
  });

  // Test error handling
  describe('Error Handling', () => {
    it('should handle non-existent directories gracefully', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'nonexistent-directory'));
      expect(result).toBeNull();
    });
  });

  // Test confidence scoring
  describe('Confidence Scoring', () => {
    it('should return proper confidence scores', async () => {
      const result = await detectFramework(path.join(testProjectsPath, 'node/react-app'));
      expect(result).not.toBeNull();
      expect(result?.confidence).toBeGreaterThanOrEqual(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
    });
  });
});