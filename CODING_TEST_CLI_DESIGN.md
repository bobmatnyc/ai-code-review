# Coding Test CLI Interface Design

## Overview

This document outlines the complete CLI interface design for the `coding-test` feature in the ai-code-review tool. The feature adds comprehensive coding assessment capabilities, integrating seamlessly with the existing architecture while supporting flexible evaluation templates and scoring rubrics.

## 1. Strategy Integration

### 1.1 Review Type Addition

Add `coding-test` to the existing `ReviewType` union in `/src/types/review.ts`:

```typescript
export type ReviewType =
  | 'quick-fixes'
  | 'architectural'
  | 'security'
  | 'performance'
  | 'unused-code'
  | 'focused-unused-code'
  | 'code-tracing-unused-code'
  | 'improved-quick-fixes'
  | 'consolidated'
  | 'best-practices'
  | 'evaluation'
  | 'extract-patterns'
  | 'coding-test';  // NEW
```

### 1.2 Strategy Factory Integration

Add case to `StrategyFactory.createStrategy()` in `/src/strategies/StrategyFactory.ts`:

```typescript
if (reviewType === 'coding-test') {
  return new CodingTestReviewStrategy();
}
```

### 1.3 Valid Review Types Update

Update the `validReviewTypes` array in `/src/cli/argumentParser.ts`:

```typescript
const validReviewTypes: ReviewType[] = [
  'quick-fixes',
  'architectural',
  'security',
  'performance',
  'unused-code',
  'focused-unused-code',
  'code-tracing-unused-code',
  'improved-quick-fixes',
  'consolidated',
  'evaluation',
  'extract-patterns',
  'coding-test',  // NEW
];
```

## 2. Command Syntax and Parameters

### 2.1 Basic Command Structure

```bash
ai-code-review --type coding-test [target] [options]
```

### 2.2 Required Parameters

- `--type coding-test`: Specifies the coding test review strategy
- `target`: Path to the candidate's code submission (file or directory)

### 2.3 Optional Parameters

#### 2.3.1 Assessment Configuration
```bash
# Assignment specification
--assignment-file <path>           # Path to assignment description file
--assignment-url <url>             # URL to assignment description
--assignment-text <text>           # Inline assignment description

# Evaluation template
--evaluation-template <path>       # Path to custom evaluation template
--template-url <url>              # URL to evaluation template
--rubric-file <path>              # Path to scoring rubric file

# Assessment type
--assessment-type <type>          # Type: coding-challenge, take-home, live-coding, code-review
--difficulty-level <level>        # Level: junior, mid, senior, lead, architect
--time-limit <minutes>            # Expected completion time in minutes
```

#### 2.3.2 Evaluation Criteria
```bash
# Core criteria weights (0-100)
--weight-correctness <number>     # Weight for correctness (default: 30)
--weight-code-quality <number>    # Weight for code quality (default: 25)
--weight-architecture <number>    # Weight for architecture (default: 20)
--weight-performance <number>     # Weight for performance (default: 15)
--weight-testing <number>         # Weight for testing (default: 10)

# Additional criteria
--evaluate-documentation         # Include documentation assessment
--evaluate-git-history          # Include git commit history analysis
--evaluate-edge-cases           # Focus on edge case handling
--evaluate-error-handling       # Focus on error handling patterns
```

#### 2.3.3 Scoring Configuration
```bash
# Scoring system
--scoring-system <type>          # Type: numeric, letter, pass-fail, custom
--max-score <number>            # Maximum possible score (default: 100)
--passing-threshold <number>     # Minimum passing score (default: 70)
--score-breakdown              # Include detailed score breakdown

# Feedback options
--feedback-level <level>        # Level: basic, detailed, comprehensive
--include-examples             # Include code examples in feedback
--include-suggestions          # Include improvement suggestions
--include-resources            # Include learning resources
```

