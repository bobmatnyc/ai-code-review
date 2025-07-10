#!/bin/bash

# Candidate Evaluation Pipeline with AI Detection
# This script processes multiple candidate submissions with comprehensive AI detection
# and generates standardized evaluation reports.

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CANDIDATES_DIR="${CANDIDATES_DIR:-./candidates}"
RESULTS_DIR="${RESULTS_DIR:-./evaluation-results}"
CONFIG_DIR="${CONFIG_DIR:-./configs}"
REPORTS_DIR="${REPORTS_DIR:-./reports}"

# AI Detection Configuration
AI_DETECTION_THRESHOLD="${AI_DETECTION_THRESHOLD:-0.7}"
AI_DETECTION_ANALYZERS="${AI_DETECTION_ANALYZERS:-git,documentation}"
POSITION_LEVEL="${POSITION_LEVEL:-mid}"  # junior, mid, senior
FAIL_ON_DETECTION="${FAIL_ON_DETECTION:-false}"

# Logging
LOG_FILE="${RESULTS_DIR}/evaluation.log"
SUMMARY_FILE="${RESULTS_DIR}/evaluation-summary.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $*" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$LOG_FILE"
}

# Validate environment
validate_environment() {
    log_info "Validating environment..."
    
    # Check if ai-code-review is installed
    if ! command -v ai-code-review &> /dev/null; then
        log_error "ai-code-review tool not found. Please install it first:"
        log_error "npm install -g @bobmatnyc/ai-code-review"
        exit 1
    fi
    
    # Check required tools
    for tool in jq bc; do
        if ! command -v "$tool" &> /dev/null; then
            log_error "Required tool '$tool' not found. Please install it."
            exit 1
        fi
    done
    
    # Create directories
    mkdir -p "$RESULTS_DIR" "$REPORTS_DIR"
    
    log_success "Environment validation complete"
}

# Get position-specific configuration
get_position_config() {
    local position="$1"
    local config_file=""
    
    case "$position" in
        "junior")
            config_file="$CONFIG_DIR/hiring-junior-dev.yaml"
            AI_DETECTION_THRESHOLD="0.8"
            ;;
        "mid")
            config_file="$CONFIG_DIR/hiring-mid-dev.yaml"
            AI_DETECTION_THRESHOLD="0.7"
            ;;
        "senior")
            config_file="$CONFIG_DIR/hiring-senior-dev.yaml"
            AI_DETECTION_THRESHOLD="0.65"
            ;;
        "security")
            config_file="$CONFIG_DIR/security-role.yaml"
            AI_DETECTION_THRESHOLD="0.6"
            FAIL_ON_DETECTION="true"
            ;;
        *)
            log_warn "Unknown position level '$position', using default configuration"
            config_file=""
            ;;
    esac
    
    echo "$config_file"
}

