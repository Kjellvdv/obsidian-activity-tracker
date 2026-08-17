#!/bin/bash

# Auto-update Activity Tracker
# Parses Obsidian notes, commits changes, and pushes to GitHub

set -e

PROJECT_DIR="/Users/kjellvandevyvere/Projects/obsidian-activity-tracker"
VIBING_DIR="/Users/kjellvandevyvere/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault/Vibing"

# Alert on failure instead of dying quietly in a log nobody reads
notify() {
    osascript -e "display notification \"$1\" with title \"Activity tracker failed\"" >/dev/null 2>&1 || true
}

fail() {
    echo "$(date): FAILED: $1"
    notify "$1"
    exit 1
}

trap 'fail "auto-update.sh aborted unexpectedly, check ~/Library/Logs/obsidian-activity-tracker.err"' ERR

# Change to project directory
cd "$PROJECT_DIR"

# Verify the vault is actually readable. When launchd loses Full Disk Access the
# folder still stats fine but reading it returns "Operation not permitted", so the
# parser sees zero notes and there is nothing to commit.
if ! ls "$VIBING_DIR" >/dev/null 2>&1; then
    fail "Cannot read the Obsidian vault. Grant Full Disk Access to /bin/bash in System Settings > Privacy & Security."
fi

# Run parser
echo "$(date): Running parser..."
npm run parse || fail "Parser failed, check ~/Library/Logs/obsidian-activity-tracker.err"

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
