const path = require('path');
const fs = require('fs');
const { glob } = require('glob');

// Function to test file detection
async function testFileDetection(targetPath) {
  console.log('Testing file detection for:', targetPath);
const path = require('path');

// Set project root path for correct file references
const projectRoot = path.join(__dirname, '../..');


  try {
    // Get all files matching the patterns
    const allFiles = await glob('**/*.{ts,tsx,js,jsx,json,md,py,php,java,rb,go,rs,c,cpp,h,hpp,cs,swift,kt}', {
      cwd: targetPath,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.venv/**', '**/env/**', '**/__pycache__/**']
    });

    console.log(`Found ${allFiles.length} files with glob`);

    if (allFiles.length === 0) {
      console.log('No files found matching patterns');
      return;
    }

    // Group files by extension
    const filesByExt = {};
    for (const file of allFiles) {
      const ext = path.extname(file);
      if (\!filesByExt[ext]) {
        filesByExt[ext] = [];
      }
      filesByExt[ext].push(file);
    }

    console.log('Files grouped by extension:');
    for (const ext in filesByExt) {
      const files = filesByExt[ext];
      console.log(`${ext}: ${files.length} files`);
      // List first 5 files for each extension
      files.slice(0, 5).forEach(file => {
        console.log(`  - ${path.relative(targetPath, file)}`);
      });
      if (files.length > 5) {
        console.log(`  - ... and ${files.length - 5} more`);
      }
    }
  } catch (error) {
    console.error('Error during file detection:', error);
  }
}

// Run the test for each project
async function main() {
  const projects = [
    '/Users/masa/Projects/ai-code-review/test-projects/typescript',
    '/Users/masa/Projects/ai-code-review/test-projects/python',
    '/Users/masa/Projects/ai-code-review/test-projects/php'
  ];

  for (const project of projects) {
    console.log('\n=================================');
    console.log(`Testing project: ${path.basename(project)}`);
    console.log('=================================');
    await testFileDetection(project);
  }
}

main().catch(console.error);
