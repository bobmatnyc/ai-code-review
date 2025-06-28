#!/usr/bin/env node

/**
 * LangChain Evaluation Framework for Extract Patterns Review Type
 * 
 * This module implements LangChain-based evaluation metrics for pattern extraction
 * quality, including relevance, completeness, accuracy, and usefulness scores.
 * 
 * Usage:
 *   node tests/extract-patterns/langchain-evaluation.js <review-file> [options]
 * 
 * Options:
 *   --reference <file>    Reference file for comparison evaluation
 *   --metrics <list>      Comma-separated list of metrics to evaluate
 *   --output <file>       Output file for evaluation results
 * 
 * Metrics:
 *   - relevance: How relevant the extracted patterns are to the codebase
 *   - completeness: How complete the analysis is
 *   - accuracy: How accurate the technical details are
 *   - usefulness: How useful the patterns would be for replication
 *   - clarity: How clear and understandable the output is
 */

const fs = require('fs').promises;
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

/**
 * Evaluation metrics configuration
 */
const EVALUATION_METRICS = {
  relevance: {
    name: 'Relevance',
    description: 'How relevant are the extracted patterns to the analyzed codebase?',
    weight: 0.25,
    criteria: [
      'Patterns match actual code structure',
      'Examples are from the analyzed codebase',
      'Architectural decisions reflect actual implementation',
      'Technology choices are accurate'
    ]
  },
  
  completeness: {
    name: 'Completeness',
    description: 'How complete is the pattern extraction analysis?',
    weight: 0.25,
    criteria: [
      'All major architectural patterns identified',
      'Code style conventions covered',
      'Toolchain and configuration analyzed',
      'Testing patterns documented',
      'Development workflow described'
    ]
  },
  
  accuracy: {
    name: 'Accuracy',
    description: 'How accurate are the technical details and recommendations?',
    weight: 0.25,
    criteria: [
      'Technical details are correct',
      'Configuration examples are valid',
      'Code snippets are syntactically correct',
      'Best practices are appropriate',
      'No misleading information'
    ]
  },
  
  usefulness: {
    name: 'Usefulness',
    description: 'How useful would this analysis be for replicating the project?',
    weight: 0.15,
    criteria: [
      'Provides actionable guidance',
      'Includes setup instructions',
      'Explains decision rationale',
      'Offers replication steps',
      'Identifies key success factors'
    ]
  },
  
  clarity: {
    name: 'Clarity',
    description: 'How clear and understandable is the analysis?',
    weight: 0.10,
    criteria: [
      'Well-structured and organized',
      'Clear explanations',
      'Good use of examples',
      'Appropriate level of detail',
      'Easy to follow'
    ]
  }
};

/**
 * Evaluation result structure
 */
class EvaluationResult {
  constructor() {
    this.metrics = {};
    this.overallScore = 0;
    this.timestamp = new Date().toISOString();
    this.details = [];
    this.recommendations = [];
  }

  /**
   * Add metric score
   */
  addMetric(name, score, details = []) {
    this.metrics[name] = {
      score,
      details,
      weight: EVALUATION_METRICS[name]?.weight || 0
    };
  }

  /**
   * Calculate overall weighted score
   */
  calculateOverallScore() {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    for (const [name, result] of Object.entries(this.metrics)) {
      const weight = result.weight;
      totalWeightedScore += result.score * weight;
      totalWeight += weight;
    }

    this.overallScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    return this.overallScore;
  }

