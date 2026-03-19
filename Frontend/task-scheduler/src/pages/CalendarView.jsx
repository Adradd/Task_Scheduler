import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import '../styles/TaskView.css';
import '../styles/CalendarView.css';

function CalendarView({ user }) {
    const [tasks, setTasks] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [viewType, setViewType] = useState('month');
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [projectVisibility, setProjectVisibility] = useState({});
    const [availableProjects, setAvailableProjects] = useState([]);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

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

    const todayKey = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }, []);

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

            const [activeRes, completedRes, projectsRes] = await Promise.all([
                axios.get(`${backendUrl}/api/tasks`, getAuthConfig()),
                axios.get(`${backendUrl}/api/tasks/completed`, getAuthConfig()),
                axios.get(`${backendUrl}/api/projects`, getAuthConfig()),
            ]);

            setTasks((activeRes.data || []).map(normalizeTask));
            setCompletedTasks((completedRes.data || []).map(normalizeTask));
            const projectNames = [...new Set((projectsRes.data || []).map((project) => project?.projectName).filter(Boolean))];
            setAvailableProjects(projectNames);
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

    const getTasksForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return visibleTasks.filter((task) => task.deadline === dateStr);
    };

    const getTasksForWeek = (startDate) => {
        const weekTasks = {};
        for (let i = 0; i < 7; i += 1) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            weekTasks[dateStr] = visibleTasks.filter((task) => task.deadline === dateStr);
        }
        return weekTasks;
    };

    const toggleProjectVisibility = (projectName) => {
        setProjectVisibility((prev) => ({
            ...prev,
            [projectName]: !(prev[projectName] ?? true),
        }));
    };

    const getTimeToCompleteInMinutes = (timeStr) => {
        if (!timeStr) return 30;
        const hourMinute = timeStr.match(/(\d+)h\s*(\d+)m/);
        const hoursOnly = timeStr.match(/(\d+)\s*hour/);

        if (hourMinute) {
            return Number(hourMinute[1]) * 60 + Number(hourMinute[2]);
        }
        if (hoursOnly) {
            return Number(hoursOnly[1]) * 60;
        }
        return 30;
    };

    const getTaskHeight = (timeStr) => {
        const minutes = getTimeToCompleteInMinutes(timeStr);
        return Math.max(28, (minutes / 60) * 42);
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

    const handlePrevious = () => {
        const nextDate = new Date(currentDate);
        if (viewType === 'week') {
            nextDate.setDate(nextDate.getDate() - 7);
        } else {
            nextDate.setMonth(nextDate.getMonth() - 1);
        }
        setCurrentDate(nextDate);
    };

    const handleNext = () => {
        const nextDate = new Date(currentDate);
        if (viewType === 'week') {
            nextDate.setDate(nextDate.getDate() + 7);
        } else {
            nextDate.setMonth(nextDate.getMonth() + 1);
        }
        setCurrentDate(nextDate);
    };

    const periodLabel = useMemo(() => {
        if (viewType === 'month') {
            return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
        }
        const weekStart = getWeekStart(currentDate);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    }, [currentDate, viewType]);

    const sectionTitle = 'Calendar Overview';

    const sectionSubtitle = `${visibleTasks.length} active task${visibleTasks.length === 1 ? '' : 's'} - ${completedTasks.length} completed`;

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
                        const isToday = date.toISOString().split('T')[0] === todayKey;

                        return (
                            <div key={day} className={`calendar-day ${isToday ? 'today' : ''}`}>
                                <div className="day-number">{day}</div>
                                <div className="day-tasks">
                                    {dayTasks.map((task) => (
                                        <button
                                            type="button"
                                            key={task.taskId}
                                            className="task-event"
                                            style={{ backgroundColor: getPriorityColor(task.priority), minHeight: `${getTaskHeight(task.timeToComplete)}px` }}
                                            onClick={() => setSelectedTask(task)}
                                        >
                                            <span className="task-event-title">{task.taskName}</span>
                                            <span className="task-event-time">{task.timeToComplete || 'No estimate'}</span>
                                        </button>
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
        const weekTasks = getTasksForWeek(weekStart);

        return (
            <div className="week-view">
                <div className="week-view-grid">
                    {dayNames.map((dayName, index) => {
                        const date = new Date(weekStart);
                        date.setDate(date.getDate() + index);
                        const dateStr = date.toISOString().split('T')[0];
                        const dateTasks = weekTasks[dateStr] || [];
                        const isToday = dateStr === todayKey;

                        return (
                            <div key={dayName} className={`week-day-column ${isToday ? 'today' : ''}`}>
                                <div className="week-day-header">
                                    <div className="week-day-name">{dayName}</div>
                                    <div className="week-day-date">{date.getDate()}</div>
                                </div>
                                <div className="week-day-tasks">
                                    {dateTasks.map((task) => (
                                        <button
                                            type="button"
                                            key={task.taskId}
                                            className="week-task-event"
                                            style={{ backgroundColor: getPriorityColor(task.priority), minHeight: `${Math.max(24, getTaskHeight(task.timeToComplete) / 2)}px` }}
                                            onClick={() => setSelectedTask(task)}
                                        >
                                            <span className="task-event-title">{task.taskName}</span>
                                            <span className="task-event-time">{task.timeToComplete || 'No estimate'}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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
                                    <p className="project-sidebar-eyebrow">Projects</p>
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
                            <div className="view-type-selector">
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
                            {viewType === 'month' ? renderMonthView() : renderWeekView()}
                        </div>
                    </div>
                </div>
            </div>

            {selectedTask && (
                <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button type="button" className="modal-close" onClick={() => setSelectedTask(null)}>x</button>
                        <h3>{selectedTask.taskName}</h3>
                        <div className="task-details">
                            <div className="detail-item"><strong>Deadline:</strong> {selectedTask.deadline || 'No date'}</div>
                            <div className="detail-item"><strong>Time to Complete:</strong> {selectedTask.timeToComplete || 'No estimate'}</div>
                            <div className="detail-item">
                                <strong>Priority:</strong>
                                <span className="priority-badge" style={{ backgroundColor: getPriorityColor(selectedTask.priority) }}>
                                    {selectedTask.priority || 'No priority'}
                                </span>
                            </div>
                            <div className="detail-item"><strong>Project:</strong> {getProjectName(selectedTask.project) || 'Uncategorized'}</div>
                            <div className="detail-item"><strong>Tags:</strong> {getTagNames(selectedTask.tags).join(', ') || 'None'}</div>
                            {selectedTask.comments ? <div className="detail-item"><strong>Comments:</strong> {selectedTask.comments}</div> : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarView;
