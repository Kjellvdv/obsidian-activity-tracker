#!/usr/bin/env node

/**
 * Obsidian Activity Tracker - Parser
 * Scans Vibing folder for project notes and generates activity data JSON
 */

const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const { format, startOfDay } = require('date-fns');
const { glob } = require('glob');

// Load configuration
const config = require('./config.json');

// Paths
const VIBING_PATH = path.join(config.obsidianVaultPath, config.vibingFolderName);
const OUTPUT_PATH = path.resolve(__dirname, '..', config.outputPath);
const SITE_DATA_PATH = path.resolve(__dirname, '..', config.siteDataPath);

/**
 * Calculate intensity score based on content length and complexity
 */
function calculateIntensity(content, learnings) {
  let score = 1;

  // Base on content length
  if (content.length > 500) score = 2;
  if (content.length > 1000) score = 3;
  if (content.length > 2000) score = 4;

  // Boost if has multiple learnings
  if (learnings && learnings.length >= 3) score = Math.min(score + 1, 4);

  return score;
}

/**
 * Clean markdown formatting for display
 */
function cleanMarkdown(content) {
  return content
    // Remove Obsidian image embeds: ![[image.png]]
    .replace(/!\[\[.*?\]\]/g, '')
    // Remove bold: **text** or __text__
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    // Remove italic: *text* or _text_
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    // Convert bullet points to plain text (keep the dash/asterisk but remove markdown)
    .replace(/^\s*[-*+]\s+/gm, '• ')
    // Convert numbered lists
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove extra spaces but preserve paragraph breaks
    .replace(/[ \t]+/g, ' ')
    // Preserve double line breaks (paragraphs)
    .replace(/\n\s*\n/g, '\n\n')
    // Trim
    .trim();
}

/**
 * Extract learnings from content
 */
function extractLearnings(content) {
  const learnings = [];

  // Look for bullet points or numbered lists that mention learning/insight keywords
  const lines = content.split('\n');
  const keywords = ['learning', 'learned', 'wondering', 'issue', 'problem', 'should', 'need to'];

  for (const line of lines) {
    const trimmed = line.trim();
    // Check if line is a bullet point or contains learning keywords
    if ((trimmed.startsWith('-') || trimmed.startsWith('*') || /^\d+\./.test(trimmed)) &&
        keywords.some(keyword => trimmed.toLowerCase().includes(keyword))) {
      learnings.push(trimmed.replace(/^[-*]\s*|\d+\.\s*/, '').trim());
    }
  }

  return learnings;
}

/**
 * Parse date from H2 heading (supports multiple formats)
 */
function parseDateFromHeading(heading) {
  // Remove ## and trim
  const text = heading.replace(/^##\s*/, '').trim();

  // Try parsing as YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  // Try parsing as ISO date
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) {
    return isoMatch[1];
  }

  // Try parsing natural date (Jan 22, 2026 or January 22, 2026)
  try {
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      return format(parsed, 'yyyy-MM-dd');
    }
  } catch (e) {
    // Not a valid date
  }

  return null;
}

/**
 * Parse a single markdown file with support for H2 date sections
 */
