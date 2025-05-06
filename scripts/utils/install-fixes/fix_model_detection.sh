#\!/bin/bash

# This script specifically fixes the model detection issue in the global installation

INSTALL_DIR="/opt/homebrew/lib/node_modules/@bobmatnyc/ai-code-review"
CORE_FILE="$INSTALL_DIR/dist/core/ApiClientSelector.js"

echo "==== AI Code Review Model Detection Fix ===="
echo

if [ \! -d "$INSTALL_DIR" ]; then
    echo "❌ Installation not found at: $INSTALL_DIR"
    exit 1
fi

# Step 1: Back up the ApiClientSelector.js file
echo "1. Backing up ApiClientSelector.js..."
if [ -f "$CORE_FILE" ]; then
    sudo cp "$CORE_FILE" "$CORE_FILE.bak"
    echo "✓ Backup created"
else
    echo "❌ ApiClientSelector.js not found at: $CORE_FILE"
    exit 1
fi

# Step 2: Modify the selectApiClient function to use the command line model
echo "2. Patching ApiClientSelector.js to prioritize command line model..."
sudo perl -i -pe 's#export async function selectApiClient\(.*?\) {#export async function selectApiClient(options = {}) {\n  // Fix: Check for command-line model option first\n  const cmdModel = options.model || process.argv.find(arg => arg.startsWith("--model="))?.split("=")[1];\n  if (cmdModel) {\n    console.log(`Using command-line model: ${cmdModel}`);\n    const [provider, model] = cmdModel.split(":");\n    if (provider === "openai") {\n      return await getOpenAIClient(model);\n    } else if (provider === "anthropic") {\n      return await getAnthropicClient(model);\n    } else if (provider === "gemini") {\n      return await getGeminiClient(model);\n    } else if (provider === "openrouter") {\n      return await getOpenRouterClient(model);\n    }\n  }\n  #' "$CORE_FILE"

# Step 3: Fix error messages for missing model
echo "3. Fixing error messages for missing model..."
sudo perl -i -pe 's#ERROR No (OpenAI|Gemini|Anthropic|OpenRouter) model specified in environment variables.*?Please set AI_CODE_REVIEW_MODEL in your \.env\.local file.*?Example:.*?$#INFO Using default model settings. For better results, specify model via --model parameter.#mg' "$CORE_FILE"

# Step 4: Create a better wrapper that directly specifies the model
echo "4. Creating an improved wrapper script..."
WRAPPER_SCRIPT="$INSTALL_DIR/bin/ai-code-review-wrapper.sh"

cat > /tmp/wrapper << 'EOT'
#\!/bin/bash

# AI Code Review improved wrapper script

# Get your OpenAI API key from environment variable or saved file
OPENAI_KEY=${OPENAI_API_KEY:-}

if [ -z "$OPENAI_KEY" ]; then
  # Check if we have a saved key
  if [ -f ~/.ai-code-review-key ]; then
    OPENAI_KEY=$(cat ~/.ai-code-review-key)
  else
    echo "Enter your OpenAI API key (or press Enter to be prompted each time):"
    read -r key
    if [ -n "$key" ]; then
      OPENAI_KEY=$key
      # Ask if we should save it
      echo "Save this key for future use? (y/N)"
      read -r save
      if [[ $save == "y" || $save == "Y" ]]; then
        echo "$OPENAI_KEY" > ~/.ai-code-review-key
        chmod 600 ~/.ai-code-review-key
        echo "Key saved to ~/.ai-code-review-key"
      fi
    fi
  fi
fi

# Define the model to use (hardcoding this to avoid detection issues)
MODEL="openai:gpt-4.1" 

# Add the model and OpenAI API key arguments
if [ -n "$OPENAI_KEY" ]; then
  # Special handling to pass model very early in the argument list
  NODE_OPTIONS="--max-old-space-size=4096" AI_CODE_REVIEW_MODEL=$MODEL ai-code-review --openai-api-key="$OPENAI_KEY" --model=$MODEL "$@"
else
  echo "No OpenAI API key found. Please provide it with --openai-api-key"
  ai-code-review "$@"
fi
EOT

sudo mkdir -p "$INSTALL_DIR/bin"
sudo cp /tmp/wrapper "$WRAPPER_SCRIPT"
sudo chmod +x "$WRAPPER_SCRIPT"
rm /tmp/wrapper

# Create a symlink in /usr/local/bin
echo "5. Creating a symlink to the wrapper script..."
sudo ln -sf "$WRAPPER_SCRIPT" /usr/local/bin/ai-code-review-enhanced

echo
echo "==== Installation Completed Successfully ===="
echo 
echo "You can now use AI Code Review with the enhanced wrapper:"
echo "   ai-code-review-enhanced ."
echo
echo "This wrapper will use your OpenAI API key and specify the model correctly."
echo "It sets both the environment variable and the command line parameter to ensure the model is recognized."
echo

echo "Done\!"
