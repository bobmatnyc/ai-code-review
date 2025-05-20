# Smart Project File Selection

## Overview

AI Code Review now uses project configuration files to guide smart file selection. This ensures that the review focuses on the most relevant files for your project:

1. For TypeScript projects, files are filtered based on `tsconfig.json` configuration
2. All projects can leverage `.gitignore` patterns to exclude files
3. Projects with ESLint can use `.eslintignore` to further refine selection

This ensures that the review focuses on files that are actually part of your working code, rather than looking at all files in the directory.

## Features

### Configuration File Support

- **Multiple File Types**: Supports `.gitignore`, `.eslintignore`, and `tsconfig.json`
- **Automatic Detection**: The tool automatically detects these files in the project root
- **Smart Filtering**: Files are filtered based on patterns defined in these configuration files
- **Path Matching**: Implements proper glob pattern matching for all configuration types
- **Performance Improvement**: Reduces the number of files sent to the AI model by focusing only on relevant files

### TypeScript-Specific Features

- **TypeScript Project Detection**: Automatically detects TypeScript projects via `tsconfig.json`
- **TypeScript Configuration Support**: Respects `include`, `exclude`, and `files` fields in tsconfig.json
- **Compiler-Aware**: Aligns file selection with the TypeScript compiler's own rules

## How It Works

The file selection process follows a multi-stage filtering approach:

1. **Basic Discovery**: Scan the project directory for files with supported extensions
2. **Ignore Patterns**: Apply patterns from `.gitignore` and `.eslintignore` to exclude files
3. **Project-Specific Filtering**:
   - For TypeScript projects, apply `tsconfig.json` patterns
   - Only files that pass all filtering stages are sent for review

### .gitignore and .eslintignore Processing

1. The tool automatically checks for these files in the project root
2. Patterns are read and combined (removing duplicates)
3. Standard glob pattern matching is used to exclude files that match any pattern
4. This happens before any project-specific filtering

### TypeScript Project Handling

1. When a `tsconfig.json` file is found, it's parsed to extract:
   - `include` patterns (which files to include)
   - `exclude` patterns (which files to exclude)
   - Explicit `files` list (specific files to include)
2. Files are matched against these patterns to determine if they're part of the TypeScript project
3. Only files that match TypeScript project configuration are sent for review

## Benefits

- **More Accurate Reviews**: By focusing on files that are actual part of the compilation process, reviews better reflect how the code will be used in production.
- **Faster Analysis**: Reduces the number of irrelevant files sent to the AI model, making the review process faster.
- **Respects Your Project Structure**: Aligns with your existing project configuration rather than making assumptions.

## Example

If your `tsconfig.json` looks like this:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "outDir": "dist",
    // other options...
  },
  "include": ["src/**/*"],
  "exclude": ["**/*.test.ts", "node_modules", "dist"]
}
```

Then the tool will:
- Only include files in the `src` directory
- Exclude any test files
- Exclude files in `node_modules` and `dist` directories

This results in a much more focused and relevant code review.