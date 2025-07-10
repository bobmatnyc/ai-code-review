# AI Detection Usage Examples

This document provides practical examples of how to use AI detection in different scenarios with the ai-code-review tool.

## Quick Reference Commands

```bash
# Basic AI detection
ai-code-review ./submission --type coding-test --enable-ai-detection

# With custom threshold
ai-code-review ./submission --type coding-test --enable-ai-detection --ai-detection-threshold 0.8

# With specific analyzers
ai-code-review ./submission --type coding-test --enable-ai-detection --ai-detection-analyzers git,documentation

# Fail on detection
ai-code-review ./submission --type coding-test --enable-ai-detection --ai-detection-fail-on-detection

# Using configuration file
ai-code-review ./submission --config ./configs/hiring-senior-dev.yaml
```

## Hiring Scenarios

### Senior Developer Assessment

```bash
# Strict evaluation for senior role
ai-code-review ./candidate-submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.65 \
  --ai-detection-analyzers git,documentation \
  --ai-detection-include-in-report \
  --format json \
  --output senior-dev-evaluation.json

# Using configuration file
ai-code-review ./candidate-submission \
  --config examples/ai-detection-configs/hiring-senior-dev.yaml \
  --output senior-dev-evaluation.md
```

**What this does:**
- Uses strict 0.65 threshold for high accuracy
- Analyzes both git history and documentation patterns
- Includes detailed AI detection results in report
- Outputs structured JSON for further processing

### Junior Developer Assessment

```bash
# More lenient evaluation for junior role
ai-code-review ./junior-candidate --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.8 \
  --ai-detection-include-in-report \
  --format markdown \
  --output junior-dev-evaluation.md

# Using configuration file
ai-code-review ./junior-candidate \
  --config examples/ai-detection-configs/hiring-junior-dev.yaml
```

**What this does:**
- Uses lenient 0.8 threshold appropriate for junior candidates
- Focuses on obvious AI patterns while allowing legitimate learning tools
- Provides comprehensive feedback for candidate development

### Security Role Assessment

```bash
# Maximum security with automatic failure
ai-code-review ./security-candidate --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.6 \
  --ai-detection-fail-on-detection \
  --ai-detection-analyzers git,documentation \
  --debug

# Using configuration file (recommended)
ai-code-review ./security-candidate \
  --config examples/ai-detection-configs/security-role.yaml \
  --debug
```

**What this does:**
- Uses very strict 0.6 threshold for security roles
- Automatically fails evaluation if AI is detected
- Enables debug logging for detailed analysis
- Appropriate for roles requiring highest code authenticity

## Educational Scenarios

### University Course Assessment

```bash
# Educational evaluation with learning focus
ai-code-review ./student-project --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.75 \
  --ai-detection-include-in-report \
  --format markdown \
  --output student-evaluation.md

# Batch processing for multiple students
for student in ./students/*/; do
  name=$(basename "$student")
  ai-code-review "$student" \
    --config examples/ai-detection-configs/education-university.yaml \
    --output "evaluations/${name}-evaluation.md"
done
```

**What this does:**
- Uses moderate threshold appropriate for learning environment
- Includes detailed feedback for educational discussion
- Processes multiple student submissions consistently

### Coding Bootcamp Assessment

```bash
# Progressive evaluation (stricter for final projects)
ai-code-review ./final-project --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.7 \
  --ai-detection-include-in-report \
  --format json \
  --output bootcamp-final-evaluation.json

# For mid-course projects (more lenient)
ai-code-review ./mid-project --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.85 \
  --ai-detection-include-in-report
```

## Team and Code Review Scenarios

### Internal Team Code Review

```bash
# Light detection for team awareness
ai-code-review ./feature-branch --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.85 \
  --ai-detection-include-in-report \
  --format markdown

# Using team configuration
ai-code-review ./feature-branch \
  --config examples/ai-detection-configs/team-code-review.yaml
```

**What this does:**
- Uses high threshold to catch only obvious AI usage
- Provides awareness without being punitive
- Helps maintain team coding standards

### Open Source Contribution Review

```bash
# Standard evaluation for community contributions
ai-code-review ./pr-branch --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.75 \
  --ai-detection-analyzers git \
  --format json \
  --output pr-evaluation.json
```

## CI/CD Integration Examples

### GitHub Actions Workflow

```yaml
# .github/workflows/ai-detection.yml
name: AI Detection Code Review
on:
  pull_request:
    branches: [main, develop]

jobs:
  ai-detection:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Important for git history analysis

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install AI Code Review
        run: npm install -g @bobmatnyc/ai-code-review

      - name: Run AI Detection
        run: |
          ai-code-review ./src \
            --type coding-test \
            --enable-ai-detection \
            --ai-detection-threshold 0.8 \
            --format json \
            --output ai-detection-results.json

      - name: Check Results
        run: |
          if grep -q '"isAIGenerated": true' ai-detection-results.json; then
            echo "::warning::AI-generated code detected in PR"
            # Don't fail the build, just warn
          fi

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: ai-detection-results
          path: ai-detection-results.json
```

### GitLab CI Configuration

```yaml
# .gitlab-ci.yml
ai_detection:
  stage: test
  image: node:18
  before_script:
    - npm install -g @bobmatnyc/ai-code-review
  script:
    - |
      ai-code-review ./src \
        --type coding-test \
        --enable-ai-detection \
        --ai-detection-threshold 0.75 \
        --format json \
        --output ai-detection-results.json
    - |
      if grep -q '"isAIGenerated": true' ai-detection-results.json; then
        echo "AI-generated code detected - manual review required"
        exit 1
      fi
  artifacts:
    reports:
      junit: ai-detection-results.json
    expire_in: 1 week
  only:
    - merge_requests
```

