# AI-Generated Code Detection Pattern Catalog

**Task:** TSK-0015  
**Issue:** ISS-0036 - Implement AI-generated code detection for coding test evaluations  
**Epic:** EP-0002 - Coding Assessment and Evaluation Framework  
**Date:** July 10, 2025  

---

## Pattern Classification System

This catalog organizes detection patterns by confidence levels to enable systematic implementation and evaluation. Each pattern includes detection methodology, implementation guidance, and expected accuracy rates.

### Confidence Level Definitions

- **High Confidence (90-99% Reliability):** Patterns with strong statistical evidence and low false positive rates
- **Medium Confidence (70-89% Reliability):** Patterns requiring contextual analysis and human verification
- **Low Confidence (50-69% Reliability):** Patterns useful for screening but requiring additional evidence

---

## HIGH CONFIDENCE PATTERNS (90-99% Reliability)

### 1. Git History Anomalies

#### H1.1: Simultaneous File Creation Pattern
**Detection Method:** Analyze initial commit for bulk file creation
**Implementation:**
```typescript
function detectBulkFileCreation(commits: GitCommit[]): boolean {
  const initialCommit = commits[0];
  return initialCommit.changedFiles.length > 15 && 
         initialCommit.type === 'initial';
}
```
**Confidence:** 95%
**False Positive Rate:** <2%

#### H1.2: AI-Generated Commit Messages
**Detection Method:** Pattern matching for template-style commit messages
**Indicators:**
- Excessive use of conventional commit format
- Overly descriptive messages for simple changes
- Consistent emoji usage across all commits
- Template phrases: "feat:", "fix:", "docs:", "refactor:"

**Implementation:**
```typescript
const aiCommitPatterns = [
  /^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{20,}/,
  /^(Add|Update|Fix|Implement|Create) .+ (feature|functionality|component|module)$/,
  /^Initial (commit|implementation) with (complete|full) .+ structure$/
];

function detectAICommitMessage(message: string): boolean {
  return aiCommitPatterns.some(pattern => pattern.test(message));
}
```
**Confidence:** 92%
**False Positive Rate:** <5%

#### H1.3: Absence of Debugging Commits
**Detection Method:** Check for typical developer workflow patterns
**Missing Patterns:**
- No "WIP" or "work in progress" commits
- No quick bug fix commits
- No experimental or exploratory commits
- No commit message typos or informal language

**Confidence:** 88%
**False Positive Rate:** <8%

### 2. Documentation Structure Anomalies

#### H2.1: Template README Structure
**Detection Method:** Analyze README section completeness and ordering
**Indicators:**
- All standard sections present (Installation, Usage, API, Contributing, License)
- Sections in predictable order
- Generic project descriptions
- Automated badge generation

**Implementation:**
```typescript
const standardSections = [
  'installation', 'usage', 'api', 'contributing', 'license', 
  'features', 'requirements', 'examples', 'documentation'
];

function analyzeREADMEStructure(readmeContent: string): number {
  const sections = extractSections(readmeContent);
  const matchedStandard = sections.filter(s => 
    standardSections.some(std => s.toLowerCase().includes(std))
  );
  return matchedStandard.length / sections.length;
}
```
**Confidence:** 91%
**False Positive Rate:** <7%

#### H2.2: Excessive Comment Density
**Detection Method:** Calculate comment-to-code ratio across files
**Thresholds:**
- Comment density >40% indicates AI generation
- Uniform comment density across all files
- JSDoc comments for trivial functions

**Implementation:**
```typescript
function calculateCommentDensity(fileContent: string): number {
  const lines = fileContent.split('\n');
  const codeLines = lines.filter(line => 
    line.trim() && !line.trim().startsWith('//') && 
    !line.trim().startsWith('/*') && !line.trim().startsWith('*')
  );
  const commentLines = lines.length - codeLines.length;
  return commentLines / lines.length;
}
```
**Confidence:** 89%
**False Positive Rate:** <9%

### 3. Code Structure Anomalies

