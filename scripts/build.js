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

/**
 * Generate version.ts file from package.json with build number
 * This ensures package.json is the single source of truth for versioning
 * while also tracking build numbers for deployment verification
 */
function generateVersionFile() {
  console.log('📦 Generating version file from package.json...');

  const fs = require('fs');

  // Read package.json
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = packageJson.version;

  // Read build-number.json to get build number
  const buildNumberPath = path.resolve(__dirname, '../build-number.json');
  let buildNumber = 0;
  try {
    if (fs.existsSync(buildNumberPath)) {
      const buildInfo = JSON.parse(fs.readFileSync(buildNumberPath, 'utf8'));
      buildNumber = buildInfo.buildNumber || 0;
    }
  } catch (error) {
    console.warn('Warning: Could not read build-number.json:', error);
  }

  // Generate version.ts content with build number
  const versionFileContent = `// This file is auto-generated during build from package.json
// Do not edit manually - changes will be overwritten
export const VERSION = '${version}';
export const BUILD_NUMBER = ${buildNumber};
export const VERSION_WITH_BUILD = '${version} (build ${buildNumber})';
`;

  // Write version.ts file
  const versionFilePath = path.resolve(__dirname, '../src/version.ts');
  fs.writeFileSync(versionFilePath, versionFileContent);

  console.log(`✅ Generated version.ts with version '${version} (build ${buildNumber})'`);
}

async function build() {
  try {
    // Generate version file first
    generateVersionFile();

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
    
    // Post-processing to fix specific issues
    const fs = require('fs');
    const path = require('path');
    const outputPath = path.resolve(__dirname, '../dist/index.js');
    
    // Read the bundle
    let content = fs.readFileSync(outputPath, 'utf8');
    
    // Remove any existing shebang and add a new one
    content = content.replace(/^#!.*\n/, '');
    content = '#!/usr/bin/env node\n' + content;
    
    // Fix the OpenAI API test implementation message
    content = content.replace(
      /console\.log\(`OpenAI API: \\u26A0\\uFE0F TEST NOT IMPLEMENTED`\);[\s\S]*?console\.log\(`  OpenAI API test not implemented yet`\);/,
      'try {\n' +
      '    const openAIResult = await testOpenAIConnection();\n' +
      '    console.log(`OpenAI API: ${openAIResult.success ? "\\u2705 CONNECTED" : "\\u274C FAILED"}`);\n' +
      '    console.log(`  ${openAIResult.message}`);\n' +
      '  } catch (error) {\n' +
      '    console.log(`OpenAI API: \\u274C FAILED`);\n' +
      '    console.log(`  Error testing OpenAI API: ${error instanceof Error ? error.message : String(error)}`);\n' +
      '  }'
    );
    
    // Write the updated bundle
    fs.writeFileSync(outputPath, content, 'utf8');
    console.log('Successfully added shebang to dist/index.js');
    
    // Make the file executable
    fs.chmodSync(outputPath, '755');
    console.log('Successfully made dist/index.js executable');
    console.log('✅ Post-processing completed');
    
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

build();