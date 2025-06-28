# Quick Start Guide

Get up and running with AI Code Review in under 5 minutes.

## Prerequisites

- Node.js 18+ 
- pnpm 8+ (recommended) or npm
- At least one API key (see [API Keys](#api-keys) below)

## Installation

### Global Installation (Recommended)

```bash
# Install globally with pnpm
pnpm add -g @bobmatnyc/ai-code-review

# Or with npm
npm install -g @bobmatnyc/ai-code-review
```

### Local Installation

```bash
# Add to your project with pnpm
pnpm add -D @bobmatnyc/ai-code-review

# Or with npm
npm install --save-dev @bobmatnyc/ai-code-review
```

## API Keys

You need at least one API key. Choose the option that works best for you:

### Option 1: Google Gemini (Recommended for beginners)
1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Create a free API key
3. Add to your environment:
   ```bash
   export AI_CODE_REVIEW_GOOGLE_API_KEY=your_key_here
   ```

### Option 2: OpenRouter (Most model options)
1. Go to [OpenRouter](https://openrouter.ai/)
2. Sign up and get an API key
3. Add to your environment:
   ```bash
   export AI_CODE_REVIEW_OPENROUTER_API_KEY=your_key_here
   ```

### Option 3: Direct Provider Access
- **Anthropic**: [Console](https://console.anthropic.com/) → `AI_CODE_REVIEW_ANTHROPIC_API_KEY`
- **OpenAI**: [Platform](https://platform.openai.com/) → `AI_CODE_REVIEW_OPENAI_API_KEY`

## Environment Setup

Create a `.env.local` file in your project root:

```bash
# Choose one or more:
AI_CODE_REVIEW_GOOGLE_API_KEY=your_google_key
AI_CODE_REVIEW_OPENROUTER_API_KEY=your_openrouter_key
AI_CODE_REVIEW_ANTHROPIC_API_KEY=your_anthropic_key
AI_CODE_REVIEW_OPENAI_API_KEY=your_openai_key

# Optional: Set default model
AI_CODE_REVIEW_MODEL=gemini:gemini-1.5-pro
```

## First Review

### Quick Fixes Review (Default)
```bash
# Review current directory
ai-code-review

# Review specific file
ai-code-review src/index.ts

# Review specific directory
ai-code-review src/
```

### Other Review Types
```bash
# Security review
ai-code-review security .

# Architectural review
ai-code-review architectural .

# Performance review
ai-code-review performance .
```

## Common Commands

```bash
# Check available models
ai-code-review --listmodels

# Estimate cost before running
ai-code-review --estimate .

# Interactive mode (recommended for beginners)
ai-code-review --interactive .

# Get help
ai-code-review --help
```

## Output

Reviews are saved to `ai-code-review-docs/` directory by default.

Example output file: `quick-fixes-review-src-2025-06-28.md`

## Troubleshooting

### "No API key found"
- Check your `.env.local` file exists
- Verify the API key format: `AI_CODE_REVIEW_*_API_KEY`
- Make sure the file is in your current working directory

### "Command not found"
- **Global install**: Restart your terminal
- **Local install**: Use `pnpm exec ai-code-review` or `npx ai-code-review`

### "Model not available"
- Run `ai-code-review --listmodels` to see available models
- Check your API key is valid for the provider

## Next Steps

1. **Read the full documentation**: [README.md](../README.md)
2. **Configure advanced options**: [Configuration Guide](CONFIGURATION_MIGRATION.md)
3. **Set up your development workflow**: [Workflow Guide](WORKFLOW.md)
4. **Explore different review types**: Try `architectural`, `security`, `performance`

## Getting Help

- **Documentation**: Check the `docs/` directory
- **Issues**: [GitHub Issues](https://github.com/bobmatnyc/ai-code-review/issues)
- **Examples**: See `docs/examples/` for common use cases

## Pro Tips

1. **Start with interactive mode**: `--interactive` helps you understand the output
2. **Use cost estimation**: `--estimate` before running expensive reviews
3. **Try different models**: Each has different strengths
4. **Review incrementally**: Focus on specific files or directories
5. **Save API costs**: Use cost-optimized models for large codebases

---

**That's it!** You should now be able to run your first AI code review. 

For more advanced usage, see the [full documentation](../README.md).
