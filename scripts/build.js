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

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: ['node18'],
  outfile: 'dist/index.js',
  sourcemap: true,
  // Do not add a shebang line here, it will be added by the prepare-package.sh script
  // banner: { js: '#!/usr/bin/env node' },
  external,
}).catch((error) => {
  console.error(error);
  process.exit(1);
});