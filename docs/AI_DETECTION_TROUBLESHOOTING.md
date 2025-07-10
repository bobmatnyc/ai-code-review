# AI Detection Troubleshooting Guide

This guide helps resolve common issues with AI detection functionality in the AI Code Review tool.

## Table of Contents

- [Quick Diagnostic Checklist](#quick-diagnostic-checklist)
- [Common Error Messages](#common-error-messages)
- [Performance Issues](#performance-issues)
- [False Positives/Negatives](#false-positivesnegatives)
- [Configuration Problems](#configuration-problems)
- [Integration Issues](#integration-issues)
- [Debug Mode Usage](#debug-mode-usage)
- [Environment Troubleshooting](#environment-troubleshooting)

## Quick Diagnostic Checklist

Before diving into specific issues, run through this quick checklist:

### ✅ Prerequisites Check

```bash
# 1. Check tool installation
ai-code-review --version

# 2. Verify AI detection is supported
ai-code-review --help | grep "ai-detection"

# 3. Test basic functionality
ai-code-review ./test-directory --type coding-test --enable-ai-detection --debug
```

### ✅ Environment Check

```bash
# Check Node.js version (requires 16+)
node --version

# Check available memory
free -h  # Linux
vm_stat  # macOS

# Check disk space
df -h
```

### ✅ Project Structure Check

```bash
# Verify git repository
git status

# Check for documentation files
find . -name "README*" -o -name "*.md" | head -5

# Check for code files
find . -name "*.js" -o -name "*.ts" -o -name "*.py" | head -5
```

## Common Error Messages

### "AI detection failed: Analysis timeout"

**Cause:** The analysis is taking longer than the configured timeout.

**Solutions:**

1. **Increase timeout** (if you have control over configuration):
   ```bash
   # Use fewer analyzers for faster analysis
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --ai-detection-analyzers git
   ```

2. **Reduce analysis scope**:
   ```bash
   # Analyze only specific directories
   ai-code-review ./src --type coding-test --enable-ai-detection
   ```

3. **Check system resources**:
   ```bash
   # Monitor during analysis
   top -p $(pgrep -f ai-code-review)
   ```

### "AI detection enabled but engine not initialized"

**Cause:** AI detection configuration is incomplete or invalid.

**Solutions:**

1. **Check review type**:
   ```bash
   # AI detection only works with coding-test type
   ai-code-review ./project --type coding-test --enable-ai-detection
   ```

2. **Verify configuration**:
   ```bash
   # Test with minimal configuration
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --ai-detection-threshold 0.7 \
     --ai-detection-analyzers git,documentation
   ```

### "Invalid AI detection analyzers: [analyzer-name]"

**Cause:** Specified analyzer is not recognized or not implemented.

**Solutions:**

1. **Use valid analyzers**:
   ```bash
   # Currently available analyzers
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --ai-detection-analyzers git,documentation
   ```

2. **Check available analyzers**:
   ```bash
   ai-code-review --help | grep -A 5 "ai-detection-analyzers"
   ```

### "Submission conversion failed"

**Cause:** The project structure doesn't meet AI detection requirements.

**Solutions:**

1. **Check git repository**:
   ```bash
   # Initialize git if needed
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Verify project has code files**:
   ```bash
   # Ensure recognizable code files exist
   find . -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.java"
   ```

3. **Add documentation**:
   ```bash
   # Create basic README if missing
   echo "# Project Description" > README.md
   ```

## Performance Issues

### Slow AI Detection Analysis

**Symptoms:**
- Analysis takes longer than 30 seconds
- High CPU/memory usage
- System becomes unresponsive

**Solutions:**

1. **Use faster analyzers**:
   ```bash
   # Git analyzer is typically fastest
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --ai-detection-analyzers git
   ```

2. **Limit analysis scope**:
   ```bash
   # Analyze specific directories only
   ai-code-review ./src/main --type coding-test --enable-ai-detection
   ```

3. **Check project size**:
   ```bash
   # Count files and size
   find . -type f | wc -l
   du -sh .
   
   # If very large, consider analyzing smaller portions
   ```

4. **Monitor system resources**:
   ```bash
   # Check available resources
   htop  # or top
   iostat 1  # Check I/O usage
   ```

### Memory Issues

**Symptoms:**
- "Out of memory" errors
- System swap usage increases dramatically
- Node.js heap allocation errors

**Solutions:**

1. **Increase Node.js memory limit**:
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" ai-code-review ./project \
     --type coding-test --enable-ai-detection
   ```

2. **Process smaller chunks**:
   ```bash
   # Analyze directories separately
   for dir in src tests docs; do
     ai-code-review ./$dir --type coding-test --enable-ai-detection
   done
   ```

3. **Clean up temporary files**:
   ```bash
   # Clear Node.js cache
   npm cache clean --force
   
   # Clear temporary directories
   rm -rf /tmp/ai-detection-*
   ```

## False Positives/Negatives

### False Positives (Human code flagged as AI)

**Common Causes:**
- Very clean, consistent coding style
- Template-based or generated code (legitimate)
- Following strict style guides

**Solutions:**

1. **Adjust threshold**:
   ```bash
   # Use higher threshold (less sensitive)
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --ai-detection-threshold 0.85
   ```

2. **Review specific patterns**:
   ```bash
   # Enable debug mode to see what triggered detection
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --debug
   ```

3. **Use different analyzers**:
   ```bash
   # Try only git analysis if documentation seems too template-like
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --ai-detection-analyzers git
   ```

### False Negatives (AI code not detected)

**Common Causes:**
- Heavily modified AI output
- Sophisticated AI tools
- Mixed human-AI collaboration

**Solutions:**

1. **Lower threshold**:
   ```bash
   # Use lower threshold (more sensitive)
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --ai-detection-threshold 0.6
   ```

2. **Use all available analyzers**:
   ```bash
   # Use comprehensive analysis
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --ai-detection-analyzers git,documentation
   ```

3. **Manual verification**:
   ```bash
   # Even if not detected, manual review is recommended for critical cases
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --ai-detection-include-in-report
   ```

## Configuration Problems

### Invalid Configuration File

**Error:** Configuration file parsing errors

**Solutions:**

1. **Validate YAML syntax**:
   ```bash
   # Check YAML syntax
   python -c "import yaml; yaml.safe_load(open('config.yaml'))"
   
   # Or use online YAML validator
   ```

2. **Use minimal configuration**:
   ```yaml
   # minimal-config.yaml
   reviewType: coding-test
   enableAiDetection: true
   aiDetectionThreshold: 0.7
   ```

3. **Test configuration**:
   ```bash
   ai-code-review ./test-project --config minimal-config.yaml --debug
   ```

### Environment Variable Issues

**Error:** Configuration not being applied

**Solutions:**

1. **Check environment variables**:
   ```bash
   # List AI detection related variables
   env | grep AI_CODE_REVIEW
   ```

2. **Set variables correctly**:
   ```bash
   export AI_CODE_REVIEW_MODEL=gemini:gemini-2.5-pro
   export AI_CODE_REVIEW_LOG_LEVEL=debug
   ai-code-review ./project --type coding-test --enable-ai-detection
   ```

3. **Override with CLI parameters**:
   ```bash
   # CLI parameters override environment variables
   ai-code-review ./project --type coding-test \
     --enable-ai-detection \
     --ai-detection-threshold 0.8
   ```

## Integration Issues

### CI/CD Pipeline Failures

**Symptoms:**
- Pipeline hangs during AI detection
- Inconsistent results between local and CI
- Permission errors

**Solutions:**

1. **Check CI environment**:
   ```yaml
   # GitHub Actions example
   - name: Debug Environment
     run: |
       echo "Node version: $(node --version)"
       echo "Available memory: $(free -h)"
       echo "Git status: $(git status --porcelain | wc -l) files"
   ```

2. **Use appropriate timeouts**:
   ```yaml
   - name: AI Detection
     timeout-minutes: 10  # Prevent hanging
     run: |
       ai-code-review . --type coding-test --enable-ai-detection
   ```

3. **Handle git history**:
   ```yaml
   - uses: actions/checkout@v4
     with:
       fetch-depth: 0  # Important for git analyzer
   ```

### Docker/Container Issues

**Symptoms:**
- Different results in containers
- Missing git history
- Permission problems

**Solutions:**

1. **Ensure git history available**:
   ```dockerfile
   # In Dockerfile
   COPY .git /app/.git
   WORKDIR /app
   ```

2. **Set proper permissions**:
   ```bash
   # In container
   chown -R app:app /app
   git config --global --add safe.directory /app
   ```

3. **Use appropriate base image**:
   ```dockerfile
   FROM node:18
   RUN apt-get update && apt-get install -y git
   ```

## Debug Mode Usage

### Enabling Debug Mode

```bash
# Method 1: CLI flag
ai-code-review ./project --type coding-test --enable-ai-detection --debug

# Method 2: Environment variable
DEBUG=1 ai-code-review ./project --type coding-test --enable-ai-detection

# Method 3: Log level
AI_CODE_REVIEW_LOG_LEVEL=debug ai-code-review ./project --type coding-test --enable-ai-detection
```

### Understanding Debug Output

```bash
# Look for these debug markers:
🔍 Starting AI detection analysis...     # Analysis start
📊 Results: Confidence=...               # Results summary
✅ AI detection completed in Xms        # Success timing
❌ AI detection failed after Xms        # Failure timing
🔧 AI detection troubleshooting:        # Auto troubleshooting tips
```

### Debug Log Analysis

```bash
# Save debug output for analysis
ai-code-review ./project --type coding-test --enable-ai-detection --debug > debug.log 2>&1

# Search for specific issues
grep -E "(ERROR|WARN|Failed)" debug.log
grep -E "AI detection" debug.log
grep -E "Pattern|Confidence" debug.log
```

## Environment Troubleshooting

### Node.js Issues

**Check Node.js version compatibility:**
```bash
# Minimum Node.js 16 required
node --version

# Check npm configuration
npm config list
npm doctor
```

**Fix Node.js issues:**
```bash
# Update Node.js (using nvm)
nvm install 18
nvm use 18

# Clear npm cache
npm cache clean --force

# Reinstall tool
npm uninstall -g @bobmatnyc/ai-code-review
npm install -g @bobmatnyc/ai-code-review
```

### Git Configuration Issues

**Check git setup:**
```bash
# Verify git is working
git --version
git status

# Check git configuration
git config --list
```

**Fix git issues:**
```bash
# Initialize repository if needed
git init

# Configure git if not set
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Add initial commit if repository is empty
git add .
git commit -m "Initial commit" --allow-empty
```

### Permission Issues

**Check file permissions:**
```bash
# Check directory permissions
ls -la ./project

# Check if files are readable
find ./project -type f ! -readable
```

**Fix permission issues:**
```bash
# Fix file permissions
chmod -R u+r ./project

# Fix directory permissions  
chmod -R u+x ./project
```

## Getting Additional Help

### Collecting Diagnostic Information

When reporting issues, collect this information:

```bash
#!/bin/bash
# diagnostic-info.sh

echo "=== AI Code Review Diagnostic Information ==="
echo "Date: $(date)"
echo "System: $(uname -a)"
echo

echo "=== Tool Version ==="
ai-code-review --version
echo

echo "=== Node.js Information ==="
node --version
npm --version
echo

echo "=== Git Information ==="
git --version
git status --porcelain | wc -l | xargs echo "Changed files:"
git log --oneline -5
echo

echo "=== Project Information ==="
echo "Directory: $(pwd)"
echo "Size: $(du -sh . | cut -f1)"
echo "Files: $(find . -type f | wc -l)"
echo "Code files: $(find . -name "*.js" -o -name "*.ts" -o -name "*.py" | wc -l)"
echo

echo "=== System Resources ==="
echo "Memory: $(free -h 2>/dev/null || vm_stat | head -5)"
echo "Disk: $(df -h . | tail -1)"
echo

echo "=== Test Run ==="
ai-code-review . --type coding-test --enable-ai-detection --debug 2>&1 | head -20
```

### Support Resources

1. **Documentation**: Check the [AI Detection User Guide](./AI_DETECTION_USER_GUIDE.md)
2. **Examples**: Review usage examples in `examples/ai-detection-usage-examples.md`
3. **GitHub Issues**: Search existing issues or create a new one
4. **Debug Logs**: Always include debug logs when reporting issues

### Best Practices for Issue Reporting

1. **Use debug mode** when reproducing issues
2. **Include minimal reproduction case** 
3. **Specify exact command used**
4. **Include system information** (OS, Node.js version, etc.)
5. **Describe expected vs actual behavior**
6. **Include relevant log snippets** (not full logs unless requested)

---

*This troubleshooting guide covers AI detection features in AI Code Review v4.3.1+. For the latest troubleshooting information, check the project documentation.*