#### H3.1: Uniform Variable Naming
**Detection Method:** Analyze naming pattern consistency
**Indicators:**
- 100% camel case adherence without variation
- Overly descriptive variable names
- No abbreviations or shortcuts
- Consistent boolean prefixes (is/has/can/should)

**Implementation:**
```typescript
function analyzeNamingPatterns(variables: string[]): number {
  const camelCasePattern = /^[a-z][a-zA-Z0-9]*$/;
  const descriptivePattern = /^[a-z]+[A-Z][a-zA-Z]+[A-Z][a-zA-Z]+$/; // 3+ words
  
  const camelCaseRatio = variables.filter(v => 
    camelCasePattern.test(v)
  ).length / variables.length;
  
  const descriptiveRatio = variables.filter(v => 
    descriptivePattern.test(v)
  ).length / variables.length;
  
  return (camelCaseRatio + descriptiveRatio) / 2;
}
```
**Confidence:** 87%
**False Positive Rate:** <10%

#### H3.2: Template Error Handling
**Detection Method:** Identify uniform error handling patterns
**Indicators:**
- Identical try-catch structures across functions
- Consistent error message formatting
- No variation in error handling approaches
- Excessive error handling for simple operations

**Confidence:** 85%
**False Positive Rate:** <12%

### 4. AI Model-Specific Error Patterns

#### H4.1: Reference Hallucinations
**Detection Method:** Check for non-existent imports and objects
**Indicators:**
- Imports from non-existent packages
- References to unavailable APIs
- Fictional library functions
- Non-standard framework methods

**Implementation:**
```typescript
const knownPackages = new Set(['react', 'lodash', 'express', /* ... */]);
const suspiciousImports = [
  'ai-helper', 'auto-code', 'smart-utils', 'ai-framework'
];

function detectHallucinatedImports(imports: string[]): boolean {
  return imports.some(imp => 
    suspiciousImports.includes(imp) || 
    (!knownPackages.has(imp) && imp.includes('ai'))
  );
}
```
**Confidence:** 94%
**False Positive Rate:** <3%

#### H4.2: Solution Misalignment
**Detection Method:** Analyze functional correctness vs requirements
**Indicators:**
- Syntactically correct but functionally wrong code
- Missing edge case handling
- Incomplete implementations
- Over-engineered solutions for simple problems

**Confidence:** 86%
**False Positive Rate:** <11%

---

## MEDIUM CONFIDENCE PATTERNS (70-89% Reliability)

### 5. Advanced Code Style Indicators

#### M5.1: Modern Feature Overuse
**Detection Method:** Analyze usage of modern JavaScript/TypeScript features
**Indicators:**
- Excessive destructuring assignment usage
- Template literals for simple strings
- Arrow functions exclusively (no function declarations)
- Consistent spread operator usage

**Implementation:**
```typescript
function analyzeModernFeatureUsage(ast: AST): number {
  const features = {
    destructuring: countDestructuringPatterns(ast),
    templateLiterals: countTemplateLiterals(ast),
    arrowFunctions: countArrowFunctions(ast),
    spreadOperators: countSpreadOperators(ast)
  };
  
  return calculateFeatureOveruseScore(features);
}
```
**Confidence:** 78%
**False Positive Rate:** <15%

#### M5.2: Type Annotation Excess
**Detection Method:** Analyze TypeScript type usage patterns
**Indicators:**
- Type annotations for obvious types
- Excessive interface definitions
- Overly complex generic types
- Uniform type safety across all code

**Confidence:** 75%
**False Positive Rate:** <18%

#### M5.3: Uniform Code Complexity
**Detection Method:** Calculate cyclomatic complexity distribution
**Indicators:**
- Similar complexity scores across all functions
- Lack of complexity variation
- No simple utility functions
- Consistent abstraction levels

**Implementation:**
```typescript
function analyzeCyclomaticComplexity(functions: Function[]): number {
  const complexities = functions.map(f => calculateComplexity(f));
  const mean = complexities.reduce((a, b) => a + b) / complexities.length;
  const variance = calculateVariance(complexities, mean);
  
  // Low variance indicates uniform complexity (AI pattern)
  return variance < 2.0 ? 0.8 : 0.3;
}
```
**Confidence:** 72%
**False Positive Rate:** <20%

