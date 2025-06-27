#!/bin/bash

# AI Code Review Development Environment Setup Script
set -e

echo "Setting up AI Code Review development environment..."

# Update system packages
sudo apt-get update

# Install Node.js 18.x (required by the project)
echo "Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
node_version=$(node --version)
echo "Node.js version: $node_version"

# Enable Corepack for pnpm support
echo "Enabling Corepack for pnpm..."
sudo corepack enable

# Install pnpm globally using Corepack
echo "Installing pnpm..."
corepack prepare pnpm@latest --activate

# Verify pnpm installation
pnpm_version=$(pnpm --version)
echo "pnpm version: $pnpm_version"

# Navigate to project directory and install dependencies
echo "Installing project dependencies..."
cd /mnt/persist/workspace
pnpm install --frozen-lockfile

# Generate version file (required by tests)
echo "Generating version file..."
pnpm run generate-version

# Validate prompts (required by test script)
echo "Validating prompts..."
pnpm run validate:prompts

echo "Development environment setup complete!"
echo "Node.js: $node_version"
echo "pnpm: $pnpm_version"
echo "Ready to run tests!"