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

    // Latest project
    if (activityData.projects.length > 0) {
        const latestProject = activityData.projects[0];
        const latestProjectCard = statCards[2];

        latestProjectCard.querySelector('.stat-value').textContent = latestProject.title;
        latestProjectCard.querySelector('.stat-value').style.fontSize = '24px'; // Smaller font for longer titles

        // Make it clickable
        latestProjectCard.style.cursor = 'pointer';
        latestProjectCard.onclick = () => showProjectModal(latestProject);
    }
}

/**
 * Generate contribution graph for 12 full calendar months
 */
function generateContributionGraph() {
    const graph = document.getElementById('contributionGraph');
    const monthsLabels = document.getElementById('monthsLabels');

    // Calculate date range - 12 full calendar months
    const today = new Date();

    // Start from the 1st of the month, 11 months ago
    const startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);

    // End on the last day of current month
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Adjust start to the Monday on or before the 1st
    const startDayOfWeek = startDate.getDay();
    const daysToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
    startDate.setDate(startDate.getDate() - daysToMonday);

    // Adjust end to the Sunday on or after the last day
    const endDayOfWeek = endDate.getDay();
    const daysToSunday = endDayOfWeek === 0 ? 0 : 7 - endDayOfWeek;
    endDate.setDate(endDate.getDate() + daysToSunday);

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

    // Position tooltip
    const rect = event.target.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`;

    tooltip.classList.add('visible');
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

    // Get 10 most recent projects
    const recentProjects = activityData.projects.slice(0, 10);

    recentProjects.forEach(project => {
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

    const formattedDate = new Date(project.date).toLocaleDateString('en-US', {
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
