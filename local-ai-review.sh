#!/bin/bash
# This script runs the local development version of the AI Code Review tool
# It uses ts-node to run the TypeScript code directly without building

echo "🔍 Running LOCAL development version of AI Code Review"
echo "📝 This is NOT the installed npm package"
echo "🚀 Executing with arguments: $@"
echo "---------------------------------------------------"

# Run the local code with yarn
yarn local "$@"
