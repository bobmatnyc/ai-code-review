#!/usr/bin/env node

/**
 * Release Management Script
 * 
 * Automates the release process including:
 * - Version bumping (patch, minor, major)
 * - Changelog generation
 * - Git tagging
 * - Release preparation
 * 
 * Usage:
 *   node scripts/release.js patch   # 1.0.0 -> 1.0.1
 *   node scripts/release.js minor   # 1.0.0 -> 1.1.0
 *   node scripts/release.js major   # 1.0.0 -> 2.0.0
 *   node scripts/release.js --dry-run patch  # Preview changes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const releaseType = args.find(arg => ['patch', 'minor', 'major'].includes(arg));

if (!releaseType) {
  console.error('❌ Error: Please specify release type (patch, minor, major)');
  console.log('\nUsage:');
  console.log('  node scripts/release.js patch   # 1.0.0 -> 1.0.1');
  console.log('  node scripts/release.js minor   # 1.0.0 -> 1.1.0');
  console.log('  node scripts/release.js major   # 1.0.0 -> 2.0.0');
  console.log('  node scripts/release.js --dry-run patch  # Preview changes');
  process.exit(1);
}

function runCommand(command, description) {
  console.log(`🔧 ${description}...`);
  if (isDryRun) {
    console.log(`   [DRY RUN] Would run: ${command}`);
    return '';
  }
  
  try {
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed`);
    return result.trim();
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

function getCurrentVersion() {
  const packageJsonPath = path.join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function bumpVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`Invalid release type: ${type}`);
  }
}

function generateChangelog(newVersion) {
  console.log('📝 Generating changelog...');
  
  try {
    // Get the last tag
    const lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
    
    // Get commits since last tag
    const commitRange = lastTag ? `${lastTag}..HEAD` : '';
    const commits = execSync(`git log --pretty=format:"- %s (%h)" ${commitRange}`, { encoding: 'utf8' }).trim();
    
    const changelogEntry = `
## [${newVersion}] - ${new Date().toISOString().split('T')[0]}

### Changes
${commits || '- Initial release'}

### Installation
\`\`\`bash
npm install -g @bobmatnyc/ai-code-review@${newVersion}
\`\`\`
`;

    if (!isDryRun) {
      // Prepend to CHANGELOG.md
      const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
      let existingChangelog = '';
      
      if (fs.existsSync(changelogPath)) {
        existingChangelog = fs.readFileSync(changelogPath, 'utf8');
      } else {
        existingChangelog = '# Changelog\n\nAll notable changes to this project will be documented in this file.\n';
      }
      
      const updatedChangelog = existingChangelog.replace(
        '# Changelog\n\nAll notable changes to this project will be documented in this file.\n',
        `# Changelog\n\nAll notable changes to this project will be documented in this file.\n${changelogEntry}\n`
      );
      
      fs.writeFileSync(changelogPath, updatedChangelog);
      console.log('✅ Updated CHANGELOG.md');
    } else {
      console.log('   [DRY RUN] Would add to CHANGELOG.md:');
      console.log(changelogEntry);
    }
    
    return changelogEntry;
  } catch (error) {
    console.warn('⚠️ Warning: Could not generate changelog:', error.message);
    return `## [${newVersion}] - ${new Date().toISOString().split('T')[0]}\n\n### Changes\n- Release ${newVersion}\n`;
  }
}

async function main() {
  console.log('🚀 Starting release process...\n');
  
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  // Get current version
  const currentVersion = getCurrentVersion();
  const newVersion = bumpVersion(currentVersion, releaseType);
  
  console.log(`📦 Version bump: ${currentVersion} -> ${newVersion} (${releaseType})\n`);
  
  // Check if working directory is clean
  try {
    execSync('git diff --exit-code', { stdio: 'pipe' });
    execSync('git diff --cached --exit-code', { stdio: 'pipe' });
  } catch (error) {
    console.error('❌ Error: Working directory is not clean. Please commit or stash changes first.');
    process.exit(1);
  }
  
  // Generate changelog
  const changelogEntry = generateChangelog(newVersion);
  
  // Update package.json version
  if (!isDryRun) {
    runCommand(`npm version ${newVersion} --no-git-tag-version`, 'Updating package.json version');
  } else {
    console.log(`🔧 [DRY RUN] Would update package.json version to ${newVersion}`);
  }
  
  // Run full build and test
  runCommand('pnpm run build', 'Running full build and test suite');
  
  // Commit changes
  if (!isDryRun) {
    runCommand('git add .', 'Staging changes');
    runCommand(`git commit -m "chore: release v${newVersion}"`, 'Committing release changes');
    runCommand(`git tag v${newVersion}`, 'Creating git tag');
  } else {
    console.log(`🔧 [DRY RUN] Would commit changes and create tag v${newVersion}`);
  }
  
  console.log('\n🎉 Release preparation complete!');
  console.log('\nNext steps:');
  console.log(`  1. Review the changes: git show v${newVersion}`);
  console.log(`  2. Push the release: git push origin main --tags`);
  console.log(`  3. GitHub Actions will automatically publish to npm`);
  console.log(`  4. Monitor the release: https://github.com/bobmatnyc/ai-code-review/actions`);
}

main().catch(error => {
  console.error('❌ Release failed:', error.message);
  process.exit(1);
});
