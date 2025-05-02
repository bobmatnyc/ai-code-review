#!/usr/bin/env node

/**
 * Build script using esbuild to bundle the AI Code Review CLI.
 * Generates a single executable file at dist/index.js with source maps,
 * and includes a shebang for direct CLI invocation.
 */
const esbuild = require('esbuild');
const path = require('path');
const { dependencies } = require(path.resolve(__dirname, '../package.json'));
const builtinModules = require('module').builtinModules;

const external = [...builtinModules, ...Object.keys(dependencies || {})];

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['src/index.ts'],
      bundle: true,
      platform: 'node',
      target: ['node18'],
      outfile: 'dist/index.js',
      sourcemap: true,
      // Don't use banner option for shebang as it sometimes causes issues
      external,
    });

    // Instead, manually add the shebang at the beginning of the file
    const fs = require('fs');
    let content = fs.readFileSync('dist/index.js', 'utf8');

    // Remove any existing shebang and add a new one
    content = content.replace(/^#!.*\n/, '');
    content = '#!/usr/bin/env node\n' + content;
    fs.writeFileSync('dist/index.js', content, 'utf8');
    console.log('Successfully added shebang to dist/index.js');

    // Make the file executable
    fs.chmodSync('dist/index.js', '755');
    console.log('Successfully made dist/index.js executable');

    // Copy prompts directory to dist
    const promptsDir = path.resolve(__dirname, '../prompts');
    const distPromptsDir = path.resolve(__dirname, '../dist/prompts');

    // Create dist/prompts directory if it doesn't exist
    if (!fs.existsSync(distPromptsDir)) {
      fs.mkdirSync(distPromptsDir, { recursive: true });
    }

    // Function to copy directory recursively
    function copyDir(src, dest) {
      const entries = fs.readdirSync(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          // Create directory if it doesn't exist
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          // Copy contents recursively
          copyDir(srcPath, destPath);
        } else {
          // Copy file
          fs.copyFileSync(srcPath, destPath);
        }
      }
    }

    // Copy prompts directory
    if (fs.existsSync(promptsDir)) {
      copyDir(promptsDir, distPromptsDir);
      console.log('Successfully copied prompts directory to dist/prompts');
    } else {
      console.warn('Prompts directory not found at', promptsDir);
    }

  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

build();