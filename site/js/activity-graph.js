/**
 * Activity Graph - Generates GitHub-style contribution graph
 */

let activityData = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

async function init() {
    try {
        // Load activity data
        const response = await fetch('data/activity-data.json');
        activityData = await response.json();

        // Update stats
        updateStats();

        // Generate contribution graph
        generateContributionGraph();

        // Show recent projects
        showRecentProjects();

    } catch (error) {
        console.error('Failed to load activity data:', error);
        document.getElementById('contributionGraph').innerHTML =
            '<div class="loading">Failed to load activity data</div>';
    }
}

/**
 * Update statistics summary
 */
function updateStats() {
    const stats = document.getElementById('stats');
    const statCards = stats.querySelectorAll('.stat-card');

    // Total projects
    statCards[0].querySelector('.stat-value').textContent = activityData.metadata.totalProjects;

    // Active days
    const activeDays = Object.keys(activityData.dailyContributions).length;
    statCards[1].querySelector('.stat-value').textContent = activeDays;

    // Latest project - find project with most recent work date
    if (activityData.projects.length > 0) {
        const getLatestDate = (project) => {
            if (project.workDates && Array.isArray(project.workDates) && project.workDates.length > 0) {
                return Math.max(...project.workDates.map(d => new Date(d).getTime()));
            }
            return new Date(project.date).getTime();
        };

        const latestProject = activityData.projects.reduce((latest, current) => {
            return getLatestDate(current) > getLatestDate(latest) ? current : latest;
        });

        const latestProjectCard = statCards[2];

        latestProjectCard.querySelector('.stat-value').textContent = latestProject.title;
        latestProjectCard.querySelector('.stat-value').style.fontSize = '24px'; // Smaller font for longer titles

        // Make it clickable
        latestProjectCard.style.cursor = 'pointer';
        latestProjectCard.onclick = () => showProjectModal(latestProject);
    }
}

/**
 * Generate contribution graph for exactly 52 weeks (GitHub-style)
 */
function generateContributionGraph() {
    const graph = document.getElementById('contributionGraph');
    const monthsLabels = document.getElementById('monthsLabels');

    // Calculate date range - exactly 52 weeks
    const today = new Date();
    const endDate = new Date(today);

    // Adjust end to the most recent Sunday (or today if today is Sunday)
    const endDayOfWeek = endDate.getDay();
    const daysToSunday = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
    endDate.setDate(endDate.getDate() + daysToSunday);

    // Start date is exactly 52 weeks (364 days) before the end date
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (52 * 7 - 1)); // 363 days back

    // Adjust start to Monday (should already be Monday, but ensure it)
    const startDayOfWeek = startDate.getDay();
    const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToMonday);

    // Calculate number of weeks
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const numWeeks = Math.ceil(totalDays / 7);

    // Generate grid (numWeeks × 7 days)
    // Create a 2D array to hold the grid cells
    const gridCells = [];
    for (let i = 0; i < numWeeks * 7; i++) {
        gridCells.push(null);
    }

    // Fill the grid based on actual day of week
    let currentDate = new Date(startDate);

    while (currentDate < endDate) {
        const dateStr = formatDate(currentDate);

        // Calculate which week (column) this date belongs to
        const daysDiff = Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24));
        const week = Math.floor(daysDiff / 7);

        // Calculate which row based on day of week (0=Mon, 6=Sun)
        let dayOfWeek = currentDate.getDay();
        // Convert: Sun=0 -> 6, Mon=1 -> 0, Tue=2 -> 1, etc.
        const row = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        // Calculate position in 1D array
        const position = week * 7 + row;

        if (position < gridCells.length) {
            const dayEl = document.createElement('div');
            dayEl.className = 'graph-day';

            // Get intensity for this day
            const dayData = activityData.dailyContributions[dateStr];
            const intensity = dayData ? dayData.intensity : 0;

            dayEl.setAttribute('data-level', intensity);
            dayEl.setAttribute('data-date', dateStr);

            // Add event listeners
            if (dayData) {
                dayEl.addEventListener('click', () => handleDayClick(dateStr));
                dayEl.addEventListener('mouseenter', (e) => showTooltip(e, dateStr, dayData));
                dayEl.addEventListener('mouseleave', hideTooltip);
            }

            gridCells[position] = dayEl;
        }

        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Append cells to graph in order
    graph.innerHTML = '';
    gridCells.forEach(cell => {
        if (cell) {
            graph.appendChild(cell);
        } else {
            // Empty cell for days not in range
            const emptyCell = document.createElement('div');
            emptyCell.className = 'graph-day';
            emptyCell.setAttribute('data-level', 0);
            graph.appendChild(emptyCell);
        }
    });

    // Now generate month labels based on actual weeks
    monthsLabels.innerHTML = '';
    let currentMonth = 0;
    const monthPositions = [];

    // Check each week's Monday to determine month labels
    for (let week = 0; week < numWeeks; week++) {
        const weekDate = new Date(startDate);
        weekDate.setDate(weekDate.getDate() + (week * 7));
        const month = weekDate.getMonth();

        if (month !== currentMonth) {
            monthPositions.push({
                month: weekDate.toLocaleDateString('en-US', { month: 'short' }),
                week: week,
                date: weekDate.toLocaleDateString('en-US')
            });
            currentMonth = month;
        }
    }

    // Create month labels with proper positioning
    monthPositions.forEach(pos => {
        const monthLabel = document.createElement('div');
        monthLabel.className = 'graph-month';
        // Position: week number * (cell width 13px + gap 3px)
        monthLabel.style.left = `${pos.week * 16}px`;
        monthLabel.textContent = pos.month;
        monthLabel.title = `Starts week ${pos.week} (${pos.date})`; // Debug tooltip
        monthsLabels.appendChild(monthLabel);
    });

    console.log('Month positions:', monthPositions); // Debug output
}

