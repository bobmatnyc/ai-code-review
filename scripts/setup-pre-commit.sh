#!/usr/bin/env bash

# Setup script for pre-commit hooks
# This script installs and configures pre-commit hooks for the AI Code Review project

set -e

echo "🔧 Setting up pre-commit hooks for AI Code Review"
echo "================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || ! grep -q "@bobmatnyc/ai-code-review" package.json; then
    echo "❌ Error: This script must be run from the AI Code Review project root"
    exit 1
fi

# Check if Python is available (required for pre-commit)
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Error: Python is required for pre-commit hooks"
    echo "   Please install Python 3.7+ and try again"
    exit 1
fi

# Determine Python command
PYTHON_CMD="python3"
if ! command -v python3 &> /dev/null; then
    PYTHON_CMD="python"
fi

echo "🐍 Using Python: $($PYTHON_CMD --version)"

# Check if pip is available
if ! $PYTHON_CMD -m pip --version &> /dev/null; then
    echo "❌ Error: pip is required for pre-commit installation"
    echo "   Please install pip and try again"
    exit 1
fi

# Install pre-commit if not already installed
if ! command -v pre-commit &> /dev/null; then
    echo "📦 Installing pre-commit..."
    $PYTHON_CMD -m pip install --user pre-commit
    
    # Add to PATH if needed
    if ! command -v pre-commit &> /dev/null; then
        echo "⚠️  pre-commit installed but not in PATH"
        echo "   You may need to add ~/.local/bin to your PATH"
        echo "   Or run: export PATH=\"\$HOME/.local/bin:\$PATH\""
        
        # Try to use it directly
        PRE_COMMIT_CMD="$HOME/.local/bin/pre-commit"
        if [ -f "$PRE_COMMIT_CMD" ]; then
            echo "✅ Found pre-commit at $PRE_COMMIT_CMD"
        else
            echo "❌ Could not locate pre-commit after installation"
            exit 1
        fi
    else
        PRE_COMMIT_CMD="pre-commit"
    fi
else
    PRE_COMMIT_CMD="pre-commit"
    echo "✅ pre-commit is already installed ($($PRE_COMMIT_CMD --version))"
fi

echo ""

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "❌ Error: pnpm is required for this project"
    echo "   Please install pnpm and try again:"
    echo "   npm install -g pnpm"
    exit 1
fi

echo "📦 Using pnpm: $(pnpm --version)"

# Install project dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing project dependencies..."
    pnpm install
fi

echo ""

# Install pre-commit hooks
echo "🔗 Installing pre-commit hooks..."
$PRE_COMMIT_CMD install

# Install commit-msg hook for conventional commits (optional)
echo "📝 Installing commit-msg hook..."
$PRE_COMMIT_CMD install --hook-type commit-msg || echo "⚠️  commit-msg hook installation failed (optional)"

echo ""

# Create secrets baseline if it doesn't exist
if [ ! -f ".secrets.baseline" ]; then
    echo "🔐 Creating secrets baseline..."
    $PRE_COMMIT_CMD run detect-secrets --all-files || true
fi

echo ""

# Run initial check on all files
echo "🧪 Running initial pre-commit check on all files..."
echo "   This may take a few minutes on first run..."

if $PRE_COMMIT_CMD run --all-files; then
    echo "✅ All pre-commit checks passed!"
else
    echo "⚠️  Some pre-commit checks failed"
    echo "   This is normal on first setup - the hooks will fix many issues automatically"
    echo "   Run 'git add .' and commit again to see the fixes"
fi

echo ""
echo "🎉 Pre-commit hooks setup complete!"
echo ""
echo "📋 What happens now:"
echo "   • Pre-commit hooks will run automatically on every commit"
echo "   • Failed hooks will prevent commits until issues are fixed"
echo "   • Many issues will be auto-fixed (formatting, trailing whitespace, etc.)"
echo ""
echo "🔧 Manual commands:"
echo "   • Run hooks manually: pre-commit run --all-files"
echo "   • Update hooks: pre-commit autoupdate"
echo "   • Skip hooks (emergency): git commit --no-verify"
echo ""
echo "📚 Configured hooks:"
echo "   ✓ TypeScript type checking"
echo "   ✓ ESLint code quality"
echo "   ✓ Import path validation"
echo "   ✓ Environment variable validation"
echo "   ✓ Build validation"
echo "   ✓ Documentation consistency"
echo "   ✓ Security scanning"
echo "   ✓ JSON/YAML validation"
echo "   ✓ Trailing whitespace removal"
echo ""

# Check if git hooks are properly installed
if [ -f ".git/hooks/pre-commit" ]; then
    echo "✅ Git pre-commit hook installed successfully"
else
    echo "⚠️  Git pre-commit hook may not be installed properly"
    echo "   Try running: pre-commit install"
fi

echo ""
echo "🚀 You're all set! Your next commit will run the pre-commit hooks."
echo ""

# Optional: Show example commit workflow
echo "💡 Example workflow:"
echo "   1. Make your changes"
echo "   2. git add ."
echo "   3. git commit -m \"feat: your commit message\""
echo "   4. Hooks run automatically and fix/validate your code"
echo "   5. If hooks fail, fix issues and commit again"
echo ""

# Check for common issues
echo "🔍 Checking for common setup issues..."

# Check Node.js version
NODE_VERSION=$(node --version | sed 's/v//')
if [ "$(printf '%s\n' "18.0.0" "$NODE_VERSION" | sort -V | head -n1)" != "18.0.0" ]; then
    echo "⚠️  Warning: Node.js version $NODE_VERSION detected"
    echo "   This project requires Node.js 18+. Consider upgrading."
fi

# Check if TypeScript is available
if ! pnpm exec tsc --version &> /dev/null; then
    echo "⚠️  Warning: TypeScript not found in project dependencies"
    echo "   Some hooks may fail. Run: pnpm install"
fi

# Check if ESLint is available
if ! pnpm exec eslint --version &> /dev/null; then
    echo "⚠️  Warning: ESLint not found in project dependencies"
    echo "   Some hooks may fail. Run: pnpm install"
fi

echo ""
echo "✅ Setup validation complete!"
echo ""
echo "📖 For more information:"
echo "   • Pre-commit documentation: https://pre-commit.com/"
echo "   • Project workflow: docs/WORKFLOW.md"
echo "   • Contributing guide: docs/development/INSTRUCTIONS.md"
