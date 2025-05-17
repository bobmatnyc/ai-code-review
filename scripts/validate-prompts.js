#!/usr/bin/env node
/**
 * Validates frontmatter of all prompt Markdown files under prompts/.
 * Ensures required fields are present and tags are arrays.
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const requiredFields = [
  'name',
  'description',
  'version',
  'author',
  'lastModified',
  'reviewType',
  'tags',
];

let failed = false;

function validateFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Skip files without frontmatter (e.g., README.md or partial overrides)
  if (!content.startsWith('---')) {
    return;
  }
  const parts = content.split('---');
  if (parts.length < 3) {
    console.error(`${filePath}: Invalid frontmatter format.`);
    failed = true;
    return;
  }
  let data;
  try {
    data = yaml.load(parts[1]);
  } catch (err) {
    console.error(`${filePath}: YAML parse error: ${err.message}`);
    failed = true;
    return;
  }
  requiredFields.forEach((field) => {
    if (!(field in data)) {
      console.error(`${filePath}: Missing required field '${field}'.`);
      failed = true;
    }
  });
  if (!Array.isArray(data.tags)) {
    console.error(`${filePath}: 'tags' should be an array.`);
    failed = true;
  }
}

function walk(dir) {
  fs.readdirSync(dir).forEach((entry) => {
    const fullPath = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (entry.endsWith('.md')) {
      validateFile(fullPath);
    }
  });
}

// Check both prompts and promptText directories
const promptsDirs = [
  path.resolve(__dirname, '../prompts'),
  path.resolve(__dirname, '../promptText')
];

let foundDir = null;
for (const dir of promptsDirs) {
  if (fs.existsSync(dir)) {
    foundDir = dir;
    break;
  }
}

if (!foundDir) {
  console.error(`prompts or promptText directory not found`);
  process.exit(1);
}

walk(foundDir);
if (failed) {
  console.error('Prompt validation failed.');
  process.exit(1);
} else {
  console.log('All prompts validated successfully.');
}