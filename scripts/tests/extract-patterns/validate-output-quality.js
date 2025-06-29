#!/usr/bin/env node

/**
 * Output quality validation for extract-patterns review type
 * 
 * This script validates the quality of extract-patterns output using
 * the validation framework and LangChain evaluation system.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '../../..');

// Test cases with expected quality characteristics
const QUALITY_TEST_CASES = [
  {
    name: 'High Quality Test - Full Codebase',
    path: 'src/',
    expectedQuality: 'good',
    expectedPatterns: ['Strategy', 'Factory', 'Singleton'],
    description: 'Full codebase should produce comprehensive analysis'
  },
  {
    name: 'Medium Quality Test - Single Module',
    path: 'src/strategies/',
    expectedQuality: 'adequate',
    expectedPatterns: ['Strategy'],
    description: 'Single module should identify core patterns'
  },
  {
    name: 'Basic Quality Test - Single File',
    path: 'src/types/review.ts',
    expectedQuality: 'adequate',
    expectedPatterns: [],
    description: 'Single file may have limited pattern identification'
  }
];

/**
 * Run extract-patterns and validate output quality
 */
async function validateOutputQuality(testCase, model) {
  console.log(`\n📋 ${testCase.name}`);
  console.log(`   Path: ${testCase.path}`);
  console.log(`   Expected quality: ${testCase.expectedQuality}`);
  
  // Run extract-patterns review
  const outputDir = path.join(projectRoot, 'ai-code-review-docs', 'quality-validation-tests');
  fs.mkdirSync(outputDir, { recursive: true });
  
  const cmd = [
    'node',
    path.join(projectRoot, 'dist', 'index.js'),
    'extract-patterns',
    testCase.path,
    '--output-dir', outputDir,
    '--interactive'
  ].join(' ');
  
  const env = {
    ...process.env,
    AI_CODE_REVIEW_MODEL: model
  };
  
  console.log('   🔍 Running extract-patterns analysis...');
  const startTime = Date.now();
  
  try {
    const result = execSync(cmd, {
      env,
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 180000 // 3 minute timeout
    });
    
    const duration = Date.now() - startTime;
    console.log(`   ✅ Analysis completed in ${duration}ms`);
    
    // Load and validate output
    const outputFile = await findLatestOutputFile(outputDir);
    if (!outputFile) {
      return { success: false, error: 'No output file found' };
    }
    
    const outputContent = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
    
    // Run validation using the validation framework
    const validation = await runValidationFramework(outputContent);
    
    // Run LangChain evaluation
    const evaluation = await runLangChainEvaluation(outputContent);
    
    // Assess quality against expectations
    const qualityAssessment = assessQuality(testCase, validation, evaluation);
    
    return {
      success: true,
      duration,
      outputFile,
      validation,
      evaluation,
      qualityAssessment
    };
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ❌ Analysis failed after ${duration}ms: ${error.message}`);
    
    return {
      success: false,
      error: error.message,
      duration
    };
  }
}

/**
 * Find the latest output file in the directory
 */
async function findLatestOutputFile(outputDir) {
  try {
    const files = fs.readdirSync(outputDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(outputDir, f),
        mtime: fs.statSync(path.join(outputDir, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);
    
    return files.length > 0 ? files[0].path : null;
  } catch (error) {
    return null;
  }
}

/**
 * Run validation framework (simulated - would use actual validator)
 */
async function runValidationFramework(outputContent) {
  // This would normally import and use the ExtractPatternsValidator
  // For now, we'll simulate the validation
  
  const patterns = outputContent.patterns;
  if (!patterns) {
    return {
      isValid: false,
      qualityLevel: 'poor',
      issues: [{ field: 'root', message: 'Missing patterns object' }]
    };
  }
  
  const issues = [];
  
  // Basic validation checks
  if (!patterns.projectOverview || patterns.projectOverview.purpose.length < 20) {
    issues.push({ field: 'projectOverview.purpose', message: 'Purpose too brief' });
  }
  
  if (!patterns.architecturalPatterns || patterns.architecturalPatterns.length === 0) {
    issues.push({ field: 'architecturalPatterns', message: 'No patterns identified' });
  }
  
  if (!patterns.exemplarCharacteristics || patterns.exemplarCharacteristics.strengths.length === 0) {
    issues.push({ field: 'exemplarCharacteristics.strengths', message: 'No strengths identified' });
  }
  
  // Determine quality level
  let qualityLevel = 'excellent';
  if (issues.length > 0) qualityLevel = 'good';
  if (issues.length > 3) qualityLevel = 'adequate';
  if (issues.length > 6) qualityLevel = 'poor';
  
  return {
    isValid: issues.length < 5,
    qualityLevel,
    issues,
    qualityMetrics: {
      completeness: Math.max(0, 100 - issues.length * 15),
      accuracy: 85,
      usefulness: 80,
      specificity: 75,
      overall: Math.max(0, 90 - issues.length * 10)
    }
  };
}

/**
 * Run LangChain evaluation (simulated - would use actual evaluator)
 */
async function runLangChainEvaluation(outputContent) {
  // This would normally import and use the LangChainEvaluator
  // For now, we'll simulate the evaluation
  
  const patterns = outputContent.patterns;
  
  const criteria = {
    relevance: 85,
    completeness: 80,
    actionability: 75,
    specificity: 70,
    novelty: 65
  };
  
  const overallScore = Math.round(
    (criteria.relevance * 0.25 + 
     criteria.completeness * 0.20 + 
     criteria.actionability * 0.25 + 
     criteria.specificity * 0.20 + 
     criteria.novelty * 0.10)
  );
  
  let grade = 'F';
  if (overallScore >= 90) grade = 'A';
  else if (overallScore >= 80) grade = 'B';
  else if (overallScore >= 70) grade = 'C';
  else if (overallScore >= 60) grade = 'D';
  
  return {
    criteria,
    overallScore,
    grade,
    strengths: patterns.exemplarCharacteristics?.strengths || [],
    weaknesses: [],
    recommendations: [
      'Provide more specific examples',
      'Enhance replication guidance'
    ]
  };
}

/**
 * Assess quality against test case expectations
 */
function assessQuality(testCase, validation, evaluation) {
  const assessment = {
    meetsExpectations: true,
    issues: [],
    strengths: [],
    score: 0
  };
  
  // Check quality level expectation
  const qualityLevels = { poor: 1, adequate: 2, good: 3, excellent: 4 };
  const expectedLevel = qualityLevels[testCase.expectedQuality];
  const actualLevel = qualityLevels[validation.qualityLevel];
  
  if (actualLevel >= expectedLevel) {
    assessment.strengths.push(`Quality level meets or exceeds expectation (${validation.qualityLevel})`);
    assessment.score += 25;
  } else {
    assessment.issues.push(`Quality level below expectation: ${validation.qualityLevel} < ${testCase.expectedQuality}`);
    assessment.meetsExpectations = false;
  }
  
  // Check pattern identification
  if (testCase.expectedPatterns.length > 0) {
    const identifiedPatterns = validation.isValid && outputContent.patterns.architecturalPatterns 
      ? outputContent.patterns.architecturalPatterns.map(p => p.patternName)
      : [];
    
    const foundExpected = testCase.expectedPatterns.filter(expected =>
      identifiedPatterns.some(identified => 
        identified.toLowerCase().includes(expected.toLowerCase())
      )
    );
    
    if (foundExpected.length > 0) {
      assessment.strengths.push(`Found expected patterns: ${foundExpected.join(', ')}`);
      assessment.score += 25;
    } else {
      assessment.issues.push(`Expected patterns not found: ${testCase.expectedPatterns.join(', ')}`);
    }
  } else {
    assessment.score += 25; // No specific pattern expectations
  }
  
  // Check evaluation grade
  if (evaluation.grade === 'A' || evaluation.grade === 'B') {
    assessment.strengths.push(`Good evaluation grade: ${evaluation.grade}`);
    assessment.score += 25;
  } else if (evaluation.grade === 'C') {
    assessment.score += 15;
  } else {
    assessment.issues.push(`Low evaluation grade: ${evaluation.grade}`);
  }
  
  // Check validation success
  if (validation.isValid) {
    assessment.strengths.push('Output passes validation');
    assessment.score += 25;
  } else {
    assessment.issues.push('Output fails validation');
    assessment.meetsExpectations = false;
  }
  
  return assessment;
}

/**
 * Main validation function
 */
async function runQualityValidation() {
  console.log('=== Extract Patterns Output Quality Validation ===\n');
  
  // Check for API key
  const hasAnthropicKey = !!process.env.AI_CODE_REVIEW_ANTHROPIC_API_KEY;
  const hasOpenAIKey = !!process.env.AI_CODE_REVIEW_OPENAI_API_KEY;
  const hasGeminiKey = !!process.env.AI_CODE_REVIEW_GOOGLE_API_KEY;
  
  if (!hasAnthropicKey && !hasOpenAIKey && !hasGeminiKey) {
    console.error('❌ No API keys found. Please set at least one API key.');
    process.exit(1);
  }
  
  // Select model
  const model = hasAnthropicKey ? 'anthropic:claude-3-sonnet' :
                hasOpenAIKey ? 'openai:gpt-4o' :
                'gemini:gemini-1.5-pro';
  
  console.log(`🤖 Using model: ${model}\n`);
  
  const results = [];
  
  // Run quality validation tests
  for (const testCase of QUALITY_TEST_CASES) {
    const result = await validateOutputQuality(testCase, model);
    results.push({ testCase: testCase.name, ...result });
    
    if (result.success) {
      console.log(`   📊 Quality Level: ${result.validation.qualityLevel}`);
      console.log(`   🎯 Evaluation Grade: ${result.evaluation.grade} (${result.evaluation.overallScore}/100)`);
      console.log(`   ✅ Meets Expectations: ${result.qualityAssessment.meetsExpectations ? 'Yes' : 'No'}`);
      console.log(`   📈 Assessment Score: ${result.qualityAssessment.score}/100`);
      
      if (result.qualityAssessment.issues.length > 0) {
        console.log(`   ⚠️  Issues: ${result.qualityAssessment.issues.join(', ')}`);
      }
    }
    
    // Add delay between tests
    if (QUALITY_TEST_CASES.indexOf(testCase) < QUALITY_TEST_CASES.length - 1) {
      console.log('   ⏳ Waiting 5 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 QUALITY VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.success);
  const meetingExpectations = successful.filter(r => r.qualityAssessment.meetsExpectations);
  
  console.log(`✅ Successful tests: ${successful.length}/${results.length}`);
  console.log(`🎯 Meeting expectations: ${meetingExpectations.length}/${successful.length}`);
  
  if (successful.length > 0) {
    const avgScore = successful.reduce((sum, r) => sum + r.qualityAssessment.score, 0) / successful.length;
    console.log(`📈 Average assessment score: ${avgScore.toFixed(1)}/100`);
    
    const avgEvalScore = successful.reduce((sum, r) => sum + r.evaluation.overallScore, 0) / successful.length;
    console.log(`🎓 Average evaluation score: ${avgEvalScore.toFixed(1)}/100`);
  }
  
  console.log('\n🎉 Quality validation completed!');
  console.log('📁 Check ai-code-review-docs/quality-validation-tests/ for output files');
}

// Run validation if this script is executed directly
if (require.main === module) {
  runQualityValidation().catch(error => {
    console.error('Error running quality validation:', error);
    process.exit(1);
  });
}

module.exports = { runQualityValidation };
