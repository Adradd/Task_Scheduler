import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import ConfirmPopoverButton from '../components/ConfirmPopoverButton.jsx';
import TaskEditorPanel from '../components/TaskEditorPanel.jsx';
import TaskListItem from '../components/TaskListItem.jsx';
import useTaskData from '../hooks/useTaskData.js';
import useResizableSidebar from '../hooks/useResizableSidebar.js';
import { extractApiErrorMessage } from '../utils/api.js';
import { createAuthConfig } from '../utils/authSession.js';
import {
    buildTimeOptions,
    formatTags,
    getTagNames,
    isGoogleReadOnlyTask,
    parseTagInput,
    projectNameToProjectObject,
    projectToProjectName,
    tagNameToTagObject,
} from '../utils/taskAdapters.js';
import {
    formatDate,
    formatFullDateLabel,
    formatHourLabel,
    formatMonthDayLabel,
    formatMonthYearLabel,
    formatSelectedDayLabel,
    formatTimeLabel,
    getTodayKey,
    toDateKey,
} from '../utils/dateFormatters.js';
import { formatPriorityLabel, getPriorityRank } from '../utils/taskFormatting.js';
import '../styles/TaskView.css';
import '../styles/CalendarView.css';

const parseTaskDateTime = (value) => {
    if (!value || typeof value !== 'string') return null;

    const normalized = value.trim().includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value.trim();

    // Parse date-only values in local time to avoid timezone day shifts.
    const dateOnlyMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
    }

    const localDateTimeMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (localDateTimeMatch) {
        const [, year, month, day, hours, minutes, seconds = '0'] = localDateTimeMatch;
        return new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hours),
            Number(minutes),
            Number(seconds),
            0,
        );
    }

    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
        return null;
    }
    return parsed;
};

const getTaskScheduleRange = (task) => {
    const startDate = parseTaskDateTime(task.startTime);
    const endDate = parseTaskDateTime(task.endTime);
    const hasValidRange = Boolean(startDate && endDate && endDate > startDate);
    return { startDate, endDate, hasValidRange };
};

const sortByDeadlineSchedulePriority = (taskA, taskB) => {
    const dateA = taskA.deadline ? parseTaskDateTime(`${taskA.deadline}T00:00:00`) : null;
    const dateB = taskB.deadline ? parseTaskDateTime(`${taskB.deadline}T00:00:00`) : null;
    const deadlineA = dateA ? dateA.getTime() : Number.MAX_SAFE_INTEGER;
    const deadlineB = dateB ? dateB.getTime() : Number.MAX_SAFE_INTEGER;
    if (deadlineA !== deadlineB) {
        return deadlineA - deadlineB;
    }

    const { startDate: startA, hasValidRange: hasScheduleA } = getTaskScheduleRange(taskA);
    const { startDate: startB, hasValidRange: hasScheduleB } = getTaskScheduleRange(taskB);
    const scheduleA = hasScheduleA ? startA.getTime() : Number.MAX_SAFE_INTEGER;
    const scheduleB = hasScheduleB ? startB.getTime() : Number.MAX_SAFE_INTEGER;
    if (scheduleA !== scheduleB) {
        return scheduleA - scheduleB;
    }

    const priorityDiff = getPriorityRank(taskA.priority) - getPriorityRank(taskB.priority);
    if (priorityDiff !== 0) {
        return priorityDiff;
    }

    return (taskA.taskName || '').localeCompare(taskB.taskName || '');
};

