#!/usr/bin/env node

/**
 * Automated GitHub Repository Setup Script
 * Sets up all necessary GitHub configurations for @bobmatnyc/ai-code-review
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const REPO_OWNER = 'bobmatnyc';
const REPO_NAME = 'ai-code-review';
const REPO_FULL = `${REPO_OWNER}/${REPO_NAME}`;

// File configurations
const configurations = {
  '.github/CODEOWNERS': `# Global ownership
* @${REPO_OWNER}

# Core architecture
/src/clients/ @${REPO_OWNER}
/src/types/ @${REPO_OWNER}

# Prompts and templates
/prompts/ @${REPO_OWNER}
/templates/ @${REPO_OWNER}

# Documentation
/docs/ @${REPO_OWNER}
README.md @${REPO_OWNER}
PROJECT.md @${REPO_OWNER}

# CI/CD and configuration
/.github/ @${REPO_OWNER}
package.json @${REPO_OWNER}
tsconfig.json @${REPO_OWNER}

# Release management
CHANGELOG.md @${REPO_OWNER}`,

  '.github/dependabot.yml': `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "chore(deps):"
    open-pull-requests-limit: 10
    reviewers:
      - "${REPO_OWNER}"
    labels:
      - "dependencies"`,

  '.github/FUNDING.yml': `# Funding configuration
github: ${REPO_OWNER}
custom: ["https://buymeacoffee.com/${REPO_OWNER}"]`,

  '.github/ISSUE_TEMPLATE/config.yml': `blank_issues_enabled: false
contact_links:
  - name: Discussion
    url: https://github.com/${REPO_FULL}/discussions
    about: Ask questions and discuss ideas with the community
  - name: Documentation
    url: https://github.com/${REPO_FULL}#readme
    about: Check the documentation for usage instructions`
};

async function createDirectory(dirPath) {
  try {
    // Check if directory exists
    try {
      await fs.access(dirPath);
      console.log(`✓ Directory exists: ${dirPath}`);
      return;
    } catch (e) {
      // Directory doesn't exist, create it
      await fs.mkdir(dirPath, { recursive: true });
      console.log(`✓ Created directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`Error creating directory ${dirPath}:`, error.message);
  }
}

async function writeFile(filePath, content) {
  try {
    // Check if file exists
    let fileExists = false;
    try {
      await fs.access(filePath);
      fileExists = true;
    } catch (e) {
      // File doesn't exist
    }

    if (fileExists) {
      // Get user confirmation before overwriting
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question(`⚠️ File ${filePath} already exists. Overwrite? (y/n): `, resolve);
      });
      
      readline.close();
      
      if (answer.toLowerCase() === 'y') {
        await fs.writeFile(filePath, content);
        console.log(`✓ Updated file: ${filePath}`);
      } else {
        console.log(`✗ Skipped file: ${filePath}`);
      }
    } else {
      await fs.writeFile(filePath, content);
      console.log(`✓ Created file: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error.message);
  }
}

async function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function setupBranchProtection() {
  console.log('\n🔒 Setting up branch protection rules...');
  
  const mainProtection = {
    required_status_checks: {
      strict: true,
      contexts: ['Build', 'Lint', 'Test', 'Type Check']
    },
    enforce_admins: true,
    required_pull_request_reviews: {
      required_approving_review_count: 1,
      dismiss_stale_reviews: true,
      require_code_owner_reviews: true,
      restrict_dismissals: true
    },
    restrictions: null,
    required_conversation_resolution: true,
    required_signatures: false, // Set to true if you require signed commits
    allow_force_pushes: false,
    allow_deletions: false
  };

  try {
    // Create a temporary file with the protection rules
    await fs.writeFile('main-protection.json', JSON.stringify(mainProtection, null, 2));
    
    execSync(`gh api repos/${REPO_FULL}/branches/main/protection --method PUT --input main-protection.json`, {
      stdio: 'inherit'
    });
    
    await fs.unlink('main-protection.json');
    console.log('✓ Main branch protection rules applied');
  } catch (error) {
    console.log('⚠ Branch protection rules could not be applied automatically');
    console.log('  You can apply them manually in GitHub repository settings');
    console.log('  Error:', error.message);
  }
}

async function setupRepositorySettings() {
  console.log('\n⚙️ Configuring repository settings...');
  
  const repoSettings = {
    has_issues: true,
    has_projects: true,
    has_wiki: false,
    has_pages: false,
    has_discussions: true,
    allow_merge_commit: true,
    allow_squash_merge: true,
    allow_rebase_merge: false,
    delete_branch_on_merge: true,
    vulnerability_alerts: true,
    archived: false,
    disabled: false
  };

  try {
    await fs.writeFile('repo-settings.json', JSON.stringify(repoSettings, null, 2));
    
    execSync(`gh api repos/${REPO_FULL} --method PATCH --input repo-settings.json`, {
      stdio: 'inherit'
    });
    
    await fs.unlink('repo-settings.json');
    console.log('✓ Repository settings configured');
  } catch (error) {
    console.log('⚠ Repository settings could not be updated automatically');
    console.log('  Error:', error.message);
  }
}

async function main() {
  console.log('🚀 Setting up GitHub repository configurations...\n');

  // Check if GitHub CLI is available
  const hasGH = await checkGitHubCLI();
  if (!hasGH) {
    console.log('⚠ GitHub CLI not found. Some configurations will need to be applied manually.');
    console.log('  Install GitHub CLI: https://cli.github.com/\n');
  }

  // Create directory structure
  const directories = [
    '.github',
    '.github/ISSUE_TEMPLATE',
    '.github/workflows'
  ];

  for (const dir of directories) {
    await createDirectory(dir);
  }

  // Create configuration files
  for (const [filePath, content] of Object.entries(configurations)) {
    await writeFile(filePath, content);
  }

  // Apply GitHub-specific configurations
  if (hasGH) {
    try {
      // Check authentication
      execSync('gh auth status', { stdio: 'pipe' });
      
      await setupRepositorySettings();
      await setupBranchProtection();
      
      // Enable vulnerability alerts
      console.log('\n🔐 Enabling security features...');
      try {
        execSync(`gh api repos/${REPO_FULL}/vulnerability-alerts --method PUT`, { stdio: 'pipe' });
        console.log('✓ Vulnerability alerts enabled');
      } catch (error) {
        console.log('⚠ Could not enable vulnerability alerts automatically');
      }
      
    } catch (error) {
      console.log('\n⚠ GitHub CLI is not authenticated.');
      console.log('  Run "gh auth login" to authenticate, then re-run this script for full setup.');
    }
  }

  console.log('\n✅ Repository setup complete!');
  console.log('\nNext steps:');
  console.log('1. Review the created files and commit them to your repository');
  console.log('2. Set up CI/CD workflows');
  console.log('3. Configure security advisories if needed');
  console.log('4. Add team members as collaborators');
  
  if (!hasGH) {
    console.log('5. Apply branch protection rules manually in GitHub repository settings');
  }
}

// Run the setup script
main().catch(console.error);