# Recess POC Guide: Coding Test Strategy Validation

This guide demonstrates how to use the AI Code Review tool's coding-test strategy to evaluate coding assignments using the actual Recess assignment as a proof of concept.

## Overview

The Recess POC demonstrates the coding-test strategy's capability to:
- **Evaluate real coding assignments** using standardized criteria
- **Replicate professional assessment processes** with configurable scoring
- **Generate comprehensive evaluation reports** in multiple formats
- **Support multiple AI models** for consistent evaluation
- **Detect potential AI usage patterns** in submitted code

## Quick Start

### 1. Prerequisites

Ensure you have:
- Node.js 16+ installed
- AI Code Review tool built and configured
- API keys for AI providers (Gemini, Claude, OpenAI)
- Access to the Recess project for testing

### 2. Basic Usage

```bash
# Navigate to the project directory you want to evaluate
cd /path/to/coding-assignment

# Run evaluation with Recess POC configuration
ai-code-review \
  --strategy coding-test \
  --config examples/recess-poc-config.json \
  --format markdown \
  --output evaluation-report.md
```

### 3. View Results

The tool generates comprehensive evaluation reports including:
- Technical implementation assessment
- Code quality analysis
- Security evaluation
- Testing and quality assurance review
- Architecture analysis
- Professional development process review

## Configuration Files

### Recess POC Configuration

The `recess-poc-config.json` configuration replicates the actual Recess assignment evaluation criteria:

```json
{
  "assignment": {
    "title": "Events Platform API Development - Recess Evaluation POC",
    "type": "take-home",
    "difficulty": "senior",
    "timeLimit": 240
  },
  "evaluation": {
    "criteria": {
      "technicalImplementation": { "weight": 25 },
      "codeQuality": { "weight": 20 },
      "security": { "weight": 15 },
      "testing": { "weight": 15 },
      "architecture": { "weight": 10 },
      "documentation": { "weight": 10 },
      "gitWorkflow": { "weight": 5 }
    }
  }
}
```

### Custom Configurations

Create your own configuration for different assignment types:

```json
{
  "assignment": {
    "title": "Your Assignment Title",
    "description": "Assignment description and context",
    "requirements": [
      "Requirement 1",
      "Requirement 2"
    ],
    "type": "coding-challenge",
    "difficulty": "mid",
    "timeLimit": 120
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

## Command Examples

### Basic Evaluation

```bash
# Simple evaluation with default settings
ai-code-review --strategy coding-test --config examples/recess-poc-config.json
```

### Advanced Configuration

```bash
# Comprehensive evaluation with custom parameters
ai-code-review \
  --strategy coding-test \
  --config examples/recess-poc-config.json \
  --model gemini-1.5-pro \
  --difficulty-level senior \
  --assessment-type take-home \
  --feedback-level comprehensive \
  --include-examples \
  --include-suggestions \
  --include-resources \
  --format markdown \
  --output detailed-evaluation.md
```

### Multiple Output Formats

```bash
# Generate both JSON and Markdown reports
ai-code-review --strategy coding-test --config examples/recess-poc-config.json --format json --output results.json
ai-code-review --strategy coding-test --config examples/recess-poc-config.json --format markdown --output results.md
```

### File Filtering

```bash
# Focus on specific file types
ai-code-review \
  --strategy coding-test \
  --config examples/recess-poc-config.json \
  --include "src/**/*.ts,src/**/*.tsx,*.json" \
  --exclude "node_modules/**,dist/**"
```

### Weight Customization

```bash
# Customize evaluation criteria weights
ai-code-review \
  --strategy coding-test \
  --config examples/recess-poc-config.json \
  --weight-correctness 40 \
  --weight-code-quality 30 \
  --weight-testing 20 \
  --weight-documentation 10
```

### Model Comparison

```bash
# Compare results across different models
ai-code-review --strategy coding-test --config examples/recess-poc-config.json --model gemini-1.5-pro --output gemini-eval.md
ai-code-review --strategy coding-test --config examples/recess-poc-config.json --model claude-3-sonnet --output claude-eval.md
ai-code-review --strategy coding-test --config examples/recess-poc-config.json --model gpt-4 --output openai-eval.md
```

## CLI Parameters Reference

### Assignment Configuration
- `--assignment-text TEXT` - Override assignment description
- `--assignment-file PATH` - Load assignment from file
- `--assignment-url URL` - Load assignment from URL
- `--assessment-type TYPE` - Set assessment type (coding-challenge, take-home, live-coding)
- `--difficulty-level LEVEL` - Set difficulty (junior, mid, senior, lead, architect)
- `--time-limit MINUTES` - Set time limit in minutes

### Evaluation Criteria
- `--weight-correctness NUM` - Weight for correctness (0-100)
- `--weight-code-quality NUM` - Weight for code quality (0-100)
- `--weight-architecture NUM` - Weight for architecture (0-100)
- `--weight-performance NUM` - Weight for performance (0-100)
- `--weight-testing NUM` - Weight for testing (0-100)

### Scoring Configuration
- `--scoring-system SYSTEM` - Scoring system (numeric, letter, pass-fail)
- `--max-score NUM` - Maximum score
- `--passing-threshold NUM` - Passing threshold
- `--score-breakdown` - Include detailed score breakdown

### Feedback Configuration
- `--feedback-level LEVEL` - Feedback level (basic, detailed, comprehensive)
- `--include-examples` - Include code examples in feedback
- `--include-suggestions` - Include improvement suggestions
- `--include-resources` - Include learning resources

### Technical Constraints
- `--allowed-libraries LIST` - Comma-separated list of allowed libraries
- `--forbidden-patterns LIST` - Comma-separated list of forbidden patterns
- `--language LANG` - Target programming language
- `--framework FRAMEWORK` - Target framework

## Testing Scripts

### Quick Validation

Run the validation script to test the implementation:

```bash
# Run quick validation tests
node scripts/validate-recess-poc.js
```

### Comprehensive Test Suite

Run the full test suite to validate all features:

```bash
# Run comprehensive test suite
bash scripts/test-recess-poc.sh
```

### Manual Testing

Test individual components manually:

```bash
# Test configuration loading
ai-code-review --strategy coding-test --config examples/recess-poc-config.json --dry-run

