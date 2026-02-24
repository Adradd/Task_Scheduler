import axios from 'axios';
import { useEffect, useState } from 'react';
import '../styles/TaskView.css';

function TaskView() {
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
    const authConfig = {
        auth: { username: 'user', password: 'password' }
    };

    // Fetch all tasks on component mount
    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${backendUrl}/api/tasks`, authConfig);
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
            await axios.put(`${backendUrl}/api/tasks`, editData, authConfig);
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
            await axios.delete(`${backendUrl}/api/tasks/${taskId}`, authConfig);
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

            const res = await axios.post(`${backendUrl}/api/tasks`, taskToCreate, authConfig);
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
                                            type="text"
                                            value={editData.deadline}
                                            onChange={(e) => handleEditChange('deadline', e.target.value)}
                                            placeholder="DD-MM-YYYY"
                                        />
                                    ) : (
                                        task.deadline
                                    )}
                                </td>
                                <td>
                                    {editingId === task.taskId ? (
                                        <input
                                            type="text"
                                            value={editData.timeToComplete}
                                            onChange={(e) => handleEditChange('timeToComplete', e.target.value)}
                                        />
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
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
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
                                    type="text"
                                    value={newTask.deadline}
                                    onChange={(e) => handleNewTaskChange('deadline', e.target.value)}
                                    placeholder="DD-MM-YYYY"
                                />
                            </td>
                            <td>
                                <input
                                    type="text"
                                    value={newTask.timeToComplete}
                                    onChange={(e) => handleNewTaskChange('timeToComplete', e.target.value)}
                                    placeholder="Time"
                                />
                            </td>
                            <td>
                                <select
                                    value={newTask.priority}
                                    onChange={(e) => handleNewTaskChange('priority', e.target.value)}
                                >
                                    <option value="">Select Priority</option>
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
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
