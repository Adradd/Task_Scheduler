import { normalizePriority } from './taskFormatting.js';

export function normalizeTask(task) {
    return {
        ...task,
        priority: normalizePriority(task?.priority),
        project: task?.project || null,
        tags: Array.isArray(task?.tags) ? task.tags : [],
    };
}

export function normalizeTasks(tasks) {
    return (tasks || []).map(normalizeTask);
}

export function getTagNames(tags) {
    if (!Array.isArray(tags)) {
        return [];
    }

    return tags
        .map((tag) => (typeof tag === 'string' ? tag : tag?.tagName || ''))
        .filter(Boolean);
}

export function parseTagInput(value) {
    if (!value) {
        return [];
    }

    return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
}

export function formatTags(tags) {
    return getTagNames(tags).join(', ');
}

export function tagNameToTagObject(tagName, allTagObjects = []) {
    const found = allTagObjects.find((tag) => tag.tagName?.toLowerCase() === tagName?.toLowerCase());
    if (found) {
        return found;
    }

    return { tagName: tagName.trim() };
}

export function projectToProjectName(project) {
    if (!project) {
        return '';
    }

    if (typeof project === 'string') {
        return project;
    }

    return project?.projectName || '';
}

export function projectToProjectColor(project, fallback = '#3fb0ba') {
    if (!project || typeof project === 'string') {
        return fallback;
    }

    const color = project?.projectColor;
    if (typeof color === 'string' && /^#[0-9a-fA-F]{6}$/.test(color.trim())) {
        return color.trim().toLowerCase();
    }

    return fallback;
}

export function projectToProjectId(project) {
    if (!project || typeof project === 'string') {
        return '';
    }

    return project?.projectId || project?.id || project?._id || '';
}

export function projectNameToProjectObject(projectName, allProjectObjects = []) {
    if (!projectName || !projectName.trim()) {
        return null;
    }

    const found = allProjectObjects.find((project) => (
        project.projectName?.toLowerCase() === projectName?.toLowerCase()
    ));

    if (found) {
        return found;
    }

    return { projectName: projectName.trim() };
}

export function isGoogleReadOnlyTask(task) {
    return Boolean(task?.isGoogleEvent || task?.importedFromGoogle || task?.googleSourceEventId);
}

export function buildTimeOptions() {
    const options = [];

    for (let minutes = 15; minutes <= 180; minutes += 15) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const label = mins === 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : `${hours}h ${mins}m`;
        options.push({ value: `${hours}h ${mins}m`, label });
    }

    for (let minutes = 210; minutes <= 480; minutes += 30) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        const label = mins === 0 ? `${hours} hours` : `${hours}h ${mins}m`;
        options.push({ value: `${hours}h ${mins}m`, label });
    }

    return options;
}