#### 2.3.4 Context and Constraints
```bash
# Technical context
--target-language <language>     # Expected programming language
--framework <framework>         # Expected framework/library
--allowed-libraries <list>      # Comma-separated list of allowed libraries
--forbidden-patterns <list>     # Comma-separated list of forbidden patterns

# Environment constraints
--node-version <version>        # Expected Node.js version
--typescript-version <version>  # Expected TypeScript version
--memory-limit <mb>            # Memory constraint in MB
--execution-timeout <seconds>   # Execution timeout in seconds
```

### 2.4 Example Commands

#### 2.4.1 Basic Coding Test
```bash
ai-code-review --type coding-test ./candidate-submission
```

#### 2.4.2 With Assignment File
```bash
ai-code-review --type coding-test ./candidate-submission \
  --assignment-file ./assignment.md \
  --difficulty-level senior \
  --assessment-type take-home
```

#### 2.4.3 Custom Evaluation Template
```bash
ai-code-review --type coding-test ./candidate-submission \
  --evaluation-template ./custom-rubric.yaml \
  --weight-correctness 40 \
  --weight-code-quality 35 \
  --weight-architecture 25 \
  --feedback-level comprehensive
```

#### 2.4.4 Live Coding Assessment
```bash
ai-code-review --type coding-test ./live-session-code \
  --assessment-type live-coding \
  --time-limit 60 \
  --evaluate-git-history \
  --include-examples \
  --scoring-system numeric
```

## 3. Configuration File Structure

### 3.1 YAML Configuration Template

```yaml
# coding-test-config.yaml
assessment:
  type: "take-home"  # coding-challenge, take-home, live-coding, code-review
  difficulty: "senior"  # junior, mid, senior, lead, architect
  timeLimit: 240  # minutes
  
assignment:
  file: "./assignment.md"
  title: "E-commerce API Development"
  description: "Build a RESTful API for an e-commerce platform"
  requirements:
    - "Implement user authentication"
    - "Create product catalog endpoints"
    - "Add shopping cart functionality"
    - "Include order management"
  
evaluation:
  template: "./evaluation-template.yaml"
  criteria:
    correctness:
      weight: 30
      description: "Functional requirements implementation"
    codeQuality:
      weight: 25
      description: "Code readability, maintainability, and style"
    architecture:
      weight: 20
      description: "Design patterns and architectural decisions"
    performance:
      weight: 15
      description: "Efficiency and scalability considerations"
    testing:
      weight: 10
      description: "Test coverage and quality"
  
scoring:
    system: "numeric"  # numeric, letter, pass-fail, custom
    maxScore: 100
    passingThreshold: 70
    breakdown: true
    
feedback:
  level: "comprehensive"  # basic, detailed, comprehensive
  includeExamples: true
  includeSuggestions: true
  includeResources: true
  
constraints:
  language: "typescript"
  framework: "express"
  allowedLibraries: ["lodash", "axios", "joi"]
  forbiddenPatterns: ["eval", "Function"]
  nodeVersion: ">=18.0.0"
  typescriptVersion: ">=4.9.0"
  memoryLimit: 512  # MB
  executionTimeout: 30  # seconds
```

### 3.2 JSON Configuration Template

```json
{
  "assessment": {
    "type": "coding-challenge",
    "difficulty": "mid",
    "timeLimit": 120
  },
  "assignment": {
    "title": "Data Processing Pipeline",
    "description": "Implement a data processing pipeline with error handling",
    "requirements": [
      "Parse CSV input files",
      "Transform data according to business rules",
      "Generate JSON output",
      "Handle malformed data gracefully"
    ]
  },
  "evaluation": {
    "criteria": {
      "correctness": { "weight": 35 },
      "codeQuality": { "weight": 30 },
      "errorHandling": { "weight": 20 },
      "performance": { "weight": 15 }
    }
  },
  "scoring": {
    "system": "letter",
    "maxScore": 100,
    "passingThreshold": 75
  },
  "feedback": {
    "level": "detailed",
    "includeExamples": true,
    "includeSuggestions": true
  }
}
```

