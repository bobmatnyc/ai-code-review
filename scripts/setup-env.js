#!/usr/bin/env node

/**
 * Setup script to create .env.local file in the correct directory
 * for global installations of AI Code Review.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Determine possible installation directories
const possibleDirectories = [
  // Global npm installation
  path.resolve(__dirname, '..'),
  // Homebrew installation
  '/opt/homebrew/lib/node_modules/@bobmatnyc/ai-code-review'
];

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Prompt for API keys
async function promptForApiKeys() {
  const keys = {};
  
  console.log('\n=== AI Code Review Configuration ===');
  console.log('This script will help you set up your API keys for AI Code Review.');
  console.log('Leave blank if you don\'t have a particular API key.\n');
  
  return new Promise((resolve) => {
    rl.question('Google Gemini API Key (AI_CODE_REVIEW_GOOGLE_API_KEY): ', (googleKey) => {
      if (googleKey.trim()) keys.AI_CODE_REVIEW_GOOGLE_API_KEY = googleKey.trim();
      
      rl.question('Anthropic API Key (AI_CODE_REVIEW_ANTHROPIC_API_KEY): ', (anthropicKey) => {
        if (anthropicKey.trim()) keys.AI_CODE_REVIEW_ANTHROPIC_API_KEY = anthropicKey.trim();
        
        rl.question('OpenAI API Key (AI_CODE_REVIEW_OPENAI_API_KEY): ', (openaiKey) => {
          if (openaiKey.trim()) keys.AI_CODE_REVIEW_OPENAI_API_KEY = openaiKey.trim();
          
          rl.question('OpenRouter API Key (AI_CODE_REVIEW_OPENROUTER_API_KEY): ', (openrouterKey) => {
            if (openrouterKey.trim()) keys.AI_CODE_REVIEW_OPENROUTER_API_KEY = openrouterKey.trim();
            
            rl.question('Default Model (AI_CODE_REVIEW_MODEL) [gemini:gemini-1.5-pro]: ', (model) => {
              keys.AI_CODE_REVIEW_MODEL = model.trim() || 'gemini:gemini-1.5-pro';
              resolve(keys);
            });
          });
        });
      });
    });
  });
}

// Create .env.local file
function createEnvFile(directory, keys) {
  const envPath = path.join(directory, '.env.local');
  let envContent = '';
  
  // Add each key to the content
  for (const [key, value] of Object.entries(keys)) {
    envContent += `${key}=${value}\n`;
  }
  
  // Write the file
  try {
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`\n✅ Created .env.local in: ${envPath}`);
    return true;
  } catch (error) {
    console.error(`\n❌ Error creating .env.local in ${envPath}: ${error.message}`);
    return false;
  }
}

// Ask if user wants to configure a custom directory
function promptForCustomDirectory() {
  return new Promise((resolve) => {
    rl.question('\nDo you want to set up a custom configuration directory? (y/N): ', (answer) => {
      if (answer.toLowerCase() === 'y') {
        rl.question('Enter the full path to your custom directory: ', (customDir) => {
          resolve(customDir.trim());
        });
      } else {
        resolve(null);
      }
    });
  });
}

// Main function
async function main() {
  console.log('Checking for AI Code Review installation...');
  
  // Check if each possible directory exists
  const existingDirs = possibleDirectories.filter(dir => {
    try {
      return fs.existsSync(dir);
    } catch (e) {
      return false;
    }
  });
  
  if (existingDirs.length === 0) {
    console.log('❌ Could not find AI Code Review installation directory.');
    console.log('This script should be run from the AI Code Review package directory.');
  } else {
    console.log('Found installation directories:');
    existingDirs.forEach((dir, i) => {
      console.log(`${i + 1}. ${dir}`);
    });
  }
  
  // Ask for custom directory
  const customDir = await promptForCustomDirectory();
  if (customDir) {
    // Check if the custom directory exists
    try {
      if (!fs.existsSync(customDir)) {
        console.log(`Creating directory: ${customDir}`);
        fs.mkdirSync(customDir, { recursive: true });
      }
      existingDirs.push(customDir);
    } catch (error) {
      console.error(`Error creating custom directory: ${error.message}`);
    }
  }
  
  // Get API keys from user
  const apiKeys = await promptForApiKeys();
  
  // If custom directory was provided, use it
  if (customDir) {
    const success = createEnvFile(customDir, apiKeys);
    if (success) {
      console.log('\n⚠️ To use this custom directory, add this to your shell profile:');
      console.log(`export AI_CODE_REVIEW_DIR="${customDir}"`);
    }
  } 
  // Otherwise use installation directories
  else if (existingDirs.length > 0) {
    let success = false;
    for (const dir of existingDirs) {
      if (createEnvFile(dir, apiKeys)) {
        success = true;
        break;
      }
    }
    
    if (success) {
      console.log('\n✅ Configuration complete! You can now use AI Code Review from any directory.');
    } else {
      console.log('\n❌ Could not create .env.local in any installation directory.');
      console.log('Try running this script with sudo or setting up a custom directory.');
    }
  } else {
    console.log('\n❌ No valid directories found for configuration.');
  }
  
  rl.close();
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});