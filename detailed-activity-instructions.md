# Git Repository Activity Analysis Instructions

This guide provides step-by-step instructions for generating a detailed CSV report of git repository activity in 15-minute increments. The report includes lines of code added/deleted, files created/deleted, directories created/deleted, branches created, commits, and merges.

## Prerequisites

- Python 3.x installed
- Access to the git repository you want to analyze
- Basic terminal/command line knowledge

## Step 1: Extract All Commit History

First, extract the complete commit history from your git repository:

```bash
git log --all --reverse --format="%H %at %s" > all_commits.txt
```

This command:
- `--all`: Includes commits from all branches
- `--reverse`: Orders commits from oldest to newest
- `--format="%H %at %s"`: Outputs hash, timestamp, and commit message

## Step 2: Create the Python Analysis Script

Create a file named `git_analyzer.py` with the following content:

```python
#!/usr/bin/env python3
import csv
import os
import subprocess
from collections import defaultdict
from datetime import datetime

# Read all commits
commits = []
with open('all_commits.txt', 'r') as f:
    for line in f:
        parts = line.strip().split(' ', 2)
        if len(parts) >= 2:
            commit_hash = parts[0]
            timestamp = int(parts[1])
            message = parts[2] if len(parts) > 2 else ''
            commits.append((commit_hash, timestamp, message))

if not commits:
    print('No commits found')
    exit(0)

# Sort commits by timestamp
commits.sort(key=lambda x: x[1])

# Create 15-minute buckets
bucket_size = 15 * 60  # 15 minutes in seconds
buckets = defaultdict(lambda: {
    'lines_added': 0,
    'lines_deleted': 0,
    'files_created': 0,
    'files_deleted': 0,
    'dirs_created': set(),
    'dirs_deleted': set(),
    'branches_created': set(),
    'commits': 0,
    'merges': 0
})

# Process each commit
for i, (commit_hash, timestamp, message) in enumerate(commits):
    # Determine the time bucket
    bucket = timestamp - (timestamp % bucket_size)
    
    # Increment commit count
    buckets[bucket]['commits'] += 1
    
    # Check if this is a merge commit
    parents = subprocess.run(
        ['git', 'log', '-1', '--pretty=%P', commit_hash],
        capture_output=True, text=True
    ).stdout.strip().split()
    
    if len(parents) > 1:
        buckets[bucket]['merges'] += 1
    
    # Get changes from this commit
    if i == 0:
        # First commit is handled differently
        files_output = subprocess.run(
            ['git', 'ls-tree', '-r', '--name-only', commit_hash],
            capture_output=True, text=True
        ).stdout.strip()
        
        files = [f for f in files_output.split('\n') if f]
        buckets[bucket]['files_created'] = len(files)
        
        # Count lines in first commit
        show_output = subprocess.run(
            ['git', 'show', commit_hash],
            capture_output=True, text=True
        ).stdout.strip()
        
        lines_added = 0
        for line in show_output.split('\n'):
            if line.startswith('+') and not line.startswith('+++'):
                lines_added += 1
        
        buckets[bucket]['lines_added'] = lines_added
        
        # Count directories
        dirs = set()
        for file_path in files:
            dir_path = os.path.dirname(file_path)
            if dir_path:
                dirs.add(dir_path)
        
        buckets[bucket]['dirs_created'].update(dirs)
    else:
        # Regular commit
        # Get diff statistics
        stat_output = subprocess.run(
            ['git', 'diff', '--shortstat', f'{commit_hash}^', commit_hash],
            capture_output=True, text=True
        ).stdout.strip()
        
        # Parse statistics
        if 'changed' in stat_output:
            parts = stat_output.split(',')
            for part in parts:
                part = part.strip()
                if 'insertion' in part:
                    try:
                        buckets[bucket]['lines_added'] += int(part.split()[0])
                    except:
                        pass
                elif 'deletion' in part:
                    try:
                        buckets[bucket]['lines_deleted'] += int(part.split()[0])
                    except:
                        pass
        
        # Get file changes
        diff_output = subprocess.run(
            ['git', 'diff', '--name-status', f'{commit_hash}^', commit_hash],
            capture_output=True, text=True
        ).stdout.strip()
        
        for line in diff_output.split('\n'):
            if not line:
                continue
                
            parts = line.split('\t')
            if len(parts) < 2:
                continue
                
            status = parts[0]
            file_path = parts[1]
            
            if status.startswith('A'):  # Added file
                buckets[bucket]['files_created'] += 1
                
                # Track directories
                dir_path = os.path.dirname(file_path)
                if dir_path:
                    buckets[bucket]['dirs_created'].add(dir_path)
                    
            elif status.startswith('D'):  # Deleted file
                buckets[bucket]['files_deleted'] += 1
                
                # Track directories
                dir_path = os.path.dirname(file_path)
                if dir_path:
                    remaining = subprocess.run(
                        ['git', 'ls-tree', '-r', '--name-only', commit_hash, dir_path],
                        capture_output=True, text=True
                    ).stdout.strip()
                    
                    if not remaining:
                        buckets[bucket]['dirs_deleted'].add(dir_path)

# Estimate branch creation
all_branches = subprocess.run(
    ['git', 'branch', '--no-merged', 'HEAD'],
    capture_output=True, text=True
).stdout.strip().split('\n')

all_branches.extend(subprocess.run(
    ['git', 'branch', '--merged', 'HEAD'],
    capture_output=True, text=True
).stdout.strip().split('\n'))

branches = [b.strip().lstrip('* ') for b in all_branches if b.strip()]

# For each branch, get first commit and assign to bucket
for branch in branches:
    first_commit = subprocess.run(
        ['git', 'log', '--format=%H %at', '--reverse', '-n', '1', branch],
        capture_output=True, text=True
    ).stdout.strip()
    
    if first_commit:
        parts = first_commit.split()
        if len(parts) >= 2:
            timestamp = int(parts[1])
            bucket = timestamp - (timestamp % bucket_size)
            buckets[bucket]['branches_created'].add(branch)

# Write results to CSV
with open('detailed-activity.csv', 'w', newline='') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow([
        'Timestamp', 'Date', 'Lines Added', 'Lines Deleted', 'Files Created', 
        'Files Deleted', 'Directories Created', 'Directories Deleted', 
        'Branches Created', 'Commits', 'Merges'
    ])
    
    for bucket, stats in sorted(buckets.items()):
        date_str = datetime.fromtimestamp(bucket).strftime('%Y-%m-%d %H:%M:%S')
        
        writer.writerow([
            bucket,
            date_str,
            stats['lines_added'],
            stats['lines_deleted'],
            stats['files_created'],
            stats['files_deleted'],
            len(stats['dirs_created']),
            len(stats['dirs_deleted']),
            len(stats['branches_created']),
            stats['commits'],
            stats['merges']
        ])

print('Generated detailed-activity.csv with git activity in 15-minute increments')
```

