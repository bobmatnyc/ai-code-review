# GitHub Configuration Scripts

This directory contains scripts and templates for configuring the existing GitHub repository for the AI Code Review project.

## Quick Configuration

Run the wrapper script to update your GitHub repository configuration:

```bash
./setup_github_repo.sh
```

This script provides a menu with options to:
1. Update the `.github` directory structure
2. Update GitHub templates and issue forms
3. Configure branch protection rules (requires admin access)
4. Configure repository settings (requires admin access)
5. Apply all configuration options above

The script will prompt for confirmation before overwriting any existing files and will only create directories that don't already exist.

## Verify Configuration

You can verify that your repository configuration matches the expected settings:

```bash
./verify_setup.sh
```

This will check:
- Required directory structure
- Required configuration files
- Branch protection rules (if you have admin access)
- Repository settings (if you have admin access)

## Files Overview

- `setup_github_repo.sh` - Main wrapper script for repository setup
- `github_setup_script.sh` - Bash script for setting up branch protection rules and rulesets
- `node_setup_script.js` - Node.js script for configuring repository settings
- `github_setup_workflow.yml` - GitHub Actions workflow for repository setup
- `ci_workflow.yml` - GitHub Actions workflow for CI/CD pipeline

### Templates and Configuration Files

- `bug_report_template.yml` - Issue template for bug reports
- `feature_request_template.yml` - Issue template for feature requests
- `pr_template.md` - Pull request template
- `codeowners_file.md` - CODEOWNERS file for code ownership
- `dependabot_config.yml` - Dependabot configuration
- `security_policy.md` - Security policy

## Manual Setup

If you prefer to set up the GitHub repository manually:

1. Create the `.github` directory structure:
   ```bash
   mkdir -p .github/{workflows,ISSUE_TEMPLATE}
   ```

2. Copy the templates to the appropriate locations:
   ```bash
   cp codeowners_file.md .github/CODEOWNERS
   cp pr_template.md .github/pull_request_template.md
   cp bug_report_template.yml .github/ISSUE_TEMPLATE/bug_report.yml
   cp feature_request_template.yml .github/ISSUE_TEMPLATE/feature_request.yml
   cp security_policy.md .github/SECURITY.md
   cp dependabot_config.yml .github/dependabot.yml
   cp ci_workflow.yml .github/workflows/ci.yml
   ```

3. Set up branch protection rules using the GitHub CLI:
   ```bash
   ./github_setup_script.sh
   ```

4. Set up repository settings using the Node.js script:
   ```bash
   node node_setup_script.js
   ```

## GitHub CLI Requirements

These scripts require the GitHub CLI (`gh`) to be installed and authenticated:

```bash
# Install GitHub CLI (macOS)
brew install gh

# Install GitHub CLI (Linux)
# See: https://github.com/cli/cli/blob/trunk/docs/install_linux.md

# Authenticate
gh auth login
```

## Permissions

To use these scripts, you need to have admin access to the repository. Some operations require specific permissions:

- Branch protection rules require admin access
- Repository settings require admin access
- Creating workflows requires write access to the repository