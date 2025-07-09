#!/usr/bin/env python3
"""
Generate weekly status report from BACKLOG.md
Usage: python trackdown/scripts/status-report.py > weekly-report.md
"""

import re
import yaml
import os
from datetime import datetime, timedelta
from pathlib import Path

def parse_backlog():
    """Parse the BACKLOG.md file and extract work items and metadata."""
    backlog_path = Path(__file__).parent.parent / 'BACKLOG.md'
    
    if not backlog_path.exists():
        print(f"Error: BACKLOG.md not found at {backlog_path}")
        return None
    
    with open(backlog_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Parse YAML frontmatter
    metadata = {}
    if content.startswith('---'):
        try:
            _, frontmatter, body = content.split('---', 2)
            metadata = yaml.safe_load(frontmatter)
        except ValueError:
            print("Warning: Could not parse YAML frontmatter")
            body = content
    else:
        body = content
    
    # Extract work items by status
    in_progress_pattern = r'- \[ \] \*\*\[([^\]]+)\]\*\* (.+)'
    completed_pattern = r'- \[x\] \*\*\[([^\]]+)\]\*\* (.+)'
    
    in_progress_items = re.findall(in_progress_pattern, body)
    completed_items = re.findall(completed_pattern, body)
    
    # Extract current sprint information
    current_sprint = metadata.get('sprint_current', 'Unknown')
    
    return {
        'metadata': metadata,
        'current_sprint': current_sprint,
        'in_progress': in_progress_items,
        'completed': completed_items,
        'body': body
    }

def extract_sprint_items(body, sprint_number):
    """Extract items from current sprint section."""
    sprint_section_pattern = rf'## 🎯 Current Sprint \(Sprint {sprint_number}\)(.*?)(?=##|$)'
    sprint_match = re.search(sprint_section_pattern, body, re.DOTALL)
    
    if not sprint_match:
        return [], []
    
    sprint_content = sprint_match.group(1)
    
    # Find items in different sections
    in_progress_section = re.search(r'### In Progress(.*?)(?=###|$)', sprint_content, re.DOTALL)
    ready_section = re.search(r'### Ready for Development(.*?)(?=###|$)', sprint_content, re.DOTALL)
    
    in_progress_items = []
    ready_items = []
    
    if in_progress_section:
        in_progress_items = re.findall(r'- \[ \] \*\*\[([^\]]+)\]\*\* (.+)', in_progress_section.group(1))
    
    if ready_section:
        ready_items = re.findall(r'- \[ \] \*\*\[([^\]]+)\]\*\* (.+)', ready_section.group(1))
    
    return in_progress_items, ready_items

def generate_report():
    """Generate the weekly status report."""
    data = parse_backlog()
    
    if not data:
        return
    
    current_date = datetime.now().strftime('%Y-%m-%d')
    current_sprint = data['current_sprint']
    
    # Extract current sprint items
    in_progress_sprint, ready_sprint = extract_sprint_items(data['body'], current_sprint)
    
    print(f"# Weekly Status Report - {current_date}")
    print(f"\n**Project:** {data['metadata'].get('project_name', 'AI Code Review Tool')}")
    print(f"**Repository:** {data['metadata'].get('repository', 'https://github.com/bobmatnyc/ai-code-review.git')}")
    print(f"**Report Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    print(f"\n## Sprint {current_sprint} Progress")
    
    # Current Sprint Status
    print(f"\n### 🔄 In Progress ({len(in_progress_sprint)} items)")
    if in_progress_sprint:
        for item_id, title in in_progress_sprint:
            print(f"- **{item_id}:** {title}")
    else:
        print("- No items currently in progress")
    
    print(f"\n### 📋 Ready for Development ({len(ready_sprint)} items)")
    if ready_sprint:
        for item_id, title in ready_sprint:
            print(f"- **{item_id}:** {title}")
    else:
        print("- No items ready for development")
    
    # Recently Completed (from completed section)
    print(f"\n### ✅ Recently Completed")
    completed_this_week = []
    
    # Look for recently completed items (this is a simplified approach)
    # In a real implementation, you'd track completion dates
    recent_completed_pattern = r'#### \*\*\[([^\]]+)\]\*\* (.+?) ✅'
    recent_completed = re.findall(recent_completed_pattern, data['body'])
    
    if recent_completed:
        # Show last 5 completed items
        for item_id, title in recent_completed[-5:]:
            print(f"- **{item_id}:** {title}")
    else:
        print("- No recently completed items found")
    
    # Sprint Metrics
    print(f"\n## Sprint Metrics")
    print(f"- **Sprint Duration:** 14 days")
    print(f"- **Items In Progress:** {len(in_progress_sprint)}")
    print(f"- **Items Ready:** {len(ready_sprint)}")
    print(f"- **Total Active Items:** {len(in_progress_sprint) + len(ready_sprint)}")
    
    # Next Week Focus
    print(f"\n## Next Week Focus")
    print("- Continue work on in-progress items")
    print("- Move ready items to in-progress as capacity allows")
    print("- Address any blockers or dependencies")
    
    # Blockers and Risks
    print(f"\n## Blockers and Risks")
    print("- Review BACKLOG.md for any items marked as 'Blocked'")
    print("- Check for dependency issues between work items")
    print("- Monitor for resource constraints or external dependencies")
    
    print(f"\n---")
    print(f"*Report generated automatically from trackdown/BACKLOG.md*")
    print(f"*For detailed information, see the full backlog and roadmap files*")

if __name__ == '__main__':
    generate_report()
