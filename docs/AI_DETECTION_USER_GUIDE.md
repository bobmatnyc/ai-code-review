# AI Detection User Guide

## Overview

The AI Code Review tool includes advanced AI detection capabilities designed to identify AI-generated code in submissions. This feature is particularly valuable for hiring assessments, educational evaluations, and maintaining code authenticity standards.

## Table of Contents

- [Getting Started](#getting-started)
- [Understanding AI Detection](#understanding-ai-detection)
- [Confidence Scores and Risk Levels](#confidence-scores-and-risk-levels)
- [Analyzers and Detection Methods](#analyzers-and-detection-methods)
- [Use Cases and Scenarios](#use-cases-and-scenarios)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

## Getting Started

### Basic Usage

Enable AI detection for any coding test evaluation:

```bash
ai-code-review ./candidate-submission --type coding-test --enable-ai-detection
```

### Quick Configuration

```bash
# Standard evaluation with moderate sensitivity
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.7

# Strict evaluation for senior positions
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.6 \
  --ai-detection-fail-on-detection

# Lenient evaluation for educational settings
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.8
```

## Understanding AI Detection

### How AI Detection Works

The AI detection system analyzes multiple aspects of code submissions to identify patterns commonly associated with AI-generated content:

1. **Pattern Recognition**: Identifies structural, stylistic, and behavioral patterns typical of AI-generated code
2. **Multi-Analyzer Approach**: Uses different analyzers to examine various aspects of the submission
3. **Confidence Scoring**: Combines evidence from multiple sources to calculate an overall confidence score
4. **Evidence Collection**: Provides detailed evidence for each detected pattern

### What AI Detection Looks For

**High-Confidence Indicators:**
- Large initial commits with complete, working functionality
- Uniform commit timing patterns that suggest automated generation
- Template-like README files with AI-typical structure and content
- Excessive or unusually uniform commenting throughout the codebase
- Perfect code formatting without typical human inconsistencies

**Medium-Confidence Indicators:**
- Specific coding style patterns associated with AI tools
- Documentation structures that follow AI templates
- Variable naming conventions that are too consistent or follow AI patterns
- Code organization that appears algorithmic rather than human-driven

**Low-Confidence Indicators:**
- Minor stylistic elements that may suggest AI assistance
- Edge case patterns that could indicate AI involvement
- Subtle linguistic patterns in comments or documentation

### Detection Limitations

**What AI Detection Cannot Do:**
- Detect all forms of AI assistance (especially sophisticated or heavily modified AI output)
- Differentiate between different AI tools with perfect accuracy
- Identify human-AI collaboration where AI output has been significantly modified
- Account for all legitimate coding practices that may appear AI-like

**False Positive Scenarios:**
- Highly skilled developers with very consistent coding practices
- Code following strict style guides or templates
- Projects based on well-known patterns or frameworks
- Developers who use code generation tools legitimately

## Confidence Scores and Risk Levels

### Confidence Score Ranges

| Score Range | Risk Level | Interpretation | Recommended Action |
|-------------|------------|----------------|-------------------|
| 0.9 - 1.0   | **CRITICAL** | Strong indicators of AI-generated content | Immediate manual review, likely AI-generated |
| 0.8 - 0.9   | **HIGH** | Multiple AI patterns detected | Manual review required, interview candidate |
| 0.6 - 0.8   | **MEDIUM** | Some concerning patterns | Additional scrutiny, consider follow-up questions |
| 0.4 - 0.6   | **LOW** | Minor indicators present | Proceed with standard evaluation |
| 0.0 - 0.4   | **MINIMAL** | Likely human-authored | Standard evaluation process |

### Interpreting Results

**High Confidence Detection (0.8+):**
- Multiple strong indicators present
- Recommendation: Always follow up with technical interview
- Consider requesting live coding demonstration
- Review specific patterns that triggered detection

**Medium Confidence Detection (0.6-0.8):**
- Some patterns detected but not conclusive
- Recommendation: Additional verification through questions or interview
- May indicate partial AI assistance or sophisticated human coding

**Low Confidence Detection (0.4-0.6):**
- Minor indicators that could have alternative explanations
- Recommendation: Standard evaluation with awareness of potential concerns
- Document findings for consistency

## Analyzers and Detection Methods

### Available Analyzers

#### Git History Analyzer
**What it analyzes:**
- Commit patterns and timing
- Commit message structure and content
- Development workflow patterns
- Repository initialization patterns

**Key patterns detected:**
- Large initial commits with complete functionality
- Uniform commit timing (e.g., exactly every 30 minutes)
- AI-typical commit messages
- Unusual development workflows

**Enable with:** `--ai-detection-analyzers git`

#### Documentation Analyzer
**What it analyzes:**
- README file structure and content
- Code comments and documentation
- Project description patterns
- Documentation completeness and style

**Key patterns detected:**
- Template-like README structures
- AI-typical language patterns
- Excessive or uniform commenting
- Perfect documentation without human inconsistencies

**Enable with:** `--ai-detection-analyzers documentation`

#### Future Analyzers (In Development)

**Structural Analyzer:**
- Code organization patterns
- Naming conventions
- Architectural patterns
- File structure analysis

**Statistical Analyzer:**
- Code complexity metrics
- Style consistency analysis
- Variable naming patterns
- Function/class distribution

**Linguistic Analyzer:**
- Natural language patterns in comments
- Variable and function naming analysis
- Documentation writing style
- Language complexity metrics

### Configuring Analyzers

```bash
# Use all available analyzers
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-analyzers git,documentation

# Use only git analysis (faster, focuses on development patterns)
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-analyzers git

# Use only documentation analysis (good for projects with limited git history)
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-analyzers documentation
```

## Use Cases and Scenarios

### Hiring and Technical Assessments

#### Senior Developer Positions
```bash
# Strict evaluation with low threshold
ai-code-review ./candidate-submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.6 \
  --ai-detection-analyzers git,documentation \
  --ai-detection-include-in-report
```

**Rationale:** Senior positions require high code authenticity. Lower threshold catches more potential AI usage.

#### Junior Developer Positions
```bash
# Moderate evaluation
ai-code-review ./candidate-submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.75 \
  --ai-detection-include-in-report
```

**Rationale:** More lenient threshold accounts for learning and potential legitimate tool usage.

#### Critical Security Roles
```bash
# Maximum security with automatic failure
ai-code-review ./candidate-submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.65 \
  --ai-detection-fail-on-detection \
  --ai-detection-analyzers git,documentation
```

**Rationale:** Security roles require uncompromising code authenticity.

### Educational Settings

#### University Coursework
```bash
# Educational evaluation with detailed feedback
ai-code-review ./student-project --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.75 \
  --ai-detection-include-in-report
```

**Best Practices for Educators:**
- Use results as teaching opportunities
- Discuss AI detection with students transparently
- Establish clear policies about AI assistance
- Focus on learning rather than punishment

#### Coding Bootcamps
```bash
# Progressive evaluation (stricter for final projects)
ai-code-review ./final-project --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.7 \
  --ai-detection-include-in-report
```

### Code Review and Quality Assurance

#### Internal Code Reviews
```bash
# Light detection for team awareness
ai-code-review ./feature-branch --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.8 \
  --ai-detection-include-in-report
```

#### Open Source Contributions
```bash
# Standard evaluation for community contributions
ai-code-review ./pr-branch --type coding-test \
  --enable-ai-detection \
  --ai-detection-threshold 0.75
```

## Best Practices

### For Hiring Managers

#### Setting Appropriate Thresholds
- **0.6-0.7**: Strict evaluation for senior roles, security positions
- **0.7-0.8**: Standard evaluation for most technical positions
- **0.8-0.9**: Lenient evaluation for junior roles, educational contexts

#### Evaluation Process
1. **Run AI Detection First**: Get objective analysis before human review
2. **Review Detected Patterns**: Understand what specific patterns were found
3. **Combine with Interviews**: Always follow up high-confidence detections
4. **Document Decisions**: Keep records for consistency and legal compliance
5. **Consider Context**: Factor in assignment complexity and time constraints

#### Communication Guidelines
- Be transparent about AI detection usage when legally appropriate
- Focus on code authenticity rather than accusation
- Provide candidates opportunity to explain or demonstrate understanding
- Use results as conversation starters, not definitive judgments

### For Educators

#### Pedagogical Approach
1. **Educational Tool**: Use AI detection as teaching about code authenticity
2. **Clear Policies**: Establish guidelines about AI assistance from course start
3. **Progressive Thresholds**: Start lenient, increase strictness as course progresses
4. **Discussion Opportunities**: Use detections to facilitate learning conversations

#### Implementation Strategy
- Introduce AI detection concept early in courses
- Explain what patterns indicate potential AI usage
- Encourage questions about legitimate tool usage
- Focus on learning outcomes rather than punishment

### For Team Leads and Code Reviewers

#### Team Standards
1. **Policy Development**: Establish clear team guidelines about AI assistance
2. **Quality Assurance**: Use detection to maintain consistent code standards
3. **Process Integration**: Incorporate into existing code review workflows
4. **Continuous Improvement**: Adjust thresholds based on team needs

## Troubleshooting

### Common Issues and Solutions

#### False Positives

**Issue**: Clean, well-structured code triggers AI detection
**Solutions:**
- Increase threshold (try 0.8 or higher)
- Review specific patterns that triggered detection
- Consider developer's consistent coding practices
- Use multiple evaluation methods

**Issue**: Code following strict style guides triggers detection
**Solutions:**
- Document your organization's coding standards
- Adjust threshold for teams with strict guidelines
- Focus on git history rather than code structure patterns

#### False Negatives

**Issue**: Suspected AI-generated code not detected
**Solutions:**
- Lower threshold (try 0.6 or lower)
- Enable additional analyzers
- Combine with manual review
- Consider that sophisticated AI usage may be undetectable

#### Performance Issues

**Issue**: AI detection takes too long
**Solutions:**
- Use fewer analyzers (just `git` for fastest results)
- Increase timeout settings
- Process smaller code submissions
- Enable caching for repeated analyses

### Debug Mode

Enable detailed logging to understand detection process:

```bash
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --debug
```

This provides:
- Detailed analyzer execution logs
- Pattern detection reasoning
- Performance metrics
- Error details if issues occur

### Configuration Validation

Check your AI detection configuration:

```bash
# Validate analyzer names
ai-code-review ./submission --type coding-test \
  --enable-ai-detection \
  --ai-detection-analyzers git,documentation,invalid_analyzer
```

The tool will warn about invalid analyzer names and continue with valid ones.

## FAQ

### General Questions

**Q: How accurate is AI detection?**
A: AI detection provides probabilistic assessment, not definitive proof. Accuracy depends on the sophistication of AI tools used and how much the code has been modified. Current implementation focuses on high-confidence patterns to minimize false positives.

**Q: Can AI detection identify all AI-generated code?**
A: No. Sophisticated AI tools and heavily modified AI output may not be detected. AI detection should be combined with other evaluation methods.

**Q: Does AI detection send code to external services?**
A: No. All analysis is performed locally. No code is transmitted to external services.

### Technical Questions

**Q: Which analyzers should I use?**
A: Start with `git,documentation` for balanced analysis. Use only `git` for faster analysis focusing on development patterns. Add more analyzers as they become available for comprehensive analysis.

**Q: What threshold should I set?**
A: Start with 0.7 for balanced sensitivity. Use 0.6-0.65 for strict evaluation, 0.8+ for lenient evaluation. Adjust based on your specific needs and false positive/negative rates.

**Q: Can I use AI detection without the coding-test review type?**
A: Currently, AI detection is specifically designed for coding test evaluations and is only available with the `--type coding-test` option.

### Legal and Ethical Questions

**Q: Should I tell candidates about AI detection?**
A: Consider your local laws and organizational policies. Transparency is generally recommended when legally permissible.

**Q: Can I automatically fail candidates based on AI detection alone?**
A: While the `--ai-detection-fail-on-detection` option exists, it's recommended to combine AI detection with human review and follow-up evaluation.

**Q: How should I handle high-confidence detections?**
A: Always follow up with additional evaluation methods such as technical interviews, live coding sessions, or detailed code explanation requests.

### Performance Questions

**Q: How long does AI detection take?**
A: Typically 2-10 seconds depending on code size and enabled analyzers. Git analysis is fastest, documentation analysis may take longer for projects with extensive documentation.

**Q: Can I speed up AI detection?**
A: Use fewer analyzers (just `git` for fastest), enable caching, or process smaller code submissions.

**Q: Does AI detection work with all programming languages?**
A: Yes, AI detection focuses on patterns that are language-agnostic (git history, documentation structure, etc.) rather than language-specific code analysis.

## Support and Updates

### Getting Help

If you encounter issues with AI detection:

1. Check this user guide for common solutions
2. Enable debug mode for detailed logging
3. Review the troubleshooting section
4. Check project documentation and GitHub issues

### Staying Updated

AI detection capabilities are continuously improved:

- New analyzers are added regularly
- Detection patterns are refined based on feedback
- Performance optimizations are ongoing
- Keep the tool updated for latest improvements

### Contributing Feedback

Help improve AI detection by:

- Reporting false positives/negatives with context
- Suggesting new pattern types to detect
- Sharing use case requirements
- Contributing to documentation improvements

---

*This guide covers AI detection features in AI Code Review v4.3.1+. For the latest updates and features, check the project documentation.*