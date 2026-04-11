const formatterCache = new Map();

function getCacheKey(locale, options) {
    return `${locale || 'default'}:${JSON.stringify(options)}`;
}

function getFormatter(options, locale) {
    const key = getCacheKey(locale, options);
    if (!formatterCache.has(key)) {
        formatterCache.set(key, new Intl.DateTimeFormat(locale, options));
    }

    return formatterCache.get(key);
}

export function formatDate(date, options, locale) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
    }

    return getFormatter(options, locale).format(date);
}

export function toDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getTodayKey() {
    return toDateKey(new Date());
}

export function formatSelectedDayLabel(date, locale) {
    return formatDate(date, { weekday: 'short', day: 'numeric' }, locale);
}

export function formatMonthDayLabel(date, locale) {
    return formatDate(date, { month: 'short', day: 'numeric' }, locale);
}

export function formatFullDateLabel(date, locale) {
    return formatDate(date, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    }, locale);
}

export function formatMonthYearLabel(date, locale) {
    return formatDate(date, { month: 'long', year: 'numeric' }, locale);
}

export function formatTimeLabel(date, locale) {
    return formatDate(date, { hour: 'numeric', minute: '2-digit' }, locale);
}

export function formatHourLabel(hour, locale) {
    const sample = new Date(2000, 0, 1, hour, 0, 0, 0);
    return formatDate(sample, { hour: 'numeric' }, locale);
}
