# Project Language Auto-Detection Integration Guide

This document provides guidance on integrating the project language auto-detection feature into the AI Code Review tool.

## Overview

The language auto-detection system will:

1. Automatically detect the programming language based on project files and structure
2. Set appropriate default language settings without requiring manual flags
3. Support multiple languages including Python, PHP, TypeScript, and JavaScript
4. Provide confidence levels for each detection

## Integration Steps

### 1. Add Detection Module

The `detectProjectType.ts` module provides the core detection functionality. This should be added to the project's src directory.

```bash
# Copy the detection module to the proper location
cp enhancement/detectProjectType.ts src/utils/
```

### 2. Update CLI Argument Parser

Modify the CLI argument parser to use auto-detection when no language is specified:

```typescript
// In src/cli/argumentParser.ts

// Import the detection function
import { detectProjectType } from '../utils/detectProjectType';

// Inside the parseArguments function, before returning the args
// Add this check for automatic language detection
if (!args.language) {
  try {
    const targetPath = path.resolve(process.cwd(), args.target || '.');
    const detection = await detectProjectType(targetPath);
    if (detection && detection.confidence !== 'low') {
      logger.info(
        `Auto-detected project language: ${detection.language}` +
        (detection.projectType ? ` (${detection.projectType})` : '')
      );
      args.language = detection.language;
    }
  } catch (error) {
    // Just log and continue with default
    logger.debug(`Language detection error: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### 3. Update Help Text and Documentation

Update the CLI help text to mention auto-detection:

```typescript
// In the yargs options for language
.option('language', {
  alias: 'l',
  choices: VALID_LANGUAGES as readonly ProgrammingLanguage[],
  default: 'typescript' as ProgrammingLanguage,
  describe: 'Programming language for the code review (auto-detected if not specified)'
})
```

### 4. Add Tests

Create tests for the detection functionality:

```typescript
// In a new file: src/__tests__/detectProjectType.test.ts

import { detectProjectType } from '../utils/detectProjectType';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';

describe('detectProjectType', () => {
  let tempDir: string;
  
  beforeEach(async () => {
    // Create a temporary directory for each test
    tempDir = path.join(os.tmpdir(), `test-project-${Math.random().toString(36).substring(2)}`);
    await fs.mkdir(tempDir, { recursive: true });
  });
  
  afterEach(async () => {
    // Clean up after each test
    await fs.rm(tempDir, { recursive: true, force: true });
  });
  
  test('should detect Python project with requirements.txt', async () => {
    // Create test files
    await fs.writeFile(path.join(tempDir, 'requirements.txt'), 'flask==2.0.0');
    
    const result = await detectProjectType(tempDir);
    
    expect(result.language).toBe('python');
    expect(result.confidence).toBe('high');
  });
  
  test('should detect PHP project with composer.json', async () => {
    // Create test files
    await fs.writeFile(path.join(tempDir, 'composer.json'), '{"require": {}}');
    
    const result = await detectProjectType(tempDir);
    
    expect(result.language).toBe('php');
    expect(result.confidence).toBe('high');
  });
  
  // Add more tests for other project types
});
```

### 5. Update CHANGELOG and Documentation

Update the changelog and documentation to reflect this new feature:

```markdown
## What's New in v2.X.0

- **Automatic Language Detection**: The tool now automatically detects the programming language based on project files and structure, removing the need to specify --language manually
```

## Implementation Notes

### Project Signatures

The detection system uses "project signatures" to identify the language and project type. These are defined patterns of files and directories that are characteristic of particular languages or frameworks.

The detection process:

1. Checks for signature matches in order of specificity (most specific first)
2. Runs optional additional checks for complex conditions
3. Falls back to statistical detection based on file extensions if no signature matches

### Confidence Levels

Each detection includes a confidence level:

- **High**: Strong evidence from project files (e.g., requirements.txt for Python)
- **Medium**: Reasonable evidence but not definitive
- **Low**: Limited evidence, potentially ambiguous

### Handling Multi-Language Projects

For projects with multiple languages, the system:

1. Identifies the primary language based on project structure and file counts
2. Records additional languages present in significant quantities
3. Makes a best-effort determination based on available evidence

## Testing

Test the integration thoroughly with different project types:

```bash
# Test with a Python project
cd /path/to/python/project
ai-code-review .

# Test with a PHP project
cd /path/to/php/project
ai-code-review .

# Verify manual override still works
cd /path/to/any/project
ai-code-review . --language python
```