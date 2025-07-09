#!/usr/bin/env python3
"""
Auto-update metrics and generate reports
Usage: python trackdown/scripts/metrics-generator.py
"""

import re
import yaml
import json
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

class MetricsGenerator:
    def __init__(self):
        self.trackdown_dir = Path(__file__).parent.parent
        self.backlog_path = self.trackdown_dir / 'BACKLOG.md'
        self.metrics_path = self.trackdown_dir / 'METRICS.md'
        self.retrospectives_path = self.trackdown_dir / 'RETROSPECTIVES.md'
    
    def generate_metrics(self):
        """Generate updated metrics from current backlog state."""
        if not self.backlog_path.exists():
            print(f"Error: BACKLOG.md not found at {self.backlog_path}")
            return False
        
        # Parse backlog data
        backlog_data = self.parse_backlog()
        
        # Calculate current metrics
        current_metrics = self.calculate_current_metrics(backlog_data)
        
        # Update metrics file
        self.update_metrics_file(current_metrics)
        
        # Generate summary report
        self.generate_summary_report(current_metrics)
        
        return True
    
    def parse_backlog(self):
        """Parse BACKLOG.md and extract data."""
        with open(self.backlog_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse frontmatter
        metadata = {}
        if content.startswith('---'):
            try:
                _, frontmatter, body = content.split('---', 2)
                metadata = yaml.safe_load(frontmatter)
            except ValueError:
                body = content
        else:
            body = content
        
        # Extract work items
        work_items = self.extract_work_items(body)
        
        return {
            'metadata': metadata,
            'work_items': work_items,
            'body': body
        }
    
    def extract_work_items(self, content):
        """Extract all work items from content."""
        work_items = []
        
        # Pattern for work items
        item_pattern = r'#### \*\*\[([^\]]+)\]\*\* (.+?) ✅?\n\*\*Type:\*\* (.+?)\n.*?\*\*Priority:\*\* (.+?)\n.*?\*\*Status:\*\* (.+?)\n'
        matches = re.findall(item_pattern, content, re.DOTALL)
        
        for match in matches:
            item_id, title, item_type, priority, status = match
            work_items.append({
                'id': item_id.strip(),
                'title': title.strip(),
                'type': item_type.strip(),
                'priority': priority.strip(),
                'status': status.strip(),
                'completed': '✅' in title
            })
        
        # Also extract simple checkbox items
        checkbox_pattern = r'- \[([x ])\] \*\*\[([^\]]+)\]\*\* (.+)'
        checkbox_matches = re.findall(checkbox_pattern, content)
        
        for checked, item_id, title in checkbox_matches:
            work_items.append({
                'id': item_id.strip(),
                'title': title.strip(),
                'type': 'Unknown',
                'priority': 'Unknown',
                'status': 'Done' if checked == 'x' else 'In Progress',
                'completed': checked == 'x'
            })
        
        return work_items
    
    def calculate_current_metrics(self, backlog_data):
        """Calculate current sprint and overall metrics."""
        work_items = backlog_data['work_items']
        current_sprint = backlog_data['metadata'].get('sprint_current', 1)
        
        # Count by status
        status_counts = defaultdict(int)
        for item in work_items:
            status_counts[item['status']] += 1
        
        # Count by type
        type_counts = defaultdict(int)
        for item in work_items:
            type_counts[item['type']] += 1
        
        # Count by priority
        priority_counts = defaultdict(int)
        for item in work_items:
            priority_counts[item['priority']] += 1
        
        # Calculate completion metrics
        total_items = len(work_items)
        completed_items = len([item for item in work_items if item['completed']])
        completion_rate = (completed_items / total_items * 100) if total_items > 0 else 0
        
        return {
            'current_sprint': current_sprint,
            'total_items': total_items,
            'completed_items': completed_items,
            'completion_rate': completion_rate,
            'status_counts': dict(status_counts),
            'type_counts': dict(type_counts),
            'priority_counts': dict(priority_counts),
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
    
    def update_metrics_file(self, metrics):
        """Update the METRICS.md file with current data."""
        if not self.metrics_path.exists():
            print(f"Warning: METRICS.md not found at {self.metrics_path}")
            return
        
        with open(self.metrics_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Update current sprint metrics section
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        # Find and update the current sprint section
        sprint_section_pattern = r'(## 📊 Current Sprint Metrics \(Sprint \d+\))(.*?)(?=##|$)'
        
        new_sprint_section = f"""## 📊 Current Sprint Metrics (Sprint {metrics['current_sprint']})

### Sprint Overview
- **Sprint:** {metrics['current_sprint']}
- **Last Updated:** {metrics['last_updated']}
- **Total Work Items:** {metrics['total_items']}
- **Completed Items:** {metrics['completed_items']}
- **Completion Rate:** {metrics['completion_rate']:.1f}%

### Work Item Status Distribution
"""
        
        for status, count in metrics['status_counts'].items():
            new_sprint_section += f"- **{status}:** {count} items\n"
        
        new_sprint_section += "\n### Work Item Type Distribution\n"
        for item_type, count in metrics['type_counts'].items():
            new_sprint_section += f"- **{item_type}:** {count} items\n"
        
        new_sprint_section += "\n### Priority Distribution\n"
        for priority, count in metrics['priority_counts'].items():
            new_sprint_section += f"- **{priority}:** {count} items\n"
        
        # Replace the section
        updated_content = re.sub(
            sprint_section_pattern,
            new_sprint_section + '\n',
            content,
            flags=re.DOTALL
        )
        
        # Update last_updated in frontmatter
        if updated_content.startswith('---'):
            try:
                _, frontmatter, body = updated_content.split('---', 2)
                metadata = yaml.safe_load(frontmatter)
                metadata['last_updated'] = current_date
                
                updated_frontmatter = yaml.dump(metadata, default_flow_style=False)
                updated_content = f"---\n{updated_frontmatter}---{body}"
            except ValueError:
                pass
        
        with open(self.metrics_path, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        
        print(f"✅ Updated METRICS.md with current data")
    
    def generate_summary_report(self, metrics):
        """Generate a summary report."""
        print(f"\n📊 Metrics Summary (Sprint {metrics['current_sprint']})")
        print(f"Generated: {metrics['last_updated']}")
        print(f"{'='*50}")
        
        print(f"\n📈 Overall Progress:")
        print(f"  Total Work Items: {metrics['total_items']}")
        print(f"  Completed Items: {metrics['completed_items']}")
        print(f"  Completion Rate: {metrics['completion_rate']:.1f}%")
        
        print(f"\n📋 Status Breakdown:")
        for status, count in metrics['status_counts'].items():
            print(f"  {status}: {count} items")
        
        print(f"\n🏷️  Type Breakdown:")
        for item_type, count in metrics['type_counts'].items():
            print(f"  {item_type}: {count} items")
        
        print(f"\n⚡ Priority Breakdown:")
        for priority, count in metrics['priority_counts'].items():
            print(f"  {priority}: {count} items")
        
        # Calculate some insights
        high_priority_items = metrics['priority_counts'].get('High', 0) + metrics['priority_counts'].get('Critical', 0)
        in_progress_items = metrics['status_counts'].get('In Progress', 0)
        
        print(f"\n💡 Insights:")
        print(f"  High/Critical Priority Items: {high_priority_items}")
        print(f"  Items Currently In Progress: {in_progress_items}")
        
        if in_progress_items > 5:
            print(f"  ⚠️  Warning: High number of items in progress - consider focusing efforts")
        
        if high_priority_items > 10:
            print(f"  ⚠️  Warning: Many high priority items - review prioritization")

def main():
    """Main function."""
    generator = MetricsGenerator()
    success = generator.generate_metrics()
    
    if success:
        print("\n✅ Metrics generation completed successfully")
    else:
        print("\n❌ Metrics generation failed")
        return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
