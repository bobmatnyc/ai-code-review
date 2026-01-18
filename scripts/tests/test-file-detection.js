const fs = require('fs/promises');
const path = require('path');
const { glob } = require('glob');

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Set project root path for correct file references
const projectRoot = path.join(__dirname, '../..');


async function readFile(filePath) {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Error reading file ${filePath}: ${error.message}`);
  }
}

async function getGitignorePatterns(projectPath) {
  const gitignorePath = path.join(projectPath, '.gitignore');

  if (await fileExists(gitignorePath)) {
    const content = await readFile(gitignorePath);
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && \!line.startsWith('#'));
  }

  return [];
}

function shouldIgnoreFile(filePath, patterns, projectRoot) {
  const relativePath = path.relative(projectRoot, filePath);
  console.log('Checking file:', { filePath, relativePath });

  // Check if file matches any gitignore pattern
  for (const pattern of patterns) {
    if (pattern.endsWith('/') && relativePath.startsWith(pattern)) {
      console.log('Ignoring file (directory pattern):', { relativePath, pattern });
      return true;
    }

    if (pattern.includes('*')) {
      const regexPattern = pattern.replace(/\./g, '\.').replace(/\*/g, '.*');

      if (new RegExp(`^${regexPattern}$`).test(relativePath)) {
        console.log('Ignoring file (wildcard pattern):', { relativePath, pattern });
        return true;
      }
    }

    if (relativePath === pattern || relativePath.startsWith(`${pattern}/`)) {
      console.log('Ignoring file (exact pattern):', { relativePath, pattern });
      return true;
    }
  }

  return false;
}

function isTestFile(filePath) {
  const filename = path.basename(filePath);
  const isTest = (
    filename.includes('.test.') ||
    filename.includes('.spec.') ||
    filename.includes('-test.') ||
    filename.includes('-spec.') ||
    filename.includes('_test.') ||
    filename.includes('_spec.') ||
    /\/__tests__\//.test(filePath) ||
    /\/__mocks__\//.test(filePath)
  );

  if (isTest) {
    console.log('Ignoring test file:', filePath);
  }

  return isTest;
}

async function testFileDetection(targetPath) {
  console.log('Testing file detection for:', targetPath);
  const projectRoot = targetPath;

  const gitignorePatterns = await getGitignorePatterns(projectRoot);
  console.log('Gitignore patterns:', gitignorePatterns);

  console.log('Running glob in directory:', targetPath);
  try {
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
    for (const [ext, files] of Object.entries(filesByExt)) {
      console.log(`${ext}: ${files.length} files`);
      // List first 5 files for each extension
      files.slice(0, 5).forEach(file => {
        console.log(`  - ${path.relative(targetPath, file)}`);
      });
      if (files.length > 5) {
        console.log(`  - ... and ${files.length - 5} more`);
      }
    }

    const filteredFiles = allFiles.filter(filePath => {
      // Skip files in gitignore
      if (shouldIgnoreFile(filePath, gitignorePatterns, projectRoot)) {
        return false;
      }

      // Skip test files
      if (isTestFile(filePath)) {
        return false;
      }

      return true;
    });

    console.log(`After filtering, ${filteredFiles.length} files remain`);
    filteredFiles.forEach(file => {
      console.log(`  - ${path.relative(targetPath, file)}`);
    });
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
