# Coding Test Strategy - Quick Reference

## Basic Commands

```bash
# Simple evaluation
ai-code-review --strategy coding-test --config config.json

# With specific model
ai-code-review --strategy coding-test --config config.json --model gemini-1.5-pro

# Multiple formats
ai-code-review --strategy coding-test --config config.json --format json --output results.json
ai-code-review --strategy coding-test --config config.json --format markdown --output results.md
```

## Configuration Examples

### Minimal Configuration
```json
{
  "assignment": {
    "title": "Coding Challenge",
    "type": "coding-challenge",
    "difficulty": "mid"
  },
  "evaluation": {
    "criteria": {
      "correctness": 40,
      "codeQuality": 30,
      "testing": 20,
      "documentation": 10
    }
  }
}
```

### Recess POC Configuration
```bash
# Use the pre-built Recess configuration
ai-code-review --strategy coding-test --config examples/recess-poc-config.json
```

## CLI Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `--config` | Configuration file path | `--config config.json` |
| `--assignment-text` | Assignment description | `--assignment-text "Build a web app"` |
| `--difficulty-level` | Assignment difficulty | `--difficulty-level senior` |
| `--assessment-type` | Type of assessment | `--assessment-type take-home` |
| `--weight-correctness` | Correctness weight (0-100) | `--weight-correctness 40` |
| `--weight-code-quality` | Code quality weight | `--weight-code-quality 30` |
| `--weight-testing` | Testing weight | `--weight-testing 20` |
| `--feedback-level` | Feedback detail level | `--feedback-level comprehensive` |
| `--scoring-system` | Scoring system | `--scoring-system numeric` |
| `--max-score` | Maximum score | `--max-score 100` |
| `--passing-threshold` | Passing threshold | `--passing-threshold 70` |

## Output Formats

### JSON Structure
```json
{
  "metadata": {
    "strategy": "coding-test",
    "assessmentType": "take-home",
    "difficultyLevel": "senior"
  },
  "scores": {
    "overall": 85,
    "breakdown": {
      "correctness": 35,
      "codeQuality": 25,
      "testing": 15,
      "documentation": 10
    }
  },
  "evaluation": {
    "strengths": ["Well-structured code", "Good test coverage"],
    "weaknesses": ["Missing error handling", "Poor documentation"],
    "recommendations": ["Add try-catch blocks", "Improve README"]
  }
}
```

## Test Commands

### Validation
```bash
# Quick validation
node scripts/validate-recess-poc.js

# Full test suite
bash scripts/test-recess-poc.sh
```

### Manual Testing
```bash
# Test configuration loading
ai-code-review --strategy coding-test --config config.json --dry-run

# Test with file filtering
ai-code-review --strategy coding-test --config config.json --include "src/**/*.ts"
```

## Model Options

| Provider | Model ID | Best For |
|----------|----------|----------|
| Gemini | `gemini-1.5-pro` | Fast, comprehensive analysis |
| Claude | `claude-3-sonnet` | Detailed code quality review |
| OpenAI | `gpt-4` | Balanced evaluation |
| OpenRouter | `anthropic/claude-3-sonnet` | Alternative Claude access |

## Common Patterns

### Batch Evaluation
```bash
for project in submissions/*; do
  ai-code-review --strategy coding-test --config config.json --path "$project" --output "results/$(basename $project).md"
done
```

### CI/CD Integration
```yaml
- name: Evaluate Code
  run: ai-code-review --strategy coding-test --config .github/eval-config.json --format json --output results.json
```

### Comparison Across Models
```bash
ai-code-review --strategy coding-test --config config.json --model gemini-1.5-pro --output gemini-eval.md
ai-code-review --strategy coding-test --config config.json --model claude-3-sonnet --output claude-eval.md
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Configuration not found | Check file path, use absolute paths |
| API rate limits | Switch models, add delays |
| Large project timeout | Use `--include` to filter files |
| Invalid JSON config | Validate JSON syntax |
| Missing criteria weights | Ensure weights sum to 100 |

## File Patterns

```bash
# Include specific files
--include "src/**/*.ts,src/**/*.tsx,*.json"

# Exclude files
--exclude "node_modules/**,dist/**,*.test.ts"

# Focus on main application files
--include "app/**/*,lib/**/*,components/**/*"
```

## Environment Variables

```bash
export AI_CODE_REVIEW_MODEL="gemini-1.5-pro"
export AI_CODE_REVIEW_DEBUG="true"
export AI_CODE_REVIEW_OUTPUT_DIR="./evaluations"
```

---

**Quick Start:** `ai-code-review --strategy coding-test --config examples/recess-poc-config.json`