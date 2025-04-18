#!/bin/bash

# Direct wrapper for ai-code-review
# Copy this script to a location in your PATH

GLOBAL_PATH="/Users/masa/.nvm/versions/node/v20.19.0/lib/node_modules/@bobmatnyc/ai-code-review/dist/index.js"

if [ -f "$GLOBAL_PATH" ]; then
    node "$GLOBAL_PATH" "$@"
else
    echo "Error: ai-code-review not found at $GLOBAL_PATH"
    echo "Please run the fix-physical-mac.sh script in the project directory"
    exit 1
fi