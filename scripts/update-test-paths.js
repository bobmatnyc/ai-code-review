#!/usr/bin/env node

/**
 * Script to move the remaining test scripts from the root directory to the scripts/tests directory
 * and update any path references to ensure they continue to work.
 */

const fs = require('fs');
const path = require('path');

// Define the project root and destination directories
const projectRoot = path.resolve(__dirname, '..');
const testsDir = path.join(projectRoot, 'scripts', 'tests');
const toolCallingDir = path.join(testsDir, 'tool-calling');

// Ensure directories exist
console.log('Ensuring test directories exist...');
if (!fs.existsSync(testsDir)) {
  fs.mkdirSync(testsDir, { recursive: true });
}
if (!fs.existsSync(toolCallingDir)) {
  fs.mkdirSync(toolCallingDir, { recursive: true });
}

// Files to move to scripts/tests/tool-calling
const toolCallingScripts = [
  'test-mock-data.js',
  'test-mock-serpapi.js',
  'test-gemini.js',
  'test-tool-calling-local.js',
  'run-mock-test.js',
  'run-live-test.js',
  'direct-test.js',
  'direct-test.mjs',
  'real-world-test.js'
];

console.log(`Moving ${toolCallingScripts.length} test scripts to scripts/tests/tool-calling directory...`);

// Function to update file content with correct paths
function updatePathReferences(content, scriptFile) {
  // Add projectRoot variable if it doesn't exist
  if (!content.includes('const projectRoot =')) {
    // Check if path module is already imported
    if (!content.includes("require('path')") && !content.includes('require("path")')) {
      content = content.replace(/^(const|let|var)(.+?)require\(.+?\);/m, 
        '$1$2require($3);\nconst path = require(\'path\');');
    }
    
    // Add projectRoot definition
    content = content.replace(
      /(const path = require\(['"]path['"]\);)/,
      '$1\nconst projectRoot = path.join(__dirname, \'../../..\');'
    );
  }
  
  // Update __dirname references
  content = content.replace(
    /path\.join\(__dirname,\s*(['"])src\//g,
    'path.join(projectRoot, $1src/'
  );
  
  content = content.replace(
    /path\.join\(__dirname,\s*(['"])test-env/g,
    'path.join(projectRoot, $1test-env'
  );
  
  // Update specific paths for test-tool-calling-local.js
  if (scriptFile === 'test-tool-calling-local.js') {
    content = content.replace(
      /const serpApiHelperPath = path\.join\(__dirname, ['"]src\/utils\/dependencies\/serpApiHelper\.ts['"]\);/,
      'const serpApiHelperPath = path.join(projectRoot, \'src/utils/dependencies/serpApiHelper.ts\');'
    );
  }
  
  return content;
}

// Process each tool calling script
let movedCount = 0;
toolCallingScripts.forEach(scriptFile => {
  const sourcePath = path.join(projectRoot, scriptFile);
  const destPath = path.join(toolCallingDir, scriptFile);
  
  if (fs.existsSync(sourcePath)) {
    console.log(`Processing ${scriptFile}...`);
    
    // Read the file content
    let content = fs.readFileSync(sourcePath, 'utf-8');
    
    // Update path references
    content = updatePathReferences(content, scriptFile);
    
    // Write the updated content to the destination file
    fs.writeFileSync(destPath, content);
    console.log(`✓ Moved and updated ${scriptFile} to ${destPath}`);
    
    // Remove the original file
    fs.unlinkSync(sourcePath);
    movedCount++;
  } else {
    console.log(`⚠ File not found: ${sourcePath}`);
  }
});

// Now update paths in all test files
console.log('\nUpdating paths in all test files...');
function updateAllTestFiles(directory) {
  const files = fs.readdirSync(directory);
  
  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Recursively process subdirectories
      updateAllTestFiles(filePath);
    } else if (file.endsWith('.js')) {
      console.log(`Updating paths in ${file}...`);
      
      let content = fs.readFileSync(filePath, 'utf8');
      const isToolCallingFile = filePath.includes('tool-calling');
      
      // Add projectRoot variable if it doesn't exist
      if (!content.includes('const projectRoot = path.join(__dirname')) {
        const pathImport = content.includes('path.join') ? '' : "const path = require('path');\n";
        const projectRootDefinition = `${pathImport}\n// Set project root path for correct file references\nconst projectRoot = path.join(__dirname, ${isToolCallingFile ? '\'../../..\'' : '\'../..\''});\n`;
        
        // Insert after imports but before main code
        const lines = content.split('\n');
        let insertIndex = 0;
        
        // Find a good place to insert the project root definition
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('require(') || lines[i].includes('import ')) {
            insertIndex = i + 1;
          } else if (lines[i].trim() === '' && i > insertIndex) {
            insertIndex = i;
            break;
          }
        }
        
        // Insert at the appropriate position
        if (insertIndex > 0) {
          lines.splice(insertIndex, 0, projectRootDefinition);
          content = lines.join('\n');
        }
      }
      
      // Fix path references
      content = content
        // Fix paths to project directories
        .replace(/path\.join\(__dirname,\s*(['"])src\//g, `path.join(projectRoot, $1src/`)
        .replace(/path\.join\(__dirname,\s*(['"])\.\//g, `path.join(projectRoot, $1./`)
        .replace(/path\.join\(__dirname,\s*(['"])dist\//g, `path.join(projectRoot, $1dist/`)
        .replace(/path\.join\(__dirname,\s*(['"])test-env/g, `path.join(projectRoot, $1test-env`)
        
        // Fix require paths for nested directories
        .replace(/require\(['"]\.\.\/src\//g, `require('${isToolCallingFile ? '../../../' : '../../'}src/`)
        .replace(/require\(['"]\.\//g, `require('${isToolCallingFile ? '../../../' : '../../'}`)
        
        // Handle direct command references
        .replace(/node\s+src\//g, `node ${isToolCallingFile ? '../../../src/' : '../../src/'}`)
        .replace(/node\s+dist\//g, `node ${isToolCallingFile ? '../../../dist/' : '../../dist/'}`);
      
      // Write updated content back to the file
      fs.writeFileSync(filePath, content);
    }
  });
}

// Update all JS files in tests directory
updateAllTestFiles(testsDir);

console.log(`\nMoved ${movedCount} test scripts and updated paths in all test files.`);
console.log('All test scripts have been organized and updated successfully!');