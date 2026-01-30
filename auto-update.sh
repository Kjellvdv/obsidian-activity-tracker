#!/bin/bash

# Auto-update Activity Tracker
# Parses Obsidian notes, commits changes, and pushes to GitHub

set -e

# Change to project directory
cd "/Users/kjellvandevyvere/Documents/Projects/Very Klear/Product Studio/obsidian-activity-tracker"

# Run parser
echo "$(date): Running parser..."
npm run parse

# Check if there are changes
if git diff --quiet site/data/activity-data.json; then
    echo "$(date): No changes detected"
    exit 0
fi

# Commit and push changes
echo "$(date): Changes detected, committing..."
git add site/data/activity-data.json
git commit -m "Auto-update activity data - $(date +%Y-%m-%d)"

echo "$(date): Pushing to GitHub..."
git push origin master

echo "$(date): Activity tracker updated successfully!"