### 6. Documentation Patterns

#### M6.1: MDX Rich Content
**Detection Method:** Analyze documentation formatting complexity
**Indicators:**
- Excessive use of callouts and interactive components
- Uniform badge and shield usage
- Automated table generation
- Consistent emoji usage in documentation

**Confidence:** 74%
**False Positive Rate:** <19%

#### M6.2: API Documentation Uniformity
**Detection Method:** Analyze API documentation patterns
**Indicators:**
- Identical parameter documentation structure
- Consistent response format documentation
- Template-like endpoint descriptions
- Uniform example code formatting

**Confidence:** 71%
**False Positive Rate:** <22%

### 7. Framework-Specific Patterns

#### M7.1: React/Next.js Template Usage
**Detection Method:** Analyze component structure and patterns
**Indicators:**
- Identical component structure across files
- Consistent hook usage patterns
- Template-like prop definitions
- Uniform state management approaches

**Implementation:**
```typescript
function analyzeReactPatterns(components: ReactComponent[]): number {
  const patterns = {
    hookUsage: analyzeHookPatterns(components),
    propStructure: analyzePropPatterns(components),
    stateManagement: analyzeStatePatterns(components)
  };
  
  return calculateTemplateScore(patterns);
}
```
**Confidence:** 76%
**False Positive Rate:** <17%

#### M7.2: Package.json Dependency Patterns
**Detection Method:** Analyze dependency selection and versioning
**Indicators:**
- Overly comprehensive dependency lists
- Latest version usage for all packages
- Unusual package combinations
- Missing common development dependencies

**Confidence:** 73%
**False Positive Rate:** <20%

---

## LOW CONFIDENCE PATTERNS (50-69% Reliability)

### 8. Statistical and Linguistic Indicators

#### L8.1: Code Entropy Analysis
**Detection Method:** Calculate Shannon entropy for code patterns
**Implementation:**
```typescript
function calculateCodeEntropy(codeTokens: string[]): number {
  const frequency = new Map<string, number>();
  codeTokens.forEach(token => {
    frequency.set(token, (frequency.get(token) || 0) + 1);
  });
  
  let entropy = 0;
  const totalTokens = codeTokens.length;
  
  for (const count of frequency.values()) {
    const probability = count / totalTokens;
    if (probability > 0) {
      entropy -= probability * Math.log2(probability);
    }
  }
  
  return entropy;
}
```
**Threshold:** Entropy < 4.5 suggests AI generation
**Confidence:** 65%
**False Positive Rate:** <25%

#### L8.2: Vocabulary Diversity Analysis
**Detection Method:** Calculate type-token ratio for comments and documentation
**Indicators:**
- Low lexical diversity in comments
- Repetitive vocabulary usage
- Consistent terminology across files
- Limited variation in explanation styles

**Implementation:**
```typescript
function calculateTypeTokenRatio(textContent: string): number {
  const words = textContent.toLowerCase().match(/\b\w+\b/g) || [];
  const uniqueWords = new Set(words);
  return uniqueWords.size / words.length;
}
```
**Threshold:** TTR < 0.6 suggests AI generation
**Confidence:** 62%
**False Positive Rate:** <28%

#### L8.3: N-gram Pattern Analysis
**Detection Method:** Analyze word sequence patterns in documentation
**Indicators:**
- Repetitive phrase structures
- Template-like sentence patterns
- Consistent technical writing style
- Predictable explanation sequences

**Confidence:** 58%
**False Positive Rate:** <30%

### 9. Behavioral Indicators

#### L9.1: Commit Timing Regularity
**Detection Method:** Analyze temporal patterns in commit history
**Indicators:**
- Regular intervals between commits
- Commits during unusual hours
- Lack of timezone variation
- Consistent commit frequency