## Step 3: Run the Analysis Script

1. Make the script executable (if on Linux/macOS):

```bash
chmod +x git_analyzer.py
```

2. Run the script:

```bash
python3 git_analyzer.py
```

## Step 4: Verify the Results

The script will generate a file named `detailed-activity.csv` in the current directory. You can open this file with any spreadsheet software (Excel, Google Sheets, etc.) to visualize the data.

The CSV file contains the following columns:
- **Timestamp**: Unix timestamp for the 15-minute bucket
- **Date**: Human-readable date and time (YYYY-MM-DD HH:MM:SS)
- **Lines Added**: Number of lines of code added in that time period
- **Lines Deleted**: Number of lines of code deleted
- **Files Created**: Number of files created
- **Files Deleted**: Number of files deleted
- **Directories Created**: Number of directories created
- **Directories Deleted**: Number of directories deleted
- **Branches Created**: Number of branches created
- **Commits**: Number of commits 
- **Merges**: Number of merge commits

## Troubleshooting

- If you receive errors about `git` commands, ensure you're running the script within a git repository.
- For large repositories, the script may take some time to complete as it processes each commit.
- If you get Python errors, ensure you have Python 3.x installed and that the subprocess, datetime, and csv modules are available.

## Advanced Options

You can modify the script to:

- Change the time bucket size (currently 15 minutes)
- Add additional metrics
- Filter commits by author, date range, or branch
- Exclude certain file types or directories

Just edit the `git_analyzer.py` file to implement these customizations.