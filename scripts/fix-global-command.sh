#!/usr/bin/env bash

# One-click fix for global ai-code-review command
# This script fixes issues with the global ai-code-review command,
# including shell path caching, multiple installations, and outdated versions.

echo "🛠️  Fixing global ai-code-review command..."

# Remove any existing installations
echo "📝 Removing any existing global installations..."
npm uninstall -g @bobmatnyc/ai-code-review 2>/dev/null

# Check for and remove Homebrew installation
if [ -f "/opt/homebrew/bin/ai-code-review" ]; then
  echo "📝 Removing Homebrew installation..."
  sudo rm -f /opt/homebrew/bin/ai-code-review
fi

# Install from local directory
echo "📝 Installing from local directory..."
npm install -g .

# Clear shell path cache
echo "📝 Clearing shell command cache..."
hash -r 2>/dev/null

# Verify installation
GLOBAL_PATH=$(which ai-code-review 2>/dev/null)

if [ -z "$GLOBAL_PATH" ]; then
  echo "❌ Failed to install global command. Please check error messages above."
  exit 1
else
  echo "✅ Global command successfully installed at: $GLOBAL_PATH"
  
  # Check the first line to ensure it has a proper shebang
  FIRST_LINE=$(head -n 1 "$GLOBAL_PATH")
  if [[ "$FIRST_LINE" != "#!/usr/bin/env node" ]]; then
    echo "⚠️  Missing or incorrect shebang line. Fixing now..."
    # Create a temporary file with the proper shebang line
    echo '#!/usr/bin/env node' > /tmp/ai-code-review-fixed
    # Append the rest of the file
    tail -n +1 "$GLOBAL_PATH" >> /tmp/ai-code-review-fixed
    # Replace the original file with the fixed version
    sudo mv /tmp/ai-code-review-fixed "$GLOBAL_PATH"
    # Make sure it's executable
    sudo chmod +x "$GLOBAL_PATH"
    echo "✅ Fixed shebang line in $GLOBAL_PATH"
  else
    echo "✅ Shebang line is correctly set."
  fi
  
  # Check if it's using the correct version
  VERSION=$(ai-code-review --show-version | tail -n 1)
  echo "📦 Version: $VERSION"
  
  echo ""
  echo "✨ Installation successful! You can now use 'ai-code-review' from anywhere."
  echo ""
  echo "If you still see errors, please try:"
  echo "1. Run 'hash -r' in your terminal"
  echo "2. Start a new terminal session"
  echo "3. Add this to your ~/.bashrc or ~/.zshrc:"
  echo "   export PATH=\"\$HOME/.nvm/versions/node/\$(node -v)/bin:\$PATH\""
fi