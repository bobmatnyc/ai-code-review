#!/bin/bash

# Create scripts directory if it doesn't exist
mkdir -p scripts

# Ensure the script is executable
chmod +x scripts/prepare-package.sh

# Clean up previous build
echo "Cleaning up previous build..."
rm -rf dist

# Build the package
echo "Building package..."
npm run build

# Make the CLI executable
echo "Making CLI executable..."
chmod +x dist/index.js

# Verify package.json
echo "Verifying package.json..."
if ! grep -q "\"bin\":" package.json; then
  echo "Error: package.json is missing the bin field"
  exit 1
fi

# Run tests
echo "Running tests..."
npm test

echo "Package preparation complete!"
echo "You can now publish the package with: npm publish"