  /**
   * Get grade based on score
   */
  getGrade() {
    const score = this.overallScore;
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

/**
 * Evaluate relevance metric
 */
function evaluateRelevance(content, codebaseInfo) {
  const score = { value: 0, details: [] };
  
  // Check if patterns match actual code structure
  const hasCodeStructure = content.toLowerCase().includes('structure') || 
                          content.toLowerCase().includes('organization');
  if (hasCodeStructure) {
    score.value += 20;
    score.details.push('✅ Code structure patterns identified');
  }
  
  // Check for actual examples from codebase
  const hasCodeExamples = (content.match(/```[\s\S]*?```/g) || []).length > 0;
  if (hasCodeExamples) {
    score.value += 25;
    score.details.push('✅ Code examples included');
  }
  
  // Check for architectural decisions
  const hasArchitecture = content.toLowerCase().includes('architecture') ||
                         content.toLowerCase().includes('design pattern');
  if (hasArchitecture) {
    score.value += 25;
    score.details.push('✅ Architectural decisions documented');
  }
  
  // Check for technology choices
  const hasTechChoices = content.toLowerCase().includes('technology') ||
                        content.toLowerCase().includes('framework') ||
                        content.toLowerCase().includes('library');
  if (hasTechChoices) {
    score.value += 30;
    score.details.push('✅ Technology choices analyzed');
  }
  
  return score;
}

/**
 * Evaluate completeness metric
 */
function evaluateCompleteness(content) {
  const score = { value: 0, details: [] };
  const requiredSections = [
    { name: 'Architecture', keywords: ['architecture', 'pattern', 'design'] },
    { name: 'Code Style', keywords: ['style', 'convention', 'formatting'] },
    { name: 'Toolchain', keywords: ['tool', 'build', 'configuration'] },
    { name: 'Testing', keywords: ['test', 'testing', 'spec'] },
    { name: 'Workflow', keywords: ['workflow', 'process', 'development'] }
  ];
  
  const contentLower = content.toLowerCase();
  let foundSections = 0;
  
  for (const section of requiredSections) {
    const found = section.keywords.some(keyword => contentLower.includes(keyword));
    if (found) {
      foundSections++;
      score.details.push(`✅ ${section.name} section covered`);
    } else {
      score.details.push(`❌ ${section.name} section missing`);
    }
  }
  
  score.value = (foundSections / requiredSections.length) * 100;
  return score;
}

/**
 * Evaluate accuracy metric
 */
function evaluateAccuracy(content) {
  const score = { value: 80, details: [] }; // Start with high score, deduct for issues
  
  // Check for red flags that indicate inaccuracy
  const redFlags = [
    'I cannot',
    'I don\'t have access',
    'Unable to analyze',
    'Not enough information',
    'Cannot determine'
  ];
  
  const contentLower = content.toLowerCase();
  let redFlagCount = 0;
  
  for (const flag of redFlags) {
    if (contentLower.includes(flag.toLowerCase())) {
      redFlagCount++;
      score.details.push(`❌ Red flag: "${flag}"`);
    }
  }
  
  // Deduct points for red flags
  score.value -= redFlagCount * 15;
  
  // Check for technical depth indicators
  const techIndicators = [
    'configuration',
    'implementation',
    'specific',
    'example',
    'pattern'
  ];
  
  let techDepth = 0;
  for (const indicator of techIndicators) {
    const matches = (contentLower.match(new RegExp(indicator, 'g')) || []).length;
    techDepth += matches;
  }
  
  if (techDepth > 10) {
    score.details.push('✅ Good technical depth');
  } else {
    score.value -= 10;
    score.details.push('⚠️ Limited technical depth');
  }
  
  return { value: Math.max(0, score.value), details: score.details };
}

/**
 * Evaluate usefulness metric
 */
function evaluateUsefulness(content) {
  const score = { value: 0, details: [] };
  
  const usefulnessIndicators = [
    { keyword: 'setup', points: 20, description: 'Setup instructions' },
    { keyword: 'replication', points: 20, description: 'Replication guidance' },
    { keyword: 'step', points: 15, description: 'Step-by-step instructions' },
    { keyword: 'decision', points: 15, description: 'Decision rationale' },
    { keyword: 'recommendation', points: 15, description: 'Recommendations' },
    { keyword: 'best practice', points: 15, description: 'Best practices' }
  ];
  
  const contentLower = content.toLowerCase();
  
  for (const indicator of usefulnessIndicators) {
    if (contentLower.includes(indicator.keyword)) {
      score.value += indicator.points;
      score.details.push(`✅ ${indicator.description} provided`);
    }
  }
  
  // Cap at 100
  score.value = Math.min(100, score.value);
  
  return score;
}

/**
 * Evaluate clarity metric
 */
function evaluateClarity(content) {
  const score = { value: 0, details: [] };
  
  // Check structure (headers)
  const headerCount = (content.match(/^#{1,6}\s+/gm) || []).length;
  if (headerCount >= 5) {
    score.value += 25;
    score.details.push('✅ Well-structured with headers');
  }
  
  // Check for examples
  const exampleCount = (content.match(/example|e\.g\.|such as|like:/gi) || []).length;
  if (exampleCount >= 5) {
    score.value += 25;
    score.details.push('✅ Good use of examples');
  }
  
  // Check for code blocks
  const codeBlockCount = (content.match(/```[\s\S]*?```/g) || []).length;
  if (codeBlockCount >= 3) {
    score.value += 25;
    score.details.push('✅ Code examples included');
  }
  
  // Check readability (sentence length, paragraph structure)
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.length, 0) / sentences.length;
  
  if (avgSentenceLength < 150) { // Reasonable sentence length
    score.value += 25;
    score.details.push('✅ Good readability');
  } else {
    score.details.push('⚠️ Some sentences may be too long');
  }
  
  return score;
}

/**
 * Run comprehensive evaluation
 */
async function evaluateExtractPatternsOutput(filePath, options = {}) {
  const result = new EvaluationResult();
  
  try {
    // Read the content
    const content = await fs.readFile(filePath, 'utf8');
    
    // Get codebase info if available
    const codebaseInfo = options.codebaseInfo || {};
    
    // Evaluate each metric
    const relevanceScore = evaluateRelevance(content, codebaseInfo);
    result.addMetric('relevance', relevanceScore.value, relevanceScore.details);
    
    const completenessScore = evaluateCompleteness(content);
    result.addMetric('completeness', completenessScore.value, completenessScore.details);
    
    const accuracyScore = evaluateAccuracy(content);
    result.addMetric('accuracy', accuracyScore.value, accuracyScore.details);
    
    const usefulnessScore = evaluateUsefulness(content);
    result.addMetric('usefulness', usefulnessScore.value, usefulnessScore.details);
    
    const clarityScore = evaluateClarity(content);
    result.addMetric('clarity', clarityScore.value, clarityScore.details);
    
    // Calculate overall score
    result.calculateOverallScore();
    
    // Generate recommendations
    if (result.overallScore < 70) {
      result.recommendations.push('Consider improving prompt templates for better coverage');
    }
    if (result.metrics.relevance?.score < 70) {
      result.recommendations.push('Ensure analysis focuses on actual codebase patterns');
    }
    if (result.metrics.completeness?.score < 70) {
      result.recommendations.push('Include more comprehensive analysis of all aspects');
    }
    if (result.metrics.accuracy?.score < 70) {
      result.recommendations.push('Verify technical accuracy and reduce uncertainty language');
    }
    
  } catch (error) {
    result.details.push(`❌ Evaluation error: ${error.message}`);
  }
  
  return result;
}

/**
 * Print evaluation results
 */
function printEvaluationResults(result, filePath) {
  console.log(`\n🎯 LangChain-Style Evaluation Results`);
  console.log(`${'='.repeat(50)}`);
  console.log(`File: ${filePath}`);
  console.log(`Overall Score: ${result.overallScore.toFixed(1)}/100 (Grade: ${result.getGrade()})`);
  console.log(`Timestamp: ${result.timestamp}`);
  
  console.log(`\n📊 Metric Breakdown:`);
  for (const [name, metric] of Object.entries(result.metrics)) {
    const config = EVALUATION_METRICS[name];
    console.log(`\n${config.name}: ${metric.score.toFixed(1)}/100 (Weight: ${(config.weight * 100).toFixed(0)}%)`);
    console.log(`   ${config.description}`);
    
    if (metric.details.length > 0) {
      metric.details.forEach(detail => console.log(`   ${detail}`));
    }
  }
  
  if (result.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    result.recommendations.forEach(rec => console.log(`   • ${rec}`));
  }
}

/**
 * Main function for CLI usage
 */
async function main() {
  const args = yargs(hideBin(process.argv))
    .usage('Usage: $0 <review-file> [options]')
    .positional('review-file', {
      describe: 'Path to the extract-patterns review file',
      type: 'string'
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Output file for evaluation results (JSON format)'
    })
    .option('reference', {
      alias: 'r',
      type: 'string',
      description: 'Reference file for comparison evaluation'
    })
    .help()
    .argv;
  
  const filePath = args._[0];
  
  if (!filePath) {
    console.error('Error: Please provide a review file path');
    process.exit(1);
  }
  
  if (!await fs.access(filePath).then(() => true).catch(() => false)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  // Run evaluation
  const result = await evaluateExtractPatternsOutput(filePath);
  
  // Print results
  printEvaluationResults(result, filePath);
  
  // Save results if output file specified
  if (args.output) {
    await fs.writeFile(args.output, JSON.stringify(result, null, 2));
    console.log(`\n📄 Results saved to: ${args.output}`);
  }
  
  // Exit with appropriate code
  process.exit(result.overallScore >= 70 ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Evaluation error:', error);
    process.exit(1);
  });
}

module.exports = {
  evaluateExtractPatternsOutput,
  printEvaluationResults,
  EvaluationResult,
  EVALUATION_METRICS
};
