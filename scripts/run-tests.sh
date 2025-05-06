#!/bin/bash

# Script to run the test scripts from the scripts/tests directory
# Usage: ./scripts/run-tests.sh [test-name] [arguments]
# Example: ./scripts/run-tests.sh standalone-test.js
#          ./scripts/run-tests.sh tool-calling/test-mock-data.js
#          ./scripts/run-tests.sh test-tool-calling.js openai

# Get the project root directory
PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
TESTS_DIR="$PROJECT_ROOT/scripts/tests"
TOOL_CALLING_DIR="$TESTS_DIR/tool-calling"

# If no arguments provided, list available tests
if [ $# -eq 0 ]; then
  echo "Available tests:"
  echo "Main tests:"
  find "$TESTS_DIR" -maxdepth 1 -type f -name "*.js" -o -name "*.sh" | xargs -n1 basename | sort
  echo -e "\nTool calling tests:"
  find "$TOOL_CALLING_DIR" -maxdepth 1 -type f -name "*.js" -o -name "*.sh" | xargs -n1 basename | sort
  exit 0
fi

TEST_NAME="$1"
shift  # Remove the first argument (test name)

# Check if the test is in the tool-calling subdirectory or main tests directory
if [[ "$TEST_NAME" == *"/"* ]]; then
  # If path contains a slash, use it directly
  TEST_PATH="$TESTS_DIR/$TEST_NAME"
else
  # Otherwise check if it exists in main tests dir or tool-calling
  if [ -f "$TESTS_DIR/$TEST_NAME" ]; then
    TEST_PATH="$TESTS_DIR/$TEST_NAME"
  elif [ -f "$TOOL_CALLING_DIR/$TEST_NAME" ]; then
    TEST_PATH="$TOOL_CALLING_DIR/$TEST_NAME"
  else
    echo "Error: Test '$TEST_NAME' not found in $TESTS_DIR or $TOOL_CALLING_DIR"
    exit 1
  fi
fi

# Check if the test exists
if [ ! -f "$TEST_PATH" ]; then
  echo "Error: Test '$TEST_PATH' not found"
  exit 1
fi

# Make the test executable if it's not already
if [[ "$TEST_PATH" == *.sh ]]; then
  chmod +x "$TEST_PATH"
  "$TEST_PATH" "$@"
else
  # For JavaScript files, use node
  node "$TEST_PATH" "$@"
fi