function parseProjectNote(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { data: frontmatter, content: markdownContent } = matter(content);

    // Extract title from filename
    const title = path.basename(filePath, '.md');

    // Extract data from frontmatter
    const vibeTools = frontmatter.VibeTools || [];
    const stack = frontmatter.Stack || [];

    // Split content into lines
    const lines = markdownContent.split('\n');

    // Look for H2 date headings
    const dateEntries = [];
    let currentDate = null;
    let currentContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check if line is an H2 heading
      if (line.startsWith('## ')) {
        // Try to parse as date
        const parsedDate = parseDateFromHeading(line);

        if (parsedDate) {
          // Save previous section if exists
          if (currentDate && currentContent.length > 0) {
            dateEntries.push({
              date: currentDate,
              content: currentContent.join('\n')
            });
          }

          // Start new section
          currentDate = parsedDate;
          currentContent = [];
        } else {
          // Not a date heading, include in current content
          currentContent.push(line);
        }
      } else {
        // Regular content line
        if (currentDate) {
          currentContent.push(line);
        }
      }
    }

    // Save last section if exists
    if (currentDate && currentContent.length > 0) {
      dateEntries.push({
        date: currentDate,
        content: currentContent.join('\n')
      });
    }

    // If no date sections found, use file modification date
    if (dateEntries.length === 0) {
      const stats = fs.statSync(filePath);
      const date = format(startOfDay(stats.mtime), 'yyyy-MM-dd');

      // Get full content as description (clean markdown formatting)
      const description = cleanMarkdown(markdownContent);

      // Extract learnings from full content
      const learnings = extractLearnings(markdownContent);

      // Calculate intensity
      const intensity = calculateIntensity(markdownContent, learnings);

      // Look for cost mentions
      const costMatch = markdownContent.match(/\$(\d+)/);
      const cost = costMatch ? `$${costMatch[1]}` : null;

      return {
        id: title.toLowerCase().replace(/\s+/g, '-'),
        date,
        title,
        vibeTools,
        stack,
        description: description.trim(),
        learnings,
        cost,
        status: 'completed',
        intensity,
        filePath
      };
    }

    // Sort date entries chronologically (oldest first)
    dateEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Return one entry per date (so calendar shows all work days)
    // but keep the same title for all entries (no "Day 1", "Day 2" suffix)
    return dateEntries.map((entry) => {
      // Get content as description (clean markdown formatting)
      const description = cleanMarkdown(entry.content);

      // Extract learnings from section content
      const learnings = extractLearnings(entry.content);

      // Calculate intensity for this section
      const intensity = calculateIntensity(entry.content, learnings);

      // Look for cost mentions in this section
      const costMatch = entry.content.match(/\$(\d+)/);
      const cost = costMatch ? `$${costMatch[1]}` : null;

      return {
        id: `${title.toLowerCase().replace(/\s+/g, '-')}-${entry.date}`,
        date: entry.date,
        title, // Same title for all entries, no day suffix
        vibeTools,
        stack,
        description: description.trim(),
        learnings,
        cost,
        status: 'completed',
        intensity,
        filePath
      };
    });

  } catch (error) {
    console.error(`Error parsing ${filePath}:`, error.message);
    return null;
  }
}

/**
 * Main parser function
 */
async function parseVibingNotes() {
  console.log('🚀 Starting Obsidian Activity Tracker Parser...\n');

  // Check if Vibing folder exists
  if (!fs.existsSync(VIBING_PATH)) {
    console.error(`❌ Vibing folder not found at: ${VIBING_PATH}`);

    // Only use workspace fallback if explicitly enabled
    if (config.useWorkspaceFallback !== false) {
      console.log('\n💡 Using workspace Vibing folder instead...');

      // Fallback to workspace vibing folder (case-insensitive check)
      let workspaceVibingPath = '/workspace/vibing';
      if (!fs.existsSync(workspaceVibingPath)) {
        workspaceVibingPath = '/workspace/Vibing';
      }
      if (!fs.existsSync(workspaceVibingPath)) {
        console.error(`❌ Workspace vibing folder not found either!`);
        console.log(`Tried: /workspace/vibing and /workspace/Vibing`);
        process.exit(1);
      }

      // Use workspace path
      const markdownFiles = await glob('**/*.md', { cwd: workspaceVibingPath });
      console.log(`📁 Found ${markdownFiles.length} markdown files in workspace\n`);

      // Parse all files
      const projects = [];
      for (const file of markdownFiles) {
        const fullPath = path.join(workspaceVibingPath, file);
        const result = parseProjectNote(fullPath);
        if (result) {
          // Handle both single project and array of projects (multiple dates)
          const projectsArray = Array.isArray(result) ? result : [result];
          projects.push(...projectsArray);
          console.log(`✓ Parsed: ${path.basename(file, '.md')} (${projectsArray.length} date${projectsArray.length > 1 ? 's' : ''})`);
        }
      }

      // Generate output
      return generateOutput(projects);
    } else {
      console.error(`❌ Cannot proceed without Vibing folder`);
      process.exit(1);
    }
  }

  // Find all markdown files in Vibing folder
  const markdownFiles = await glob('**/*.md', { cwd: VIBING_PATH });
  console.log(`📁 Found ${markdownFiles.length} markdown files in ${config.vibingFolderName}/\n`);

  // Parse all files
  const projects = [];
  for (const file of markdownFiles) {
    const fullPath = path.join(VIBING_PATH, file);
    const result = parseProjectNote(fullPath);
    if (result) {
      // Handle both single project and array of projects (multiple dates)
      const projectsArray = Array.isArray(result) ? result : [result];
      projects.push(...projectsArray);
      console.log(`✓ Parsed: ${path.basename(file, '.md')} (${projectsArray.length} date${projectsArray.length > 1 ? 's' : ''})`);
    }
  }

  // Generate output
  return generateOutput(projects);
}

