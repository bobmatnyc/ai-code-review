#!/usr/bin/env bash

# Script to ensure the global ai-code-review command uses the latest build
# This handles both npm link and npm install -g scenarios
# and cleans up any conflicting installations

echo "Ensuring ai-code-review global command is up-to-date..."

# Check for multiple installations
GLOBAL_PATHS=$(which -a ai-code-review 2>/dev/null)
NUM_PATHS=$(echo "$GLOBAL_PATHS" | wc -l)

if [ $NUM_PATHS -gt 1 ]; then
  echo "Found multiple ai-code-review installations:"
  echo "$GLOBAL_PATHS"
  echo "Cleaning up conflicting installations..."
  
  # Remove homebrew installation if it exists
  if [ -f "/opt/homebrew/bin/ai-code-review" ]; then
    echo "Removing Homebrew installation..."
    rm -f /opt/homebrew/bin/ai-code-review
  fi
  
  # Remove any other global installations
  echo "Uninstalling existing global packages..."
  npm uninstall -g @bobmatnyc/ai-code-review
fi

# Reinstall the package globally
echo "Installing package globally from local directory..."
npm install -g .

# Verify the installation was successful
if [ $? -eq 0 ]; then
  # Clear shell command path cache
  echo "Clearing shell command cache..."
  hash -r 2>/dev/null || true
  
  echo "✅ Global command updated successfully. You can now use 'ai-code-review' from anywhere."
  
  # Display the path to the global executable
  GLOBAL_PATH=$(which ai-code-review)
  echo "🔗 Global executable: $GLOBAL_PATH"
  
  # Display the version to confirm it's working
  VERSION=$(ai-code-review --show-version | tail -n 1)
  echo "📦 Version: $VERSION"
  
  echo ""
  echo "NOTE: If you still see errors about missing executables, please run 'hash -r' in your terminal"
  echo "or restart your terminal session to clear the command cache."
else
  echo "❌ Failed to update global command."
  exit 1
fi