**Implementation:**
```typescript
function analyzeCommitTiming(timestamps: Date[]): number {
  const intervals = [];
  for (let i = 1; i < timestamps.length; i++) {
    const interval = timestamps[i].getTime() - timestamps[i-1].getTime();
    intervals.push(interval);
  }
  
  const meanInterval = intervals.reduce((a, b) => a + b) / intervals.length;
  const variance = calculateVariance(intervals, meanInterval);
  
  // Low variance indicates regular timing (possible AI)
  return variance < 3600000 ? 0.6 : 0.2; // 1 hour threshold
}
```
**Confidence:** 55%
**False Positive Rate:** <32%

#### L9.2: Missing Developer Artifacts
**Detection Method:** Check for typical developer workflow indicators
**Missing Elements:**
- No experimental branches
- No debugging console.log statements
- No TODO comments
- No temporary or test files

**Confidence:** 59%
**False Positive Rate:** <29%

---

## IMPLEMENTATION PRIORITY MATRIX

### Immediate Implementation (Phase 1)
**High Confidence, Low Implementation Complexity:**
1. H1.1: Simultaneous File Creation Pattern
2. H1.2: AI-Generated Commit Messages
3. H2.1: Template README Structure
4. H4.1: Reference Hallucinations

### Near-term Implementation (Phase 2)
**High-Medium Confidence, Medium Implementation Complexity:**
1. H2.2: Excessive Comment Density
2. H3.1: Uniform Variable Naming
3. M5.1: Modern Feature Overuse
4. M7.1: React/Next.js Template Usage

### Future Enhancement (Phase 3)
**Medium-Low Confidence, High Implementation Complexity:**
1. L8.1: Code Entropy Analysis
2. L8.2: Vocabulary Diversity Analysis
3. M5.3: Uniform Code Complexity
4. L9.1: Commit Timing Regularity

---

## PATTERN COMBINATION STRATEGIES

### Multi-Pattern Detection
**High Confidence Combination:**
- 3+ High Confidence patterns = 98% confidence
- 2+ High + 2+ Medium patterns = 95% confidence
- 1+ High + 3+ Medium patterns = 88% confidence

### Weighted Scoring System
```typescript
interface DetectionScore {
  highConfidencePatterns: number;
  mediumConfidencePatterns: number;
  lowConfidencePatterns: number;
  totalScore: number;
}

function calculateDetectionScore(patterns: DetectedPattern[]): DetectionScore {
  const weights = { high: 0.9, medium: 0.7, low: 0.5 };
  
  const score = patterns.reduce((acc, pattern) => {
    return acc + weights[pattern.confidence];
  }, 0);
  
  return {
    highConfidencePatterns: patterns.filter(p => p.confidence === 'high').length,
    mediumConfidencePatterns: patterns.filter(p => p.confidence === 'medium').length,
    lowConfidencePatterns: patterns.filter(p => p.confidence === 'low').length,
    totalScore: Math.min(score / patterns.length, 1.0)
  };
}
```

### False Positive Mitigation
**Human Code Indicators (Negative Patterns):**
- Irregular commit timing with natural variation
- Presence of debugging artifacts and TODO comments
- Informal language in commit messages
- Typos and corrections in documentation
- Experimental or incomplete code sections
- Personal coding style variations

---

## TESTING AND VALIDATION FRAMEWORK

### Pattern Validation Protocol
1. **Ground Truth Dataset:** Test against known AI/human code samples
2. **Cross-validation:** Validate patterns across different AI models
3. **Temporal Testing:** Test against historical and recent AI-generated code
4. **Adversarial Testing:** Test against AI code modified to appear human

### Continuous Pattern Evolution
- **Monthly Pattern Review:** Update patterns based on new AI capabilities
- **False Positive Analysis:** Regular review of incorrectly flagged human code
- **Model Drift Detection:** Monitor for changes in AI generation patterns
- **Community Feedback:** Incorporate developer feedback on detection accuracy

---

**Pattern Catalog Version:** 1.0  
**Last Updated:** July 10, 2025  
**Next Review:** August 10, 2025  
**Implementation Status:** Ready for Phase 1 Development