# Evaluate single candidate
evaluate_candidate() {
    local candidate_dir="$1"
    local candidate_name="$(basename "$candidate_dir")"
    local config_file="$2"
    
    log_info "Evaluating candidate: $candidate_name"
    
    # Validate candidate directory
    if [[ ! -d "$candidate_dir" ]]; then
        log_error "Candidate directory not found: $candidate_dir"
        return 1
    fi
    
    # Check if directory has any code files
    if ! find "$candidate_dir" -type f \( -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" -o -name "*.rb" -o -name "*.php" \) | head -1 | grep -q .; then
        log_warn "No code files found for candidate: $candidate_name"
        return 1
    fi
    
    local result_file="$RESULTS_DIR/${candidate_name}-evaluation.json"
    local report_file="$REPORTS_DIR/${candidate_name}-report.md"
    
    # Build AI Code Review command
    local cmd_args=(
        "$candidate_dir"
        --type coding-test
        --enable-ai-detection
        --ai-detection-threshold "$AI_DETECTION_THRESHOLD"
        --ai-detection-analyzers "$AI_DETECTION_ANALYZERS"
        --ai-detection-include-in-report
        --format json
        --output "$result_file"
    )
    
    # Add config file if available
    if [[ -n "$config_file" && -f "$config_file" ]]; then
        cmd_args+=(--config "$config_file")
        log_info "Using configuration: $config_file"
    fi
    
    # Add fail-on-detection if enabled
    if [[ "$FAIL_ON_DETECTION" == "true" ]]; then
        cmd_args+=(--ai-detection-fail-on-detection)
        log_info "Automatic failure on AI detection enabled"
    fi
    
    # Run evaluation
    log_info "Running evaluation for $candidate_name..."
    local start_time=$(date +%s)
    
    if ai-code-review "${cmd_args[@]}" 2>&1 | tee -a "$LOG_FILE"; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        log_success "Evaluation completed for $candidate_name (${duration}s)"
    else
        local exit_code=$?
        log_error "Evaluation failed for $candidate_name (exit code: $exit_code)"
        return $exit_code
    fi
    
    # Extract and process results
    if [[ -f "$result_file" ]]; then
        extract_candidate_metrics "$result_file" "$candidate_name" "$report_file"
        return 0
    else
        log_error "Result file not found for $candidate_name"
        return 1
    fi
}

# Extract metrics from evaluation results
extract_candidate_metrics() {
    local result_file="$1"
    local candidate_name="$2"
    local report_file="$3"
    
    log_info "Extracting metrics for $candidate_name..."
    
    # Extract AI detection results
    local ai_detected
    local confidence
    local patterns_count
    local high_confidence_patterns
    local analysis_time
    local overall_score
    
    ai_detected=$(jq -r '.metadata.aiDetection.isAIGenerated // false' "$result_file")
    confidence=$(jq -r '.metadata.aiDetection.confidenceScore // 0' "$result_file")
    patterns_count=$(jq -r '.metadata.aiDetection.patternsDetected // 0' "$result_file")
    high_confidence_patterns=$(jq -r '.metadata.aiDetection.highConfidencePatterns // 0' "$result_file")
    analysis_time=$(jq -r '.metadata.aiDetection.analysisTime // 0' "$result_file")
    overall_score=$(jq -r '.metadata.overallScore // "N/A"' "$result_file")
    
    # Determine risk level
    local risk_level
    if (( $(echo "$confidence >= 0.9" | bc -l) )); then
        risk_level="CRITICAL"
    elif (( $(echo "$confidence >= 0.8" | bc -l) )); then
        risk_level="HIGH"
    elif (( $(echo "$confidence >= 0.6" | bc -l) )); then
        risk_level="MEDIUM"
    elif (( $(echo "$confidence >= 0.4" | bc -l) )); then
        risk_level="LOW"
    else
        risk_level="MINIMAL"
    fi
    
    # Log results
    log_info "Results for $candidate_name:"
    log_info "  AI Detected: $ai_detected"
    log_info "  Confidence: $confidence"
    log_info "  Risk Level: $risk_level"
    log_info "  Patterns: $patterns_count"
    log_info "  Analysis Time: ${analysis_time}ms"
    
    # Generate human-readable report
    generate_candidate_report "$candidate_name" "$report_file" \
        "$ai_detected" "$confidence" "$risk_level" "$patterns_count" \
        "$high_confidence_patterns" "$analysis_time" "$overall_score"
    
    # Add to summary data
    add_to_summary "$candidate_name" "$ai_detected" "$confidence" \
        "$risk_level" "$patterns_count" "$overall_score"
}

# Generate human-readable report for candidate
generate_candidate_report() {
    local candidate_name="$1"
    local report_file="$2"
    local ai_detected="$3"
    local confidence="$4"
    local risk_level="$5"
    local patterns_count="$6"
    local high_confidence_patterns="$7"
    local analysis_time="$8"
    local overall_score="$9"
    
    cat > "$report_file" << EOF
# Evaluation Report: $candidate_name

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Position Level:** $POSITION_LEVEL
**AI Detection Threshold:** $AI_DETECTION_THRESHOLD

## Summary

EOF
    
    if [[ "$ai_detected" == "true" ]]; then
        cat >> "$report_file" << EOF
⚠️ **AI-Generated Content Detected**

This candidate's submission shows indicators of AI-generated code and requires additional review.

EOF
    else
        cat >> "$report_file" << EOF
✅ **Human-Authored Code**

This candidate's submission appears to be human-authored based on the analysis.

EOF
    fi
    
    cat >> "$report_file" << EOF
## AI Detection Results

| Metric | Value |
|--------|-------|
| **AI Detected** | $ai_detected |
| **Confidence Score** | $confidence |
| **Risk Level** | $risk_level |
| **Patterns Detected** | $patterns_count |
| **High-Confidence Patterns** | $high_confidence_patterns |
| **Analysis Time** | ${analysis_time}ms |
| **Overall Score** | $overall_score |

## Risk Assessment

EOF
    
    case "$risk_level" in
        "CRITICAL")
            cat >> "$report_file" << EOF
🚨 **CRITICAL RISK** - Strong indicators of AI-generated content
- Immediate manual review required
- Consider rejecting or requesting re-submission
- Conduct live coding interview if proceeding

EOF
            ;;
        "HIGH")
            cat >> "$report_file" << EOF
