# Test Projects for AI Code Review

This directory contains sample project structures that are used for testing framework detection capabilities and other features of the AI Code Review tool.

## Purpose

These test projects serve the following purposes:

1. **Framework Detection Testing**: Sample projects with different frameworks to test automatic framework detection
2. **Prompt Template Testing**: Real-world examples to test language and framework-specific prompts
3. **Integration Testing**: Test fixtures for the automated test suite
4. **Demo Material**: Example projects to demonstrate the tool's capabilities

## Directory Structure

- `node/` - JavaScript/TypeScript projects
  - `react-app/` - Sample React application
  - `angular-app/` - Sample Angular application
  - `vue-app/` - Sample Vue.js application
  - `express-app/` - Sample Express.js backend
- `python/` - Python projects
  - `django-app/` - Sample Django application
  - `flask-app/` - Sample Flask application (default)
- `php/` - PHP projects
  - `laravel-app/` - Sample Laravel application
  - `wordpress/` - Sample WordPress theme/plugin
- `ruby/` - Ruby projects
  - `rails-app/` - Sample Ruby on Rails application

## Note for Contributors

These projects are intentionally minimal and don't represent full applications. They contain just enough structure and files to be identifiable by the framework detection system.

**Do not:**
- Run linting on these files (they are excluded in the project configuration)
- Attempt to compile or run these applications (they are incomplete)
- Include sensitive or proprietary code in these examples

The test projects are excluded from compilation and linting through entries in `.gitignore`, `.eslintignore` and `tsconfig.json`.

## Usage in Tests

To use these test projects in unit tests:

```typescript
import { detectFramework } from '../utils/detection';

describe('Framework Detection', () => {
  it('should detect React framework', async () => {
    const result = await detectFramework('/path/to/test-projects/node/react-app');
    expect(result.framework).toBe('react');
  });
});
```