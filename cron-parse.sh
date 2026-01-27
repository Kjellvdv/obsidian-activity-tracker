#!/bin/bash

# Activity Tracker - Automated Daily Parsing
# Runs at 6am daily via cron

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$SCRIPT_DIR"
LOG_DIR="$PROJECT_DIR/logs"
LOG_FILE="$LOG_DIR/parse.log"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Verify logs directory was created
if [ ! -d "$LOG_DIR" ]; then
    echo "ERROR: Failed to create logs directory at $LOG_DIR"
    exit 1
fi

# Log the run
echo "==================================================" >> "$LOG_FILE"
echo "Parsing started at $(date)" >> "$LOG_FILE"
echo "PROJECT_DIR: $PROJECT_DIR" >> "$LOG_FILE"
echo "Current directory: $(pwd)" >> "$LOG_FILE"
echo "==================================================" >> "$LOG_FILE"

# Load nvm (required for cron jobs with nvm-installed node)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    echo "✅ NVM loaded" >> "$LOG_FILE"
else
    echo "❌ NVM not found at $NVM_DIR/nvm.sh" >> "$LOG_FILE"
fi

# Check node availability
which node >> "$LOG_FILE" 2>&1
node --version >> "$LOG_FILE" 2>&1

# Change to project directory
echo "Changing to: $PROJECT_DIR" >> "$LOG_FILE"
cd "$PROJECT_DIR" || {
    echo "❌ Failed to change to project directory" >> "$LOG_FILE"
    exit 1
}
echo "✅ Changed to project directory: $(pwd)" >> "$LOG_FILE"

# Verify parser exists
if [ ! -f "parser/parse-vibing-notes.js" ]; then
    echo "❌ Parser not found at parser/parse-vibing-notes.js" >> "$LOG_FILE"
    exit 1
fi
echo "✅ Parser found" >> "$LOG_FILE"

# Run the parser
echo "Running parser..." >> "$LOG_FILE"
node parser/parse-vibing-notes.js >> "$LOG_FILE" 2>&1

# Check if successful
if [ $? -eq 0 ]; then
    echo "✅ Parse completed successfully at $(date)" >> "$LOG_FILE"
else
    echo "❌ Parse failed at $(date)" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
