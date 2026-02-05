/**
 * Modal - Display project details
 */

/**
 * Format description with date headers and separators
 */
function formatDescription(description) {
    // Split by horizontal rule markers (---)
    const sections = description.split(/\n*---\n*/);

    // Format each section
    return sections.map(section => {
        // Replace bold date headers with styled divs
        section = section.replace(/\*\*([^*]+)\*\*/g, '<div class="date-header">$1</div>');

        // Replace line breaks with <br> for proper paragraph spacing
        section = section.replace(/\n\n/g, '</p><p>');

        return `<p>${section}</p>`;
    }).join('<hr class="day-separator">');
}

/**
 * Show project detail modal (handles single project or array of projects)
 */
function showProjectModal(projects) {
    const modal = document.getElementById('projectModal');
    const modalBody = document.getElementById('modalBody');

    // Convert single project to array
    if (!Array.isArray(projects)) {
        projects = [projects];
    }

    // Build HTML for each project
    const projectsHTML = projects.map((project, index) => {
        // Build tools tags
        const toolsHTML = project.vibeTools.map(tool =>
            `<span class="tag tag-tool">${tool}</span>`
        ).join('');

        // Build stack tags
        const stackHTML = project.stack.map(tech =>
            `<span class="tag tag-stack">${tech}</span>`
        ).join('');

        // Build learnings list
        let learningsHTML = '';
        if (project.learnings && project.learnings.length > 0) {
            learningsHTML = `
                <div class="modal-section">
                    <h3 class="modal-section-title">Key Learnings</h3>
                    <ul class="modal-learnings">
                        ${project.learnings.map(learning => `<li>${learning}</li>`).join('')}
                    </ul>
                </div>
            `;
        }

        // Build cost/metrics
        let metricsHTML = '';
        if (project.cost) {
            metricsHTML = `
                <div class="modal-section">
                    <h3 class="modal-section-title">Metrics</h3>
                    <p><strong>Cost:</strong> ${project.cost}</p>
                </div>
            `;
        }

        // Add separator between multiple projects
        const separator = index > 0 ? '<hr style="margin: 40px 0; border: none; border-top: 2px solid #D6D1CB;">' : '';

        return `
            ${separator}
            <h2 class="modal-title">${project.title}</h2>

            <div class="modal-section">
                <h3 class="modal-section-title">Vibe Tools</h3>
                <div class="project-tags">${toolsHTML}</div>
            </div>

            <div class="modal-section">
                <h3 class="modal-section-title">Tech Stack</h3>
                <div class="project-tags">${stackHTML}</div>
            </div>

            <div class="modal-section">
                <h3 class="modal-section-title">Description</h3>
                <div class="modal-description">${formatDescription(project.description)}</div>
            </div>

            ${learningsHTML}
            ${metricsHTML}
        `;
    }).join('');

    // Add header if multiple projects
    const headerHTML = projects.length > 1
        ? `<p style="color: #6B6763; margin-bottom: 20px; font-weight: 500;">${projects.length} projects on this day</p>`
        : '';

    // Populate modal
    modalBody.innerHTML = headerHTML + projectsHTML;

    // Show modal
    modal.classList.add('active');

    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

/**
 * Close modal
 */
function closeModal() {
    const modal = document.getElementById('projectModal');
    modal.classList.remove('active');

    // Re-enable body scroll
    document.body.style.overflow = '';
}

// Initialize modal event listeners
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('projectModal');
    const modalClose = document.getElementById('modalClose');
    const modalOverlay = modal.querySelector('.modal-overlay');

    // Close button
    modalClose.addEventListener('click', closeModal);

    // Click outside to close
    modalOverlay.addEventListener('click', closeModal);

    // ESC key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
});
