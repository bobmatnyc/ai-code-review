#!/bin/bash

# GitHub Repository Configuration Verification Script
# Checks that the GitHub repository configuration matches the expected settings

set -e

REPO="bobmatnyc/ai-code-review"
echo "🔍 Verifying GitHub configuration for $REPO..."

# Ensure GitHub CLI is authenticated
gh auth status || {
    echo "Please authenticate with GitHub CLI first:"
    echo "gh auth login"
    exit 1
}

# Verify directory structure
echo "Checking GitHub directory structure..."
for dir in .github .github/workflows .github/ISSUE_TEMPLATE; do
    if [ -d "$dir" ]; then
        echo "✓ $dir exists"
    else
        echo "✗ $dir is missing"
    fi
done

# Verify required files
echo "Checking required GitHub configuration files..."
required_files=(
    ".github/CODEOWNERS"
    ".github/pull_request_template.md" 
    ".github/SECURITY.md"
    ".github/dependabot.yml"
    ".github/ISSUE_TEMPLATE/bug_report.yml"
    ".github/ISSUE_TEMPLATE/feature_request.yml"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✓ $file exists"
    else
        echo "✗ $file is missing"
    fi
done

# Check branch protection (requires admin access)
echo "Checking branch protection rules..."
if gh api repos/$REPO/branches/main/protection &>/dev/null; then
    echo "✓ Main branch has protection rules"
    
    # Check for required status checks
    if gh api repos/$REPO/branches/main/protection | grep -q '"required_status_checks":'; then
        echo "  ✓ Required status checks configured"
    else
        echo "  ✗ Missing required status checks"
    fi
    
    # Check for pull request reviews
    if gh api repos/$REPO/branches/main/protection | grep -q '"required_pull_request_reviews":'; then
        echo "  ✓ Required pull request reviews configured"
    else
        echo "  ✗ Missing required pull request reviews"
    fi
else
    echo "✗ Main branch protection not configured"
fi

# Check repository settings
echo "Checking repository settings..."
repo_settings=$(gh api repos/$REPO)

# Check issue settings
if echo "$repo_settings" | grep -q '"has_issues":true'; then
    echo "✓ Issues are enabled"
else
    echo "✗ Issues are not enabled"
fi

# Check wiki settings (should be disabled)
if echo "$repo_settings" | grep -q '"has_wiki":false'; then
    echo "✓ Wiki is disabled (as recommended)"
else
    echo "✗ Wiki setting is not configured correctly"
fi

# Check vulnerability alerts
if echo "$repo_settings" | grep -q '"security_and_analysis".*"vulnerability_alerts".*"enabled":true'; then
    echo "✓ Vulnerability alerts are enabled"
else
    echo "✓ Unable to verify vulnerability alerts (requires admin access)"
fi

echo ""
echo "GitHub repository verification complete!"
echo "You can run the setup script to fix any missing configuration:"
echo "  ./scripts/gh/setup_github_repo.sh"