## Batch Processing Examples

### Multiple Candidate Evaluation

```bash
#!/bin/bash
# evaluate-candidates.sh

candidates_dir="./candidates"
results_dir="./evaluation-results"
config_file="./configs/hiring-senior-dev.yaml"

mkdir -p "$results_dir"

echo "Starting batch evaluation of candidates..."

for candidate_dir in "$candidates_dir"/*/; do
  if [[ -d "$candidate_dir" ]]; then
    candidate_name=$(basename "$candidate_dir")
    echo "Evaluating candidate: $candidate_name"
    
    ai-code-review "$candidate_dir" \
      --config "$config_file" \
      --format json \
      --output "$results_dir/${candidate_name}-evaluation.json"
    
    # Extract AI detection status
    ai_detected=$(jq -r '.metadata.aiDetection.isAIGenerated // false' \
      "$results_dir/${candidate_name}-evaluation.json")
    
    confidence=$(jq -r '.metadata.aiDetection.confidenceScore // 0' \
      "$results_dir/${candidate_name}-evaluation.json")
    
    echo "  $candidate_name: AI Detection = $ai_detected (confidence: $confidence)"
  fi
done

echo "Batch evaluation complete. Results in $results_dir/"
```

### Student Project Grading

```bash
#!/bin/bash
# grade-student-projects.sh

students_dir="./student-submissions"
grades_dir="./grades"
config_file="./configs/education-university.yaml"

mkdir -p "$grades_dir"

echo "Grading student projects with AI detection..."

for student_dir in "$students_dir"/*/; do
  if [[ -d "$student_dir" ]]; then
    student_id=$(basename "$student_dir")
    echo "Grading student: $student_id"
    
    ai-code-review "$student_dir" \
      --config "$config_file" \
      --format markdown \
      --output "$grades_dir/${student_id}-grade.md"
    
    # Check for AI detection
    if grep -q "AI-Generated Content Detected" "$grades_dir/${student_id}-grade.md"; then
      echo "  ⚠️  $student_id: AI detection alert - manual review needed"
      # Create flag file for manual review
      touch "$grades_dir/${student_id}-REVIEW_NEEDED.flag"
    else
      echo "  ✅ $student_id: No AI detection concerns"
    fi
  fi
done

echo "Grading complete. Check $grades_dir/ for results."
echo "Files marked with REVIEW_NEEDED.flag require manual review."
```

## Advanced Configuration Examples

### Custom Analyzer Selection

```bash
# Fast analysis (git only)
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-analyzers git \
  --ai-detection-threshold 0.7

# Comprehensive analysis (all available)
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-analyzers git,documentation \
  --ai-detection-threshold 0.7

# Documentation-focused (for projects with limited git history)
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-analyzers documentation \
  --ai-detection-threshold 0.8
```

### Environment-Specific Configurations

```bash
# Development environment (lenient)
export AI_DETECTION_THRESHOLD=0.9
ai-code-review ./code --type coding-test --enable-ai-detection

# Staging environment (moderate)
export AI_DETECTION_THRESHOLD=0.75
ai-code-review ./code --type coding-test --enable-ai-detection

# Production environment (strict)
export AI_DETECTION_THRESHOLD=0.6
ai-code-review ./code --type coding-test --enable-ai-detection --ai-detection-fail-on-detection
```

## Debugging and Troubleshooting

### Debug Mode

```bash
# Enable detailed logging
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --debug

# With custom log level
AI_CODE_REVIEW_LOG_LEVEL=debug ai-code-review ./submission \
  --type coding-test \
  --enable-ai-detection
```

### Performance Testing

```bash
# Measure AI detection performance
time ai-code-review ./large-project --type coding-test \
  --enable-ai-detection \
  --ai-detection-analyzers git

# Compare different analyzer combinations
for analyzers in "git" "documentation" "git,documentation"; do
  echo "Testing analyzers: $analyzers"
  time ai-code-review ./project --type coding-test \
    --enable-ai-detection \
    --ai-detection-analyzers "$analyzers" \
    > /dev/null
done
```

### Configuration Validation

```bash
# Test configuration file
ai-code-review ./test-project \
  --config ./configs/my-config.yaml \
  --debug

# Validate threshold values
for threshold in 0.5 0.6 0.7 0.8 0.9; do
  echo "Testing threshold: $threshold"
  ai-code-review ./project --type coding-test \
    --enable-ai-detection \
    --ai-detection-threshold "$threshold" \
    --output "test-threshold-${threshold}.json"
done
```

## Integration with Other Tools

### Combining with Code Quality Tools

```bash
# Run code quality checks first, then AI detection
npm run lint && npm run test && \
ai-code-review ./src --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.75

# Generate comprehensive report
{
  echo "# Comprehensive Code Evaluation"
  echo
  echo "## Code Quality Results"
  npm run lint -- --format json | jq .
  echo
  echo "## Test Results"
  npm test -- --json | jq .
  echo
  echo "## AI Detection Results"
  ai-code-review ./src --type coding-test \
    --enable-ai-detection \
    --format json | jq .
} > comprehensive-report.md
```

### Integration with Review Tools

```bash
# Generate review for popular code review platforms
ai-code-review ./pr-branch --type coding-test \
  --enable-ai-detection \
  --format json \
  --output review.json

# Convert to review platform format
node scripts/convert-to-review-format.js review.json > platform-review.json
```

---

*These examples demonstrate various ways to use AI detection effectively across different scenarios. Adjust thresholds and configurations based on your specific requirements and context.*