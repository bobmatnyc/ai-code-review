#!/usr/bin/env node

/**
 * Output Validation Framework for Extract Patterns Review Type
 * 
 * This module validates the quality and accuracy of extract-patterns output
 * by checking for required sections, content quality, and structural integrity.
 * 
 * Usage:
 *   node tests/extract-patterns/output-validator.js <review-file>
 *   
 * Or as a module:
 *   const { validateExtractPatternsOutput } = require('./output-validator');
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Validation criteria for extract-patterns output
 */
const VALIDATION_CRITERIA = {
  // Required sections that should be present
  requiredSections: [
    'Project Profile',
    'Architecture Patterns',
    'Code Style',
    'Toolchain',
    'Testing Patterns',
    'Replication Guide'
  ],

  // TypeScript-specific sections (when analyzing TypeScript projects)
  typescriptSections: [
    'Type System',
    'TypeScript Configuration',
    'Generic Patterns',
    'Interface Design'
  ],

  // Minimum content requirements
  minContentLength: 2000, // Minimum characters for comprehensive analysis
  minSectionCount: 6,     // Minimum number of major sections
  
  // Quality indicators
  qualityIndicators: [
    'specific examples',
    'code snippets',
    'configuration details',
    'architectural decisions',
    'best practices',
    'patterns',
    'conventions'
  ],

  // Red flags that indicate poor quality
  redFlags: [
    'I cannot',
    'I don\'t have access',
    'Unable to analyze',
    'No information available',
    'Cannot determine',
    'Not enough context'
  ]
};

/**
 * Validation result structure
 */
class ValidationResult {
  constructor() {
    this.score = 0;
    this.maxScore = 0;
    this.passed = false;
    this.sections = {
      found: [],
      missing: []
    };
    this.quality = {
      indicators: [],
      redFlags: []
    };
    this.metrics = {
      contentLength: 0,
      sectionCount: 0,
      codeSnippetCount: 0,
      exampleCount: 0
    };
    this.recommendations = [];
    this.details = [];
  }

  /**
   * Calculate final score as percentage
   */
  getScorePercentage() {
    return this.maxScore > 0 ? Math.round((this.score / this.maxScore) * 100) : 0;
  }

  /**
   * Determine if validation passed
   */
  isPassed() {
    return this.getScorePercentage() >= 70; // 70% threshold for passing
  }
}

/**
 * Extract sections from markdown content
 */
function extractSections(content) {
  const sections = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Match markdown headers (# ## ### etc.)
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const title = headerMatch[2].trim();
      sections.push({ level, title, line });
    }
  }
  
  return sections;
}

/**
 * Count code snippets in content
 */
