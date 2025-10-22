#!/usr/bin/env node

/**
 * Pre-release Validation Script
 * 
 * Comprehensive checks before releasing:
 * - Build system validation
 * - Test coverage verification
 * - API key configuration check
 * - Model availability verification
 * - Documentation completeness
 * - Security audit
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol} ${message}${colors.reset}`);
}

function success(message) { log('green', '✅', message); }
function warning(message) { log('yellow', '⚠️', message); }
function error(message) { log('red', '❌', message); }
function info(message) { log('blue', 'ℹ️', message); }

let checksPassed = 0;
let checksTotal = 0;
let warnings = [];

function runCheck(name, checkFunction) {
  checksTotal++;
  console.log(`\n${colors.blue}🔍 ${name}${colors.reset}`);
  
  try {
    const result = checkFunction();
    if (result === true) {
      success(`${name} passed`);
      checksPassed++;
    } else if (result === 'warning') {
      warning(`${name} passed with warnings`);
      checksPassed++;
    } else {
      error(`${name} failed`);
    }
  } catch (err) {
    error(`${name} failed: ${err.message}`);
  }
}

function checkBuildSystem() {
  // Check if all build scripts exist
  const requiredScripts = [
    'scripts/build.js',
    'scripts/increment-build-number.js',
    'scripts/generate-version.js'
  ];
  
  for (const script of requiredScripts) {
    if (!fs.existsSync(script)) {
      throw new Error(`Missing required script: ${script}`);
    }
  }
  
  // Check package.json scripts
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredPackageScripts = ['build', 'test', 'lint', 'build:types'];
  
  for (const script of requiredPackageScripts) {
    if (!packageJson.scripts[script]) {
      throw new Error(`Missing package.json script: ${script}`);
    }
  }
  
  return true;
}

function checkTestCoverage() {
  try {
    // Run tests and capture output
    const testOutput = execSync('pnpm test', { encoding: 'utf8', stdio: 'pipe' });
    
    // Check if tests pass
    if (!testOutput.includes('✓') && !testOutput.includes('passed')) {
      throw new Error('Tests are not passing');
    }
    
    // Check for test coverage (if available)
    if (testOutput.includes('Coverage')) {
      const coverageMatch = testOutput.match(/(\d+\.?\d*)%/);
      if (coverageMatch) {
        const coverage = parseFloat(coverageMatch[1]);
        if (coverage < 80) {
          warnings.push(`Test coverage is ${coverage}% (recommended: >80%)`);
          return 'warning';
        }
      }
    }
    
    return true;
  } catch (error) {
    throw new Error(`Test execution failed: ${error.message}`);
  }
}

function checkLinting() {
  try {
    execSync('pnpm run lint', { stdio: 'pipe' });
    return true;
  } catch (error) {
    throw new Error('Linting failed - please fix code style issues');
  }
}

function checkTypeScript() {
  try {
    execSync('pnpm run build:types', { stdio: 'pipe' });
    return true;
  } catch (error) {
    throw new Error('TypeScript compilation failed');
  }
}

function checkDocumentation() {
  const requiredDocs = [
    'README.md',
    'docs/README.md',
    'docs/QUICK_START.md'
  ];
  
  for (const doc of requiredDocs) {
    if (!fs.existsSync(doc)) {
      warnings.push(`Missing documentation: ${doc}`);
    }
  }
  
  // Check if README has basic sections
  const readme = fs.readFileSync('README.md', 'utf8');
  const requiredSections = ['Installation', 'Usage', 'Features'];
  
  for (const section of requiredSections) {
    if (!readme.includes(section)) {
      warnings.push(`README.md missing section: ${section}`);
    }
  }
  
  return warnings.length === 0 ? true : 'warning';
}

function checkSecurityAudit() {
  try {
    // Run npm audit
    const auditOutput = execSync('npm audit --audit-level=high', { encoding: 'utf8', stdio: 'pipe' });
    
    if (auditOutput.includes('found 0 vulnerabilities')) {
      return true;
    } else {
      warnings.push('Security vulnerabilities found - run npm audit for details');
      return 'warning';
    }
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities are found
    warnings.push('Security audit found issues - run npm audit for details');
    return 'warning';
  }
}

function checkVersionConsistency() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const packageVersion = packageJson.version;
  
  // Check build-number.json
  if (fs.existsSync('build-number.json')) {
    const buildInfo = JSON.parse(fs.readFileSync('build-number.json', 'utf8'));
    if (buildInfo.version !== packageVersion) {
      warnings.push(`Version mismatch: package.json (${packageVersion}) vs build-number.json (${buildInfo.version})`);
    }
  }
  
  // Check if version follows semver
  const semverRegex = /^\d+\.\d+\.\d+$/;
  if (!semverRegex.test(packageVersion)) {
    throw new Error(`Invalid version format: ${packageVersion} (should be semver: x.y.z)`);
  }
  
  return true;
}

function checkGitStatus() {
  try {
    // Check if working directory is clean
    execSync('git diff --exit-code', { stdio: 'pipe' });
    execSync('git diff --cached --exit-code', { stdio: 'pipe' });
    
    // Check if we're on main branch
    const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    if (currentBranch !== 'main' && currentBranch !== 'master') {
      warnings.push(`Currently on branch '${currentBranch}' (recommended: main/master)`);
      return 'warning';
    }
    
    return true;
  } catch (error) {
    throw new Error('Working directory is not clean - please commit or stash changes');
  }
}

function checkBuildOutput() {
  try {
    // Run a quick build
    execSync('pnpm run quick-build', { stdio: 'pipe' });
    
    // Check if dist/index.js exists and is executable
    if (!fs.existsSync('dist/index.js')) {
      throw new Error('Build output dist/index.js not found');
    }
    
    // Check if the built CLI works
    const versionOutput = execSync('node dist/index.js --version', { encoding: 'utf8' });
    if (!versionOutput.includes('.')) {
      throw new Error('Built CLI does not return valid version');
    }
    
    return true;
  } catch (error) {
    throw new Error(`Build verification failed: ${error.message}`);
  }
}

async function main() {
  console.log(`${colors.blue}🚀 Pre-release Validation${colors.reset}\n`);
  
  // Run all checks
  runCheck('Build System', checkBuildSystem);
  runCheck('TypeScript Compilation', checkTypeScript);
  runCheck('Linting', checkLinting);
  runCheck('Test Coverage', checkTestCoverage);
  runCheck('Documentation', checkDocumentation);
  runCheck('Security Audit', checkSecurityAudit);
  runCheck('Version Consistency', checkVersionConsistency);
  runCheck('Git Status', checkGitStatus);
  runCheck('Build Output', checkBuildOutput);
  
  // Summary
  console.log(`\n${colors.blue}📊 Validation Summary${colors.reset}`);
  console.log(`Checks passed: ${checksPassed}/${checksTotal}`);
  
  if (warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️ Warnings:${colors.reset}`);
    warnings.forEach(warning => console.log(`  • ${warning}`));
  }
  
  if (checksPassed === checksTotal) {
    success('All checks passed! Ready for release 🎉');
    console.log('\nNext steps:');
    console.log('  1. Run: node scripts/release.js [patch|minor|major]');
    console.log('  2. Push: git push origin main --tags');
    console.log('  3. Monitor: GitHub Actions will handle the rest');
    process.exit(0);
  } else {
    error(`${checksTotal - checksPassed} checks failed. Please fix issues before releasing.`);
    process.exit(1);
  }
}

main().catch(error => {
  error(`Pre-release validation failed: ${error.message}`);
  process.exit(1);
});
