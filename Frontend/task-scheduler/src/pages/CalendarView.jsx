import axios from 'axios';
import {useEffect, useState} from 'react';
import '../styles/CalendarView.css';

function CalendarView({ user }) {
    const [tasks, setTasks] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 25)); // February 25, 2026
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [viewType, setViewType] = useState('month'); // 'week', 'month'

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const getAuthConfig = () => {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            return {
                headers: {
                    'Authorization': 'Basic ' + authToken
                }
            };
        }
        return {};
    };

    useEffect(() => {
        if (user) {
            fetchTasks();
            fetchCompletedTasks();
        }
    }, [user]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${backendUrl}/api/tasks`, getAuthConfig());
            setTasks(res.data || []);
        } catch (err) {
            setError('Failed to fetch tasks: ' + (err.response?.data?.message || err.message));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCompletedTasks = async () => {
        try {
            const res = await axios.get(`${backendUrl}/api/tasks/completed`, getAuthConfig());
            setCompletedTasks(res.data || []);
        } catch (err) {
            console.error(err);
        }
    };

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const getTasksForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return tasks.filter(task => task.deadline === dateStr);
    };

    const getTasksForWeek = (startDate) => {
        const weekTasks = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            weekTasks[dateStr] = tasks.filter(task => task.deadline === dateStr);
        }
        return weekTasks;
    };

    const getWeekStart = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    };

    const getTimeToCompleteInMinutes = (timeStr) => {
        if (!timeStr) return 30;
        const match = timeStr.match(/(\d+)h\s*(\d+)m/);
        if (match) {
            return parseInt(match[1]) * 60 + parseInt(match[2]);
        }
        return 30;
    };

    const getTaskHeight = (timeStr) => {
        const minutes = getTimeToCompleteInMinutes(timeStr);
        return Math.max(30, (minutes / 60) * 60);
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'High':
                return '#dc3545';
            case 'Medium':
                return '#ffc107';
            case 'Low':
                return '#28a745';
            default:
                return '#3fb0ba';
        }
    };

    const handlePrevious = () => {
        const newDate = new Date(currentDate);
        if (viewType === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const handleNext = () => {
        const newDate = new Date(currentDate);
        if (viewType === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(new Date(2026, 1, 25));
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];


    const renderWeekView = () => {
        const weekStart = getWeekStart(currentDate);
        const weekTasks = getTasksForWeek(weekStart);
        const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

        return (
            <div className="week-view">
                <div className="week-view-header">
                    <h2>
                        Week of {weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </h2>
                </div>
                <div className="week-view-grid">
                    {dayNames.map((dayName, index) => {
                        const date = new Date(weekStart);
                        date.setDate(date.getDate() + index);
                        const dateStr = date.toISOString().split('T')[0];
                        const dayTasks = weekTasks[dateStr] || [];

                        return (
                            <div key={dayName} className="week-day-column">
                                <div className="week-day-header">
                                    <div className="week-day-name">{dayName}</div>
                                    <div className="week-day-date">{date.getDate()}</div>
                                </div>
                                <div className="week-day-tasks">
                                    {dayTasks.map((task) => (
                                        <div
                                            key={task.taskId}
                                            className="week-task-event"
                                            style={{
                                                backgroundColor: getPriorityColor(task.priority),
                                                minHeight: `${getTaskHeight(task.timeToComplete) / 2}px`,
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setSelectedTask(task)}
                                            title={task.taskName}
                                        >
                                            <div className="task-event-title">{task.taskName}</div>
                                            <div className="task-event-time">{task.timeToComplete}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderMonthView = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDayOfMonth = getFirstDayOfMonth(currentDate);
        const days = [];

        for (let i = 0; i < firstDayOfMonth; i++) {
            days.push(null);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return (
            <div className="month-view">
                <div className="calendar-day-headers">
                    {dayNames.map((day) => (
                        <div key={day} className="calendar-day-header">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="calendar-days">
                    {days.map((day, index) => {
                        if (day === null) {
                            return <div key={`empty-${index}`} className="calendar-day empty"></div>;
                        }

                        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        const dayTasks = getTasksForDate(date);
                        const isToday = date.toDateString() === new Date(2026, 1, 25).toDateString();

                        return (
                            <div
                                key={day}
                                className={`calendar-day ${isToday ? 'today' : ''}`}
                            >
                                <div className="day-number">{day}</div>
                                <div className="day-tasks">
                                    {dayTasks.map((task) => (
                                        <div
                                            key={task.taskId}
                                            className="task-event"
                                            style={{
                                                backgroundColor: getPriorityColor(task.priority),
                                                minHeight: `${getTaskHeight(task.timeToComplete)}px`,
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setSelectedTask(task)}
                                            title={task.taskName}
                                        >
                                            <div className="task-event-title">{task.taskName}</div>
                                            <div className="task-event-time">{task.timeToComplete}</div>
                                        </div>
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
        return <div className="loading">Loading calendar...</div>;
    }

    return (
        <div className="calendar-view-container">
            <div className="calendar-header">
                <h1>My Calendar</h1>
            </div>

            <div className="calendar-content">
                {error && <div className="error-message">{error}</div>}

                <div className="calendar-controls">
                    <button className="btn-nav" onClick={handlePrevious}>← Previous</button>

                    <div className="view-type-selector">
                        <button
                            className={`view-btn ${viewType === 'week' ? 'active' : ''}`}
                            onClick={() => setViewType('week')}
                        >
                            Week
                        </button>
                        <button
                            className={`view-btn ${viewType === 'month' ? 'active' : ''}`}
                            onClick={() => setViewType('month')}
                        >
                            Month
                        </button>
                    </div>

                    <div className="month-year">
                        <h2>
                            {viewType === 'week' && (() => {
                                const weekStart = getWeekStart(currentDate);
                                const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
                                return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                            })()}
                            {viewType === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
                        </h2>
                    </div>

                    <button className="btn-nav" onClick={handleNext}>Next →</button>
                    <button className="btn-today" onClick={handleToday}>Today</button>
                </div>

                <div className="calendar-grid">
                    {viewType === 'week' && renderWeekView()}
                    {viewType === 'month' && renderMonthView()}
                </div>
            </div>

            {selectedTask && (
                <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedTask(null)}>✕</button>
                        <h3>{selectedTask.taskName}</h3>
                        <div className="task-details">
                            <div className="detail-item">
                                <strong>Deadline:</strong> {selectedTask.deadline}
                            </div>
                            <div className="detail-item">
                                <strong>Time to Complete:</strong> {selectedTask.timeToComplete}
                            </div>
                            <div className="detail-item">
                                <strong>Priority:</strong>
                                <span
                                    className="priority-badge"
                                    style={{backgroundColor: getPriorityColor(selectedTask.priority)}}
                                >
                                    {selectedTask.priority}
                                </span>
                            </div>
                            <div className="detail-item">
                                <strong>Project:</strong> {selectedTask.project}
                            </div>
                            {selectedTask.tags && (
                                <div className="detail-item">
                                    <strong>Tags:</strong> {selectedTask.tags}
                                </div>
                            )}
                            {selectedTask.subtask && (
                                <div className="detail-item">
                                    <strong>Subtask:</strong> {selectedTask.subtask}
                                </div>
                            )}
                            {selectedTask.comments && (
                                <div className="detail-item">
                                    <strong>Comments:</strong> {selectedTask.comments}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default CalendarView;
