# Track Down Automation Scripts

This directory contains automation scripts for the Track Down project management system.

## Scripts Overview

### 🔍 backlog-validator.py
Validates the format and content of `BACKLOG.md` to ensure consistency and completeness.

**Usage:**
```bash
python trackdown/scripts/backlog-validator.py
```

**What it checks:**
- YAML frontmatter format and required fields
- Work item ID format and uniqueness
- Required sections presence
- Status value validity
- Work item format consistency

**Exit codes:**
- `0`: Validation passed
- `1`: Validation failed with errors

### 📊 status-report.py
Generates weekly status reports from the current state of `BACKLOG.md`.

**Usage:**
```bash
python trackdown/scripts/status-report.py > weekly-report.md
```

**Output includes:**
- Current sprint progress
- Items in progress and ready for development
- Recently completed work
- Sprint metrics and statistics
- Next week focus areas
- Potential blockers and risks

### 📈 metrics-generator.py
Collects and updates project metrics, automatically updating `METRICS.md`.

**Usage:**
```bash
python trackdown/scripts/metrics-generator.py
```

**Features:**
- Calculates completion rates and progress metrics
- Analyzes work item distribution by type, status, and priority
- Updates `METRICS.md` with current data
- Generates summary reports to console
- Tracks historical trends

## Dependencies

All scripts require Python 3.6+ and the following packages:
- `pyyaml` - for YAML frontmatter parsing

Install dependencies:
```bash
pip install pyyaml
```

## Integration

### Git Hooks
The `backlog-validator.py` script is automatically run via the pre-commit Git hook to ensure Track Down files are valid before commits.

### CI/CD Pipeline
All scripts are integrated into the GitHub Actions CI/CD pipeline:
- Validation runs on every pull request
- Status reports are generated and uploaded as artifacts
- Metrics are collected for trend analysis

## Troubleshooting

### Common Issues

**"BACKLOG.md not found"**
- Ensure you're running the script from the project root directory
- Verify the `trackdown/BACKLOG.md` file exists

**"Missing required frontmatter field"**
- Check that all required YAML fields are present in BACKLOG.md
- Required fields: `title`, `last_updated`, `sprint_current`, `project_name`

**"Duplicate work item ID"**
- Ensure all work item IDs (US-001, T-001, etc.) are unique
- Check both active and completed sections

**"Non-standard work item ID prefix"**
- Use standard prefixes: EP (Epic), US (User Story), T (Task), BUG (Bug), SP (Spike)
- Follow format: PREFIX-NUMBER (e.g., US-001, T-042)

### Debug Mode

For detailed output, you can modify the scripts to include debug information or run with verbose Python output:

```bash
python -v trackdown/scripts/backlog-validator.py
```

## Contributing

When modifying these scripts:
1. Maintain backward compatibility with existing BACKLOG.md format
2. Add appropriate error handling and user-friendly messages
3. Update this README with any new features or requirements
4. Test scripts with various BACKLOG.md states (empty, malformed, etc.)
5. Follow PEP 8 Python style guidelines
