#!/usr/bin/env node

/**
 * Validates YAML frontmatter in prompt templates against the schema
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Required fields for validation
const REQUIRED_FIELDS = ['name', 'description', 'version', 'author', 'reviewType', 'language', 'tags', 'lastModified'];
const VALID_REVIEW_TYPES = [
  'architectural', 'best-practices', 'quick-fixes', 'security', 'performance',
  'unused-code', 'consolidated', 'evaluation', 'extract-patterns', 'coding-test',
  'ai-integration', 'cloud-native', 'developer-experience'
];
const VALID_LANGUAGES = [
  'generic', 'typescript', 'javascript', 'python', 'java', 'csharp',
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin'
];

/**
 * Simple validation function
 */
function validateFrontmatter(frontmatter) {
  const errors = [];

  // Check required fields
  for (const field of REQUIRED_FIELDS) {
    if (!frontmatter[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate specific fields
  if (frontmatter.reviewType && !VALID_REVIEW_TYPES.includes(frontmatter.reviewType)) {
    errors.push(`Invalid reviewType: ${frontmatter.reviewType}`);
  }

  if (frontmatter.language && !VALID_LANGUAGES.includes(frontmatter.language)) {
    errors.push(`Invalid language: ${frontmatter.language}`);
  }

  if (frontmatter.version && !/^\d+\.\d+\.\d+$/.test(frontmatter.version)) {
    errors.push(`Invalid version format: ${frontmatter.version} (should be x.y.z)`);
  }

  if (frontmatter.lastModified && !/^\d{4}-\d{2}-\d{2}$/.test(frontmatter.lastModified)) {
    errors.push(`Invalid lastModified format: ${frontmatter.lastModified} (should be YYYY-MM-DD)`);
  }

  if (frontmatter.tags && !Array.isArray(frontmatter.tags)) {
    errors.push(`Tags should be an array`);
  }

  return errors;
}

/**
 * Extract YAML frontmatter from a Handlebars template file
 */
function extractFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file starts with YAML frontmatter
  if (!content.startsWith('---\n')) {
    return null;
  }
  
  // Find the end of frontmatter
  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return null;
  }
  
  // Extract and parse YAML
  const yamlContent = content.substring(4, endIndex);
  try {
    return yaml.load(yamlContent);
  } catch (error) {
    throw new Error(`Invalid YAML in ${filePath}: ${error.message}`);
  }
}

/**
 * Find all .hbs files in the promptText/languages directory
 */
function findPromptFiles() {
  const languagesDir = path.join(__dirname, '../promptText/languages');
  const files = [];
  
  function scanDirectory(dir) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (entry.endsWith('.hbs')) {
        files.push(fullPath);
      }
    }
  }
  
  scanDirectory(languagesDir);
  return files;
}

/**
 * Validate a single prompt file
 */
function validatePromptFile(filePath) {
  const relativePath = path.relative(process.cwd(), filePath);

  try {
    const frontmatter = extractFrontmatter(filePath);

    if (!frontmatter) {
      return {
        file: relativePath,
        valid: false,
        errors: ['Missing YAML frontmatter']
      };
    }

    const errors = validateFrontmatter(frontmatter);
    const valid = errors.length === 0;

    return {
      file: relativePath,
      valid,
      errors,
      frontmatter: valid ? frontmatter : null
    };

  } catch (error) {
    return {
      file: relativePath,
      valid: false,
      errors: [error.message]
    };
  }
}

/**
 * Main validation function
 */
function main() {
  console.log('🔍 Validating prompt template frontmatter...\n');
  
  const promptFiles = findPromptFiles();
  const results = promptFiles.map(validatePromptFile);
  
  const validFiles = results.filter(r => r.valid);
  const invalidFiles = results.filter(r => !r.valid);
  
  // Report results
  console.log(`📊 Validation Results:`);
  console.log(`   ✅ Valid files: ${validFiles.length}`);
  console.log(`   ❌ Invalid files: ${invalidFiles.length}`);
  console.log(`   📁 Total files: ${results.length}\n`);
  
  if (invalidFiles.length > 0) {
    console.log('❌ Invalid Files:\n');
    invalidFiles.forEach(result => {
      console.log(`   📄 ${result.file}`);
      result.errors.forEach(error => {
        console.log(`      • ${error}`);
      });
      console.log();
    });
  }
  
  if (validFiles.length > 0) {
    console.log('✅ Valid Files Summary:\n');
    const summary = {};
    validFiles.forEach(result => {
      const { reviewType, language } = result.frontmatter;
      const key = `${language}/${reviewType}`;
      if (!summary[key]) {
        summary[key] = [];
      }
      summary[key].push(result.file);
    });
    
    Object.keys(summary).sort().forEach(key => {
      console.log(`   📋 ${key}: ${summary[key].length} file(s)`);
    });
  }
  
  // Exit with error code if validation failed
  if (invalidFiles.length > 0) {
    process.exit(1);
  }
  
  console.log('\n🎉 All prompt templates have valid frontmatter!');
}

if (require.main === module) {
  main();
}

module.exports = {
  validatePromptFile,
  extractFrontmatter,
  findPromptFiles
};