export default function CalendarView ({ user }) {
    const DAY_VIEW_START_HOUR = 0;
    const DAY_VIEW_END_HOUR = 23;
    const DAY_VIEW_HOUR_HEIGHT = 52;
    const WEEK_VIEW_HOUR_HEIGHT = 32;
    const WEEK_VIEW_HEADER_HEIGHT = 56;
    const WEEK_VIEW_UNSCHEDULED_HEIGHT = 78;
    const NO_PROJECT_CALENDAR_COLOR = '#8ecae6';

    const {
        tasks,
        completedTasks,
        availableProjects,
        allProjectObjects,
        availableTags,
        allTagObjects,
        error,
        setError,
        loading,
        refetchAll,
        fetchTaskDetails,
        updateTask,
        completeTask,
        deleteTask,
    } = useTaskData(user);
    const [googleEvents, setGoogleEvents] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedTaskLoading, setSelectedTaskLoading] = useState(false);
    const [editData, setEditData] = useState({});
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [editTaskAutoSchedule, setEditTaskAutoSchedule] = useState(false);
    const [viewType, setViewType] = useState('month');
    const [projectVisibility, setProjectVisibility] = useState({});
    const [showEditTagDropdown, setShowEditTagDropdown] = useState(false);
    const [showEditProjectDropdown, setShowEditProjectDropdown] = useState(false);
    const [editTaskTagInput, setEditTaskTagInput] = useState('');
    const [showProjectFilters, setShowProjectFilters] = useState(false);
    const { isResizing, sidebarWidth, startResizing } = useResizableSidebar();

    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const normalizeGoogleEvent = (event) => {
        const startDateTime = event?.start?.dateTime || '';
        const endDateTime = event?.end?.dateTime || '';
        const isAllDay = !startDateTime && Boolean(event?.start?.date);
        const deadline = event?.start?.date || (startDateTime ? startDateTime.slice(0, 10) : '');
        const sourceCalendarName = event?.googleCalendarName || 'Google Calendar';

        return {
            taskId: `google_${event?.id || `${sourceCalendarName}_${deadline || 'event'}`}`,
            taskName: event?.summary || '(Google Calendar Event)',
            deadline,
            startTime: isAllDay ? '' : startDateTime,
            endTime: isAllDay ? '' : endDateTime,
            priority: 'google',
            project: { projectName: sourceCalendarName, projectColor: '#1a73e8' },
            tags: [],
            comments: event?.description || '',
            isGoogleEvent: true,
            googleEventUrl: event?.htmlLink || '',
            googleCalendarId: event?.googleCalendarId || '',
            googleCalendarName: sourceCalendarName,
        };
    };
    const todayKey = useMemo(() => getTodayKey(), []);
    const selectedDayLabel = useMemo(() => formatSelectedDayLabel(currentDate), [currentDate]);

    useEffect(() => {
        if (!user) {
            return;
        }
        fetchGoogleEventsForRange(currentDate, viewType);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDate, viewType, user]);

    const getGoogleEventRange = (date, activeViewType) => {
        const base = new Date(date);
        if (activeViewType === 'day') {
            const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            return { timeMin: start.toISOString(), timeMax: end.toISOString() };
        }

        if (activeViewType === 'week') {
            const start = getWeekStart(base);
            const end = new Date(start);
            end.setDate(end.getDate() + 7);
            return { timeMin: start.toISOString(), timeMax: end.toISOString() };
        }

        const start = new Date(base.getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
        const end = new Date(base.getFullYear(), base.getMonth() + 1, 1, 0, 0, 0, 0);
        return { timeMin: start.toISOString(), timeMax: end.toISOString() };
    };

    const fetchGoogleEventsForRange = async (date, activeViewType) => {
        const { timeMin, timeMax } = getGoogleEventRange(date, activeViewType);
        try {
            const googleRes = await axios.get(`${backendUrl}/api/integrations/google/events`, {
                ...createAuthConfig(),
                params: { timeMin, timeMax },
            });
            const sourceGoogleEvents = googleRes?.data?.events || [];
            setGoogleEvents(sourceGoogleEvents.map(normalizeGoogleEvent));
        } catch {
            setGoogleEvents([]);
        }
    };

    const taskCountByProject = useMemo(() => {
        return tasks.reduce((counts, task) => {
            const projectName = projectToProjectName(task.project);
            if (!projectName) {
                return counts;
            }
            counts[projectName] = (counts[projectName] || 0) + 1;
            return counts;
        }, {});
    }, [tasks]);

    const sidebarProjects = useMemo(() => {
        return availableProjects
            .map((projectName) => ({
                projectName,
                taskCount: taskCountByProject[projectName] || 0,
            }))
            .sort((a, b) => a.projectName.localeCompare(b.projectName));
    }, [availableProjects, taskCountByProject]);

    useEffect(() => {
        setProjectVisibility((prev) => {
            const next = {};
            sidebarProjects.forEach(({ projectName }) => {
                next[projectName] = prev[projectName] ?? true;
            });
            return next;
        });
    }, [sidebarProjects]);

    useEffect(() => {
        if (!selectedTask && isEditingTask) {
            stopEditingSelectedTask();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTask]);

    const visibleTasks = useMemo(() => {
        return tasks.filter((task) => {
            const projectName = projectToProjectName(task.project);
            if (!projectName) {
                return true;
            }
            return projectVisibility[projectName] ?? true;
        });
    }, [projectVisibility, tasks]);

    const calendarItems = useMemo(() => {
        return [...visibleTasks, ...googleEvents];
    }, [visibleTasks, googleEvents]);

    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const getTaskDisplayDateKey = (task) => {
        if (task?.deadline) {
            return task.deadline;
        }

        const { startDate, hasValidRange } = getTaskScheduleRange(task);
        if (hasValidRange) {
            return toDateKey(startDate);
        }
        return '';
    };

    const getTasksForDate = (date) => {
        const dateStr = toDateKey(date);
        return calendarItems
            .filter((task) => getTaskDisplayDateKey(task) === dateStr)
            .sort(sortByDeadlineSchedulePriority);
    };

    const formatDeadlineLabel = (deadline) => {
        if (!deadline) return 'No deadline';
        const parsed = parseTaskDateTime(`${deadline}T00:00:00`);
        if (!parsed) return deadline;
        return formatMonthDayLabel(parsed);
    };

    const formatDateTimeDetailLabel = (dateTimeValue) => {
        const parsed = parseTaskDateTime(dateTimeValue);
        if (!parsed) return 'Unscheduled';

        const dateLabel = formatDate(parsed, { month: 'long', day: 'numeric', year: 'numeric' });
        const timeLabel = formatTimeLabel(parsed);
        return `${dateLabel} at ${timeLabel}`;
    };

    const normalizeProjectColor = (color) => {
        if (!color || typeof color !== 'string') return null;
        const trimmed = color.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
            return trimmed.toLowerCase();
        }
        return null;
    };

    const getProjectColor = (project) => {
        if (!project || typeof project === 'string') {
            return null;
        }
        return normalizeProjectColor(project.projectColor);
    };

    const getScheduledEntriesForDate = (date, hourHeight) => {
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        const selectedDateKey = toDateKey(selectedDate);
        const dayStartMinutes = DAY_VIEW_START_HOUR * 60;
        const dayEndMinutes = (DAY_VIEW_END_HOUR + 1) * 60;

        const scheduledEntries = [];
        const unscheduledEntries = [];

        calendarItems.forEach((task) => {
            const { startDate, endDate, hasValidRange } = getTaskScheduleRange(task);
            const taskDisplayDateKey = getTaskDisplayDateKey(task);

            if (hasValidRange && taskDisplayDateKey === selectedDateKey) {
                const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
                const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();
                const clippedStart = Math.max(dayStartMinutes, startMinutes);
                const clippedEnd = Math.min(dayEndMinutes, endMinutes);

                if (clippedEnd > clippedStart) {
                    scheduledEntries.push({
                        task,
                        startDate,
                        endDate,
                        startMinutes,
                        endMinutes,
                        clippedStart,
                        clippedEnd,
                    });
                }
                return;
            }

            if (taskDisplayDateKey === selectedDateKey && !hasValidRange) {
                unscheduledEntries.push(task);
            }
        });

        scheduledEntries.sort((a, b) => {
            if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
            if (a.endMinutes !== b.endMinutes) return a.endMinutes - b.endMinutes;
            return (a.task.taskName || '').localeCompare(b.task.taskName || '');
        });

        unscheduledEntries.sort((a, b) => {
            const orderA = getPriorityRank(a.priority);
            const orderB = getPriorityRank(b.priority);
            if (orderA !== orderB) return orderA - orderB;
            return (a.taskName || '').localeCompare(b.taskName || '');
        });

        const laneEnds = [];
        const laidOut = scheduledEntries.map((entry) => {
            let lane = laneEnds.findIndex((laneEnd) => laneEnd <= entry.clippedStart);
            if (lane === -1) {
                lane = laneEnds.length;
                laneEnds.push(entry.clippedEnd);
            } else {
                laneEnds[lane] = entry.clippedEnd;
            }
            return { ...entry, lane };
        });

        const totalLanes = Math.max(1, laneEnds.length);
        const minutePixelHeight = hourHeight / 60;
        const laidOutEntries = laidOut.map((entry) => ({
            ...entry,
            top: (entry.clippedStart - dayStartMinutes) * minutePixelHeight,
            height: Math.max(24, (entry.clippedEnd - entry.clippedStart) * minutePixelHeight),
            widthPct: 100 / totalLanes,
            leftPct: (entry.lane * 100) / totalLanes,
        }));

        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();
        const showCurrentTime = selectedDateKey === todayKey && nowMinutes >= dayStartMinutes && nowMinutes < dayEndMinutes;

        return {
            scheduledEntries: laidOutEntries,
            unscheduledEntries,
            showCurrentTime,
            currentTimeTop: showCurrentTime ? (nowMinutes - dayStartMinutes) * minutePixelHeight : -1,
            currentTimeLabel: formatTimeLabel(now),
        };
    };

    const dayViewData = getScheduledEntriesForDate(currentDate, DAY_VIEW_HOUR_HEIGHT);

    const sectionTitle = useMemo(() => {
        if (viewType === 'day') {
            return formatFullDateLabel(currentDate);
        }

        if (viewType === 'week') {
            const weekStart = getWeekStart(currentDate);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);

            const startLabel = formatMonthDayLabel(weekStart);
            const endLabel = formatDate(weekEnd, { month: 'short', day: 'numeric', year: 'numeric' });

            return `Week of ${startLabel} – ${endLabel}`;
        }

        return formatMonthYearLabel(currentDate);
    }, [currentDate, viewType]);

    const getFilteredTags = (inputValue, currentTags) => {
        const input = inputValue.split(',').pop().trim().toLowerCase();
        if (!input) return availableTags.filter((tag) => !currentTags.includes(tag));
        return availableTags.filter((tag) => tag.toLowerCase().includes(input) && !currentTags.includes(tag));
    };

    const handleEditChange = (field, value) => {
        if (field === 'tags') {
            setEditTaskTagInput(value);
            setShowEditTagDropdown(value.length > 0);
            setEditData((prev) => ({ ...prev, tags: parseTagInput(value) }));
            return;
        }
        setEditData((prev) => ({ ...prev, [field]: value }));
    };

    const handleEditTagSelect = (tagName) => {
        const currentTags = editData.tags || [];
        if (!currentTags.includes(tagName)) {
            setEditData((prev) => ({ ...prev, tags: [...currentTags, tagName] }));
            setEditTaskTagInput('');
        }
        setShowEditTagDropdown(false);
    };

    const handleEditRemoveTag = (tagToRemove) => {
        const updatedTags = (editData.tags || []).filter((tag) => tag !== tagToRemove);
        setEditData((prev) => ({ ...prev, tags: updatedTags }));
        setEditTaskTagInput('');
    };


    const loadSelectedTask = async (task) => {
        if (!task) {
            return;
        }

        if (isGoogleReadOnlyTask(task)) {
            setSelectedTask(task);
            return;
        }

        setSelectedTaskLoading(true);
        setError(null);

        try {
            const refreshedTask = await fetchTaskDetails(task.taskId);
            setSelectedTask(refreshedTask);
        } catch (err) {
            setSelectedTask(task);
            setError(`Failed to fetch task details: ${extractApiErrorMessage(err)}`);
        } finally {
            setSelectedTaskLoading(false);
        }
    };

    const startEditingSelectedTask = async (taskToEdit = selectedTask) => {
        if (!taskToEdit) {
            return;
        }

        let normalized = taskToEdit;
        if (isGoogleReadOnlyTask(taskToEdit)) {
            setSelectedTask(taskToEdit);
            return;
        }

        if (taskToEdit.taskId) {
            setSelectedTaskLoading(true);
            setError(null);
            try {
                normalized = await fetchTaskDetails(taskToEdit.taskId);
            } catch (err) {
                setError(`Failed to fetch task details: ${extractApiErrorMessage(err)}`);
            } finally {
                setSelectedTaskLoading(false);
            }
        }

        const tagNames = getTagNames(normalized.tags);
        setEditData({
            ...normalized,
            project: projectToProjectName(normalized.project),
            tags: tagNames,
        });
        setSelectedTask(normalized);
        setEditTaskTagInput(formatTags(tagNames));
        setEditTaskAutoSchedule(false);
        setIsEditingTask(true);
    };

    const stopEditingSelectedTask = () => {
        setIsEditingTask(false);
        setEditData({});
        setEditTaskTagInput('');
        setShowEditTagDropdown(false);
        setShowEditProjectDropdown(false);
        setEditTaskAutoSchedule(false);
        setError(null);
    };

    const handleSaveSelectedTask = async () => {
        if (!selectedTask?.taskId) {
            return;
        }

        const validationErrors = [];
        if (!editData.taskName?.trim()) validationErrors.push('Task name is required');
        if (!editData.deadline?.trim()) validationErrors.push('Deadline is required');
        if (!editData.timeToComplete?.trim()) validationErrors.push('Time to complete is required');
        if (!editData.priority?.trim()) validationErrors.push('Priority is required');
        if (
            editData.project?.trim()
            && !availableProjects.some((projectName) => projectName.toLowerCase() === editData.project.trim().toLowerCase())
        ) {
            validationErrors.push('Please select a project from the project list');
        }
        if (validationErrors.length > 0) {
            setError(validationErrors.join(' | '));
            return;
        }

        try {
            setError(null);
            const tagObjects = (editData.tags || []).map((tagName) => tagNameToTagObject(tagName, allTagObjects));
            const payload = {
                ...editData,
                project: projectNameToProjectObject(editData.project || '', allProjectObjects),
                tags: tagObjects,
                autoSchedule: editTaskAutoSchedule,
            };

            const updatedTask = await updateTask(payload);
            setSelectedTask(updatedTask);
            await refetchAll();
            stopEditingSelectedTask();
        } catch (err) {
            setError(`Failed to update task: ${extractApiErrorMessage(err)}`);
        }
    };

    const handleCompleteTask = async (taskId) => {
        try {
            setError(null);
            await completeTask(taskId);
            if (selectedTask?.taskId === taskId) {
                closeSelectedTaskModal();
            }
        } catch (err) {
            setError(`Failed to complete task: ${extractApiErrorMessage(err)}`);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            setError(null);
            await deleteTask(taskId);
            if (selectedTask?.taskId === taskId) {
                closeSelectedTaskModal();
            }
        } catch (err) {
            setError(`Failed to delete task: ${extractApiErrorMessage(err)}`);
        }
    };

    const getCalendarEditorProps = () => ({
        mode: 'edit',
        taskData: editData,
        timeOptions: buildTimeOptions(),
        projectDropdownVisible: showEditProjectDropdown,
        tagDropdownVisible: showEditTagDropdown,
        tagInputValue: editTaskTagInput,
        filteredProjects: availableProjects,
        filteredTags: getFilteredTags(editTaskTagInput, editData.tags || []),
        autoSchedule: editTaskAutoSchedule,
        onChange: handleEditChange,
        onProjectFocus: () => setShowEditProjectDropdown(true),
        onProjectBlur: () => setTimeout(() => setShowEditProjectDropdown(false), 0),
        onTagFocus: () => setShowEditTagDropdown(true),
        onTagBlur: () => setTimeout(() => setShowEditTagDropdown(false), 200),
        onTagSelect: handleEditTagSelect,
        onRemoveTag: handleEditRemoveTag,
        onAutoScheduleChange: setEditTaskAutoSchedule,
        onSave: handleSaveSelectedTask,
        onCancel: stopEditingSelectedTask,
    });

    const toggleProjectVisibility = (projectName) => {
        setProjectVisibility((prev) => ({
            ...prev,
            [projectName]: !(prev[projectName] ?? true),
        }));
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'high':
                return '#dc3545';
            case 'medium':
                return '#f0ad4e';
            case 'low':
                return '#28a745';
            case 'google':
                return '#1a73e8';
            default:
                return '#3fb0ba';
        }
    };

    const getTaskCalendarColor = (task) => {
        if (isGoogleReadOnlyTask(task)) {
            return '#1a73e8';
        }

        const projectName = projectToProjectName(task?.project);
        const projectColor = getProjectColor(task?.project);

        if (!projectName) {
            return NO_PROJECT_CALENDAR_COLOR;
        }

        return projectColor || getPriorityColor(task?.priority);
    };

    const handlePrevious = () => {
        const nextDate = new Date(currentDate);
        if (viewType === 'week') {
            nextDate.setDate(nextDate.getDate() - 7);
        } else if (viewType === 'day') {
            nextDate.setDate(nextDate.getDate() - 1);
        } else {
            nextDate.setMonth(nextDate.getMonth() - 1);
        }
        setCurrentDate(nextDate);
    };

    const handleNext = () => {
        const nextDate = new Date(currentDate);
        if (viewType === 'week') {
            nextDate.setDate(nextDate.getDate() + 7);
        } else if (viewType === 'day') {
            nextDate.setDate(nextDate.getDate() + 1);
        } else {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
        setCurrentDate(nextDate);
    };

    const sectionSubtitle = `${visibleTasks.length} active task${visibleTasks.length === 1 ? '' : 's'} • ${completedTasks.length} completed • ${googleEvents.length} Google event${googleEvents.length === 1 ? '' : 's'}`;

    const sidebarTasks = useMemo(() => {
        return [...visibleTasks].sort(sortByDeadlineSchedulePriority);
    }, [visibleTasks]);

    const renderMonthView = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDayOfMonth = getFirstDayOfMonth(currentDate);
        const days = [];

        for (let i = 0; i < firstDayOfMonth; i += 1) days.push(null);
        for (let day = 1; day <= daysInMonth; day += 1) days.push(day);

        return (
            <div className="calendar-board">
                <div className="calendar-day-headers">
                    {dayNames.map((dayName) => (
                        <div key={dayName} className="calendar-day-header">{dayName}</div>
                    ))}
                </div>
                <div className="calendar-days">
                    {days.map((day, idx) => {
                        if (day === null) {
                            return <div key={`blank-${idx}`} className="calendar-day empty" />;
                        }

                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const dayTasks = getTasksForDate(date);
                        const isToday = toDateKey(date) === todayKey;

                        return (
                            <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                                <div className="day-number">{day}</div>
                                <div className="day-tasks">
                                    {dayTasks.map((task) => (
                                        (() => {
                                            const { startDate, hasValidRange } = getTaskScheduleRange(task);
                                            const startLabel = hasValidRange ? formatTimeLabel(startDate) : 'Unscheduled';
                                            const deadlineLabel = formatDeadlineLabel(task.deadline);

                                            return (
                                                <button
                                                    type="button"
                                                    key={task.taskId}
                                                    className="month-task-item"
                                                    style={{ borderLeft: `3px solid ${getTaskCalendarColor(task)}` }}
                                                    onClick={() => loadSelectedTask(task)}
                                                >
                                                    <span className="month-task-title">{task.taskName}</span>
                                                    <span className="month-task-meta">{deadlineLabel} | {startLabel}</span>
                                                </button>
                                            );
                                        })()
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const weekStart = getWeekStart(currentDate);
        const totalHours = DAY_VIEW_END_HOUR - DAY_VIEW_START_HOUR + 1;
        const dayHeight = totalHours * WEEK_VIEW_HOUR_HEIGHT;
        const weekTopOffset = WEEK_VIEW_HEADER_HEIGHT + WEEK_VIEW_UNSCHEDULED_HEIGHT;
        const dayHours = Array.from({ length: totalHours }, (_, idx) => DAY_VIEW_START_HOUR + idx);
        const weekHourBoundaries = Array.from({ length: totalHours + 1 }, (_, idx) => idx);

        return (
            <div className="week-view">
                <div className="week-timeline-wrap">
                    <div className="week-time-labels" style={{ height: `${dayHeight + weekTopOffset}px` }}>
                        <div className="week-time-header-spacer" style={{ height: `${WEEK_VIEW_HEADER_HEIGHT}px` }} aria-hidden="true" />
                        <div className="week-time-unscheduled-spacer" style={{ height: `${WEEK_VIEW_UNSCHEDULED_HEIGHT}px` }} aria-hidden="true" />
                        {dayHours.map((hour) => (
                            <div key={`week-hour-${hour}`} className="week-time-label" style={{ height: `${WEEK_VIEW_HOUR_HEIGHT}px` }}>
                                {formatHourLabel(hour)}
                            </div>
                        ))}
                    </div>

                    <div className="week-view-grid week-view-grid-timeline">
                        {dayNames.map((dayName, index) => {
                            const date = new Date(weekStart);
                            date.setDate(date.getDate() + index);
                            const dateStr = toDateKey(date);
                            const isToday = dateStr === todayKey;
                            const dayData = getScheduledEntriesForDate(date, WEEK_VIEW_HOUR_HEIGHT);

                            return (
                                <div key={`${dayName}-${dateStr}`} className={`week-day-column ${isToday ? 'today' : ''}`}>
                                    <div className="week-day-header">
                                        <div className="week-day-name">{dayName}</div>
                                        <div className="week-day-date">{date.getDate()}</div>
                                    </div>

                                    <div className="week-unscheduled-wrap">
                                        {dayData.unscheduledEntries.length === 0 ? (
                                            <p className="week-unscheduled-empty">No unscheduled tasks.</p>
                                        ) : (
                                            <div className="week-unscheduled-list">
                                                {dayData.unscheduledEntries.map((task) => (
                                                    <button
                                                        type="button"
                                                        key={`unscheduled-${task.taskId}`}
                                                        className="week-unscheduled-item"
                                                        onClick={() => loadSelectedTask(task)}
                                                        style={{ borderLeftColor: getTaskCalendarColor(task) }}
                                                    >
                                                        <span className="week-unscheduled-name">{task.taskName}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <div className="week-day-timeline" style={{ height: `${dayHeight}px` }}>
                                        {weekHourBoundaries.map((hour, hourIdx) => (
                                            <div
                                                key={`week-line-${dateStr}-${hour}`}
                                                className="week-hour-line"
                                                style={{ top: `${hourIdx * WEEK_VIEW_HOUR_HEIGHT}px` }}
                                            />
                                        ))}

                                        {dayData.showCurrentTime && (
                                            <div className="week-current-time-line" style={{ top: `${dayData.currentTimeTop}px` }} />
                                        )}

                                        {dayData.scheduledEntries.map((entry) => (
                                            <button
                                                type="button"
                                                key={entry.task.taskId}
                                                className="week-timeline-task"
                                                onClick={() => loadSelectedTask(entry.task)}
                                                style={{
                                                    top: `${entry.top}px`,
                                                    height: `${entry.height}px`,
                                                    left: `calc(${entry.leftPct}% + 2px)`,
                                                    width: `calc(${entry.widthPct}% - 4px)`,
                                                    backgroundColor: getTaskCalendarColor(entry.task),
                                                }}
                                                title={`${entry.task.taskName} (${formatTimeLabel(entry.startDate)} - ${formatTimeLabel(entry.endDate)})`}
                                            >
                                                <span className="task-event-title">{entry.task.taskName}</span>
                                                <span className="task-event-time">{formatTimeLabel(entry.startDate)} - {formatTimeLabel(entry.endDate)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    const renderDayView = () => {
        const totalHours = DAY_VIEW_END_HOUR - DAY_VIEW_START_HOUR + 1;
        const dayHeight = totalHours * DAY_VIEW_HOUR_HEIGHT;
        const dayHours = Array.from({ length: totalHours }, (_, idx) => DAY_VIEW_START_HOUR + idx);

        return (
            <div className="day-view">
                <div className="day-view-topbar">
                    <div className="day-view-month">{formatMonthYearLabel(currentDate)}</div>
                    <div className="day-view-current-day">{selectedDayLabel}</div>
                    <div className="day-view-spacer" aria-hidden="true" />
                </div>

                <div className="day-unscheduled-wrap">
                    <div className="day-unscheduled-title">Unscheduled Tasks</div>
                    {dayViewData.unscheduledEntries.length === 0 ? (
                        <p className="day-unscheduled-empty">No unscheduled tasks for this day.</p>
                    ) : (
                        <div className="day-unscheduled-list">
                            {dayViewData.unscheduledEntries.map((task) => (
                                <button
                                    type="button"
                                    key={task.taskId}
                                    className="day-unscheduled-item"
                                    onClick={() => loadSelectedTask(task)}
                                    style={{ borderLeftColor: getTaskCalendarColor(task) }}
                                >
                                    <span className="day-unscheduled-name">{task.taskName}</span>
                                    <span className="day-unscheduled-meta">{formatPriorityLabel(task.priority) || 'No priority'} - {task.timeToComplete || 'No estimate'}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="day-grid-shell">
                    <div className="day-time-labels" style={{ height: `${dayHeight}px` }}>
                        {dayHours.map((hour) => (
                            <div key={hour} className="day-time-label" style={{ height: `${DAY_VIEW_HOUR_HEIGHT}px` }}>
                                {formatHourLabel(hour)}
                            </div>
                        ))}
                    </div>

                    <div className="day-grid-surface" style={{ height: `${dayHeight}px` }}>
                        {dayHours.map((hour, idx) => (
                            <div
                                key={`line-${hour}`}
                                className="day-hour-line"
                                style={{ top: `${idx * DAY_VIEW_HOUR_HEIGHT}px` }}
                            />
                        ))}

                        {dayViewData.showCurrentTime && (
                            <>
                                {/*<div className="day-current-time-label" style={{ top: `${dayViewData.currentTimeTop}px` }}>*/}
                                {/*    {dayViewData.currentTimeLabel}*/}
                                {/*</div>*/}
                                <div className="day-current-time-line" style={{ top: `${dayViewData.currentTimeTop}px` }} />
                            </>
                        )}

                        {dayViewData.scheduledEntries.map((entry) => (
                            <button
                                type="button"
                                key={entry.task.taskId}
                                className="day-task-block"
                                onClick={() => loadSelectedTask(entry.task)}
                                style={{
                                    top: `${entry.top}px`,
                                    height: `${entry.height}px`,
                                    left: `calc(${entry.leftPct}% + 2px)`,
                                    width: `calc(${entry.widthPct}% - 4px)`,
                                    backgroundColor: getTaskCalendarColor(entry.task),
                                }}
                                title={`${entry.task.taskName} (${formatTimeLabel(entry.startDate)} - ${formatTimeLabel(entry.endDate)})`}
                            >
                                <span className="task-event-title">{entry.task.taskName}</span>
                                <span className="task-event-time">{formatTimeLabel(entry.startDate)} - {formatTimeLabel(entry.endDate)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    };

    const closeSelectedTaskModal = () => {
        stopEditingSelectedTask();
        setSelectedTask(null);
    };

    if (loading) {
        return (
            <main className="task-view-container">
                <div className="task-content">
                    <div className="task-layout task-layout-loading">
                        <aside className="project-sidebar task-loading-sidebar" />
                        <div className="task-main-panel loading loading-panel">Loading calendar…</div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="task-view-container calendar-view-container">
            <div className="task-content">
                <div
                    className={`task-layout task-layout-resizable ${isResizing ? 'is-resizing' : ''}`}
                    style={{ gridTemplateColumns: `${sidebarWidth}px 10px minmax(0, 1fr)` }}
                >
                    <aside className="project-sidebar">
                        <div className="project-sidebar-main">
                            <div className="project-section">
                                <p className="project-sidebar-eyebrow">Tasks by Deadline</p>
                                <div className="calendar-sidebar-task-list">
                                    {sidebarTasks.length > 0 ? sidebarTasks.map((task) => (
                                        <TaskListItem
                                            key={`sidebar-${task.taskId}`}
                                            task={task}
                                            className="calendar-sidebar-task"
                                            getProjectName={projectToProjectName}
                                            getTagNames={getTagNames}
                                            onSelect={loadSelectedTask}
                                            showCheckbox={false}
                                            showTags={false}
                                            showActions={false}
                                            showDateTime={false}
                                            metaItems={[
                                                `Project: ${projectToProjectName(task.project) || 'Uncategorized'}`,
                                                `Priority: ${formatPriorityLabel(task.priority) || 'No priority'}`,
                                                `Deadline: ${formatDeadlineLabel(task.deadline)}`,
                                            ]}
                                            metaSeparator=" | "
                                        />
                                    )) : <p className="project-empty-state">No active tasks in this filter.</p>}
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div
                        className="project-sidebar-resize-handle"
                        onPointerDown={startResizing}
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Resize sidebar"
                    />

                    <div className="task-main-panel">
                        {error && <div className="error-message" role="alert">{error}</div>}

                        <div className="task-section-header calendar-section-header">
                            <div className="task-title-group">
                                <div className="task-section-title"><span>{sectionTitle}</span></div>
                                <div className="task-section-subtitle">{sectionSubtitle}</div>
                            </div>
                        </div>

                        <div className="calendar-controls-bar">
                            <div className="calendar-left-controls">
                                <button
                                    type="button"
                                    className="calendar-nav-button"
                                    onClick={() => setShowProjectFilters((prev) => !prev)}
                                >
                                    Projects
                                </button>
                                {showProjectFilters && (
                                    <div className="calendar-project-filter-panel">
                                        <p className="project-sidebar-eyebrow">Project Filters</p>
                                        <div className="project-nav-list">
                                            {sidebarProjects.length > 0 ? sidebarProjects.map((project) => (
                                                <label key={project.projectName} className="project-checkbox-row">
                                                    <input
                                                        type="checkbox"
                                                        className="project-checkbox"
                                                        checked={projectVisibility[project.projectName] ?? true}
                                                        onChange={() => toggleProjectVisibility(project.projectName)}
                                                    />
                                                    <span className="project-nav-label">{project.projectName}</span>
                                                    <span className="project-count">{project.taskCount}</span>
                                                </label>
                                            )) : <p className="project-empty-state">No active projects yet.</p>}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="calendar-nav-controls">
                                <button type="button" className="calendar-nav-button" onClick={handlePrevious}>Previous</button>
                                <button type="button" className="calendar-nav-button calendar-nav-button-primary" onClick={() => setCurrentDate(new Date())}>Today</button>
                                <button type="button" className="calendar-nav-button" onClick={handleNext}>Next</button>
                            </div>

                            <div className="view-type-selector">
                                <button type="button" className={`view-btn ${viewType === 'day' ? 'active' : ''}`} onClick={() => setViewType('day')}>Day</button>
                                <button type="button" className={`view-btn ${viewType === 'week' ? 'active' : ''}`} onClick={() => setViewType('week')}>Week</button>
                                <button type="button" className={`view-btn ${viewType === 'month' ? 'active' : ''}`} onClick={() => setViewType('month')}>Month</button>
                            </div>
                        </div>

                        <div className="calendar-grid-wrap">
                            {viewType === 'month' ? renderMonthView() : viewType === 'week' ? renderWeekView() : renderDayView()}
                        </div>
                    </div>
                </div>
            </div>

            {selectedTask && (
                <div className="modal-overlay" onClick={closeSelectedTaskModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="calendar-task-modal-title">
                        <button type="button" className="modal-close" onClick={closeSelectedTaskModal} aria-label="Close task details">×</button>
                        <h3 id="calendar-task-modal-title">{selectedTask.taskName}</h3>
                        {selectedTaskLoading ? (
                            <div className="task-main-panel loading loading-panel">Loading task details…</div>
                        ) : isEditingTask ? (
                            <TaskEditorPanel {...getCalendarEditorProps()} />
                        ) : (
                            <>
                                <div className="task-details">
                                    {isGoogleReadOnlyTask(selectedTask) ? <div className="detail-item"><strong>Source:</strong> Google Calendar</div> : null}
                                    <div className="detail-item"><strong>Deadline:</strong> {selectedTask.deadline || 'No date'}</div>
                                    <div className="detail-item"><strong>Time to Complete:</strong> {selectedTask.timeToComplete || 'No estimate'}</div>
                                    <div className="detail-item"><strong>Start:</strong> {formatDateTimeDetailLabel(selectedTask.startTime)}</div>
                                    <div className="detail-item"><strong>End:</strong> {formatDateTimeDetailLabel(selectedTask.endTime)}</div>
                                    <div className="detail-item"><strong>Priority:</strong> {formatPriorityLabel(selectedTask.priority) || 'No priority'}</div>
                                    <div className="detail-item"><strong>Project:</strong> {projectToProjectName(selectedTask.project) || 'Uncategorized'}</div>
                                    <div className="detail-item"><strong>Tags:</strong> {getTagNames(selectedTask.tags).join(', ') || 'None'}</div>
                                    {selectedTask.comments ? <div className="detail-item"><strong>Comments:</strong> {selectedTask.comments}</div> : null}
                                </div>
                                {isGoogleReadOnlyTask(selectedTask) ? (
                                    <div className="task-editor-actions calendar-modal-actions">
                                        {selectedTask.googleEventUrl ? (
                                            <a href={selectedTask.googleEventUrl} target="_blank" rel="noreferrer" className="btn-save">Open in Google Calendar</a>
                                        ) : null}
                                        <button type="button" className="btn-edit" onClick={closeSelectedTaskModal}>Close</button>
                                    </div>
                                ) : (
                                    <div className="task-editor-actions calendar-modal-actions">
                                        <button type="button" className="btn-edit" onClick={() => startEditingSelectedTask()}>Edit Task</button>
                                        <button type="button" className="btn-save" onClick={() => handleCompleteTask(selectedTask.taskId)}>Complete</button>
                                        <ConfirmPopoverButton
                                            buttonClassName="btn-delete"
                                            buttonLabel="Delete"
                                            title="Delete task?"
                                            message={<><strong>{selectedTask.taskName}</strong> will be permanently removed.</>}
                                            onConfirm={() => handleDeleteTask(selectedTask.taskId)}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </main>
    );
}