⚠️ **HIGH RISK** - Multiple AI patterns detected
- Manual review strongly recommended
- Conduct technical interview
- Request explanation of key code sections

EOF
            ;;
        "MEDIUM")
            cat >> "$report_file" << EOF
⚠️ **MEDIUM RISK** - Some concerning patterns detected
- Additional verification recommended
- Consider follow-up questions about implementation
- Normal interview process with extra attention to code understanding

EOF
            ;;
        "LOW"|"MINIMAL")
            cat >> "$report_file" << EOF
✅ **LOW RISK** - Minimal or no AI indicators
- Proceed with standard evaluation process
- No additional verification required

EOF
            ;;
    esac
    
    cat >> "$report_file" << EOF
## Recommendations

EOF
    
    if [[ "$ai_detected" == "true" ]]; then
        cat >> "$report_file" << EOF
1. **Manual Review**: Conduct thorough manual code review
2. **Technical Interview**: Schedule detailed technical interview
3. **Live Coding**: Consider live coding session
4. **Code Explanation**: Ask candidate to explain specific implementations
5. **Additional Assessment**: May require supplementary evaluation

EOF
    else
        cat >> "$report_file" << EOF
1. **Standard Process**: Proceed with normal evaluation workflow
2. **Technical Interview**: Continue with planned technical interview
3. **Reference Check**: Complete standard reference verification

EOF
    fi
    
    cat >> "$report_file" << EOF
## Next Steps

- [ ] Review detailed analysis results
- [ ] Schedule technical interview
- [ ] Verify candidate understanding of implementation
- [ ] Complete evaluation scorecard
- [ ] Make hiring decision

---

*Report generated by AI Code Review v4.3.1+ Candidate Evaluation Pipeline*
*Configuration: Position=$POSITION_LEVEL, Threshold=$AI_DETECTION_THRESHOLD*
EOF
    
    log_success "Report generated: $report_file"
}

# Add candidate results to summary
add_to_summary() {
    local candidate_name="$1"
    local ai_detected="$2"
    local confidence="$3"
    local risk_level="$4"
    local patterns_count="$5"
    local overall_score="$6"
    
    # Initialize summary file if it doesn't exist
    if [[ ! -f "$SUMMARY_FILE" ]]; then
        echo '{"evaluation_summary": {"timestamp": "", "position_level": "", "threshold": "", "candidates": []}}' > "$SUMMARY_FILE"
    fi
    
    # Add candidate data
    local temp_file=$(mktemp)
    jq --arg name "$candidate_name" \
       --arg ai_detected "$ai_detected" \
       --arg confidence "$confidence" \
       --arg risk_level "$risk_level" \
       --arg patterns "$patterns_count" \
       --arg score "$overall_score" \
       --arg timestamp "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
       --arg position "$POSITION_LEVEL" \
       --arg threshold "$AI_DETECTION_THRESHOLD" \
       '
       .evaluation_summary.timestamp = $timestamp |
       .evaluation_summary.position_level = $position |
       .evaluation_summary.threshold = $threshold |
       .evaluation_summary.candidates += [{
           "name": $name,
           "ai_detected": ($ai_detected == "true"),
           "confidence_score": ($confidence | tonumber),
           "risk_level": $risk_level,
           "patterns_detected": ($patterns | tonumber),
           "overall_score": $score,
           "evaluated_at": $timestamp
       }]
       ' "$SUMMARY_FILE" > "$temp_file" && mv "$temp_file" "$SUMMARY_FILE"
}

