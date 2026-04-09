export const normalizePriority = (priority) => {
    if (typeof priority !== 'string') {
        return '';
    }

    return priority.trim().toLowerCase();
};

export const getPriorityRank = (priority) => {
    const normalized = normalizePriority(priority);
    const priorityOrder = { high: 0, medium: 1, low: 2, google: 3 };
    return priorityOrder[normalized] ?? 4;
};

export const formatPriorityLabel = (priority) => {
    const normalized = normalizePriority(priority);
    switch (normalized) {
        case 'high':
            return 'High';
        case 'medium':
            return 'Medium';
        case 'low':
            return 'Low';
        case 'google':
            return 'Google';
        default:
            return priority || '';
    }
};
