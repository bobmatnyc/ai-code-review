# CLI Usage: Token Counting and Multi-Pass Reviews

This guide covers the command-line usage for token counting and multi-pass review features.

## Basic Commands

### Estimating Token Usage

To analyze token usage and estimate costs without performing a review:

```bash
pnpm run dev code-review project-name path/to/files --estimate
```

This will:
1. Count tokens in all files
2. Estimate input/output token usage
3. Calculate approximate API costs
4. Recommend whether a multi-pass review is needed

### Using Multi-Pass Mode Explicitly

The system automatically enables multi-pass mode when needed, but you can activate it explicitly:

```bash
pnpm run dev code-review project-name path/to/files --multiPass
```

### Adjusting Context Maintenance

Control how much context is preserved between passes:

```bash
pnpm run dev code-review project-name path/to/files --contextMaintenanceFactor=0.2
```

Valid values are between 0 and 1:
- Lower values (e.g., 0.1) preserve less context but allow more code per pass
- Higher values (e.g., 0.3) preserve more context but require more passes

Default: 0.15 (15% of context window reserved for context maintenance)

## Output Options

### JSON Output

Get token analysis or multi-pass review results in JSON format:

```bash
pnpm run dev code-review project-name path/to/files --multiPass --output=json
```

### Quiet Mode

Suppress progress display during multi-pass reviews:

```bash
pnpm run dev code-review project-name path/to/files --multiPass --quiet
```

## Token Analysis with Different Models

Specify which model to use for token analysis:

```bash
pnpm run dev code-review project-name path/to/files --estimate --model=gemini:gemini-1.5-pro
```

```bash
pnpm run dev code-review project-name path/to/files --estimate --model=anthropic:claude-3-opus
```

## Examples

### Estimate Token Usage for a Single File

```bash
pnpm run dev code-review project-name src/index.ts --estimate
```

### Estimate Token Usage for a Directory

```bash
pnpm run dev code-review project-name src/ --estimate
```

### Perform Multi-Pass Review with High Context Maintenance

Good for complex codebases with many interdependencies:

```bash
pnpm run dev code-review project-name src/ --multiPass --contextMaintenanceFactor=0.25
```

### Perform Multi-Pass Review with Low Context Maintenance

Good for simple codebases with minimal dependencies:

```bash
pnpm run dev code-review project-name src/ --multiPass --contextMaintenanceFactor=0.1
```

### Perform Quick-Fixes Review with Multi-Pass Mode

```bash
pnpm run dev code-review project-name src/ --type=quick-fixes --multiPass
```

### Perform Architectural Review with Multi-Pass Mode

```bash
pnpm run dev code-review project-name src/ --type=architectural --multiPass
```

## Tips

1. Always run `--estimate` first on large codebases to understand token usage and costs
2. When dealing with very large codebases, focus on specific directories or use file filters
3. Use appropriate context maintenance factors based on code complexity:
   - Simple scripts: 0.1
   - Standard web apps: 0.15 (default)
   - Complex systems with many interdependencies: 0.2-0.25
4. To improve performance, run against specific file types:
   - `pnpm run dev code-review project-name "src/**/*.ts" --multiPass`