# Generate final summary report
generate_summary_report() {
    log_info "Generating summary report..."
    
    local summary_report="$REPORTS_DIR/evaluation-summary.md"
    local total_candidates
    local ai_detected_count
    local high_risk_count
    local critical_risk_count
    
    total_candidates=$(jq -r '.evaluation_summary.candidates | length' "$SUMMARY_FILE")
    ai_detected_count=$(jq -r '.evaluation_summary.candidates | map(select(.ai_detected == true)) | length' "$SUMMARY_FILE")
    high_risk_count=$(jq -r '.evaluation_summary.candidates | map(select(.risk_level == "HIGH" or .risk_level == "CRITICAL")) | length' "$SUMMARY_FILE")
    critical_risk_count=$(jq -r '.evaluation_summary.candidates | map(select(.risk_level == "CRITICAL")) | length' "$SUMMARY_FILE")
    
    cat > "$summary_report" << EOF
# Candidate Evaluation Summary

**Generated:** $(date '+%Y-%m-%d %H:%M:%S')
**Position Level:** $POSITION_LEVEL
**AI Detection Threshold:** $AI_DETECTION_THRESHOLD
**Total Candidates Evaluated:** $total_candidates

## Overview

EOF
    
    if [[ $ai_detected_count -gt 0 ]]; then
        cat >> "$summary_report" << EOF
⚠️ **AI Detection Alerts**: $ai_detected_count of $total_candidates candidates showed AI-generated patterns

EOF
    else
        cat >> "$summary_report" << EOF
✅ **No AI Detection Issues**: All candidates passed AI detection screening

EOF
    fi
    
    cat >> "$summary_report" << EOF
## Statistics

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Evaluated | $total_candidates | 100% |
| AI Detected | $ai_detected_count | $(( ai_detected_count * 100 / total_candidates ))% |
| High Risk | $high_risk_count | $(( high_risk_count * 100 / total_candidates ))% |
| Critical Risk | $critical_risk_count | $(( critical_risk_count * 100 / total_candidates ))% |

## Candidate Results

EOF
    
    # Generate candidate table
    echo "| Candidate | AI Detected | Confidence | Risk Level | Action Required |" >> "$summary_report"
    echo "|-----------|-------------|------------|------------|-----------------|" >> "$summary_report"
    
    jq -r '.evaluation_summary.candidates[] | 
           [.name, 
            (if .ai_detected then "⚠️ Yes" else "✅ No" end), 
            (.confidence_score | tostring), 
            .risk_level, 
            (if .risk_level == "CRITICAL" then "🚨 Immediate Review" 
             elif .risk_level == "HIGH" then "⚠️ Manual Review" 
             elif .risk_level == "MEDIUM" then "📋 Additional Verification"
             else "✅ Standard Process" end)] | 
           "| " + join(" | ") + " |"' "$SUMMARY_FILE" >> "$summary_report"
    
    cat >> "$summary_report" << EOF

## Recommendations

EOF
    
    if [[ $critical_risk_count -gt 0 ]]; then
        cat >> "$summary_report" << EOF
### 🚨 Critical Risk Candidates ($critical_risk_count)
- Immediate manual review required
- Consider automatic rejection or re-submission request
- If proceeding, mandatory live coding interview

EOF
    fi
    
    if [[ $high_risk_count -gt $critical_risk_count ]]; then
        local high_only=$((high_risk_count - critical_risk_count))
        cat >> "$summary_report" << EOF
### ⚠️ High Risk Candidates ($high_only)
- Detailed technical interview required
- Request explanation of key implementations
- Additional verification methods recommended

EOF
    fi
    
    cat >> "$summary_report" << EOF
### 📊 Process Improvements
- Review AI detection threshold effectiveness
- Analyze common patterns in detected submissions
- Update evaluation criteria based on findings

## Files Generated

- **Detailed Results**: \`$RESULTS_DIR/\`
- **Individual Reports**: \`$REPORTS_DIR/\`
- **Summary Data**: \`$SUMMARY_FILE\`
- **Process Log**: \`$LOG_FILE\`

---

*Generated by AI Code Review Candidate Evaluation Pipeline*
EOF
    
    log_success "Summary report generated: $summary_report"
}

# Main execution
main() {
    log_info "Starting candidate evaluation pipeline..."
    log_info "Configuration:"
    log_info "  Candidates Directory: $CANDIDATES_DIR"
    log_info "  Results Directory: $RESULTS_DIR"
    log_info "  Position Level: $POSITION_LEVEL"
    log_info "  AI Detection Threshold: $AI_DETECTION_THRESHOLD"
    log_info "  Analyzers: $AI_DETECTION_ANALYZERS"
    log_info "  Fail on Detection: $FAIL_ON_DETECTION"
    
    # Initialize summary file
    echo '{"evaluation_summary": {"timestamp": "", "position_level": "", "threshold": "", "candidates": []}}' > "$SUMMARY_FILE"
    
    validate_environment
    
    # Get position-specific configuration
    local config_file
    config_file=$(get_position_config "$POSITION_LEVEL")
    
    if [[ -n "$config_file" && -f "$config_file" ]]; then
        log_info "Using position-specific configuration: $config_file"
    else
        log_warn "No position-specific configuration found, using CLI parameters"
    fi
    
    # Check if candidates directory exists
    if [[ ! -d "$CANDIDATES_DIR" ]]; then
        log_error "Candidates directory not found: $CANDIDATES_DIR"
        exit 1
    fi
    
    # Find candidate directories
    local candidate_dirs=()
    while IFS= read -r -d '' dir; do
        candidate_dirs+=("$dir")
    done < <(find "$CANDIDATES_DIR" -mindepth 1 -maxdepth 1 -type d -print0)
    
    if [[ ${#candidate_dirs[@]} -eq 0 ]]; then
        log_error "No candidate directories found in $CANDIDATES_DIR"
        exit 1
    fi
    
    log_info "Found ${#candidate_dirs[@]} candidates to evaluate"
    
    # Evaluate each candidate
    local successful_evaluations=0
    local failed_evaluations=0
    
    for candidate_dir in "${candidate_dirs[@]}"; do
        local candidate_name=$(basename "$candidate_dir")
        
        if evaluate_candidate "$candidate_dir" "$config_file"; then
            ((successful_evaluations++))
            log_success "Completed evaluation for $candidate_name"
        else
            ((failed_evaluations++))
            log_error "Failed evaluation for $candidate_name"
        fi
        
        echo "" # Add spacing between candidates
    done
    
    # Generate summary
    generate_summary_report
    
    # Final summary
    log_info "Evaluation pipeline completed!"
    log_info "Results:"
    log_info "  Successful evaluations: $successful_evaluations"
    log_info "  Failed evaluations: $failed_evaluations"
    log_info "  Total candidates: ${#candidate_dirs[@]}"
    
    if [[ $failed_evaluations -gt 0 ]]; then
        log_warn "Some evaluations failed. Check the log file for details: $LOG_FILE"
        exit 1
    else
        log_success "All evaluations completed successfully!"
    fi
}

# Help function
show_help() {
    cat << EOF
Candidate Evaluation Pipeline with AI Detection

USAGE:
    $0 [OPTIONS]

ENVIRONMENT VARIABLES:
    CANDIDATES_DIR              Directory containing candidate submissions (default: ./candidates)
    RESULTS_DIR                 Directory for evaluation results (default: ./evaluation-results)
    CONFIG_DIR                  Directory containing configuration files (default: ./configs)
    REPORTS_DIR                 Directory for human-readable reports (default: ./reports)
    AI_DETECTION_THRESHOLD      AI detection confidence threshold 0.0-1.0 (default: 0.7)
    AI_DETECTION_ANALYZERS      Comma-separated analyzers (default: git,documentation)
    POSITION_LEVEL              Position level: junior|mid|senior|security (default: mid)
    FAIL_ON_DETECTION           Fail evaluation on AI detection: true|false (default: false)

EXAMPLES:
    # Basic usage
    $0

    # Senior developer evaluation with strict threshold
    POSITION_LEVEL=senior AI_DETECTION_THRESHOLD=0.65 $0

    # Security role with automatic failure
    POSITION_LEVEL=security FAIL_ON_DETECTION=true $0

    # Custom directories
    CANDIDATES_DIR=/path/to/candidates RESULTS_DIR=/path/to/results $0

DIRECTORY STRUCTURE:
    candidates/
    ├── candidate-001/
    │   ├── src/
    │   ├── package.json
    │   └── README.md
    ├── candidate-002/
    └── ...

OUTPUT:
    evaluation-results/          JSON results for each candidate
    reports/                     Human-readable reports
    evaluation-summary.json      Summary data
    evaluation.log              Process log

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Run main function
main "$@"