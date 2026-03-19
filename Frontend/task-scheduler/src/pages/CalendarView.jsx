import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import TaskEditorPanel from '../components/TaskEditorPanel.jsx';
import TaskListItem from '../components/TaskListItem.jsx';
import '../styles/TaskView.css';
import '../styles/CalendarView.css';

function CalendarView({ user }) {
    const DAY_VIEW_START_HOUR = 0;
    const DAY_VIEW_END_HOUR = 23;
    const DAY_VIEW_HOUR_HEIGHT = 52;
    const WEEK_VIEW_HOUR_HEIGHT = 32;
    const WEEK_VIEW_TOP_OFFSET = 134;

    const [tasks, setTasks] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [editData, setEditData] = useState({});
    const [isEditingTask, setIsEditingTask] = useState(false);
    const [editTaskAutoSchedule, setEditTaskAutoSchedule] = useState(false);
    const [viewType, setViewType] = useState('month');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [projectVisibility, setProjectVisibility] = useState({});
    const [availableProjects, setAvailableProjects] = useState([]);
    const [allProjectObjects, setAllProjectObjects] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [allTagObjects, setAllTagObjects] = useState([]);
    const [showEditTagDropdown, setShowEditTagDropdown] = useState(false);
    const [showEditProjectDropdown, setShowEditProjectDropdown] = useState(false);
    const [editTaskTagInput, setEditTaskTagInput] = useState('');
    const [showProjectFilters, setShowProjectFilters] = useState(false);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const toDateKey = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getAuthConfig = () => {
        const authToken = sessionStorage.getItem('authToken');
        if (!authToken) {
            return {};
        }

        return {
            headers: {
                Authorization: `Basic ${authToken}`,
            },
        };
    };

    const normalizeTask = (task) => ({
        ...task,
        project: task?.project || null,
        tags: Array.isArray(task?.tags) ? task.tags : [],
    });

    const getProjectName = (project) => {
        if (!project) return '';
        if (typeof project === 'string') return project;
        return project.projectName || '';
    };

    const getTagNames = (tags) => {
        if (!Array.isArray(tags)) return [];
        return tags
            .map((tag) => (typeof tag === 'string' ? tag : tag?.tagName || ''))
            .filter(Boolean);
    };

    const formatTags = (tags) => {
        const names = getTagNames(tags);
        return names.join(', ');
    };

    const parseTagInput = (value) => {
        if (!value) return [];
        return [...new Set(value.split(',').map((tag) => tag.trim()).filter(Boolean))];
    };

    const tagNameToTagObject = (tagName) => {
        const found = allTagObjects.find((tag) => tag.tagName?.toLowerCase() === tagName?.toLowerCase());
        if (found) {
            return found;
        }
        return { tagName: tagName.trim() };
    };

    const projectNameToProjectObject = (projectName) => {
        if (!projectName || !projectName.trim()) {
            return null;
        }
        const found = allProjectObjects.find((project) => project.projectName?.toLowerCase() === projectName?.toLowerCase());
        if (found) {
            return found;
        }
        return { projectName: projectName.trim() };
    };

    const todayKey = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

    const selectedDayLabel = useMemo(() => {
        return currentDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    }, [currentDate]);

    useEffect(() => {
        if (!user) {
            return;
        }
        fetchCalendarData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchCalendarData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [activeRes, completedRes, projectsRes, tagsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/tasks`, getAuthConfig()),
                axios.get(`${backendUrl}/api/tasks/completed`, getAuthConfig()),
                axios.get(`${backendUrl}/api/projects`, getAuthConfig()),
                axios.get(`${backendUrl}/api/tags`, getAuthConfig()),
            ]);

            setTasks((activeRes.data || []).map(normalizeTask));
            setCompletedTasks((completedRes.data || []).map(normalizeTask));
            const projects = projectsRes.data || [];
            const projectNames = [...new Set(projects.map((project) => project?.projectName).filter(Boolean))];
            const tags = tagsRes.data || [];

            setAvailableProjects(projectNames);
            setAllProjectObjects(projects);
            setAllTagObjects(tags);
            setAvailableTags(tags.map((tag) => tag.tagName).filter(Boolean));
        } catch (err) {
            setError('Failed to fetch calendar tasks: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const taskCountByProject = useMemo(() => {
        return tasks.reduce((counts, task) => {
            const projectName = getProjectName(task.project);
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
            const projectName = getProjectName(task.project);
            if (!projectName) {
                return true;
            }
            return projectVisibility[projectName] ?? true;
        });
    }, [projectVisibility, tasks]);

    const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        d.setDate(d.getDate() - day);
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const parseTaskDateTime = (value) => {
        if (!value || typeof value !== 'string') return null;

        const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
        const parsed = new Date(normalized);

        if (Number.isNaN(parsed.getTime())) {
            return null;
        }
        return parsed;
    };

    const getPriorityRank = (priority) => {
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return priorityOrder[priority] ?? 3;
    };

    const getTaskScheduleRange = (task) => {
        const startDate = parseTaskDateTime(task.startTime);
        const endDate = parseTaskDateTime(task.endTime);
        const hasValidRange = Boolean(startDate && endDate && endDate > startDate);
        return { startDate, endDate, hasValidRange };
    };

    const getTaskDisplayDateKey = (task) => {
        const { startDate, hasValidRange } = getTaskScheduleRange(task);
        if (hasValidRange) {
            return toDateKey(startDate);
        }
        return task.deadline || '';
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

    const getTasksForDate = (date) => {
        const dateStr = toDateKey(date);
        return visibleTasks
            .filter((task) => getTaskDisplayDateKey(task) === dateStr)
            .sort(sortByDeadlineSchedulePriority);
    };

    const formatHourLabel = (hour) => {
        const period = hour >= 12 ? 'PM' : 'AM';
        const normalizedHour = hour % 12 === 0 ? 12 : hour % 12;
        return `${normalizedHour}${period}`;
    };

    const formatHourBoundaryLabel = (hour) => {
        if (hour >= DAY_VIEW_END_HOUR + 1) {
            return '11:59PM';
        }
        return formatHourLabel(hour);
    };

    const formatTimeLabel = (date) => {
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const period = hours >= 12 ? 'PM' : 'AM';
        const normalizedHour = hours % 12 === 0 ? 12 : hours % 12;
        return `${normalizedHour}:${minutes}${period}`;
    };

    const formatDeadlineLabel = (deadline) => {
        if (!deadline) return 'No deadline';
        const parsed = parseTaskDateTime(`${deadline}T00:00:00`);
        if (!parsed) return deadline;
        return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

        visibleTasks.forEach((task) => {
            const { startDate, endDate, hasValidRange } = getTaskScheduleRange(task);

            if (hasValidRange && toDateKey(startDate) === selectedDateKey) {
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

            if (task.deadline === selectedDateKey && !hasValidRange) {
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

    const getFilteredTags = (inputValue, currentTags) => {
        const input = inputValue.split(',').pop().trim().toLowerCase();
        if (!input) return availableTags.filter((tag) => !currentTags.includes(tag));
        return availableTags.filter((tag) => tag.toLowerCase().includes(input) && !currentTags.includes(tag));
    };

    const getFilteredProjects = (inputValue) => {
        const input = (inputValue || '').trim().toLowerCase();
        if (!input) {
            return availableProjects;
        }
        return availableProjects.filter((projectName) => projectName.toLowerCase().includes(input));
    };

    const handleEditChange = (field, value) => {
        if (field === 'tags') {
            setEditTaskTagInput(value);
            setShowEditTagDropdown(value.length > 0);
            setEditData((prev) => ({ ...prev, tags: parseTagInput(value) }));
            return;
        }
        if (field === 'project') {
            setShowEditProjectDropdown(true);
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

    const handleEditProjectSelect = (projectName) => {
        setEditData((prev) => ({ ...prev, project: projectName }));
        setShowEditProjectDropdown(false);
    };

    const startEditingSelectedTask = (taskToEdit = selectedTask) => {
        if (!taskToEdit) {
            return;
        }
        const normalized = normalizeTask(taskToEdit);
        const tagNames = getTagNames(normalized.tags);
        setEditData({
            ...normalized,
            project: getProjectName(normalized.project),
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
    };

    const handleSaveSelectedTask = async () => {
        if (!selectedTask?.taskId) {
            return;
        }

        try {
            setError(null);
            const tagObjects = (editData.tags || []).map((tagName) => tagNameToTagObject(tagName));
            const payload = {
                ...editData,
                project: projectNameToProjectObject(editData.project || ''),
                tags: tagObjects,
                autoSchedule: editTaskAutoSchedule,
            };

            const res = await axios.put(`${backendUrl}/api/tasks`, payload, getAuthConfig());
            const updatedTask = normalizeTask(res.data || payload);

            setTasks((prev) => prev.map((task) => (task.taskId === updatedTask.taskId ? updatedTask : task)));
            setSelectedTask(updatedTask);
            stopEditingSelectedTask();
        } catch (err) {
            setError('Failed to update task: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleCompleteTask = async (taskId) => {
        try {
            setError(null);
            const res = await axios.put(`${backendUrl}/api/tasks/${taskId}/complete`, {}, getAuthConfig());
            const completedTask = normalizeTask(res.data || {});
            setTasks((prev) => prev.filter((task) => task.taskId !== taskId));
            setCompletedTasks((prev) => [...prev, completedTask]);
            if (selectedTask?.taskId === taskId) {
                closeSelectedTaskModal();
            }
        } catch (err) {
            setError('Failed to complete task: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }

        try {
            setError(null);
            await axios.delete(`${backendUrl}/api/tasks/${taskId}`, getAuthConfig());
            setTasks((prev) => prev.filter((task) => task.taskId !== taskId));
            if (selectedTask?.taskId === taskId) {
                closeSelectedTaskModal();
            }
        } catch (err) {
            setError('Failed to delete task: ' + (err.response?.data?.message || err.message));
        }
    };

    const getCalendarEditorProps = () => ({
        mode: 'edit',
        taskData: editData,
        timeOptions: [
            ...Array.from({ length: 12 }, (_, i) => {
                const minutes = (i + 1) * 15;
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                const label = mins === 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : `${hours}h ${mins}m`;
                return { value: `${hours}h ${mins}m`, label };
            }),
            ...Array.from({ length: 10 }, (_, i) => {
                const minutes = 210 + (i * 30);
                const hours = Math.floor(minutes / 60);
                const mins = minutes % 60;
                const label = mins === 0 ? `${hours} hours` : `${hours}h ${mins}m`;
                return { value: `${hours}h ${mins}m`, label };
            }),
        ],
        projectDropdownVisible: showEditProjectDropdown,
        tagDropdownVisible: showEditTagDropdown,
        tagInputValue: editTaskTagInput,
        filteredProjects: getFilteredProjects(editData.project),
        filteredTags: getFilteredTags(editTaskTagInput, editData.tags || []),
        autoSchedule: editTaskAutoSchedule,
        onChange: handleEditChange,
        onProjectFocus: () => setShowEditProjectDropdown(true),
        onProjectBlur: () => setTimeout(() => setShowEditProjectDropdown(false), 200),
        onTagFocus: () => setShowEditTagDropdown(true),
        onTagBlur: () => setTimeout(() => setShowEditTagDropdown(false), 200),
        onProjectSelect: handleEditProjectSelect,
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
            case 'High':
                return '#dc3545';
            case 'Medium':
                return '#f0ad4e';
            case 'Low':
                return '#28a745';
            default:
                return '#3fb0ba';
        }
    };

    const getTaskCalendarColor = (task) => {
        return getProjectColor(task?.project) || getPriorityColor(task?.priority);
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

    const periodLabel = useMemo(() => {
        if (viewType === 'month') {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        if (viewType === 'day') {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }, [currentDate, viewType]);

    const sectionTitle = 'Calendar Overview';

    const sectionSubtitle = `${visibleTasks.length} active task${visibleTasks.length === 1 ? '' : 's'} - ${completedTasks.length} completed`;

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
                                                    onClick={() => setSelectedTask(task)}
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
        const dayHours = Array.from({ length: totalHours }, (_, idx) => DAY_VIEW_START_HOUR + idx);
        const weekHourBoundaries = Array.from({ length: totalHours + 1 }, (_, idx) => DAY_VIEW_START_HOUR + idx);

        return (
            <div className="week-view">
                <div className="week-timeline-wrap">
                    <div className="week-time-labels" style={{ height: `${dayHeight + WEEK_VIEW_TOP_OFFSET}px` }}>
                        <div className="week-time-offset" style={{ height: `${WEEK_VIEW_TOP_OFFSET}px` }} aria-hidden="true" />
                        {dayHours.map((hour) => (
                            <div key={`week-hour-${hour}`} className="week-time-label" style={{ height: `${WEEK_VIEW_HOUR_HEIGHT}px` }}>
                                {formatHourLabel(hour)}
                            </div>
                        ))}
                        <div className="week-time-label week-time-label-end">{formatHourBoundaryLabel(DAY_VIEW_END_HOUR + 1)}</div>
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
                                                        onClick={() => setSelectedTask(task)}
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
                                                onClick={() => setSelectedTask(entry.task)}
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
                    <div className="day-view-month">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
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
                                    onClick={() => setSelectedTask(task)}
                                                        style={{ borderLeftColor: getTaskCalendarColor(task) }}
                                >
                                    <span className="day-unscheduled-name">{task.taskName}</span>
                                    <span className="day-unscheduled-meta">{task.priority || 'No priority'} - {task.timeToComplete || 'No estimate'}</span>
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
                                <div className="day-current-time-label" style={{ top: `${dayViewData.currentTimeTop}px` }}>
                                    {dayViewData.currentTimeLabel}
                                </div>
                                <div className="day-current-time-line" style={{ top: `${dayViewData.currentTimeTop}px` }} />
                            </>
                        )}

                        {dayViewData.scheduledEntries.map((entry) => (
                            <button
                                type="button"
                                key={entry.task.taskId}
                                className="day-task-block"
                                onClick={() => setSelectedTask(entry.task)}
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
            <div className="task-view-container">
                <div className="task-content">
                    <div className="task-layout task-layout-loading">
                        <aside className="project-sidebar task-loading-sidebar" />
                        <div className="task-main-panel loading loading-panel">Loading calendar...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="task-view-container calendar-view-container">
            <div className="task-content">
                <div className={`task-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                    <aside className={`project-sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
                        <button
                            type="button"
                            className="sidebar-collapse-button"
                            onClick={() => setIsSidebarCollapsed((prev) => !prev)}
                            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            {isSidebarCollapsed ? '>' : '<'}
                        </button>

                        {!isSidebarCollapsed && (
                            <div className="project-sidebar-main">
                                <div className="project-section">
                                    <p className="project-sidebar-eyebrow">Tasks by Deadline</p>
                                    <div className="calendar-sidebar-task-list">
                                        {sidebarTasks.length > 0 ? sidebarTasks.map((task) => (
                                            <TaskListItem
                                                key={`sidebar-${task.taskId}`}
                                                task={task}
                                                className="calendar-sidebar-task"
                                                getProjectName={getProjectName}
                                                getTagNames={getTagNames}
                                                onSelect={setSelectedTask}
                                                showCheckbox={false}
                                                showTags={false}
                                                showActions={false}
                                                showDateTime={false}
                                                metaItems={[
                                                    `Project: ${getProjectName(task.project) || 'Uncategorized'}`,
                                                    `Priority: ${task.priority || 'No priority'}`,
                                                    `Deadline: ${formatDeadlineLabel(task.deadline)}`,
                                                ]}
                                                metaSeparator=" | "
                                            />
                                        )) : <p className="project-empty-state">No active tasks in this filter.</p>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>

                    <div className="task-main-panel">
                        {error && <div className="error-message">{error}</div>}

                        <div className="task-section-header calendar-section-header">
                            <div className="task-title-group">
                                <div className="task-section-title"><span>{sectionTitle}</span></div>
                                <div className="task-section-subtitle">{sectionSubtitle}</div>
                            </div>

                            <div className="calendar-nav-controls">
                                <button type="button" className="calendar-nav-button" onClick={handlePrevious}>Previous</button>
                                <button type="button" className="calendar-nav-button calendar-nav-button-primary" onClick={() => setCurrentDate(new Date())}>Today</button>
                                <button type="button" className="calendar-nav-button" onClick={handleNext}>Next</button>
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
                            <div className="view-type-selector">
                                <button type="button" className={`view-btn ${viewType === 'day' ? 'active' : ''}`} onClick={() => setViewType('day')}>Day</button>
                                <button type="button" className={`view-btn ${viewType === 'week' ? 'active' : ''}`} onClick={() => setViewType('week')}>Week</button>
                                <button type="button" className={`view-btn ${viewType === 'month' ? 'active' : ''}`} onClick={() => setViewType('month')}>Month</button>
                            </div>
                            <div className="month-year"><h2>{periodLabel}</h2></div>
                        </div>

                        {visibleTasks.length === 0 && (
                            <div className="empty-task-state calendar-empty-state">
                                <h3>No tasks in this calendar filter</h3>
                                <p>Adjust the date, view, or project checkboxes.</p>
                            </div>
                        )}
                        <div className="calendar-grid-wrap">
                            {viewType === 'month' ? renderMonthView() : viewType === 'week' ? renderWeekView() : renderDayView()}
                        </div>
                    </div>
                </div>
            </div>

            {selectedTask && (
                <div className="modal-overlay" onClick={closeSelectedTaskModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="modal-close" onClick={closeSelectedTaskModal}>x</button>
                        <h3>{selectedTask.taskName}</h3>
                        {isEditingTask ? (
                            <TaskEditorPanel {...getCalendarEditorProps()} />
                        ) : (
                            <>
                                <div className="task-details">
                                    <div className="detail-item"><strong>Deadline:</strong> {selectedTask.deadline || 'No date'}</div>
                                    <div className="detail-item"><strong>Time to Complete:</strong> {selectedTask.timeToComplete || 'No estimate'}</div>
                                    <div className="detail-item"><strong>Start:</strong> {selectedTask.startTime || 'Unscheduled'}</div>
                                    <div className="detail-item"><strong>End:</strong> {selectedTask.endTime || 'Unscheduled'}</div>
                                    <div className="detail-item">
                                        <strong>Priority:</strong>
                                        <span className="priority-badge" style={{ backgroundColor: getTaskCalendarColor(selectedTask) }}>
                                            {selectedTask.priority || 'No priority'}
                                        </span>
                                    </div>
                                    <div className="detail-item"><strong>Project:</strong> {getProjectName(selectedTask.project) || 'Uncategorized'}</div>
                                    <div className="detail-item"><strong>Tags:</strong> {getTagNames(selectedTask.tags).join(', ') || 'None'}</div>
                                    {selectedTask.comments ? <div className="detail-item"><strong>Comments:</strong> {selectedTask.comments}</div> : null}
                                </div>
                                <div className="task-editor-actions calendar-modal-actions">
                                    <button type="button" className="btn-edit" onClick={startEditingSelectedTask}>Edit Task</button>
                                    <button type="button" className="btn-save" onClick={() => handleCompleteTask(selectedTask.taskId)}>Complete</button>
                                    <button type="button" className="btn-delete" onClick={() => handleDeleteTask(selectedTask.taskId)}>Delete</button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarView;
