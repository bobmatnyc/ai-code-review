#!/usr/bin/env bash

# Fix for npm package installation of ai-code-review
# This script addresses the specific issue where the CLI binary is missing its shebang line
# or has other corruption when installed via npm

echo "🛠️  Fixing npm-installed ai-code-review package..."

# Get the current version from package.json
PACKAGE_VERSION=$(node -e "console.log(require('../package.json').version)")
echo "📦 Current version: $PACKAGE_VERSION"

# Force clean the npm cache
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# Uninstall any existing global installation
echo "🗑️  Removing existing global installation..."
npm uninstall -g @bobmatnyc/ai-code-review

# Install the latest version from npm
echo "📥 Installing from npm..."
npm install -g @bobmatnyc/ai-code-review@latest

# Get the path to the installed binary
GLOBAL_PATH=$(which ai-code-review)

if [ -z "$GLOBAL_PATH" ]; then
  echo "❌ Failed to locate global ai-code-review binary."
  exit 1
fi

echo "✅ Found ai-code-review at: $GLOBAL_PATH"

# Check the first line to ensure it has a proper shebang
FIRST_LINE=$(head -n 1 "$GLOBAL_PATH")
echo "📝 First line: $FIRST_LINE"

if [[ "$FIRST_LINE" != "#!/usr/bin/env node" ]]; then
  echo "⚠️  Missing or incorrect shebang line. Fixing now..."
  
  # Create a temporary file with the proper shebang line
  echo '#!/usr/bin/env node' > /tmp/ai-code-review-fixed
  
  # Append the rest of the file
  cat "$GLOBAL_PATH" >> /tmp/ai-code-review-fixed
  
  # Replace the original file with the fixed version
  sudo mv /tmp/ai-code-review-fixed "$GLOBAL_PATH"
  
  # Make sure it's executable
  sudo chmod +x "$GLOBAL_PATH"
  
  echo "✅ Fixed shebang line in $GLOBAL_PATH"
else
  echo "✅ Shebang line is correctly set."
fi

# Verify the binary works
echo "🧪 Testing the binary..."
ai-code-review --version

if [ $? -eq 0 ]; then
  echo "✅ ai-code-review is working correctly!"
else
  echo "❌ ai-code-review is still not working correctly."
  echo "⚠️  Additional diagnostics:"
  
  # Check for potential issues
  echo "📁 File details:"
  ls -la "$GLOBAL_PATH"
  
  echo "📊 File type:"
  file "$GLOBAL_PATH"
  
  echo "👀 First 10 lines:"
  head -n 10 "$GLOBAL_PATH"
  
  echo "⚙️  Try running with node directly:"
  node "$GLOBAL_PATH" --version
  
  echo ""
  echo "📝 If all else fails, create a wrapper script:"
  echo ""
  echo "cat > /usr/local/bin/ai-code-review << 'EOF'"
  echo '#!/usr/bin/env bash'
  echo 'node "'$GLOBAL_PATH'" "$@"'
  echo "EOF"
  echo "chmod +x /usr/local/bin/ai-code-review"
fi