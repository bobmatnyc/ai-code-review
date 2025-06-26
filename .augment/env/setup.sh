#!/bin/bash
set -e

# Update system packages
sudo apt-get update

# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install pnpm globally
sudo npm install -g pnpm@8.15.4

# Enable corepack for pnpm
sudo corepack enable

# Navigate to workspace directory
cd /mnt/persist/workspace

# Install project dependencies using pnpm
pnpm install

# Install missing node-fetch types
pnpm add -D @types/node-fetch

# Add Node.js, npm, and pnpm to PATH in user profile
echo 'export PATH="/usr/bin:/usr/local/bin:$PATH"' >> $HOME/.profile
echo 'export PATH="./node_modules/.bin:$PATH"' >> $HOME/.profile
echo 'export NODE_PATH="/usr/lib/node_modules"' >> $HOME/.profile

# Source the profile to make changes available
source $HOME/.profile

# Verify installations
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "pnpm version: $(pnpm --version)"
echo "TypeScript version: $(npx tsc --version)"

# Build TypeScript types
pnpm run build:types

# Validate prompts before running tests
pnpm run validate:prompts