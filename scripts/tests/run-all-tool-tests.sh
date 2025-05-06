#!/bin/bash

# Script to run all tool calling tests
# This script runs both OpenAI and Anthropic tool calling tests 

PROJECT_ROOT="$( cd "$( dirname "${BASH_SOURCE[0]}" )/../.." && pwd )"
TESTS_DIR="$PROJECT_ROOT/scripts/tests"
TOOL_CALLING_DIR="$TESTS_DIR/tool-calling"
RUN_TESTS="$PROJECT_ROOT/scripts/run-tests.sh"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Running Tool Calling Tests ====${NC}"
echo "This script will run the main tool calling tests for both OpenAI and Anthropic"

# Check for necessary API keys
if [ -z "$AI_CODE_REVIEW_OPENAI_API_KEY" ]; then
  echo -e "${YELLOW}WARNING: OpenAI API key not set. Some tests will use mock implementations.${NC}"
  echo "Set AI_CODE_REVIEW_OPENAI_API_KEY for full testing."
else
  echo -e "${GREEN}OpenAI API key is set.${NC}"
fi

if [ -z "$AI_CODE_REVIEW_ANTHROPIC_API_KEY" ]; then
  echo -e "${YELLOW}WARNING: Anthropic API key not set. Some tests will use mock implementations.${NC}"
  echo "Set AI_CODE_REVIEW_ANTHROPIC_API_KEY for full testing."
else
  echo -e "${GREEN}Anthropic API key is set.${NC}"
fi

if [ -z "$SERPAPI_KEY" ]; then
  echo -e "${YELLOW}WARNING: SERPAPI key not set. Dependency analysis will use mock implementations.${NC}"
  echo "Set SERPAPI_KEY for full testing."
else
  echo -e "${GREEN}SERPAPI key is set.${NC}"
fi

echo ""
echo -e "${BLUE}=== Running basic tests with mock data ===${NC}"
$RUN_TESTS tool-calling/test-mock-data.js

echo ""
echo -e "${BLUE}=== Running tests with mock SERPAPI implementation ===${NC}"
$RUN_TESTS tool-calling/test-mock-serpapi.js

echo ""
echo -e "${BLUE}=== All tests completed ===${NC}"
echo "Check the output above for any errors."