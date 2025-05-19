#!/bin/bash

# CI Local Check Script
# Run all CI checks locally before pushing changes

echo "🔍 Running local CI checks..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track if any step fails
FAILED=0

# Function to run a command and check result
run_check() {
    local name=$1
    local command=$2
    
    echo -e "\n${YELLOW}Running: ${name}${NC}"
    echo "Command: ${command}"
    
    if eval "${command}"; then
        echo -e "${GREEN}✓ ${name} passed${NC}"
    else
        echo -e "${RED}✗ ${name} failed${NC}"
        FAILED=1
    fi
}

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
fi

# Run all checks
run_check "Linting" "npm run lint"
run_check "Type checking" "npm run build:types"
run_check "Tests" "npm test"
run_check "Build" "npm run build"

# Check for uncommitted changes to package-lock.json
if git diff --exit-code package-lock.json > /dev/null 2>&1; then
    echo -e "${GREEN}✓ package-lock.json is up to date${NC}"
else
    echo -e "${RED}✗ package-lock.json has uncommitted changes${NC}"
    echo "Run 'git add package-lock.json' if these changes are intentional"
    FAILED=1
fi

# Summary
echo -e "\n${YELLOW}=================== CI Check Summary ===================${NC}"
if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Safe to push.${NC}"
else
    echo -e "${RED}✗ Some checks failed. Please fix issues before pushing.${NC}"
    exit 1
fi