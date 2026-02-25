import axios from 'axios';
import { useEffect, useState } from 'react';
import '../styles/TaskView.css';

function TaskView({ user }) {
    const [tasks, setTasks] = useState([]);
    const [completedTasks, setCompletedTasks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [sortBy, setSortBy] = useState('deadline'); // 'deadline', 'project', 'priority'
    const [newTask, setNewTask] = useState({
        taskName: '',
        deadline: '',
        timeToComplete: '',
        priority: '',
        project: '',
        tags: '',
        subtask: '',
        comments: ''
    });

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // Generate time options: 15 minute increments up to 3 hours, then 30 minute increments
    const generateTimeOptions = () => {
        const options = [];

        // 15-minute increments from 15 minutes to 3 hours (180 minutes)
        for (let minutes = 15; minutes <= 180; minutes += 15) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const label = mins === 0 ? `${hours} hour${hours > 1 ? 's' : ''}` : `${hours}h ${mins}m`;
            options.push({ value: `${hours}h ${mins}m`, label });
        }

        // 30-minute increments from 3.5 hours to 8 hours (210 to 480 minutes)
        for (let minutes = 210; minutes <= 480; minutes += 30) {
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            const label = mins === 0 ? `${hours} hours` : `${hours}h ${mins}m`;
            options.push({ value: `${hours}h ${mins}m`, label });
        }

        return options;
    };

    const timeOptions = generateTimeOptions();

    // Create auth config from stored credentials
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

    // Fetch all tasks on component mount and when user changes
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
            setError(null);
            const res = await axios.get(`${backendUrl}/api/tasks/completed`, getAuthConfig());
            setCompletedTasks(res.data || []);
        } catch (err) {
            setError('Failed to fetch completed tasks: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleEdit = (task) => {
        setEditingId(task.taskId);
        setEditData({ ...task });
    };

    const handleSaveEdit = async (taskId) => {
        try {
            setError(null);
            await axios.put(`${backendUrl}/api/tasks`, editData, getAuthConfig());
            setTasks(tasks.map(t => t.taskId === taskId ? editData : t));
            setEditingId(null);
            setEditData({});
        } catch (err) {
            setError('Failed to update task: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleDelete = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this task?')) {
            return;
        }
        try {
            setError(null);
            await axios.delete(`${backendUrl}/api/tasks/${taskId}`, getAuthConfig());
            setTasks(tasks.filter(t => t.taskId !== taskId));
        } catch (err) {
            setError('Failed to delete task: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleCompleteTask = async (taskId) => {
        try {
            setError(null);
            const res = await axios.put(`${backendUrl}/api/tasks/${taskId}/complete`, {}, getAuthConfig());
            setTasks(tasks.filter(t => t.taskId !== taskId));
            setCompletedTasks([...completedTasks, res.data]);
        } catch (err) {
            setError('Failed to complete task: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleReopenTask = async (taskId) => {
        try {
            setError(null);
            const res = await axios.put(`${backendUrl}/api/tasks/${taskId}/reopen`, {}, getAuthConfig());
            setCompletedTasks(completedTasks.filter(t => t.taskId !== taskId));
            setTasks([...tasks, res.data]);
        } catch (err) {
            setError('Failed to reopen task: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleDeleteCompleted = async (taskId) => {
        if (!window.confirm('Are you sure you want to delete this completed task?')) {
            return;
        }
        try {
            setError(null);
            await axios.delete(`${backendUrl}/api/tasks/${taskId}`, getAuthConfig());
            setCompletedTasks(completedTasks.filter(t => t.taskId !== taskId));
        } catch (err) {
            setError('Failed to delete task: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const validateTask = (task) => {
        if (!task.taskName.trim()) return 'Task name is required';
        if (!task.deadline.trim()) return 'Deadline is required';
        if (!task.timeToComplete.trim()) return 'Time to complete is required';
        if (!task.priority.trim()) return 'Priority is required';
        if (!task.project.trim()) return 'Project is required';
        return null;
    };

    const handleCreateTask = async () => {
        const validationError = validateTask(newTask);
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setError(null);
            const taskToCreate = {
                taskId: `task_${Date.now()}`,
                taskName: newTask.taskName,
                deadline: newTask.deadline,
                timeToComplete: newTask.timeToComplete,
                priority: newTask.priority,
                project: newTask.project,
                tags: newTask.tags,
                subtask: newTask.subtask,
                comments: newTask.comments
            };

            const res = await axios.post(`${backendUrl}/api/tasks`, taskToCreate, getAuthConfig());
            setTasks([...tasks, res.data]);
            setNewTask({
                taskName: '',
                deadline: '',
                timeToComplete: '',
                priority: '',
                project: '',
                tags: '',
                subtask: '',
                comments: ''
            });
        } catch (err) {
            setError('Failed to create task: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleNewTaskChange = (field, value) => {
        setNewTask(prev => ({ ...prev, [field]: value }));
    };

    const handleEditChange = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const sortTasks = (tasksToSort) => {
        const sorted = [...tasksToSort];
        sorted.sort((a, b) => {
            if (sortBy === 'deadline') {
                // Parse dates properly - handle YYYY-MM-DD format
                const dateA = a.deadline ? new Date(a.deadline) : new Date(0);
                const dateB = b.deadline ? new Date(b.deadline) : new Date(0);
                return dateA - dateB;
            } else if (sortBy === 'project') {
                const projectA = (a.project || '').toLowerCase();
                const projectB = (b.project || '').toLowerCase();
                return projectA.localeCompare(projectB);
            } else if (sortBy === 'priority') {
                const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 };
                const orderA = priorityOrder[a.priority] !== undefined ? priorityOrder[a.priority] : 3;
                const orderB = priorityOrder[b.priority] !== undefined ? priorityOrder[b.priority] : 3;
                return orderA - orderB;
            }
            return 0;
        });
        return sorted;
    };

    if (loading) {
        return <div className="loading">Loading tasks...</div>;
    }

    const sortedTasks = sortTasks(tasks);

    return (
        <div className="task-view-container">
            {/* Header Section */}
            <div className="task-header">
                <h1>Task Management</h1>
                <p>Organize, prioritize, and track your tasks efficiently</p>
            </div>

            {/* Content Section */}
            <div className="task-content">
                {error && <div className="error-message">{error}</div>}

                {/* Active Tasks Section */}
                <div>
                    <div className="task-section-title">
                        <span>Active Tasks</span>
                        <div className="sort-controls">
                            <label htmlFor="sort-select">Sort by:</label>
                            <select
                                id="sort-select"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="deadline">Deadline</option>
                                <option value="priority">Priority</option>
                                <option value="project">Project</option>
                            </select>
                        </div>
                    </div>

                    <div className="tasks-container">
                        {sortedTasks.map(task => (
                            <div key={task.taskId} className={`task-card ${editingId === task.taskId ? 'editing' : ''}`}>
                                <div className="task-card-header">
                                    <input
                                        type="checkbox"
                                        className="task-checkbox"
                                        checked={task.isCompleted || false}
                                        onChange={() => handleCompleteTask(task.taskId)}
                                        title="Mark task as complete"
                                    />
                                    {editingId === task.taskId ? (
                                        <input
                                            type="text"
                                            className="task-title"
                                            value={editData.taskName}
                                            onChange={(e) => handleEditChange('taskName', e.target.value)}
                                        />
                                    ) : (
                                        <h3 className="task-title">{task.taskName}</h3>
                                    )}
                                </div>

                                <div className="task-card-body">
                                    <div className="task-field">
                                        <label>Deadline</label>
                                        {editingId === task.taskId ? (
                                            <input
                                                type="date"
                                                value={editData.deadline}
                                                onChange={(e) => handleEditChange('deadline', e.target.value)}
                                            />
                                        ) : (
                                            <div className="task-field-value">{task.deadline}</div>
                                        )}
                                    </div>

                                    <div className="task-field">
                                        <label>Time to Complete</label>
                                        {editingId === task.taskId ? (
                                            <select
                                                value={editData.timeToComplete}
                                                onChange={(e) => handleEditChange('timeToComplete', e.target.value)}
                                            >
                                                <option value="">Select Time</option>
                                                {timeOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div className="task-field-value">{task.timeToComplete}</div>
                                        )}
                                    </div>

                                    <div className="task-field">
                                        <label>Priority</label>
                                        {editingId === task.taskId ? (
                                            <select
                                                value={editData.priority}
                                                onChange={(e) => handleEditChange('priority', e.target.value)}
                                            >
                                                <option value="">Select Priority</option>
                                                <option value="Low">Low</option>
                                                <option value="Medium">Medium</option>
                                                <option value="High">High</option>
                                            </select>
                                        ) : (
                                            <div className="task-field-value">{task.priority}</div>
                                        )}
                                    </div>

                                    <div className="task-field">
                                        <label>Project</label>
                                        {editingId === task.taskId ? (
                                            <input
                                                type="text"
                                                value={editData.project}
                                                onChange={(e) => handleEditChange('project', e.target.value)}
                                            />
                                        ) : (
                                            <div className="task-field-value">{task.project}</div>
                                        )}
                                    </div>

                                    <div className="task-field">
                                        <label>Tags</label>
                                        {editingId === task.taskId ? (
                                            <input
                                                type="text"
                                                value={editData.tags}
                                                onChange={(e) => handleEditChange('tags', e.target.value)}
                                            />
                                        ) : (
                                            <div className="task-field-value">{task.tags}</div>
                                        )}
                                    </div>

                                    <div className="task-field">
                                        <label>Subtask</label>
                                        {editingId === task.taskId ? (
                                            <input
                                                type="text"
                                                value={editData.subtask}
                                                onChange={(e) => handleEditChange('subtask', e.target.value)}
                                            />
                                        ) : (
                                            <div className="task-field-value">{task.subtask}</div>
                                        )}
                                    </div>

                                    <div className="task-field">
                                        <label>Comments</label>
                                        {editingId === task.taskId ? (
                                            <textarea
                                                value={editData.comments}
                                                onChange={(e) => handleEditChange('comments', e.target.value)}
                                            />
                                        ) : (
                                            <div className="task-field-value">{task.comments}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="task-card-actions">
                                    {editingId === task.taskId ? (
                                        <>
                                            <button className="btn-save" onClick={() => handleSaveEdit(task.taskId)}>
                                                Save
                                            </button>
                                            <button className="btn-cancel" onClick={handleCancel}>
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button className="btn-edit" onClick={() => handleEdit(task)}>
                                                Edit
                                            </button>
                                            <button className="btn-delete" onClick={() => handleDelete(task.taskId)}>
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* New Task Card */}
                        <div className="new-task-card">
                            <h3 className="new-task-card-title">+ Add New Task</h3>
                            <div className="new-task-body">
                                <div className="task-field">
                                    <label>Task Name *</label>
                                    <input
                                        type="text"
                                        value={newTask.taskName}
                                        onChange={(e) => handleNewTaskChange('taskName', e.target.value)}
                                        placeholder="Enter task name"
                                    />
                                </div>
                                <div className="task-field">
                                    <label>Deadline *</label>
                                    <input
                                        type="date"
                                        value={newTask.deadline}
                                        onChange={(e) => handleNewTaskChange('deadline', e.target.value)}
                                    />
                                </div>
                                <div className="task-field">
                                    <label>Time to Complete *</label>
                                    <select
                                        value={newTask.timeToComplete}
                                        onChange={(e) => handleNewTaskChange('timeToComplete', e.target.value)}
                                    >
                                        <option value="">Select Time</option>
                                        {timeOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="task-field">
                                    <label>Priority *</label>
                                    <select
                                        value={newTask.priority}
                                        onChange={(e) => handleNewTaskChange('priority', e.target.value)}
                                    >
                                        <option value="">Select Priority</option>
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                    </select>
                                </div>
                                <div className="task-field">
                                    <label>Project *</label>
                                    <input
                                        type="text"
                                        value={newTask.project}
                                        onChange={(e) => handleNewTaskChange('project', e.target.value)}
                                        placeholder="Enter project name"
                                    />
                                </div>
                                <div className="task-field">
                                    <label>Tags</label>
                                    <input
                                        type="text"
                                        value={newTask.tags}
                                        onChange={(e) => handleNewTaskChange('tags', e.target.value)}
                                        placeholder="e.g., work, urgent"
                                    />
                                </div>
                                <div className="task-field">
                                    <label>Subtask</label>
                                    <input
                                        type="text"
                                        value={newTask.subtask}
                                        onChange={(e) => handleNewTaskChange('subtask', e.target.value)}
                                        placeholder="Enter subtask"
                                    />
                                </div>
                                <div className="task-field">
                                    <label>Comments</label>
                                    <textarea
                                        value={newTask.comments}
                                        onChange={(e) => handleNewTaskChange('comments', e.target.value)}
                                        placeholder="Add any comments or notes"
                                    />
                                </div>
                            </div>
                            <button className="btn-add" onClick={handleCreateTask}>
                                Create Task
                            </button>
                        </div>
                    </div>
                </div>

                {/* Completed Tasks Section */}
                {completedTasks.length > 0 && (
                    <div className="completed-tasks-section">
                        <h2 className="task-section-title">Completed Tasks</h2>
                        <div className="completed-tasks-grid">
                            {completedTasks.map(task => (
                                <div key={task.taskId} className="completed-task-card">
                                    <div>
                                        <h3 className="completed-task-title">{task.taskName}</h3>
                                        <div className="completed-task-info">
                                            <div><strong>Deadline:</strong> {task.deadline}</div>
                                            <div><strong>Priority:</strong> {task.priority}</div>
                                            <div><strong>Project:</strong> {task.project}</div>
                                        </div>
                                    </div>
                                    <div className="completed-task-actions">
                                        <button
                                            className="btn-reopen"
                                            onClick={() => handleReopenTask(task.taskId)}
                                        >
                                            Reopen
                                        </button>
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDeleteCompleted(task.taskId)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TaskView;