function countCodeSnippets(content) {
  // Count fenced code blocks
  const fencedBlocks = (content.match(/```[\s\S]*?```/g) || []).length;
  
  // Count inline code
  const inlineCode = (content.match(/`[^`\n]+`/g) || []).length;
  
  return { fencedBlocks, inlineCode, total: fencedBlocks + inlineCode };
}

/**
 * Count examples in content
 */
function countExamples(content) {
  const examplePatterns = [
    /example:/gi,
    /for example/gi,
    /e\.g\./gi,
    /such as/gi,
    /like:/gi
  ];
  
  let count = 0;
  for (const pattern of examplePatterns) {
    const matches = content.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  
  return count;
}

/**
 * Check for quality indicators in content
 */
function checkQualityIndicators(content, indicators) {
  const found = [];
  const contentLower = content.toLowerCase();
  
  for (const indicator of indicators) {
    if (contentLower.includes(indicator.toLowerCase())) {
      found.push(indicator);
    }
  }
  
  return found;
}

/**
 * Check for red flags in content
 */
function checkRedFlags(content, redFlags) {
  const found = [];
  const contentLower = content.toLowerCase();
  
  for (const flag of redFlags) {
    if (contentLower.includes(flag.toLowerCase())) {
      found.push(flag);
    }
  }
  
  return found;
}

/**
 * Validate extract-patterns output
 */
async function validateExtractPatternsOutput(filePath) {
  const result = new ValidationResult();
  
  try {
    // Read the file
    const content = await fs.readFile(filePath, 'utf8');
    result.metrics.contentLength = content.length;
    
    // Extract sections
    const sections = extractSections(content);
    result.metrics.sectionCount = sections.length;
    
    // Check required sections
    result.maxScore += VALIDATION_CRITERIA.requiredSections.length * 10; // 10 points per required section
    
    for (const requiredSection of VALIDATION_CRITERIA.requiredSections) {
      const found = sections.some(section => 
        section.title.toLowerCase().includes(requiredSection.toLowerCase())
      );
      
      if (found) {
        result.sections.found.push(requiredSection);
        result.score += 10;
        result.details.push(`✅ Found required section: ${requiredSection}`);
      } else {
        result.sections.missing.push(requiredSection);
        result.details.push(`❌ Missing required section: ${requiredSection}`);
      }
    }
    
    // Check TypeScript-specific sections (if applicable)
    const isTypeScriptProject = content.toLowerCase().includes('typescript') || 
                               content.toLowerCase().includes('.ts');
    
    if (isTypeScriptProject) {
      result.maxScore += VALIDATION_CRITERIA.typescriptSections.length * 5; // 5 points per TS section
      
      for (const tsSection of VALIDATION_CRITERIA.typescriptSections) {
        const found = sections.some(section => 
          section.title.toLowerCase().includes(tsSection.toLowerCase())
        );
        
        if (found) {
          result.score += 5;
          result.details.push(`✅ Found TypeScript section: ${tsSection}`);
        } else {
          result.details.push(`⚠️  Missing TypeScript section: ${tsSection}`);
        }
      }
    }
    
    // Check content length
    result.maxScore += 20; // 20 points for adequate content length
    if (result.metrics.contentLength >= VALIDATION_CRITERIA.minContentLength) {
      result.score += 20;
      result.details.push(`✅ Content length adequate: ${result.metrics.contentLength} chars`);
    } else {
      result.details.push(`❌ Content too short: ${result.metrics.contentLength} chars (min: ${VALIDATION_CRITERIA.minContentLength})`);
      result.recommendations.push('Increase analysis depth for more comprehensive output');
    }
    
    // Count code snippets and examples
    const codeSnippets = countCodeSnippets(content);
    result.metrics.codeSnippetCount = codeSnippets.total;
    result.metrics.exampleCount = countExamples(content);
    
    // Check for quality indicators
    result.maxScore += 30; // 30 points for quality indicators
    result.quality.indicators = checkQualityIndicators(content, VALIDATION_CRITERIA.qualityIndicators);
    
    const qualityScore = Math.min(30, result.quality.indicators.length * 5);
    result.score += qualityScore;
    
    if (result.quality.indicators.length > 0) {
      result.details.push(`✅ Quality indicators found: ${result.quality.indicators.join(', ')}`);
    } else {
      result.details.push(`❌ No quality indicators found`);
      result.recommendations.push('Include more specific examples and code snippets');
    }
    
    // Check for red flags
    result.quality.redFlags = checkRedFlags(content, VALIDATION_CRITERIA.redFlags);
    
    if (result.quality.redFlags.length > 0) {
      result.score -= result.quality.redFlags.length * 10; // Penalty for red flags
      result.details.push(`❌ Red flags found: ${result.quality.redFlags.join(', ')}`);
      result.recommendations.push('Review model configuration and input quality');
    } else {
      result.details.push(`✅ No red flags detected`);
    }
    
    // Code snippet bonus
    if (result.metrics.codeSnippetCount > 5) {
      result.score += 10;
      result.details.push(`✅ Good code snippet coverage: ${result.metrics.codeSnippetCount} snippets`);
    } else if (result.metrics.codeSnippetCount > 0) {
      result.details.push(`⚠️  Limited code snippets: ${result.metrics.codeSnippetCount} snippets`);
      result.recommendations.push('Include more code examples for better illustration');
    }
    
    // Example bonus
    if (result.metrics.exampleCount > 10) {
      result.score += 10;
      result.details.push(`✅ Rich examples: ${result.metrics.exampleCount} examples`);
    }
    
    // Final validation
    result.passed = result.isPassed();
    
    // Add overall recommendations
    if (!result.passed) {
      result.recommendations.push('Consider adjusting prompt templates for better coverage');
      result.recommendations.push('Verify model has sufficient context about the project');
    }
    
  } catch (error) {
    result.details.push(`❌ Validation error: ${error.message}`);
    result.passed = false;
  }
  
  return result;
}

/**
 * Print validation results
 */
function printValidationResults(result, filePath) {
  console.log(`\n📋 Extract Patterns Output Validation`);
  console.log(`${'='.repeat(50)}`);
  console.log(`File: ${filePath}`);
  console.log(`Score: ${result.getScorePercentage()}% (${result.score}/${result.maxScore})`);
  console.log(`Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log(`\n📊 Metrics:`);
  console.log(`   Content Length: ${result.metrics.contentLength} characters`);
  console.log(`   Sections: ${result.metrics.sectionCount}`);
  console.log(`   Code Snippets: ${result.metrics.codeSnippetCount}`);
  console.log(`   Examples: ${result.metrics.exampleCount}`);
  
  if (result.sections.found.length > 0) {
    console.log(`\n✅ Found Sections (${result.sections.found.length}):`);
    result.sections.found.forEach(section => console.log(`   • ${section}`));
  }
  
  if (result.sections.missing.length > 0) {
    console.log(`\n❌ Missing Sections (${result.sections.missing.length}):`);
    result.sections.missing.forEach(section => console.log(`   • ${section}`));
  }
  
  if (result.quality.indicators.length > 0) {
    console.log(`\n🎯 Quality Indicators:`);
    result.quality.indicators.forEach(indicator => console.log(`   • ${indicator}`));
  }
  
  if (result.quality.redFlags.length > 0) {
    console.log(`\n🚩 Red Flags:`);
    result.quality.redFlags.forEach(flag => console.log(`   • ${flag}`));
  }
  
  if (result.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    result.recommendations.forEach(rec => console.log(`   • ${rec}`));
  }
  
  console.log(`\n📝 Detailed Results:`);
  result.details.forEach(detail => console.log(`   ${detail}`));
}

/**
 * Main function for CLI usage
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: node output-validator.js <review-file>');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  if (!await fs.access(filePath).then(() => true).catch(() => false)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }
  
  const result = await validateExtractPatternsOutput(filePath);
  printValidationResults(result, filePath);
  
  process.exit(result.passed ? 0 : 1);
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Validation error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateExtractPatternsOutput,
  printValidationResults,
  ValidationResult,
  VALIDATION_CRITERIA
};