## 4. Error Handling and Validation

### 4.1 Parameter Validation

```typescript
// Validation rules for CLI parameters
const validationRules = {
  assessmentType: ['coding-challenge', 'take-home', 'live-coding', 'code-review'],
  difficultyLevel: ['junior', 'mid', 'senior', 'lead', 'architect'],
  scoringSystem: ['numeric', 'letter', 'pass-fail', 'custom'],
  feedbackLevel: ['basic', 'detailed', 'comprehensive'],
  weightValues: { min: 0, max: 100 },
  timeLimit: { min: 5, max: 480 }, // 5 minutes to 8 hours
  maxScore: { min: 1, max: 1000 },
  passingThreshold: { min: 0, max: 100 }
};
```

### 4.2 Fallback Logic

```typescript
// Fallback configuration when required files are missing
const fallbackConfig = {
  assignment: {
    // Generate generic assignment from code analysis
    useCodeAnalysis: true,
    inferFromFileStructure: true,
    defaultDescription: "Code review and assessment of submitted solution"
  },
  evaluation: {
    // Use default evaluation template
    useDefaultTemplate: true,
    standardCriteria: ['correctness', 'codeQuality', 'architecture', 'performance'],
    defaultWeights: { correctness: 30, codeQuality: 25, architecture: 20, performance: 15, testing: 10 }
  },
  scoring: {
    // Default scoring system
    system: 'numeric',
    maxScore: 100,
    passingThreshold: 70
  }
};
```

### 4.3 Error Messages

```typescript
const errorMessages = {
  missingAssignment: "No assignment file found. Using code analysis to infer requirements.",
  invalidWeights: "Criterion weights must sum to 100. Normalizing provided weights.",
  unsupportedLanguage: "Language not supported. Using generic evaluation template.",
  configurationError: "Configuration file is invalid. Using default settings.",
  templateNotFound: "Evaluation template not found. Using built-in template.",
  invalidTimeLimit: "Time limit must be between 5 and 480 minutes. Using default.",
  scoreOutOfRange: "Score threshold must be between 0 and 100. Using default."
};
```

## 5. Integration with Existing Architecture

### 5.1 CLI Options Extension

Add new options to `ReviewOptions` interface in `/src/types/review.ts`:

```typescript
export interface ReviewOptions {
  // ... existing options ...
  
  // Coding test specific options
  assignmentFile?: string;
  assignmentUrl?: string;
  assignmentText?: string;
  evaluationTemplate?: string;
  templateUrl?: string;
  rubricFile?: string;
  assessmentType?: 'coding-challenge' | 'take-home' | 'live-coding' | 'code-review';
  difficultyLevel?: 'junior' | 'mid' | 'senior' | 'lead' | 'architect';
  timeLimit?: number;
  
  // Evaluation criteria weights
  weightCorrectness?: number;
  weightCodeQuality?: number;
  weightArchitecture?: number;
  weightPerformance?: number;
  weightTesting?: number;
  
  // Evaluation flags
  evaluateDocumentation?: boolean;
  evaluateGitHistory?: boolean;
  evaluateEdgeCases?: boolean;
  evaluateErrorHandling?: boolean;
  
  // Scoring configuration
  scoringSystem?: 'numeric' | 'letter' | 'pass-fail' | 'custom';
  maxScore?: number;
  passingThreshold?: number;
  scoreBreakdown?: boolean;
  
  // Feedback options
  feedbackLevel?: 'basic' | 'detailed' | 'comprehensive';
  includeExamples?: boolean;
  includeSuggestions?: boolean;
  includeResources?: boolean;
  
  // Constraints
  allowedLibraries?: string[];
  forbiddenPatterns?: string[];
  nodeVersion?: string;
  typescriptVersion?: string;
  memoryLimit?: number;
  executionTimeout?: number;
}
```

### 5.2 Argument Parser Extension

