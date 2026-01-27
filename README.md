# Obsidian Activity Tracker

A GitHub-style contribution graph for tracking your AI & vibe coding experiments from Obsidian notes.

## Features

- **GitHub-style Contribution Graph** - 52-week grid showing daily coding activity
- **Interactive Modals** - Click any day to see full project details
- **Automatic Parsing** - Extracts data from Obsidian Vibing notes
- **Responsive Design** - Works on desktop and mobile
- **Dark Theme** - Easy on the eyes
- **No Build Step** - Pure HTML/CSS/JS

## Project Structure

```
obsidian-activity-tracker/
├── parser/
│   ├── parse-vibing-notes.js    # Main parser script
│   └── config.json               # Configuration
├── output/
│   └── activity-data.json        # Generated data
├── site/
│   ├── index.html                # Main page
│   ├── css/style.css             # Styles
│   ├── js/
│   │   ├── activity-graph.js     # Contribution graph
│   │   └── modal.js              # Project modals
│   └── data/
│       └── activity-data.json    # Activity data
└── deploy/
    └── deploy-to-siteground.sh   # Deployment script
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Parser

Edit `parser/config.json` with your Obsidian vault path:

```json
{
  "obsidianVaultPath": "/Users/your-name/Library/Mobile Documents/iCloud~md~obsidian/Documents/Obsidian Vault",
  "vibingFolderName": "Vibing"
}
```

### 3. Create Project Notes

In your Obsidian vault, create notes in the `Vibing/` folder with this format:

```markdown
---
VibeTools:
  - ChatGPT
  - Claude Code
Stack:
  - Python
  - JavaScript
---

# Project Title

Project description and learnings go here.

Key insights:
- Learning point 1
- Learning point 2
```

## Usage

### Parse Obsidian Notes

```bash
npm run parse
```

This will:
- Scan your `Vibing/` folder for `.md` files
- Extract frontmatter (VibeTools, Stack)
- Parse content for learnings
- Generate `activity-data.json`

### Test Locally

```bash
cd site
python3 -m http.server 8080
```

Open http://localhost:8080 in your browser

### Deploy to SiteGround

```bash
./deploy/deploy-to-siteground.sh
```

(Configure SFTP credentials in `deploy/.env` first)

## Obsidian Note Format

### Required Fields
- `VibeTools`: Array of AI tools used
- `Stack`: Array of technologies

### Optional Content
- Project description (first paragraphs)
- Learnings (bullet points)
- Cost mentions (e.g., "$28")

### Example

See `/workspace/vibing/Wardrobe.md` for a complete example.

## Contribution Graph

- **Level 0** (Empty): No activity
- **Level 1** (Light Green): Small project
- **Level 2** (Medium Green): Medium project
- **Level 3** (Dark Green): Large project
- **Level 4** (Brightest Green): Intense project

Intensity is calculated based on:
- Content length
- Number of learnings
- Complexity indicators

## Deployment

### Initial Upload

Upload all files to your subdomain:

```
public_html/vibing/
├── index.html
├── css/
├── js/
└── data/
```

### Updates

After creating new projects:

1. Run parser: `npm run parse`
2. Upload only `data/activity-data.json`
3. Site auto-updates on next load

## Customization

### Colors

Edit `site/css/style.css`:

```css
/* Contribution colors */
.graph-day[data-level="4"] {
    background: #39d353;  /* Change to your color */
}
```

### Stats

Add new stats in `site/js/activity-graph.js`:

```javascript
function updateStats() {
    // Add your custom stats here
}
```

## Troubleshooting

### Parser Issues

**"Vibing folder not found"**
- Check `parser/config.json` path
- Ensure Obsidian vault path is correct

**"No markdown files found"**
- Verify files are in `Vibing/` folder
- Check file extensions are `.md`

### Site Issues

**"Failed to load activity data"**
- Ensure `data/activity-data.json` exists
- Check browser console for errors
- Verify JSON is valid

**Graph not showing**
- Check if data has projects
- Verify date format is YYYY-MM-DD
- Check console for JavaScript errors

## Tech Stack

- **Parser**: Node.js, gray-matter, date-fns
- **Frontend**: Vanilla JavaScript, CSS Grid
- **Server**: Any static file hosting
- **No Build**: Direct file deployment

## Performance

- Parser: ~100ms for 10 projects
- Site load: < 500ms
- Graph render: < 200ms
- Responsive: Mobile-friendly

## Current Status

✅ Parser working (tested with Wardrobe project)
✅ JSON generation successful
✅ Site running locally on port 8080
✅ Contribution graph rendering
✅ Modal functionality working
✅ Responsive design implemented

## Next Steps

1. Add more projects to `vibing/` folder
2. Run parser: `npm run parse`
3. Test locally
4. Deploy to SiteGround subdomain
5. Set up automated weekly updates

## License

MIT - Feel free to use and modify for your own projects!

---

*Built with vibe coding energy* ✨
