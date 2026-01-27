# Setting Up Daily Auto-Parse at 6am

The `cron-parse.sh` script automatically:
- Detects its own location (no path configuration needed)
- Loads nvm if installed (supports nvm-managed Node.js)
- Creates logs directory and detailed log files
- Runs the parser and reports success/failure

## Step 1: Make the Script Executable

```bash
cd ~/obsidian-activity-tracker
chmod +x cron-parse.sh
```

## Step 2: Test the Script Manually

```bash
cd ~/obsidian-activity-tracker
./cron-parse.sh
```

Check the log:
```bash
cat logs/parse.log
```

You should see the parser output and "✅ Parse completed successfully"

## Step 3: Set Up the Cron Job

Open your crontab:
```bash
crontab -e
```

Add this line (paste it, then save and exit):
```
0 6 * * * ~/obsidian-activity-tracker/cron-parse.sh
```

This means: "Run at 0 minutes, 6 hours (6am), every day, every month, every weekday"

## Step 4: Verify Cron Job

List your cron jobs to confirm:
```bash
crontab -l
```

You should see:
```
0 6 * * * ~/obsidian-activity-tracker/cron-parse.sh
```

## Step 5: Wait or Test

**Wait**: The script will run automatically tomorrow at 6am
**Test now**: Run manually to verify it works
```bash
~/obsidian-activity-tracker/cron-parse.sh
```

## Checking Logs

View recent parsing logs:
```bash
tail -50 ~/obsidian-activity-tracker/logs/parse.log
```

## Troubleshooting

### Cron not running?

1. **Check macOS permissions**: System Preferences → Security & Privacy → Full Disk Access
   - Add `/usr/sbin/cron` if not present

2. **Check cron is running**:
   ```bash
   ps aux | grep cron
   ```

3. **Test with earlier time**:
   ```bash
   # Run in 2 minutes (if current time is 14:30, set it to 14:32)
   32 14 * * * ~/obsidian-activity-tracker/cron-parse.sh
   ```

4. **Check system logs**:
   ```bash
   log show --predicate 'process == "cron"' --last 1h
   ```

### Node not found?

The script automatically loads nvm if installed. Check the log file to see if nvm was loaded:
```bash
cat ~/obsidian-activity-tracker/logs/parse.log | grep NVM
```

If nvm is not being loaded, make sure it's installed at `~/.nvm/nvm.sh`

### Parse failing?

Check the log file for errors:
```bash
cat ~/obsidian-activity-tracker/logs/parse.log
```

## Alternative Schedules

Edit the cron schedule to change timing:

```bash
# Every day at 6am (current)
0 6 * * * ~/obsidian-activity-tracker/cron-parse.sh

# Every day at 9am
0 9 * * * ~/obsidian-activity-tracker/cron-parse.sh

# Twice daily: 6am and 6pm
0 6,18 * * * ~/obsidian-activity-tracker/cron-parse.sh

# Every 6 hours
0 */6 * * * ~/obsidian-activity-tracker/cron-parse.sh
```

## Disabling Auto-Parse

Remove the cron job:
```bash
crontab -e
# Delete the line, save and exit
```

Or comment it out:
```bash
# 0 6 * * * ~/obsidian-activity-tracker/cron-parse.sh
```

## Success!

Once set up, your activity tracker will automatically update every morning at 6am with your latest Obsidian projects! 🎉

You can still run `npm run parse` manually anytime you want an immediate update.