/**
 * Handle click on a day
 */
function handleDayClick(dateStr) {
    // Filter projects that have this date in their workDates array OR as their main date
    const projects = activityData.projects.filter(p => {
        if (p.workDates && Array.isArray(p.workDates)) {
            return p.workDates.includes(dateStr);
        }
        return p.date === dateStr;
    });

    if (projects.length > 0) {
        // Pass all projects for that day (modal will handle single or multiple)
        showProjectModal(projects);
    }
}

/**
 * Show tooltip on hover
 */
function showTooltip(event, dateStr, dayData) {
    const tooltip = document.getElementById('tooltip');
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    tooltip.innerHTML = `
        <div class="tooltip-date">${formattedDate}</div>
        <div class="tooltip-info">
            ${dayData.projectCount} project${dayData.projectCount > 1 ? 's' : ''}
            ${dayData.vibeTools.length > 0 ? `<br>Tools: ${dayData.vibeTools.join(', ')}` : ''}
        </div>
    `;

    // Position tooltip (fixed positioning, so use viewport coordinates)
    const rect = event.target.getBoundingClientRect();

    // Start with default position (below the element)
    let left = rect.left;
    let top = rect.bottom + 8;

    // Show tooltip temporarily to get its dimensions
    tooltip.classList.add('visible');
    const tooltipRect = tooltip.getBoundingClientRect();

    // Prevent tooltip from going off the right edge
    if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }

    // Prevent tooltip from going off the left edge
    if (left < 10) {
        left = 10;
    }

    // If tooltip would go below viewport, show it above the element instead
    if (top + tooltipRect.height > window.innerHeight - 10) {
        top = rect.top - tooltipRect.height - 8;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

/**
 * Hide tooltip
 */
function hideTooltip() {
    const tooltip = document.getElementById('tooltip');
    tooltip.classList.remove('visible');
}

/**
 * Show recent projects list
 */
function showRecentProjects() {
    const container = document.querySelector('.projects-list');

    // Sort projects by most recent work date
    const sortedProjects = [...activityData.projects].sort((a, b) => {
        // Get the most recent date for each project
        const getLatestDate = (project) => {
            if (project.workDates && Array.isArray(project.workDates) && project.workDates.length > 0) {
                // If workDates exists, find the latest date in the array
                return Math.max(...project.workDates.map(d => new Date(d).getTime()));
            }
            // Otherwise use the main date
            return new Date(project.date).getTime();
        };

        const latestA = getLatestDate(a);
        const latestB = getLatestDate(b);

        return latestB - latestA; // Sort descending (most recent first)
    });

    // Display all projects (no limit)
    sortedProjects.forEach(project => {
        const card = createProjectCard(project);
        container.appendChild(card);
    });
}

/**
 * Create project card element
 */
function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.onclick = () => showProjectModal(project);

    // Get the most recent date for this project
    let displayDate = project.date;
    if (project.workDates && Array.isArray(project.workDates) && project.workDates.length > 0) {
        const latestTimestamp = Math.max(...project.workDates.map(d => new Date(d).getTime()));
        displayDate = new Date(latestTimestamp).toISOString().split('T')[0];
    }

    const formattedDate = new Date(displayDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });

    // Create tags HTML
    const toolTags = project.vibeTools.map(tool =>
        `<span class="tag tag-tool">${tool}</span>`
    ).join('');

    const stackTags = project.stack.map(tech =>
        `<span class="tag tag-stack">${tech}</span>`
    ).join('');

    card.innerHTML = `
        <div class="project-header">
            <h3 class="project-title">${project.title}</h3>
            <span class="project-date">${formattedDate}</span>
        </div>
        <p class="project-description">${truncate(project.description, 200)}</p>
        <div class="project-tags">
            ${toolTags}
            ${stackTags}
        </div>
    `;

    return card;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Truncate text to max length
 */
function truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}
