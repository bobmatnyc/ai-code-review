#!/usr/bin/env bash

# Migration script from npm/yarn to pnpm
# This script helps users migrate their development environment to use pnpm

set -e

echo "🔄 AI Code Review: Migration to pnpm"
echo "===================================="
echo ""

# Check if pnpm is already installed
if command -v pnpm &> /dev/null; then
    echo "✅ pnpm is already installed (version: $(pnpm --version))"
else
    echo "📦 Installing pnpm..."
    
    # Check if corepack is available (Node.js 16.10+)
    if command -v corepack &> /dev/null; then
        echo "🔧 Using Corepack to install pnpm (recommended method)..."
        corepack enable
        corepack prepare pnpm@latest --activate
    else
        echo "🔧 Using npm to install pnpm..."
        npm install -g pnpm
    fi
    
    echo "✅ pnpm installed successfully (version: $(pnpm --version))"
fi

echo ""

# Check for existing lock files
if [ -f "package-lock.json" ]; then
    echo "🗑️  Found package-lock.json - removing it..."
    rm package-lock.json
    echo "✅ Removed package-lock.json"
fi

if [ -f "yarn.lock" ]; then
    echo "🗑️  Found yarn.lock - removing it..."
    rm yarn.lock
    echo "✅ Removed yarn.lock"
fi

if [ -d "node_modules" ]; then
    echo "🗑️  Removing existing node_modules..."
    rm -rf node_modules
    echo "✅ Removed node_modules"
fi

echo ""

# Install dependencies with pnpm
echo "📥 Installing dependencies with pnpm..."
pnpm install

echo ""
echo "✅ Migration to pnpm completed successfully!"
echo ""
echo "📝 Next steps:"
echo "   • Use 'pnpm install' instead of 'npm install'"
echo "   • Use 'pnpm add <package>' instead of 'npm install <package>'"
echo "   • Use 'pnpm run <script>' instead of 'npm run <script>'"
echo "   • Use 'pnpm exec <command>' instead of 'npx <command>'"
echo ""
echo "🔗 Learn more about pnpm: https://pnpm.io/"
echo ""

# Verify the installation works
echo "🧪 Testing the installation..."
if pnpm run --help &> /dev/null; then
    echo "✅ pnpm is working correctly!"
    
    # Show available scripts
    echo ""
    echo "📋 Available scripts:"
    pnpm run | grep -E "^  [a-zA-Z]" | head -10
    
    if [ $(pnpm run | grep -E "^  [a-zA-Z]" | wc -l) -gt 10 ]; then
        echo "   ... and more (run 'pnpm run' to see all)"
    fi
else
    echo "❌ Something went wrong with the pnpm installation"
    echo "   Please check the error messages above and try again"
    exit 1
fi

echo ""
echo "🎉 You're all set to use pnpm with AI Code Review!"
