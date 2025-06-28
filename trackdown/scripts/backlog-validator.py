#!/usr/bin/env python3
"""
Validate BACKLOG.md format and check for required fields
Usage: python trackdown/scripts/backlog-validator.py
"""

import re
import yaml
import sys
from pathlib import Path
from datetime import datetime

class BacklogValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.backlog_path = Path(__file__).parent.parent / 'BACKLOG.md'
    
    def validate(self):
        """Main validation function."""
        if not self.backlog_path.exists():
            self.errors.append(f"BACKLOG.md not found at {self.backlog_path}")
            return False
        
        with open(self.backlog_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Validate YAML frontmatter
        self.validate_frontmatter(content)
        
        # Validate work item format
        self.validate_work_items(content)
        
        # Validate required sections
        self.validate_sections(content)
        
        # Validate work item IDs
        self.validate_work_item_ids(content)
        
        # Validate status values
        self.validate_status_values(content)
        
        return len(self.errors) == 0
    
    def validate_frontmatter(self, content):
        """Validate YAML frontmatter."""
        if not content.startswith('---'):
            self.errors.append("Missing YAML frontmatter at the beginning of the file")
            return
        
        try:
            _, frontmatter, _ = content.split('---', 2)
            metadata = yaml.safe_load(frontmatter)
            
            required_fields = ['title', 'last_updated', 'sprint_current', 'project_name']
            for field in required_fields:
                if field not in metadata:
                    self.errors.append(f"Missing required frontmatter field: {field}")
            
            # Validate date format
            if 'last_updated' in metadata:
                try:
                    datetime.strptime(str(metadata['last_updated']), '%Y-%m-%d')
                except ValueError:
                    self.errors.append("last_updated should be in YYYY-MM-DD format")
            
        except ValueError:
            self.errors.append("Invalid YAML frontmatter format")
        except yaml.YAMLError as e:
            self.errors.append(f"YAML parsing error: {e}")
    
    def validate_work_items(self, content):
        """Validate work item format."""
        # Pattern for work items
        work_item_pattern = r'#### \*\*\[([^\]]+)\]\*\* (.+?)(?=####|\n##|\Z)'
        work_items = re.findall(work_item_pattern, content, re.DOTALL)
        
        for item_id, item_content in work_items:
            self.validate_single_work_item(item_id, item_content)
    
    def validate_single_work_item(self, item_id, content):
        """Validate a single work item."""
        # Check for required fields
        required_fields = ['Type:', 'Priority:', 'Status:']
        for field in required_fields:
            if field not in content:
                self.warnings.append(f"Work item {item_id} missing field: {field}")
        
        # Check for acceptance criteria
        if 'Acceptance Criteria:' not in content and 'Type: Bug' not in content:
            self.warnings.append(f"Work item {item_id} missing acceptance criteria")
        
        # Check for user story format (for user stories)
        if 'Type: User Story' in content:
            if 'As a' not in content or 'I want' not in content or 'so that' not in content:
                self.warnings.append(f"User story {item_id} doesn't follow proper format")
    
    def validate_sections(self, content):
        """Validate required sections exist."""
        required_sections = [
            '## 🎯 Current Sprint',
            '## 📋 Product Backlog',
            '## 🔄 Completed Work Items'
        ]
        
        for section in required_sections:
            if section not in content:
                self.errors.append(f"Missing required section: {section}")
    
    def validate_work_item_ids(self, content):
        """Validate work item ID format and uniqueness."""
        # Extract all work item IDs
        id_pattern = r'\[([A-Z]+-\d+)\]'
        all_ids = re.findall(id_pattern, content)
        
        # Check for duplicates
        seen_ids = set()
        for item_id in all_ids:
            if item_id in seen_ids:
                self.errors.append(f"Duplicate work item ID: {item_id}")
            seen_ids.add(item_id)
        
        # Validate ID format
        valid_prefixes = ['EP', 'US', 'T', 'BUG', 'SP']
        for item_id in all_ids:
            prefix = item_id.split('-')[0]
            if prefix not in valid_prefixes:
                self.warnings.append(f"Non-standard work item ID prefix: {item_id}")
    
    def validate_status_values(self, content):
        """Validate status values are from allowed list."""
        valid_statuses = [
            'Backlog', 'Ready', 'In Progress', 'In Review',
            'Testing', 'Done', 'Blocked', 'Planning'
        ]

        status_pattern = r'\*\*Status:\*\* ([^\n]+)'
        statuses = re.findall(status_pattern, content)

        for status in statuses:
            # Clean up status (remove extra formatting and whitespace)
            clean_status = status.strip()
            # Handle multi-word statuses
            if clean_status not in valid_statuses:
                self.warnings.append(f"Invalid status value: '{clean_status}'")
    
    def print_results(self):
        """Print validation results."""
        if self.errors:
            print("❌ VALIDATION ERRORS:")
            for error in self.errors:
                print(f"  - {error}")
        
        if self.warnings:
            print("⚠️  VALIDATION WARNINGS:")
            for warning in self.warnings:
                print(f"  - {warning}")
        
        if not self.errors and not self.warnings:
            print("✅ BACKLOG.md validation passed - no issues found")
        elif not self.errors:
            print(f"✅ BACKLOG.md validation passed with {len(self.warnings)} warnings")
        else:
            print(f"❌ BACKLOG.md validation failed with {len(self.errors)} errors and {len(self.warnings)} warnings")

def main():
    """Main function."""
    validator = BacklogValidator()
    is_valid = validator.validate()
    validator.print_results()
    
    # Exit with error code if validation failed
    sys.exit(0 if is_valid else 1)

if __name__ == '__main__':
    main()
