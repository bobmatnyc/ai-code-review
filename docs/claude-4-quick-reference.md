# Claude 4 Models - Quick Reference

## 🚀 Quick Start

```bash
# Install or update
npm install -g @bobmatnyc/ai-code-review@latest

# Set your API key
export AI_CODE_REVIEW_ANTHROPIC_API_KEY=your-api-key

# Use Claude 4 Opus (powerful, expensive)
export AI_CODE_REVIEW_MODEL=anthropic:claude-4-opus
ai-code-review src/

# Use Claude 4 Sonnet (balanced, economical)
export AI_CODE_REVIEW_MODEL=anthropic:claude-4-sonnet
ai-code-review src/
```

## 💰 Cost Calculator

### Single File Review
| Model | ~1K tokens input | Estimated Cost |
|-------|------------------|----------------|
| Claude 4 Opus | 2.5K total tokens | ~$0.18 |
| Claude 4 Sonnet | 2.5K total tokens | ~$0.04 |

### Small Project (50 files, ~80K tokens)
| Model | Review Type | Estimated Cost |
|-------|-------------|----------------|
| Claude 4 Opus | Single-pass | ~$6.00 |
| Claude 4 Sonnet | Single-pass | ~$1.20 |

### Medium Project (200 files, ~350K tokens)
| Model | Review Type | Estimated Cost |
|-------|-------------|----------------|
| Claude 4 Opus | Multi-pass (3) | ~$27.71 |
| Claude 4 Sonnet | Multi-pass (3) | ~$5.54 |

## 🎯 When to Use Each Model

### Use Claude 4 Opus for:
- 🏗️ Architectural reviews (`--type architectural`)
- 🔒 Security audits (`--type security`)
- 🧩 Complex refactoring suggestions
- 📊 Comprehensive code analysis
- 🎯 Mission-critical code reviews

### Use Claude 4 Sonnet for:
- ✅ Quick fixes (`--type quick-fixes`)
- 📝 Routine code reviews
- 🔄 CI/CD pipeline checks
- 💡 Best practices suggestions
- 🚀 Performance reviews (`--type performance`)

## 📋 Common Commands

```bash
# Estimate cost before running
ai-code-review src/ --model anthropic:claude-4-opus --estimate

# Quick fixes with Sonnet (most economical)
ai-code-review src/ --model anthropic:claude-4-sonnet --type quick-fixes

# Architectural review with Opus
ai-code-review src/ --model anthropic:claude-4-opus --type architectural

# Skip confirmation for multi-pass reviews
ai-code-review large-project/ --model anthropic:claude-4-sonnet --no-confirm

# Review only specific files
ai-code-review src/utils/ --model anthropic:claude-4-sonnet

# Include test files
ai-code-review src/ --model anthropic:claude-4-sonnet --include-tests
```

## 💡 Cost-Saving Tips

1. **Start with estimates**: Always use `--estimate` for large codebases
2. **Use Sonnet by default**: 5x cheaper than Opus
3. **Target specific directories**: Don't review the entire codebase
4. **Choose appropriate review types**: `quick-fixes` generates less output
5. **Enable caching**: Use `--use-cache` for iterative reviews
6. **Exclude unnecessary files**: Tests, docs, generated code

## ⚡ Performance Tips

### Context Window (200K tokens)
- **Fits in single pass**: Up to ~150K tokens of code
- **Needs 2 passes**: 150K-300K tokens
- **Needs 3+ passes**: 300K+ tokens

### Optimize for Speed
```bash
# Fast review with Sonnet
ai-code-review src/ \
  --model anthropic:claude-4-sonnet \
  --type quick-fixes \
  --no-confirm

# Skip project docs for speed
ai-code-review src/ \
  --model anthropic:claude-4-sonnet \
  --no-include-project-docs
```

## 🔧 Environment Setup

Create a `.env.local` file:
```env
# Required for Claude models
AI_CODE_REVIEW_ANTHROPIC_API_KEY=sk-ant-api03-...

# Set default model
AI_CODE_REVIEW_MODEL=anthropic:claude-4-sonnet

# Optional: Set log level
AI_CODE_REVIEW_LOG_LEVEL=info
```

## 📊 Model Comparison

| Feature | Claude 4 Opus | Claude 4 Sonnet | Claude 3.5 Sonnet |
|---------|---------------|-----------------|-------------------|
| Context | 200K tokens | 200K tokens | 200K tokens |
| Input Price | $15/1M | $3/1M | $3/1M |
| Output Price | $75/1M | $15/1M | $15/1M |
| Best For | Complex analysis | Routine reviews | General use |
| Speed | Slower | Faster | Fastest |
| Quality | Highest | High | High |

## 🚨 Common Issues

### "Model not found" Error
```bash
# Check your model name
ai-code-review --listmodels | grep claude-4

# Correct format
export AI_CODE_REVIEW_MODEL=anthropic:claude-4-opus
```

### High Cost Warning
```bash
# Always estimate first
ai-code-review large-project/ --estimate

# Switch to Sonnet if too expensive
export AI_CODE_REVIEW_MODEL=anthropic:claude-4-sonnet
```

### API Key Issues
```bash
# Verify API key is set
echo $AI_CODE_REVIEW_ANTHROPIC_API_KEY

# Test connection
ai-code-review --test-api
```

---

**Remember**: Claude 4 Opus costs 5x more than Sonnet. Always start with Sonnet unless you need Opus's advanced capabilities!