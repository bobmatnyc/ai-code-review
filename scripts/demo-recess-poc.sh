#!/bin/bash

# Recess POC Demo Script
# This script demonstrates the coding-test strategy using the Recess assignment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
RECESS_PROJECT="/Users/masa/Clients/Recess/events-platform-samana"
CONFIG_FILE="/Users/masa/Projects/managed/ai-code-review/examples/recess-poc-config.json"
DEMO_OUTPUT="/Users/masa/Projects/managed/ai-code-review/ai-code-review-docs/recess-poc-demo"

echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║                    🎯 Recess POC Demo                         ║${NC}"
echo -e "${MAGENTA}║              AI Code Review - Coding Test Strategy            ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════════╝${NC}"
echo

# Function to print section headers
print_section() {
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════${NC}"
    echo
}

# Function to print step headers
print_step() {
    echo -e "${YELLOW}📋 Step $1: $2${NC}"
    echo
}

# Function to run command with nice output
run_demo_command() {
    local description="$1"
    local command="$2"
    local output_file="$3"
    
    echo -e "${BLUE}🔧 $description${NC}"
    echo -e "${YELLOW}Command:${NC} $command"
    echo
    
    if eval "$command" > "$output_file" 2>&1; then
        echo -e "${GREEN}✅ Success!${NC}"
        if [ -f "$output_file" ]; then
            file_size=$(wc -c < "$output_file")
            echo -e "${GREEN}📄 Output saved: $output_file ($file_size bytes)${NC}"
        fi
    else
        echo -e "${RED}❌ Command failed${NC}"
        echo "Check $output_file for error details"
        return 1
    fi
    echo
}

# Check prerequisites
print_section "🔍 Prerequisites Check"

echo -e "${BLUE}Checking project structure...${NC}"
if [ ! -d "$RECESS_PROJECT" ]; then
    echo -e "${RED}❌ Recess project not found at: $RECESS_PROJECT${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Recess project found${NC}"

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Configuration file not found at: $CONFIG_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Configuration file found${NC}"

# Create demo output directory
mkdir -p "$DEMO_OUTPUT"
echo -e "${GREEN}✅ Demo output directory created: $DEMO_OUTPUT${NC}"
echo

# Demo starts here
print_section "🚀 Demo: Recess POC Evaluation"

cd "$RECESS_PROJECT"

print_step "1" "Basic Evaluation with JSON Output"
run_demo_command \
    "Running basic coding test evaluation" \
    "ai-code-review --strategy coding-test --config '$CONFIG_FILE' --format json --output '$DEMO_OUTPUT/basic-evaluation.json'" \
    "$DEMO_OUTPUT/basic-evaluation.log"

print_step "2" "Comprehensive Markdown Report"
run_demo_command \
    "Generating comprehensive markdown report" \
    "ai-code-review --strategy coding-test --config '$CONFIG_FILE' --feedback-level comprehensive --include-examples --include-suggestions --format markdown --output '$DEMO_OUTPUT/comprehensive-report.md'" \
    "$DEMO_OUTPUT/comprehensive-report.log"

print_step "3" "Custom Scoring Weights"
run_demo_command \
    "Testing with custom scoring weights" \
    "ai-code-review --strategy coding-test --config '$CONFIG_FILE' --weight-correctness 40 --weight-code-quality 30 --weight-security 20 --weight-testing 10 --format json --output '$DEMO_OUTPUT/custom-weights.json'" \
    "$DEMO_OUTPUT/custom-weights.log"

print_step "4" "File-Focused Analysis"
run_demo_command \
    "Analyzing specific file types only" \
    "ai-code-review --strategy coding-test --config '$CONFIG_FILE' --include 'app/**/*.tsx,lib/**/*.ts,prisma/**/*.prisma' --format markdown --output '$DEMO_OUTPUT/focused-analysis.md'" \
    "$DEMO_OUTPUT/focused-analysis.log"

print_step "5" "Assignment Override Demo"
CUSTOM_ASSIGNMENT="# Events Platform Assessment
Build a modern events management platform with the following requirements:
- User authentication and authorization
- Event CRUD operations with proper validation
- Real-time updates and notifications
- Comprehensive testing and documentation
- Production-ready deployment configuration"

run_demo_command \
    "Using custom assignment text" \
    "ai-code-review --strategy coding-test --assignment-text '$CUSTOM_ASSIGNMENT' --difficulty-level senior --assessment-type take-home --format markdown --output '$DEMO_OUTPUT/custom-assignment.md'" \
    "$DEMO_OUTPUT/custom-assignment.log"

# Generate demo summary
print_section "📊 Demo Results Summary"