# Test with assignment text override
ai-code-review \
  --strategy coding-test \
  --assignment-text "Build a simple web application with user authentication" \
  --difficulty-level mid \
  --dry-run
```

## Output Formats

### JSON Output

```json
{
  "metadata": {
    "strategy": "coding-test",
    "timestamp": "2025-07-10T12:00:00Z",
    "model": "gemini-1.5-pro",
    "assessmentType": "take-home",
    "difficultyLevel": "senior"
  },
  "summary": "Overall evaluation summary",
  "scores": {
    "overall": 75,
    "breakdown": {
      "technicalImplementation": 20,
      "codeQuality": 15,
      "security": 10
    }
  },
  "evaluation": {
    "strengths": ["List of strengths"],
    "weaknesses": ["List of weaknesses"],
    "recommendations": ["Improvement recommendations"]
  }
}
```

### Markdown Output

```markdown
# Events Platform Evaluation Report

**Overall Score:** 75/100 (B+)
**Assessment Type:** Take-home assignment
**Difficulty Level:** Senior

## Executive Summary

[Comprehensive evaluation summary]

## Technical Implementation (20/25)

### Strengths
- Modern tech stack implementation
- Functional CRUD operations

### Areas for Improvement
- Error handling needs enhancement
- Input validation missing

## Recommendations

1. Implement comprehensive error handling
2. Add input validation middleware
3. Increase test coverage
```

## Best Practices

### Configuration Management

1. **Use version control** for configuration files
2. **Document configuration changes** with clear commit messages
3. **Test configurations** before using in production evaluations
4. **Backup original configurations** before modifications

### Evaluation Consistency

1. **Use the same model** for comparative evaluations
2. **Standardize criteria weights** across similar assignments
3. **Document evaluation rationale** for transparency
4. **Regular calibration** with human evaluators

### Quality Assurance

1. **Run validation tests** before important evaluations
2. **Cross-check results** with multiple models when possible
3. **Review generated reports** for accuracy and completeness
4. **Maintain evaluation logs** for audit trails

## Troubleshooting

### Common Issues

1. **Configuration not loading**
   - Check file path and permissions
   - Validate JSON syntax
   - Ensure required sections exist

2. **API rate limits**
   - Use different models for load balancing
   - Implement delays between requests
   - Monitor API usage quotas

3. **Incomplete evaluations**
   - Check file inclusion patterns
   - Verify project structure compatibility
   - Review error logs for issues

### Debug Commands

```bash
# Enable debug logging
AI_CODE_REVIEW_DEBUG=true ai-code-review --strategy coding-test --config examples/recess-poc-config.json

# Test with minimal file set
ai-code-review --strategy coding-test --config examples/recess-poc-config.json --include "*.md"

# Validate configuration only
ai-code-review --strategy coding-test --config examples/recess-poc-config.json --dry-run
```

## Advanced Features

### AI Usage Detection

The tool can analyze development patterns to detect potential AI assistance:

```json
{
  "aiUsageDetection": {
    "enabled": true,
    "suspiciousPatterns": [
      "Complete MVP implementation in unusually short timeframe",
      "Perfect first implementation without iteration"
    ]
  }
}
```

### Custom Evaluation Phases

Define custom evaluation phases for complex assessments:

```json
{
  "evaluationFramework": {
    "phases": [
      {
        "name": "Initial Assessment",
        "criteria": ["builds successfully", "runs without errors"]
      },
      {
        "name": "Code Quality Review",
        "criteria": ["TypeScript usage", "error handling"]
      }
    ]
  }
}
```

### Bonus Points System

Implement bonus points for exceptional work:

```json
{
  "bonusPoints": [
    "Docker containerization",
    "CI/CD pipeline setup",
    "Advanced security features"
  ]
}
```

## Integration Examples

### CI/CD Integration

```yaml
# GitHub Actions example
name: Code Review Evaluation
on: [push, pull_request]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run AI Code Review
        run: |
          ai-code-review \
            --strategy coding-test \
            --config .github/coding-test-config.json \
            --format json \
            --output evaluation-results.json
```

### Batch Evaluation

```bash
#!/bin/bash
# Evaluate multiple submissions
for project in submissions/*; do
  echo "Evaluating $project"
  ai-code-review \
    --strategy coding-test \
    --config evaluation-config.json \
    --path "$project" \
    --output "evaluations/$(basename $project)-evaluation.md"
done
```

## Support and Resources

### Documentation
- [Main Documentation](../README.md)
- [Configuration Reference](./CONFIGURATION.md)
- [CLI Reference](./CLI_REFERENCE.md)

### Examples
- [Configuration Examples](../examples/)
- [Test Scripts](../scripts/)
- [Integration Examples](../integration/)

### Community
- [GitHub Issues](https://github.com/your-repo/ai-code-review/issues)
- [Discussions](https://github.com/your-repo/ai-code-review/discussions)
- [Contributing Guide](../CONTRIBUTING.md)

---

**Last Updated:** July 10, 2025
**Version:** 4.3.1