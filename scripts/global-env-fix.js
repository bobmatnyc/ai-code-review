#!/usr/bin/env node

/**
 * This script directly fixes the environment loading issue in global installations
 * without requiring a full package update.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Possible global installation paths
const possiblePaths = [
  '/opt/homebrew/lib/node_modules/@bobmatnyc/ai-code-review',
  process.env.NODE_PATH ? path.join(process.env.NODE_PATH, '@bobmatnyc/ai-code-review') : null,
  path.join(process.env.HOME || process.env.USERPROFILE, '.nvm/versions/node/*/lib/node_modules/@bobmatnyc/ai-code-review'),
  '/usr/local/lib/node_modules/@bobmatnyc/ai-code-review',
  '/usr/lib/node_modules/@bobmatnyc/ai-code-review'
].filter(Boolean);

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Fix the index.js file in the global installation
 */
function fixIndexJs(installPath) {
  console.log(`\nAttempting to fix ${installPath}/dist/index.js...`);
  
  try {
    // Check if the file exists
    if (!fs.existsSync(path.join(installPath, 'dist', 'index.js'))) {
      console.error(`❌ Could not find index.js in ${installPath}/dist`);
      return false;
    }
    
    // Read the file
    const filePath = path.join(installPath, 'dist', 'index.js');
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Apply the fix - look for the problematic code
    if (content.includes('const envPath = path.resolve(process.cwd(), \'.env\');')) {
      console.log('Found the problematic code section, applying fix...');
      
      // Create a backup
      fs.writeFileSync(filePath + '.bak', content, 'utf8');
      console.log(`Created backup at ${filePath}.bak`);
      
      // Replace the code with our fix
      content = content.replace(
        '.env.local file not found. Trying to load from .env',
        'No .env.local found in tool directory or current directory. Continuing without loading environment variables.'
      );
      
      // Remove the code that tries to load .env and fails
      content = content.replace(
        /\/\/ Try to load from \.env as fallback[\s\S]*?try {[\s\S]*?const result = dotenv\.config\({ path: envPath }\);[\s\S]*?if \(result\.error\) {[\s\S]*?console\.error\('Error loading \.env file:', result\.error\);[\s\S]*?} else {[\s\S]*?debugLog\('Successfully loaded environment variables from \.env'\);[\s\S]*?}[\s\S]*?} catch \(err\) {[\s\S]*?console\.error\('Error loading any environment files:', err\);[\s\S]*?}/,
        '// Skip loading .env to avoid errors\n            debugLog(\'Continuing without environment files\');'
      );
      
      // Write the fixed content
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Successfully fixed ${filePath}`);
      return true;
    } else {
      console.log('⚠️ Could not find the exact code pattern to fix. The file may already be fixed or has a different structure.');
      return false;
    }
  } catch (error) {
    console.error(`❌ Error fixing index.js: ${error.message}`);
    return false;
  }
}

/**
 * Create or update .env.local file in the installation directory
 */
function createEnvFile(installPath) {
  return new Promise((resolve) => {
    console.log(`\nWould you like to create a .env.local file in ${installPath}? (y/N): `);
    rl.question('', (answer) => {
      if (answer.toLowerCase() === 'y') {
        let apiKeys = {};
        
        console.log('\nPlease enter your API keys (leave blank if not available):');
        
        rl.question('Google Gemini API Key: ', (googleKey) => {
          if (googleKey.trim()) apiKeys.AI_CODE_REVIEW_GOOGLE_API_KEY = googleKey.trim();
          
          rl.question('Anthropic API Key: ', (anthropicKey) => {
            if (anthropicKey.trim()) apiKeys.AI_CODE_REVIEW_ANTHROPIC_API_KEY = anthropicKey.trim();
            
            rl.question('OpenAI API Key: ', (openaiKey) => {
              if (openaiKey.trim()) apiKeys.AI_CODE_REVIEW_OPENAI_API_KEY = openaiKey.trim();
              
              rl.question('OpenRouter API Key: ', (openrouterKey) => {
                if (openrouterKey.trim()) apiKeys.AI_CODE_REVIEW_OPENROUTER_API_KEY = openrouterKey.trim();
                
                rl.question('Default Model (default: gemini:gemini-1.5-pro): ', (model) => {
                  apiKeys.AI_CODE_REVIEW_MODEL = model.trim() || 'gemini:gemini-1.5-pro';
                  
                  try {
                    const envPath = path.join(installPath, '.env.local');
                    let content = '';
                    
                    // Create the env file content
                    for (const [key, value] of Object.entries(apiKeys)) {
                      content += `${key}=${value}\n`;
                    }
                    
                    // Write the file
                    fs.writeFileSync(envPath, content, 'utf8');
                    console.log(`✅ Successfully created ${envPath}`);
                    resolve(true);
                  } catch (error) {
                    console.error(`❌ Error creating .env.local: ${error.message}`);
                    console.log('You may need to run this script with sudo.');
                    resolve(false);
                  }
                });
              });
            });
          });
        });
      } else {
        resolve(false);
      }
    });
  });
}

/**
 * Main function
 */
async function main() {
  console.log('AI Code Review Global Environment Fix');
  console.log('====================================');
  console.log('This script fixes environment loading issues in globally installed AI Code Review.');
  
  // Find global installation paths
  console.log('\nSearching for global installations...');
  const existingPaths = [];
  
  for (const path of possiblePaths) {
    try {
      if (fs.existsSync(path)) {
        existingPaths.push(path);
        console.log(`✅ Found installation at: ${path}`);
      }
    } catch (e) {
      // Skip paths that cause errors
    }
  }
  
  // Allow user to specify custom path
  console.log('\nWould you like to specify a custom installation path? (y/N): ');
  rl.question('', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      rl.question('Enter the full path to your installation: ', async (customPath) => {
        if (customPath.trim() && fs.existsSync(customPath.trim())) {
          existingPaths.push(customPath.trim());
        } else {
          console.error('❌ Invalid path or path does not exist.');
        }
        await processPaths(existingPaths);
      });
    } else {
      await processPaths(existingPaths);
    }
  });
}

/**
 * Process each installation path
 */
async function processPaths(paths) {
  if (paths.length === 0) {
    console.error('❌ No AI Code Review installations found.');
    console.log('Please make sure AI Code Review is installed globally, or specify the correct path.');
    rl.close();
    return;
  }
  
  // Apply fix to each path
  let fixedAny = false;
  for (const installPath of paths) {
    if (fixIndexJs(installPath)) {
      fixedAny = true;
      await createEnvFile(installPath);
    }
  }
  
  if (fixedAny) {
    console.log('\n✅ Fix applied successfully!');
    console.log('You should now be able to run AI Code Review without environment loading errors.');
  } else {
    console.log('\n⚠️ Could not apply fixes. You may need to:');
    console.log('1. Run this script with sudo');
    console.log('2. Update AI Code Review to the latest version');
    console.log('3. Manually create a .env.local file in your global installation directory');
  }
  
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error);
  rl.close();
});