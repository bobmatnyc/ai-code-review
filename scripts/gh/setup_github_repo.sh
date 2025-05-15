#!/bin/bash

# AI Code Review - GitHub Repository Setup Wrapper
# This script makes it easy to set up all the GitHub repository configurations

# Set to exit on error
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "🔧 AI Code Review GitHub Repository Configuration"
echo "=========================================="
echo "This script will update your GitHub repository with the recommended"
echo "configuration for the AI Code Review project."
echo "It will modify the EXISTING repository settings, not create a new repository."
echo
echo "Prerequisites:"
echo "  - GitHub CLI (gh) installed and authenticated"
echo "  - Repository exists on GitHub"
echo "  - You have admin permissions on the repository"
echo

# Check for GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Please install it first:"
    echo "    https://cli.github.com/"
    exit 1
fi

# Check authentication
echo "Checking GitHub CLI authentication..."
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub CLI is not authenticated. Please run:"
    echo "    gh auth login"
    exit 1
fi

# Set repository name explicitly to match package.json
REPO_NAME="bobmatnyc/ai-code-review"

echo "📦 Detected repository: $REPO_NAME"
echo

# Offer options
echo "Available configuration options:"
echo "  1) Update .github directory structure only"
echo "  2) Update GitHub templates and issue forms"
echo "  3) Configure branch protection rules (requires admin access)"
echo "  4) Configure repository settings (requires admin access)"
echo "  5) Apply all configuration options above"
echo "  q) Quit"
echo

read -p "Enter your choice (1-5 or q): " choice

# Function to copy file with confirmation if it exists
safe_copy() {
    local src="$1"
    local dest="$2"
    
    if [ -f "$dest" ]; then
        echo "⚠️ File already exists: $dest"
        read -p "   Overwrite? (y/n): " overwrite
        if [[ $overwrite =~ ^[Yy]$ ]]; then
            cp "$src" "$dest"
            echo "   ✓ File updated"
        else
            echo "   ✗ Skipped"
        fi
    else
        cp "$src" "$dest"
        echo "   ✓ File created"
    fi
}

case "$choice" in
    1)
        echo "Creating/updating .github directory structure..."
        mkdir -p .github/{workflows,ISSUE_TEMPLATE}
        safe_copy "$SCRIPT_DIR/codeowners_file.md" .github/CODEOWNERS
        echo "✅ Done!"
        ;;
    2)
        echo "Creating/updating templates and issue forms..."
        mkdir -p .github/{workflows,ISSUE_TEMPLATE}
        safe_copy "$SCRIPT_DIR/codeowners_file.md" .github/CODEOWNERS
        safe_copy "$SCRIPT_DIR/pr_template.md" .github/pull_request_template.md
        safe_copy "$SCRIPT_DIR/bug_report_template.yml" .github/ISSUE_TEMPLATE/bug_report.yml
        safe_copy "$SCRIPT_DIR/feature_request_template.yml" .github/ISSUE_TEMPLATE/feature_request.yml
        safe_copy "$SCRIPT_DIR/security_policy.md" .github/SECURITY.md
        safe_copy "$SCRIPT_DIR/dependabot_config.yml" .github/dependabot.yml
        echo "✅ Done!"
        ;;
    3)
        echo "Updating branch protection rules..."
        bash "$SCRIPT_DIR/github_setup_script.sh"
        echo "✅ Done!"
        ;;
    4)
        echo "Updating repository settings using GitHub API..."
        node "$SCRIPT_DIR/node_setup_script.js"
        echo "✅ Done!"
        ;;
    5)
        echo "Setting up everything..."
        mkdir -p .github/{workflows,ISSUE_TEMPLATE}
        safe_copy "$SCRIPT_DIR/codeowners_file.md" .github/CODEOWNERS
        safe_copy "$SCRIPT_DIR/pr_template.md" .github/pull_request_template.md
        safe_copy "$SCRIPT_DIR/bug_report_template.yml" .github/ISSUE_TEMPLATE/bug_report.yml
        safe_copy "$SCRIPT_DIR/feature_request_template.yml" .github/ISSUE_TEMPLATE/feature_request.yml
        safe_copy "$SCRIPT_DIR/security_policy.md" .github/SECURITY.md
        safe_copy "$SCRIPT_DIR/dependabot_config.yml" .github/dependabot.yml
        safe_copy "$SCRIPT_DIR/ci_workflow.yml" .github/workflows/ci.yml
        bash "$SCRIPT_DIR/github_setup_script.sh"
        node "$SCRIPT_DIR/node_setup_script.js"
        echo "✅ All setup complete!"
        ;;
    q|Q)
        echo "Exiting without changes."
        exit 0
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

echo
echo "Next steps:"
echo "1. Review the created files in the .github directory"
echo "2. Commit and push the changes to GitHub"
echo "3. Set up CI/CD workflows or GitHub Actions"
echo "4. Add collaborators if needed"