/**
 * Generate output JSON structure
 */
function generateOutput(projects) {
  console.log(`\n📊 Processing ${projects.length} projects...\n`);

  // Build daily contributions map
  const dailyContributions = {};

  for (const project of projects) {
    if (!dailyContributions[project.date]) {
      dailyContributions[project.date] = {
        intensity: 0,
        projectCount: 0,
        vibeTools: new Set()
      };
    }

    const day = dailyContributions[project.date];
    day.intensity = Math.max(day.intensity, project.intensity);
    day.projectCount++;
    project.vibeTools.forEach(tool => day.vibeTools.add(tool));
  }

  // Convert Sets to Arrays
  Object.keys(dailyContributions).forEach(date => {
    dailyContributions[date].vibeTools = Array.from(dailyContributions[date].vibeTools);
  });

  // Get date range
  const dates = Object.keys(dailyContributions).sort();
  const dateRange = {
    start: dates[0] || format(new Date(), 'yyyy-MM-dd'),
    end: dates[dates.length - 1] || format(new Date(), 'yyyy-MM-dd')
  };

  // Build final structure
  const output = {
    metadata: {
      generated: new Date().toISOString(),
      totalProjects: projects.length,
      dateRange
    },
    dailyContributions,
    projects: projects.sort((a, b) => new Date(b.date) - new Date(a.date))
  };

  // Ensure output directories exist
  fs.ensureDirSync(path.dirname(OUTPUT_PATH));
  fs.ensureDirSync(path.dirname(SITE_DATA_PATH));

  // Write output files
  fs.writeJsonSync(OUTPUT_PATH, output, { spaces: 2 });
  fs.writeJsonSync(SITE_DATA_PATH, output, { spaces: 2 });

  console.log(`✅ Generated: ${OUTPUT_PATH}`);
  console.log(`✅ Generated: ${SITE_DATA_PATH}`);

  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log('📈 Summary');
  console.log('='.repeat(50));
  console.log(`Total Projects: ${projects.length}`);
  console.log(`Active Days: ${Object.keys(dailyContributions).length}`);
  console.log(`Date Range: ${dateRange.start} to ${dateRange.end}`);

  // Tools used
  const allTools = new Set();
  const allStack = new Set();
  projects.forEach(p => {
    p.vibeTools.forEach(t => allTools.add(t));
    p.stack.forEach(s => allStack.add(s));
  });

  console.log(`\nVibe Tools Used: ${Array.from(allTools).join(', ')}`);
  console.log(`Tech Stack: ${Array.from(allStack).join(', ')}`);
  console.log('='.repeat(50));

  return output;
}

// Run parser
if (require.main === module) {
  parseVibingNotes()
    .then(() => {
      console.log('\n✨ Parser completed successfully!\n');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Parser failed:', error);
      process.exit(1);
    });
}

module.exports = { parseVibingNotes, parseProjectNote };
