#!/bin/bash

# GitHub Repository Setup Script for @bobmatnyc/ai-code-review
# Run this script from the root of your repository

set -e

REPO="bobmatnyc/ai-code-review"
echo "Setting up GitHub rules for $REPO..."

# Ensure GitHub CLI is authenticated
gh auth status || {
    echo "Please authenticate with GitHub CLI first:"
    echo "gh auth login"
    exit 1
}

# Ensure .github directory structure exists
if [ -d ".github" ]; then
  echo "✓ .github directory already exists"
else
  mkdir -p .github
  echo "✓ Created .github directory"
fi

# Create subdirectories if they don't exist
for dir in workflows ISSUE_TEMPLATE; do
  if [ -d ".github/$dir" ]; then
    echo "✓ .github/$dir directory already exists"
  else
    mkdir -p ".github/$dir"
    echo "✓ Created .github/$dir directory"
  fi
done

# Create branch protection rules
echo "Setting up branch protection rules..."

# Main branch protection
echo "Creating branch protection rules with updated API format..."
cat > branch-protection.json << EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Build", "Lint", "Test", "Type Check"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "required_linear_history": false,
  "allow_force_pushes": false,
  "allow_deletions": false
}
EOF

echo "Applying branch protection rules..."
if gh api repos/$REPO/branches/main/protection --method PUT --input branch-protection.json; then
  echo "✓ Branch protection rules applied successfully"
else
  echo "⚠️ Could not apply branch protection rules. This requires admin access to the repository."
  echo "You may apply these rules manually in the GitHub repository settings."
fi

# Clean up
rm -f branch-protection.json

# Development branch protection (if exists)
if gh api repos/$REPO/branches/develop 2>/dev/null; then
    echo "Setting up develop branch protection..."
    cat > develop-protection.json << EOF
    {
      "required_status_checks": {
        "strict": true,
        "contexts": ["Build", "Lint", "Test", "Type Check"]
      },
      "enforce_admins": false,
      "required_pull_request_reviews": {
        "required_approving_review_count": 1,
        "dismiss_stale_reviews": true
      },
      "restrictions": null,
      "required_conversation_resolution": true,
      "required_linear_history": false,
      "allow_force_pushes": false,
      "allow_deletions": false
    }
EOF

    if gh api repos/$REPO/branches/develop/protection --method PUT --input develop-protection.json; then
        echo "✓ Develop branch protection rules applied successfully"
    else
        echo "⚠️ Could not apply develop branch protection rules. This requires admin access to the repository."
    fi

    # Clean up
    rm -f develop-protection.json
fi

# Create rulesets (requires GitHub Enterprise or GitHub Pro)
echo "Checking repository type..."
if gh api repos/$REPO | grep -q '"visibility":"private"'; then
    echo "Setting up repository rulesets (requires GitHub Enterprise or GitHub Pro)..."

    # Create tag protection ruleset
    cat > tag-protection-ruleset.json << EOF
{
  "name": "Release Tags Protection",
  "target": "tag",
  "conditions": {
    "ref_name": {
      "include": ["refs/tags/v*"]
    }
  },
  "rules": [
    {
      "type": "deletion"
    },
    {
      "type": "creation"
    }
  ],
  "enforcement": "active",
  "bypass_actors": [
    {
      "actor_id": 5,
      "actor_type": "Team",
      "bypass_mode": "always"
    }
  ]
}
EOF

    if gh api repos/$REPO/rulesets --method POST --input tag-protection-ruleset.json; then
        echo "✓ Tag protection ruleset created successfully"
    else
        echo "⚠️ Could not create tag protection ruleset. This may require GitHub Enterprise or GitHub Pro."
    fi

    # Create file path restrictions ruleset
    cat > file-restrictions-ruleset.json << EOF
{
  "name": "Critical Files Protection",
  "target": "branch",
  "conditions": {
    "ref_name": {
      "include": ["refs/heads/main", "refs/heads/develop"]
    }
  },
  "rules": [
    {
      "type": "file_path_restriction",
      "parameters": {
        "restricted_file_paths": [
          ".github/workflows/*",
          "package.json",
          "tsconfig.json",
          ".env.example",
          "src/types/*",
          "prompts/**"
        ]
      }
    }
  ],
  "enforcement": "active",
  "bypass_actors": [
    {
      "actor_id": 5,
      "actor_type": "Team",
      "bypass_mode": "always"
    }
  ]
}
EOF

    if gh api repos/$REPO/rulesets --method POST --input file-restrictions-ruleset.json; then
        echo "✓ File path restrictions ruleset created successfully"
    else
        echo "⚠️ Could not create file path restrictions ruleset. This may require GitHub Enterprise or GitHub Pro."
    fi

    # Clean up
    rm -f tag-protection-ruleset.json file-restrictions-ruleset.json
else
    echo "⚠️ Repository rulesets require a private repository with GitHub Enterprise or GitHub Pro."
    echo "  Skipping ruleset creation."
fi

echo "GitHub rules setup completed!"
echo "Next steps:"
echo "1. Review the protection rules in your repository settings"
echo "2. Create and configure the CI/CD workflow"
echo "3. Add team members as collaborators if needed"

# No cleanup needed - files are already cleaned up above