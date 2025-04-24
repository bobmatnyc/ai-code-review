#!/usr/bin/env node
/**
 * Normalize frontmatter for all prompt Markdown files under prompts/.
 * - Ensures 'tags' is an array
 * - Adds 'lastModified' date if missing
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const promptsDir = path.resolve(__dirname, '../prompts');
let updated = false;

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  if (!content.startsWith('---')) return;
  const parts = content.split('---');
  if (parts.length < 3) return;
  const fm = parts[1];
  const rest = parts.slice(2).join('---');
  let data;
  try {
    data = yaml.load(fm);
  } catch (err) {
    console.error(`Error parsing YAML in ${filePath}: ${err.message}`);
    return;
  }
  // We will always reformat frontmatter to ensure consistent formatting
  // Normalize tags (ensure array)
  if (data.tags != null && !Array.isArray(data.tags)) {
    data.tags = String(data.tags).split(/\s*,\s*/);
  }
  // Normalize authors field to author
  if (data.authors) {
    data.author = data.authors;
    delete data.authors;
  }
  // Ensure lastModified exists
  if (!data.lastModified) {
    data.lastModified = new Date().toISOString().slice(0, 10);
  }
  // Re-dump frontmatter to ensure proper YAML formatting
  const newFm = yaml.dump(data, { lineWidth: -1 }).trim();
  const newContent = ['---', newFm, '---', rest].join('\n');
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Formatted frontmatter: ${filePath}`);
  updated = true;
}

function walk(dir) {
  fs.readdirSync(dir).forEach((entry) => {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) {
      walk(full);
    } else if (full.endsWith('.md')) {
      processFile(full);
    }
  });
}

if (!fs.existsSync(promptsDir)) {
  console.error(`Prompts directory not found: ${promptsDir}`);
  process.exit(1);
}
walk(promptsDir);
if (updated) {
  console.log('Frontmatter normalization complete.');
} else {
  console.log('No frontmatter changes needed.');
}