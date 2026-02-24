import axios from 'axios';
import { useEffect, useState } from 'react';
import '../styles/TaskView.css';

function TaskView({ user }) {
    const [tasks, setTasks] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
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

    if (loading) {
        return <div className="loading">Loading tasks...</div>;
    }

    return (
        <div className="task-view-container">
            {error && <div className="error-message">{error}</div>}

            <div className="table-wrapper">
                <table className="task-table">
                    <thead>
                        <tr>
                            <th>Task Name</th>
                            <th>Deadline</th>
                            <th>Completion Time</th>
                            <th>Priority</th>
                            <th>Project</th>
                            <th>Tags</th>
                            <th>Subtask</th>
                            <th>Comments</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map(task => (
                            <tr key={task.taskId} className={editingId === task.taskId ? 'editing' : ''}>
                                <td>
                                    {editingId === task.taskId ? (
                                        <input
                                            type="text"
                                            value={editData.taskName}
                                            onChange={(e) => handleEditChange('taskName', e.target.value)}
                                        />
                                    ) : (
                                        task.taskName
                                    )}
                                </td>
                                <td>
                                    {editingId === task.taskId ? (
                                        <input
                                            type="date"
                                            value={editData.deadline}
                                            onChange={(e) => handleEditChange('deadline', e.target.value)}
                                        />
                                    ) : (
                                        task.deadline
                                    )}
                                </td>
                                <td>
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
                                        task.timeToComplete
                                    )}
                                </td>
                                <td>
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
                                        task.priority
                                    )}
                                </td>
                                <td>
                                    {editingId === task.taskId ? (
                                        <input
                                            type="text"
                                            value={editData.project}
                                            onChange={(e) => handleEditChange('project', e.target.value)}
                                        />
                                    ) : (
                                        task.project
                                    )}
                                </td>
                                <td>
                                    {editingId === task.taskId ? (
                                        <input
                                            type="text"
                                            value={editData.tags}
                                            onChange={(e) => handleEditChange('tags', e.target.value)}
                                        />
                                    ) : (
                                        task.tags
                                    )}
                                </td>
                                <td>
                                    {editingId === task.taskId ? (
                                        <input
                                            type="text"
                                            value={editData.subtask}
                                            onChange={(e) => handleEditChange('subtask', e.target.value)}
                                        />
                                    ) : (
                                        task.subtask
                                    )}
                                </td>
                                <td>
                                    {editingId === task.taskId ? (
                                        <input
                                            type="text"
                                            value={editData.comments}
                                            onChange={(e) => handleEditChange('comments', e.target.value)}
                                        />
                                    ) : (
                                        task.comments
                                    )}
                                </td>
                                <td className="actions">
                                    {editingId === task.taskId ? (
                                        <>
                                            <button
                                                className="btn-save"
                                                onClick={() => handleSaveEdit(task.taskId)}
                                            >
                                                Save
                                            </button>
                                            <button
                                                className="btn-cancel"
                                                onClick={handleCancel}
                                            >
                                                Cancel
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className="btn-edit"
                                                onClick={() => handleEdit(task)}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                className="btn-delete"
                                                onClick={() => handleDelete(task.taskId)}
                                            >
                                                Delete
                                            </button>
                                        </>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {/* New Task Row */}
                        <tr className="new-task-row">
                            <td>
                                <input
                                    type="text"
                                    value={newTask.taskName}
                                    onChange={(e) => handleNewTaskChange('taskName', e.target.value)}
                                    placeholder="Enter task name"
                                />
                            </td>
                            <td>
                                <input
                                    type="date"
                                    value={newTask.deadline}
                                    onChange={(e) => handleNewTaskChange('deadline', e.target.value)}
                                />
                            </td>
                            <td>
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
                            </td>
                            <td>
                                <select
                                    value={newTask.priority}
                                    onChange={(e) => handleNewTaskChange('priority', e.target.value)}
                                >
                                    <option value="">Select Priority</option>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                </select>
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={newTask.project}
                                    onChange={(e) => handleNewTaskChange('project', e.target.value)}
                                    placeholder="Project"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={newTask.tags}
                                    onChange={(e) => handleNewTaskChange('tags', e.target.value)}
                                    placeholder="Tags"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={newTask.subtask}
                                    onChange={(e) => handleNewTaskChange('subtask', e.target.value)}
                                    placeholder="Subtask"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={newTask.comments}
                                    onChange={(e) => handleNewTaskChange('comments', e.target.value)}
                                    placeholder="Comments"
                                />
                            </td>
                            <td className="actions">
                                <button
                                    className="btn-add"
                                    onClick={handleCreateTask}
                                >
                                    Add Task
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default TaskView;
