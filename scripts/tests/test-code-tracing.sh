#!/bin/bash

# Test script for the code tracing feature

echo "Testing code tracing feature..."
echo "Running unused code review with code tracing on src/utils directory"

# Set Claude model if you want to use Claude
# export AI_CODE_REVIEW_MODEL=anthropic:claude-3-haiku-20240307

# Run the code review with tracing option
node dist/index.js review --type unused-code --trace-code --output markdown ./src/utils

echo "Review completed!"