Add new CLI options to `argumentParser.ts`:

```typescript
// Add to the main command options
.option('assignment-file', {
  describe: 'Path to assignment description file',
  type: 'string',
})
.option('assignment-url', {
  describe: 'URL to assignment description',
  type: 'string',
})
.option('assignment-text', {
  describe: 'Inline assignment description',
  type: 'string',
})
.option('evaluation-template', {
  describe: 'Path to custom evaluation template',
  type: 'string',
})
.option('assessment-type', {
  describe: 'Type of assessment',
  choices: ['coding-challenge', 'take-home', 'live-coding', 'code-review'],
  default: 'coding-challenge',
})
.option('difficulty-level', {
  describe: 'Difficulty level',
  choices: ['junior', 'mid', 'senior', 'lead', 'architect'],
  default: 'mid',
})
.option('time-limit', {
  describe: 'Expected completion time in minutes',
  type: 'number',
})
.option('weight-correctness', {
  describe: 'Weight for correctness evaluation (0-100)',
  type: 'number',
  default: 30,
})
.option('weight-code-quality', {
  describe: 'Weight for code quality evaluation (0-100)',
  type: 'number',
  default: 25,
})
.option('weight-architecture', {
  describe: 'Weight for architecture evaluation (0-100)',
  type: 'number',
  default: 20,
})
.option('weight-performance', {
  describe: 'Weight for performance evaluation (0-100)',
  type: 'number',
  default: 15,
})
.option('weight-testing', {
  describe: 'Weight for testing evaluation (0-100)',
  type: 'number',
  default: 10,
})
.option('scoring-system', {
  describe: 'Scoring system type',
  choices: ['numeric', 'letter', 'pass-fail', 'custom'],
  default: 'numeric',
})
.option('max-score', {
  describe: 'Maximum possible score',
  type: 'number',
  default: 100,
})
.option('passing-threshold', {
  describe: 'Minimum passing score',
  type: 'number',
  default: 70,
})
.option('feedback-level', {
  describe: 'Feedback detail level',
  choices: ['basic', 'detailed', 'comprehensive'],
  default: 'detailed',
})
.option('include-examples', {
  describe: 'Include code examples in feedback',
  type: 'boolean',
  default: false,
})
.option('include-suggestions', {
  describe: 'Include improvement suggestions',
  type: 'boolean',
  default: true,
})
.option('allowed-libraries', {
  describe: 'Comma-separated list of allowed libraries',
  type: 'string',
})
.option('forbidden-patterns', {
  describe: 'Comma-separated list of forbidden patterns',
  type: 'string',
})
```

## 6. Output Formats

### 6.1 Structured JSON Output

