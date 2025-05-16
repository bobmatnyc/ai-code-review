/**
 * @fileoverview Tests for projectTypeDetector.
 *
 * This module provides tests for the automatic language detection feature.
 */

import { detectProjectType } from '../../utils/detection';
import path from 'path';
import fs from 'fs/promises';
//import os from 'os'; // Not used in this file

describe('detectProjectType', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for each test under project workspace
    tempDir = path.join(process.cwd(), 'tmp', `test-project-${Math.random().toString(36).substring(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up after each test
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (err) {
      console.error('Failed to clean up temp directory:', err);
    }
  });

  describe('Python detection', () => {
    test('should detect Python project with requirements.txt', async () => {
      // Create test files
      await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0');
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('python');
      expect(result.confidence).toBe('high');
    });
    
    test('should detect Python project with setup.py', async () => {
      // Create test files
      await fs.writeFile(
        path.join(tempDir, 'setup.py'), 
        'from setuptools import setup\nsetup(name="test")'
      );
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('python');
      expect(result.confidence).toBe('high');
    });
    
    test('should detect Python project with pyproject.toml', async () => {
      // Create test files
      await fs.writeFile(path.join(tempDir, 'pyproject.toml'), '[build-system]\nrequires = ["setuptools"]');
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('python');
      expect(result.confidence).toBe('high');
    });
    
    test('should detect Django project', async () => {
      // Create test files
      await fs.writeFile(
        path.join(tempDir, 'manage.py'), 
        '#!/usr/bin/env python\nfrom django.core.management import execute_from_command_line'
      );
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('python');
      expect(result.confidence).toBe('high');
      expect(result.projectType).toBe('Django');
    });
    
    test('should detect Python by file extension with low confidence', async () => {
      // Create test files
      await fs.writeFile(
        path.join(tempDir, 'script.py'), 
        'print("Hello, world!")'
      );
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('python');
      // The confidence might be low since we're only looking at file extensions
      expect(['low', 'medium']).toContain(result.confidence);
    });
  });

  describe('PHP detection', () => {
    test('should detect PHP project with composer.json', async () => {
      // Create test files
      await fs.writeFile(path.join(tempDir, 'composer.json'), '{"require": {}}');
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('php');
      expect(result.confidence).toBe('high');
    });
    
    test('should detect Laravel project', async () => {
      // Create test files
      await fs.writeFile(path.join(tempDir, 'artisan'), '#!/usr/bin/env php');
      await fs.mkdir(path.join(tempDir, 'app', 'Http', 'Controllers'), { recursive: true });
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('php');
      expect(result.confidence).toBe('high');
      expect(result.projectType).toBe('Laravel');
    });
    
    test('should detect WordPress project', async () => {
      // Create test files
      await fs.writeFile(
        path.join(tempDir, 'wp-config.php'), 
        '<?php define("DB_NAME", "wordpress");'
      );
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('php');
      expect(result.confidence).toBe('high');
      expect(result.projectType).toBe('WordPress');
    });
    
    test('should detect PHP by file extension with low confidence', async () => {
      // Create test files
      await fs.writeFile(
        path.join(tempDir, 'index.php'), 
        '<?php echo "Hello, world!";'
      );
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('php');
      // The confidence might be low since we're only looking at file extensions
      expect(['low', 'medium']).toContain(result.confidence);
    });
  });

  describe('TypeScript detection', () => {
    test('should detect TypeScript project with tsconfig.json', async () => {
      // Create test files
      await fs.writeFile(path.join(tempDir, 'tsconfig.json'), '{"compilerOptions": {}}');
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('typescript');
      expect(result.confidence).toBe('high');
    });
    
    test('should detect TypeScript project with package.json containing typescript', async () => {
      // Create test files
      await fs.writeFile(
        path.join(tempDir, 'package.json'), 
        '{"dependencies": {"typescript": "^4.0.0"}}'
      );
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('typescript');
      expect(result.confidence).toBe('high');
    });
    
    test('should detect TypeScript by file extension with medium confidence', async () => {
      // Create test files
      await fs.writeFile(
        path.join(tempDir, 'app.ts'), 
        'console.log("Hello, world!");'
      );
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('typescript');
      // This should have medium confidence since it's just based on file extension
      expect(result.confidence).toBe('medium');
    });
  });

  describe('JavaScript detection', () => {
    test('should detect JavaScript project with package.json and no TypeScript', async () => {
      // Create test files
      await fs.writeFile(
        path.join(tempDir, 'package.json'), 
        '{"dependencies": {"react": "^17.0.0"}}'
      );
      await fs.writeFile(
        path.join(tempDir, 'index.js'), 
        'console.log("Hello, world!");'
      );
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('javascript');
      expect(result.confidence).toBe('high');
    });
    
    test('should detect JavaScript by file extension with low confidence', async () => {
      // Create test files
      await fs.writeFile(
        path.join(tempDir, 'script.js'), 
        'console.log("Hello, world!");'
      );
      
      const result = await detectProjectType(tempDir);
      
      expect(result.language).toBe('javascript');
      // The confidence might be low since we're only looking at file extensions
      expect(['low', 'medium']).toContain(result.confidence);
    });
  });

  describe('Fallback behavior', () => {
    test('should fallback to statistical detection', async () => {
      // Create various files
      await fs.writeFile(path.join(tempDir, 'file1.py'), 'print("Hello")');
      await fs.writeFile(path.join(tempDir, 'file2.py'), 'print("World")');
      await fs.writeFile(path.join(tempDir, 'file3.py'), 'print("Python")');
      await fs.writeFile(path.join(tempDir, 'file4.py'), 'print("Rules")');
      await fs.writeFile(path.join(tempDir, 'file1.js'), 'console.log("JS")');
      
      const result = await detectProjectType(tempDir);
      
      // Should choose Python based on file count
      expect(result.language).toBe('python');
      // Accept either medium or low confidence since implementation might vary
      expect(['medium', 'low']).toContain(result.confidence);
    });
    
    test('should default to typescript with empty directory', async () => {
      const result = await detectProjectType(tempDir);
      
      // Should default to typescript for empty directories
      expect(result.language).toBe('typescript');
      expect(result.confidence).toBe('low');
    });
    
    test('should handle multiple languages and detect additional languages', async () => {
      // Create a mixed project with multiple languages
      await fs.writeFile(path.join(tempDir, 'tsconfig.json'), '{}'); // TypeScript marker
      
      // Create multiple files of different types
      await fs.mkdir(path.join(tempDir, 'src'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'src', 'index.ts'), 'console.log("TS");');
      await fs.writeFile(path.join(tempDir, 'src', 'app.ts'), 'export class App {}');
      
      await fs.mkdir(path.join(tempDir, 'scripts'), { recursive: true });
      await fs.writeFile(path.join(tempDir, 'scripts', 'build.py'), 'print("Build script")');
      await fs.writeFile(path.join(tempDir, 'scripts', 'deploy.py'), 'print("Deploy script")');
      await fs.writeFile(path.join(tempDir, 'scripts', 'test.py'), 'print("Test script")');
      await fs.writeFile(path.join(tempDir, 'scripts', 'utils.py'), 'print("Utils")');
      
      const result = await detectProjectType(tempDir);
      
      // Primary language should be TypeScript due to tsconfig.json
      expect(result.language).toBe('typescript');
      expect(result.confidence).toBe('high');
      
      // Should detect Python as an additional language
      expect(result.additionalLanguages).toBeDefined();
      expect(result.additionalLanguages).toContain('python');
    });
  });
});