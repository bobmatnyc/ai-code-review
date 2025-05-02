#!/usr/bin/env bash

# Emergency fix script for physical Mac terminal
# Run this to fix the global command path issue

echo "🔧 Emergency Fix for Physical Mac Terminal"
echo "=========================================="

# Get actual global bin path
PNPM_PREFIX=$(pnpm config get prefix)
GLOBAL_BIN="$PNPM_PREFIX/bin/ai-code-review"

echo "Global pnpm prefix: $PNPM_PREFIX"
echo "Global binary path: $GLOBAL_BIN"

# Try to fix PATH issues
if [ -f "$GLOBAL_BIN" ]; then
    echo "✅ Global binary exists at: $GLOBAL_BIN"
else
    echo "❌ Global binary does not exist at the expected location"
fi

# Try to reinstall the package globally with a direct path
echo ""
echo "🔄 Reinstalling the package globally..."
cd /Users/masa/Projects/ai-code-review
pnpm uninstall -g @bobmatnyc/ai-code-review
pnpm install -g .

# Create a direct alias in the user's bin directory
echo ""
echo "🔄 Creating a direct alias in ~/bin..."
mkdir -p ~/bin
ln -sf "$PNPM_PREFIX/bin/ai-code-review" ~/bin/ai-code-review
chmod +x ~/bin/ai-code-review

echo ""
echo "🔄 Checking if the alias works..."
ls -la ~/bin/ai-code-review

# Show fix for .bash_profile or .zshrc
echo ""
echo "📝 Add these lines to your ~/.bash_profile or ~/.zshrc:"
echo "--------------------------------------------------------"
echo "export PATH=\"\$HOME/bin:\$PATH\""
echo "export PATH=\"\$HOME/.nvm/versions/node/\$(node -v)/bin:\$PATH\""
echo "--------------------------------------------------------"
echo ""
echo "Then run: source ~/.bash_profile (or ~/.zshrc)"
echo ""
echo "🔍 Alternatively, run this exact command to use the tool:"
echo "$PNPM_PREFIX/bin/ai-code-review"