```json
{
  "assessment": {
    "type": "coding-test",
    "candidate": "john.doe@example.com",
    "assignment": {
      "title": "E-commerce API Development",
      "difficulty": "senior",
      "timeLimit": 240,
      "actualTime": 180
    },
    "timestamp": "2024-01-15T10:30:00Z",
    "toolVersion": "4.3.1"
  },
  "score": {
    "total": 78,
    "maxScore": 100,
    "passed": true,
    "passingThreshold": 70,
    "breakdown": {
      "correctness": { "score": 25, "maxScore": 30, "percentage": 83.3 },
      "codeQuality": { "score": 20, "maxScore": 25, "percentage": 80.0 },
      "architecture": { "score": 15, "maxScore": 20, "percentage": 75.0 },
      "performance": { "score": 12, "maxScore": 15, "percentage": 80.0 },
      "testing": { "score": 6, "maxScore": 10, "percentage": 60.0 }
    }
  },
  "evaluation": {
    "correctness": {
      "score": 25,
      "maxScore": 30,
      "summary": "Most functional requirements implemented correctly",
      "strengths": [
        "All API endpoints implemented and working",
        "Proper HTTP status codes used",
        "Request validation implemented"
      ],
      "weaknesses": [
        "Missing pagination in product listing",
        "Error handling could be more robust"
      ],
      "examples": [
        {
          "type": "good",
          "description": "Proper input validation",
          "code": "const { error } = userSchema.validate(req.body);"
        }
      ]
    },
    "codeQuality": {
      "score": 20,
      "maxScore": 25,
      "summary": "Good code structure with room for improvement",
      "strengths": [
        "Consistent naming conventions",
        "Proper separation of concerns",
        "Good use of TypeScript types"
      ],
      "weaknesses": [
        "Some functions are too long",
        "Missing JSDoc comments",
        "Could benefit from more abstraction"
      ]
    }
  },
  "feedback": {
    "level": "comprehensive",
    "overallSummary": "Strong technical solution with solid implementation of core requirements. Code quality is good but could be enhanced with better documentation and more modular design.",
    "recommendations": [
      "Add comprehensive JSDoc comments for all public functions",
      "Implement pagination for large data sets",
      "Consider using middleware for common validation logic",
      "Add integration tests for API endpoints"
    ],
    "resources": [
      {
        "title": "API Design Best Practices",
        "url": "https://restfulapi.net/rest-api-design-tutorial-with-example/"
      },
      {
        "title": "TypeScript Documentation Guidelines",
        "url": "https://typescriptlang.org/docs/handbook/jsdoc-supported-types.html"
      }
    ]
  },
  "technicalAnalysis": {
    "languageDetected": "typescript",
    "frameworkDetected": "express",
    "linesOfCode": 1250,
    "filesAnalyzed": 15,
    "testCoverage": 65,
    "eslintIssues": 3,
    "securityIssues": 0,
    "performanceScore": 85
  }
}
```

### 6.2 Markdown Report Format

```markdown
# Coding Assessment Report

## Assessment Summary
- **Candidate**: john.doe@example.com
- **Assignment**: E-commerce API Development
- **Difficulty**: Senior Level
- **Time Limit**: 4 hours
- **Actual Time**: 3 hours
- **Date**: January 15, 2024

## Overall Score: 78/100 ✅ PASS

### Score Breakdown
| Criteria | Score | Max | Percentage | Weight |
|----------|-------|-----|------------|--------|
| Correctness | 25 | 30 | 83.3% | 30% |
| Code Quality | 20 | 25 | 80.0% | 25% |
| Architecture | 15 | 20 | 75.0% | 20% |
| Performance | 12 | 15 | 80.0% | 15% |
| Testing | 6 | 10 | 60.0% | 10% |

## Detailed Evaluation

### ✅ Correctness (25/30)
**Strong implementation of core requirements**

**Strengths:**
- All API endpoints implemented and working correctly
- Proper HTTP status codes used throughout
- Request validation implemented using Joi schemas
- Database operations handle edge cases well

**Areas for Improvement:**
- Missing pagination in product listing endpoint
- Error handling could be more robust in user registration
- Some edge cases in order processing not handled

**Example of Good Practice:**
```typescript
const { error } = userSchema.validate(req.body);
if (error) {
  return res.status(400).json({ 
    error: 'Invalid input', 
    details: error.details 
  });
}
```

### ⚠️ Code Quality (20/25)
**Good structure with room for improvement**

**Strengths:**
- Consistent naming conventions throughout
- Proper separation of concerns between routes, services, and models
- Good use of TypeScript types and interfaces
- Clean, readable code structure

**Areas for Improvement:**
- Some functions exceed 50 lines and should be broken down
- Missing JSDoc comments for public functions
- Could benefit from more abstraction layers
- Some duplicate code in validation logic

### 🏗️ Architecture (15/20)
**Solid architectural decisions**

**Strengths:**
- Clear MVC pattern implementation
- Good separation between business logic and HTTP handling
- Proper database abstraction layer
- Appropriate use of middleware

**Areas for Improvement:**
- Could benefit from service layer pattern
- Error handling strategy could be more centralized
- Authentication middleware could be more robust

## Recommendations

### High Priority
1. **Add comprehensive JSDoc comments** for all public functions and classes
2. **Implement pagination** for endpoints that return large datasets
3. **Enhance error handling** with centralized error management
4. **Add integration tests** for critical API endpoints

### Medium Priority
1. **Refactor long functions** into smaller, more focused units
2. **Create middleware** for common validation logic
3. **Improve logging** with structured logging library
4. **Add API documentation** using OpenAPI/Swagger

### Low Priority
1. **Consider implementing caching** for frequently accessed data
2. **Add rate limiting** to prevent abuse
3. **Implement health check endpoint** for monitoring

## Learning Resources
- [API Design Best Practices](https://restfulapi.net/rest-api-design-tutorial-with-example/)
- [TypeScript Documentation Guidelines](https://typescriptlang.org/docs/handbook/jsdoc-supported-types.html)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

## Technical Metrics
- **Language**: TypeScript
- **Framework**: Express.js
- **Lines of Code**: 1,250
- **Files Analyzed**: 15
- **Test Coverage**: 65%
- **ESLint Issues**: 3 (minor)
- **Security Issues**: 0
- **Performance Score**: 85/100

---
*Generated by AI Code Review Tool v4.3.1*
```

