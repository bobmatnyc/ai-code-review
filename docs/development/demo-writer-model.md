# Writer Model Feature Demo

The `--writer-model` feature allows you to use different models for analysis and report writing.

## How It Works

1. **Analysis Phase**: Uses the primary model (expensive, powerful)
2. **Consolidation Phase**: Uses the writer model (cheaper, faster)

## Example Usage

```bash
# Use Claude Opus for deep code analysis, Haiku for report writing
ai-code-review src --model anthropic:claude-3-opus --writer-model anthropic:claude-3-haiku

# Use GPT-4 for analysis, GPT-4o-mini for consolidation  
ai-code-review src --model openai:gpt-4 --writer-model openai:gpt-4o-mini

# Or set via environment variables
export AI_CODE_REVIEW_MODEL=anthropic:claude-3-opus
export AI_CODE_REVIEW_WRITER_MODEL=anthropic:claude-3-haiku
ai-code-review src
```

## Log Output

When configured, you'll see:
```
[INFO] Using anthropic API with model: claude-3-opus
[INFO] Using writer model for consolidation: anthropic:claude-3-haiku
```

## Benefits

- **Cost Savings**: 10-20x cheaper for consolidation
- **Performance**: Faster report generation
- **Flexibility**: Best tool for each job

## Note on o3 Model

The o3 model is very new and may not be available to all users yet. If you see errors with o3, try using other models like:
- `openai:gpt-4o`
- `openai:gpt-4`
- `anthropic:claude-3-opus`
- `gemini:gemini-1.5-pro`