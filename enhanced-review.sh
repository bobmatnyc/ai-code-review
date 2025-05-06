#!/bin/bash

# Enhanced code review script that automatically adds a file list to architectural reviews
# and performs dependency analysis with security checks
# This script wraps the standard code-review command and applies post-processing

# Function to print usage information
function print_usage {
  echo "Usage: $0 [options] [target]"
  echo ""
  echo "This script extends the standard code-review command with enhanced features:"
  echo "  - Automatically adds a list of analyzed files to architectural reviews"
  echo "  - Performs dependency analysis with security checks for package dependencies"
  echo ""
  echo "Additional features enabled by default for architectural reviews:"
  echo "  - Package security analysis using SerpAPI (requires SERPAPI_KEY in .env.local)"
  echo ""
  echo "Example usage:"
  echo "  $0 -t arch ./my-project  # Run enhanced architectural review on ./my-project"
  echo "  $0 -t quick-fixes ./src  # Run regular quick-fixes review on ./src"
  echo ""
  exit 1
}

# Check for help option
if [[ "$*" == *"-h"* || "$*" == *"--help"* ]]; then
  print_usage
fi

# Determine the script's directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Get the time before executing the command
START_TIME=$(date +%s)

# Create a temporary file to capture the output
TEMP_OUTPUT=$(mktemp)

# Check if this is an architectural review
IS_ARCH=false
if [[ "$*" == *"-t arch"* || "$*" == *"--type arch"* || "$*" == *"-t architectural"* || "$*" == *"--type architectural"* ]]; then
  IS_ARCH=true
  echo "🔍 Running enhanced architectural review with dependency analysis..."
  
  # Check if .env.local file exists
  ENV_FILE="$SCRIPT_DIR/.env.local"
  if [[ -f "$ENV_FILE" ]]; then
    # Check if SERPAPI_KEY is already set in environment
    if [[ -z "$SERPAPI_KEY" ]]; then
      # Extract SERPAPI_KEY from .env.local if it exists
      SERPAPI_KEY=$(grep SERPAPI_KEY "$ENV_FILE" | cut -d '=' -f2)
      if [[ ! -z "$SERPAPI_KEY" ]]; then
        echo "✅ Using SERPAPI_KEY from .env.local for package security analysis"
        export SERPAPI_KEY
      else
        echo "⚠️ No SERPAPI_KEY found in .env.local. Package security analysis may not work."
        echo "   Add a SERPAPI_KEY entry to .env.local to enable dependency security analysis."
      fi
    fi
  fi
  
  # Add --include-dependency-analysis flag if not already present
  if [[ "$*" != *"--include-dependency-analysis"* && "$*" != *"--no-include-dependency-analysis"* ]]; then
    # Run the code-review command with dependency analysis enabled
    $SCRIPT_DIR/code-review "$@" --include-dependency-analysis | tee "$TEMP_OUTPUT"
  else
    # Run with the user's specified dependency analysis setting
    $SCRIPT_DIR/code-review "$@" | tee "$TEMP_OUTPUT"
  fi
else
  # For non-architectural reviews, just run the command as is
  $SCRIPT_DIR/code-review "$@" | tee "$TEMP_OUTPUT"
fi
EXIT_CODE=${PIPESTATUS[0]}

# Extract review file path from the output if review was completed
REVIEW_PATH=$(grep -oE '/Users/[^ ]+/ai-code-review-docs/[^ ]+\.(md|json)' "$TEMP_OUTPUT" | tail -n 1)

# Remove the temporary file
rm "$TEMP_OUTPUT"

# Check if a review path was found and the command succeeded
if [[ ! -z "$REVIEW_PATH" && $EXIT_CODE -eq 0 ]]; then
  # Check if it's an architectural review
  if [[ "$REVIEW_PATH" == *"architectural-review"* ]]; then
    echo "Post-processing architectural review..."
    
    # Run the enhanced review script (handles both file lists and package security)
    node "$SCRIPT_DIR/enhance-review.js" "$REVIEW_PATH"
    
    # Get the time after post-processing
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo "✅ Enhanced review completed in $DURATION seconds"
    echo "Review saved to: $REVIEW_PATH"
  fi
fi

# Return the original exit code
exit $EXIT_CODE