#!/bin/bash
# This script runs the built version of the AI Code Review tool
# It builds the TypeScript code and then runs the JavaScript output

echo "🔧 Running BUILT version of AI Code Review"
echo "📦 This simulates the installed npm package"
echo "🚀 Executing with arguments: $@"
echo "---------------------------------------------------"

# First build the package
pnpm run build

# Then run the built version
node dist/index.js "$@"
