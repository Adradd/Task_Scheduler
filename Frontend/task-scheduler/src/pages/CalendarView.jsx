import axios from 'axios';
import { useEffect, useState } from 'react';
import '../styles/CalendarView.css';

function CalendarView({ user }) {
    const [tasks, setTasks] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 25)); // February 25, 2026
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [completedTasks, setCompletedTasks] = useState([]);

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
        const height = Math.max(30, (minutes / 60) * 60);
        return height;
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

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date(2026, 1, 25));
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
    }

    if (loading) {
        return <div className="loading">Loading calendar...</div>;
    }

    return (
        <div className="calendar-view-container">
            <div className="calendar-header">
                <h1>Calendar View</h1>
                <p>Visualize your tasks and deadlines</p>
            </div>

            <div className="calendar-content">
                {error && <div className="error-message">{error}</div>}

                <div className="calendar-controls">
                    <button className="btn-nav" onClick={handlePrevMonth}>← Previous</button>
                    <div className="month-year">
                        <h2>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
                    </div>
                    <button className="btn-nav" onClick={handleNextMonth}>Next →</button>
                    <button className="btn-today" onClick={handleToday}>Today</button>
                </div>

                <div className="calendar-grid">
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
