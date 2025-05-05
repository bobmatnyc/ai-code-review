#!/usr/bin/env bash

# Creates a robust wrapper script for ai-code-review that works even if the npm package is broken
# This guarantees the CLI will work by invoking the Node.js binary directly

echo "🛠️  Creating robust wrapper for ai-code-review..."

# Get the path to the installed binary
GLOBAL_PATH=$(which ai-code-review)

if [ -z "$GLOBAL_PATH" ]; then
  echo "❌ Failed to locate global ai-code-review binary."
  echo "Please make sure @bobmatnyc/ai-code-review is installed globally."
  echo "You can install it with: npm install -g @bobmatnyc/ai-code-review"
  exit 1
fi

echo "✅ Found ai-code-review at: $GLOBAL_PATH"

# Create the wrapper script
echo "📝 Creating wrapper script in /usr/local/bin..."

# Ensure the directory exists and is writable
if [ ! -d /usr/local/bin ]; then
  sudo mkdir -p /usr/local/bin
fi

# Create the wrapper script
cat > /tmp/ai-code-review-wrapper << EOF
#!/usr/bin/env bash

# This is a wrapper script for ai-code-review
# It ensures the CLI works by invoking Node.js directly
# Generated on $(date)

# Get the actual path to the ai-code-review script
ORIGINAL_SCRIPT="$GLOBAL_PATH"

# Run with Node.js directly
node "\$ORIGINAL_SCRIPT" "\$@"
EOF

# Make it executable
chmod +x /tmp/ai-code-review-wrapper

# Move it to /usr/local/bin (which is typically in PATH)
sudo mv /tmp/ai-code-review-wrapper /usr/local/bin/ai-code-review

echo "✅ Wrapper script created at /usr/local/bin/ai-code-review"
echo "📝 Testing the wrapper..."

# Test the wrapper
/usr/local/bin/ai-code-review --version

if [ $? -eq 0 ]; then
  echo "✅ Wrapper is working correctly!"
  echo "You can now use 'ai-code-review' from anywhere."
else
  echo "❌ Wrapper is not working correctly."
  echo "Please check the permissions and try again."
  exit 1
fi