## 7. Usage Pattern Examples

### 7.1 Quick Assessment
```bash
# Basic assessment with minimal configuration
ai-code-review --type coding-test ./submission --output json
```

### 7.2 Comprehensive Assessment
```bash
# Full assessment with custom weights and comprehensive feedback
ai-code-review --type coding-test ./submission \
  --assignment-file ./assignment.md \
  --difficulty-level senior \
  --weight-correctness 35 \
  --weight-code-quality 30 \
  --weight-architecture 25 \
  --weight-performance 10 \
  --feedback-level comprehensive \
  --include-examples \
  --include-suggestions \
  --output markdown
```

### 7.3 Live Coding Session
```bash
# Assessment for live coding session with git history analysis
ai-code-review --type coding-test ./live-session \
  --assessment-type live-coding \
  --time-limit 60 \
  --evaluate-git-history \
  --evaluate-edge-cases \
  --feedback-level basic \
  --scoring-system pass-fail
```

### 7.4 Configuration File Usage
```bash
# Using YAML configuration file
ai-code-review --type coding-test ./submission \
  --config coding-test-config.yaml \
  --output-dir ./assessments
```

### 7.5 Batch Processing
```bash
# Process multiple submissions
for candidate in ./submissions/*; do
  ai-code-review --type coding-test "$candidate" \
    --assignment-file ./assignment.md \
    --output json \
    --output-dir ./results/"$(basename "$candidate")"
done
```

## 8. Implementation Checklist

### 8.1 Core Components
- [ ] Create `CodingTestReviewStrategy` class
- [ ] Add new CLI options to argument parser
- [ ] Extend `ReviewOptions` interface
- [ ] Create evaluation template system
- [ ] Implement scoring algorithms
- [ ] Add configuration file support

### 8.2 Integration Points
- [ ] Update `StrategyFactory` to handle coding-test type
- [ ] Add validation for new CLI parameters
- [ ] Create fallback logic for missing templates
- [ ] Integrate with existing output formats
- [ ] Add error handling for edge cases

### 8.3 Testing Requirements
- [ ] Unit tests for strategy implementation
- [ ] Integration tests for CLI options
- [ ] End-to-end tests for complete workflow
- [ ] Performance tests for large submissions
- [ ] Error handling tests for edge cases

### 8.4 Documentation
- [ ] Update CLI help text
- [ ] Create configuration examples
- [ ] Add usage documentation
- [ ] Document evaluation criteria
- [ ] Provide template creation guide

This comprehensive CLI design provides a flexible, powerful interface for coding assessments while maintaining consistency with the existing ai-code-review architecture. The design supports various assessment types, customizable evaluation criteria, and multiple output formats, making it suitable for different hiring scenarios and organizational needs.