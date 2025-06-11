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
pnpm run build

# Make the CLI executable and ensure it has the correct shebang line
echo "Making CLI executable and adding shebang line..."
chmod +x dist/index.js

# Check if shebang already exists, if not add it
echo "Checking shebang line in dist/index.js..."
if ! head -1 dist/index.js | grep -q "^#!/usr/bin/env node"; then
  echo "Adding shebang line to dist/index.js..."
  echo '#!/usr/bin/env node' > dist/index.js.tmp
  cat dist/index.js >> dist/index.js.tmp
  mv dist/index.js.tmp dist/index.js
else
  echo "Shebang already present in dist/index.js"
fi
chmod +x dist/index.js

# Verify the shebang was correctly added
if grep -q "^#!/usr/bin/env node" dist/index.js; then
  echo "✅ Shebang line successfully added to dist/index.js"
else
  echo "❌ Failed to add shebang line to dist/index.js"
  exit 1
fi

# IMPORTANT: We no longer copy prompts to the dist directory
# All prompts are now bundled in the code
echo "Skipping prompts directory copy - prompts are now bundled in the code"

# Verify package.json
echo "Verifying package.json..."
if ! grep -q "\"bin\":" package.json; then
  echo "Error: package.json is missing the bin field"
  exit 1
fi

# Run tests
echo "Running tests..."
pnpm test

# Skip model validation for now
echo "Skipping model validation..."
# pnpm run validate:models

echo "Package preparation complete!"
echo "You can now publish the package with: pnpm publish"