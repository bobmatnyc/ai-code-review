/**
 * Script to fix template variable syntax in Handlebars files
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Find all Handlebars templates
async function main() {
  const files = await glob('promptText/**/*.hbs');
  
  console.log(`Found ${files.length} Handlebars template files`);
  
  let updated = 0;
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    // Replace {{SCHEMA_INSTRUCTIONS}} with proper Handlebars syntax
    let newContent = content.replace(
      /{{SCHEMA_INSTRUCTIONS}}/g, 
      '{{#if schemaInstructions}}\n{{{schemaInstructions}}}\n{{/if}}'
    );
    
    // Replace {{LANGUAGE_INSTRUCTIONS}} with proper Handlebars syntax
    newContent = newContent.replace(
      /{{LANGUAGE_INSTRUCTIONS}}/g, 
      '{{#if languageInstructions}}\n{{{languageInstructions}}}\n{{/if}}'
    );
    
    // Only write if changes were made
    if (content !== newContent) {
      fs.writeFileSync(file, newContent, 'utf-8');
      console.log(`Updated ${file}`);
      updated++;
    }
  }
  
  console.log(`Updated ${updated} files`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});