echo -e "${BLUE}Generated Files:${NC}"
echo
for file in "$DEMO_OUTPUT"/*.{json,md}; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        filesize=$(wc -c < "$file")
        echo -e "${GREEN}✅ $filename${NC} (${filesize} bytes)"
    fi
done
echo

echo -e "${BLUE}Log Files:${NC}"
echo
for file in "$DEMO_OUTPUT"/*.log; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        filesize=$(wc -c < "$file")
        echo -e "${YELLOW}📝 $filename${NC} (${filesize} bytes)"
    fi
done
echo

# Create demo summary file
cat > "$DEMO_OUTPUT/demo-summary.md" << EOF
# Recess POC Demo Summary

**Demo Date:** $(date)
**Project Evaluated:** events-platform-samana
**Configuration:** recess-poc-config.json

## Demo Steps Completed

1. ✅ **Basic Evaluation** - JSON output with standard configuration
2. ✅ **Comprehensive Report** - Detailed markdown report with examples
3. ✅ **Custom Scoring** - Modified criteria weights demonstration
4. ✅ **File Filtering** - Focused analysis on specific file types
5. ✅ **Assignment Override** - Custom assignment text functionality

## Generated Files

$(for file in "$DEMO_OUTPUT"/*.{json,md}; do
    if [ -f "$file" ] && [ "$(basename "$file")" != "demo-summary.md" ]; then
        filename=$(basename "$file")
        filesize=$(wc -c < "$file")
        echo "- **$filename** ($filesize bytes)"
    fi
done)

## Key Features Demonstrated

### Configuration Management
- ✅ JSON configuration file loading
- ✅ CLI parameter overrides
- ✅ Assignment text customization

### Output Formats
- ✅ JSON structured output
- ✅ Markdown human-readable reports
- ✅ Comprehensive evaluation details

### Evaluation Criteria
- ✅ Technical implementation assessment
- ✅ Code quality analysis
- ✅ Security evaluation
- ✅ Testing and QA review
- ✅ Architecture assessment

### Advanced Features
- ✅ Custom scoring weights
- ✅ File inclusion/exclusion patterns
- ✅ Multiple feedback levels
- ✅ AI model flexibility

## Sample Output Preview

### Basic Evaluation (JSON)
\`\`\`json
{
  "metadata": {
    "strategy": "coding-test",
    "assessmentType": "take-home",
    "difficultyLevel": "senior"
  },
  "scores": {
    "overall": 75,
    "breakdown": {
      "technicalImplementation": 20,
      "codeQuality": 15,
      "security": 10
    }
  }
}
\`\`\`

### Comprehensive Report (Markdown)
\`\`\`markdown
# Events Platform Evaluation Report

**Overall Score:** 75/100 (B+)

## Technical Implementation (20/25)
- ✅ Modern Next.js implementation
- ❌ Missing error handling
\`\`\`

## Next Steps

1. Review generated reports for accuracy
2. Test with different project structures
3. Experiment with various AI models
4. Customize evaluation criteria for specific needs
5. Integrate into CI/CD workflows

## Commands Used

\`\`\`bash
# Basic evaluation
ai-code-review --strategy coding-test --config recess-poc-config.json

# Comprehensive report
ai-code-review --strategy coding-test --config recess-poc-config.json --feedback-level comprehensive

# Custom weights
ai-code-review --strategy coding-test --config recess-poc-config.json --weight-correctness 40

# File filtering
ai-code-review --strategy coding-test --config recess-poc-config.json --include 'app/**/*.tsx'

# Assignment override
ai-code-review --strategy coding-test --assignment-text "Custom assignment..."
\`\`\`

---

*Generated by Recess POC Demo Script*
*AI Code Review Tool v4.3.1*
EOF

echo -e "${GREEN}📋 Demo summary generated: $DEMO_OUTPUT/demo-summary.md${NC}"
echo

print_section "🎉 Demo Complete!"

echo -e "${GREEN}✅ All demo steps completed successfully!${NC}"
echo
echo -e "${YELLOW}📁 Demo Output Directory:${NC} $DEMO_OUTPUT"
echo -e "${YELLOW}📋 Summary Report:${NC} $DEMO_OUTPUT/demo-summary.md"
echo
echo -e "${BLUE}💡 What you can do next:${NC}"
echo "  1. Review the generated evaluation reports"
echo "  2. Compare results with the original Recess evaluation"
echo "  3. Test with different AI models (Gemini, Claude, OpenAI)"
echo "  4. Customize the configuration for your own assignments"
echo "  5. Integrate into your evaluation workflow"
echo
echo -e "${MAGENTA}🚀 The Recess POC demonstrates that the coding-test strategy can successfully${NC}"
echo -e "${MAGENTA}   replicate professional code evaluation processes with AI assistance!${NC}"
echo