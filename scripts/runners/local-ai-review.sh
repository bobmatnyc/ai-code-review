#!/bin/bash
# This script runs the local development version of the AI Code Review tool
# It uses ts-node to run the TypeScript code directly without building

echo "🔍 Running LOCAL development version of AI Code Review"
echo "📝 This is NOT the installed npm package"
echo "🚀 Executing with arguments: $@"
echo "---------------------------------------------------"

# Set log level to INFO for cleaner output
export AI_CODE_REVIEW_LOG_LEVEL=info

echo "📝 Using INFO log level with enhanced dependency analysis logging"
echo "---------------------------------------------------"

# Run the local code with pnpm
pnpm run local "$@"
