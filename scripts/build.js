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
    
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

build();