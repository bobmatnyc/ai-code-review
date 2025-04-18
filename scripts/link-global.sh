#!/usr/bin/env bash

# Script to ensure the global ai-code-review command uses the latest build
# This handles both npm link and npm install -g scenarios

echo "Ensuring ai-code-review global command is up-to-date..."

# First, check if there's a globally installed version
GLOBAL_PATH=$(which ai-code-review 2>/dev/null)
if [ -z "$GLOBAL_PATH" ]; then
  echo "No global ai-code-review command found. Creating one with npm link..."
  npm link
else
  # Check if it's a link to our development directory or a global install
  LINK_TARGET=$(ls -la "$GLOBAL_PATH" | grep -- "->" | awk '{print $NF}')
  if [[ "$LINK_TARGET" == *"node_modules/@bobmatnyc/ai-code-review"* ]]; then
    echo "Found globally installed version. Reinstalling from local directory..."
    npm uninstall -g @bobmatnyc/ai-code-review
    npm install -g .
  else
    echo "Found npm-linked version. Refreshing link..."
    npm link
  fi
fi

# Verify the installation was successful
if [ $? -eq 0 ]; then
  echo "✅ Global command updated successfully. You can now use 'ai-code-review' from anywhere."
  
  # Display the path to the global executable
  GLOBAL_PATH=$(which ai-code-review)
  echo "🔗 Global executable: $GLOBAL_PATH"
  
  # Display the version to confirm it's working
  VERSION=$(ai-code-review --show-version | tail -n 1)
  echo "📦 Version: $VERSION"
else
  echo "❌ Failed to update global command."
  exit 1
fi