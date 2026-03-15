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
        tags: [],
        subtask: '',
        comments: ''
    });
    const [availableTags, setAvailableTags] = useState([]);
    const [allTagObjects, setAllTagObjects] = useState([]);
    const [availableProjects, setAvailableProjects] = useState([]);
    const [allProjectObjects, setAllProjectObjects] = useState([]);
    const [showNewTaskTagDropdown, setShowNewTaskTagDropdown] = useState(false);
    const [showEditTagDropdown, setShowEditTagDropdown] = useState(false);
    const [showNewTaskProjectDropdown, setShowNewTaskProjectDropdown] = useState(false);
    const [showEditProjectDropdown, setShowEditProjectDropdown] = useState(false);
    const [newTaskTagInput, setNewTaskTagInput] = useState('');
    const [editTaskTagInput, setEditTaskTagInput] = useState('');

    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // Extract tag names from Tag objects
    const getTagNames = (tags) => {
        if (!Array.isArray(tags)) return [];
        return tags.map(tag => {
            if (typeof tag === 'string') return tag;
            return tag?.tagName || '';
        }).filter(Boolean);
    };

    // Convert tag names to Tag objects
    const tagNameToTagObject = (tagName) => {
        const found = allTagObjects.find(t => t.tagName?.toLowerCase() === tagName?.toLowerCase());
        if (found) {
            return found;
        }
        return { tagName: tagName.trim() };
    };

    const parseTagInput = (value) => {
        if (!value) return [];
        return [...new Set(value.split(',').map(tag => tag.trim()).filter(Boolean))];
    };

    const formatTags = (tags) => {
        if (!Array.isArray(tags) || tags.length === 0) return '';
        const tagNames = getTagNames(tags);
        return tagNames.join(', ');
    };

    const projectToProjectName = (project) => {
        if (!project) return '';
        if (typeof project === 'string') return project;
        return project?.projectName || '';
    };

    const projectNameToProjectObject = (projectName) => {
        const found = allProjectObjects.find(p => p.projectName?.toLowerCase() === projectName?.toLowerCase());
        if (found) {
            return found;
        }
        return { projectName: projectName.trim() };
    };

    const normalizeTask = (task) => ({
        ...task,
        project: task?.project || null,
        tags: Array.isArray(task?.tags) ? task.tags : []
    });

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
    const getAuthConfig = () => { // TODO: split out & use shared code
        const authToken = sessionStorage.getItem('authToken');
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
            fetchAvailableTags();
            fetchAvailableProjects();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const fetchAvailableTags = async () => {
        try {
            const res = await axios.get(`${backendUrl}/api/tags`, getAuthConfig());
            const tags = res.data || [];
            setAllTagObjects(tags);
            setAvailableTags(tags.map(tag => tag.tagName));
        } catch (err) {
            console.error('Failed to fetch tags:', err);
        }
    };

    const fetchAvailableProjects = async () => {
        try {
            const res = await axios.get(`${backendUrl}/api/projects`, getAuthConfig());
            const projects = res.data || [];
            setAllProjectObjects(projects);
            setAvailableProjects([...new Set(projects.map(project => project.projectName).filter(Boolean))]);
        } catch (err) {
            console.error('Failed to fetch projects:', err);
        }
    };

    const fetchTasks = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get(`${backendUrl}/api/tasks`, getAuthConfig());
            setTasks((res.data || []).map(normalizeTask));
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
            setCompletedTasks((res.data || []).map(normalizeTask));
        } catch (err) {
            setError('Failed to fetch completed tasks: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleEdit = (task) => {
        setEditingId(task.taskId);
        const normalized = normalizeTask(task);
        // Convert Tag objects to tag name strings for editing
        const tagNames = getTagNames(normalized.tags);
        const editDataWithNames = {
            ...normalized,
            project: projectToProjectName(normalized.project),
            tags: tagNames
        };
        setEditData(editDataWithNames);
        setEditTaskTagInput(formatTags(tagNames));
    };

    const handleSaveEdit = async (taskId) => {
        try {
            setError(null);
            // Convert tag names to Tag objects
            const tagObjects = (editData.tags || []).map(tagName => tagNameToTagObject(tagName));
            const dataToSend = {
                ...editData,
                project: projectNameToProjectObject(editData.project || ''),
                tags: tagObjects
            };

            const res = await axios.put(`${backendUrl}/api/tasks`, dataToSend, getAuthConfig());
            const updatedTask = normalizeTask(res.data || editData);
            setTasks(tasks.map(t => t.taskId === taskId ? updatedTask : t));
            setEditingId(null);
            setEditData({});
            fetchAvailableTags();
            fetchAvailableProjects();
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
            setCompletedTasks([...completedTasks, normalizeTask(res.data)]);
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
            setTasks([...tasks, normalizeTask(res.data)]);
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
            // Convert tag names to Tag objects
            const tagObjects = newTask.tags.map(tagName => tagNameToTagObject(tagName));

            const taskToCreate = {
                taskId: `task_${Date.now()}`,
                taskName: newTask.taskName,
                deadline: newTask.deadline,
                timeToComplete: newTask.timeToComplete,
                priority: newTask.priority,
                project: projectNameToProjectObject(newTask.project),
                tags: tagObjects,
                subtask: newTask.subtask,
                comments: newTask.comments
            };

            const res = await axios.post(`${backendUrl}/api/tasks`, taskToCreate, getAuthConfig());
            setTasks([...tasks, normalizeTask(res.data)]);
            setNewTask({
                taskName: '',
                deadline: '',
                timeToComplete: '',
                priority: '',
                project: '',
                tags: [],
                subtask: '',
                comments: ''
            });
            setNewTaskTagInput('');
            fetchAvailableTags();
            fetchAvailableProjects();
        } catch (err) {
            setError('Failed to create task: ' + (err.response?.data?.message || err.message));
            console.error(err);
        }
    };

    const handleNewTaskChange = (field, value) => {
        if (field === 'tags') {
            setNewTaskTagInput(value);
            setShowNewTaskTagDropdown(value.length > 0);
            // Only parse the input as tags, don't double-format
            setNewTask(prev => ({ ...prev, tags: parseTagInput(value) }));
            return;
        }
        if (field === 'project') {
            setShowNewTaskProjectDropdown(true);
        }
        setNewTask(prev => ({ ...prev, [field]: value }));
    };

    const handleEditChange = (field, value) => {
        if (field === 'tags') {
            setEditTaskTagInput(value);
            setShowEditTagDropdown(value.length > 0);
            // Store tag names as strings internally
            const tagNames = parseTagInput(value).filter(Boolean);
            setEditData(prev => ({ ...prev, tags: tagNames }));
            return;
        }
        if (field === 'project') {
            setShowEditProjectDropdown(true);
        }
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const handleTagSelect = (tagName, isNewTask = true) => {
        if (isNewTask) {
            const currentTags = newTask.tags || [];
            if (!currentTags.includes(tagName)) {
                const updatedTags = [...currentTags, tagName];
                setNewTask(prev => ({ ...prev, tags: updatedTags }));
                // Update the input field to show current input value (clearing the partial match)
                setNewTaskTagInput('');
            }
            setShowNewTaskTagDropdown(false);
        } else {
            const currentTags = editData.tags || [];
            if (!currentTags.includes(tagName)) {
                const updatedTags = [...currentTags, tagName];
                setEditData(prev => ({ ...prev, tags: updatedTags }));
                // Update the input field to show current input value (clearing the partial match)
                setEditTaskTagInput('');
            }
            setShowEditTagDropdown(false);
        }
    };

    const removeTag = (tagToRemove, isNewTask = true) => {
        if (isNewTask) {
            const updatedTags = newTask.tags.filter(tag => tag !== tagToRemove);
            setNewTask(prev => ({ ...prev, tags: updatedTags }));
            setNewTaskTagInput('');
        } else {
            const updatedTags = editData.tags.filter(tag => tag !== tagToRemove);
            setEditData(prev => ({ ...prev, tags: updatedTags }));
            setEditTaskTagInput('');
        }
    };

    const getFilteredTags = (inputValue, currentTags) => {
        const input = inputValue.split(',').pop().trim().toLowerCase();
        if (!input) return availableTags.filter(tag => !currentTags.includes(tag));
        return availableTags.filter(tag =>
            tag.toLowerCase().includes(input) && !currentTags.includes(tag)
        );
    };

    const getFilteredProjects = (inputValue) => {
        const input = (inputValue || '').trim().toLowerCase();
        if (!input) {
            return availableProjects;
        }
        return availableProjects.filter(projectName => projectName.toLowerCase().includes(input));
    };

    const handleProjectSelect = (projectName, isNewTask = true) => {
        if (isNewTask) {
            setNewTask(prev => ({ ...prev, project: projectName }));
            setShowNewTaskProjectDropdown(false);
            return;
        }
        setEditData(prev => ({ ...prev, project: projectName }));
        setShowEditProjectDropdown(false);
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
                const projectA = projectToProjectName(a.project).toLowerCase();
                const projectB = projectToProjectName(b.project).toLowerCase();
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
                <h1>My Tasks</h1>
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
                                            <div className="tag-input-container">
                                                <input
                                                    type="text"
                                                    value={editData.project}
                                                    onChange={(e) => handleEditChange('project', e.target.value)}
                                                    onFocus={() => setShowEditProjectDropdown(true)}
                                                    onBlur={() => setTimeout(() => setShowEditProjectDropdown(false), 200)}
                                                    placeholder="Select or type a project"
                                                />
                                                {showEditProjectDropdown && getFilteredProjects(editData.project).length > 0 && (
                                                    <div className="tag-dropdown">
                                                        {getFilteredProjects(editData.project).map((projectName) => (
                                                            <div
                                                                key={projectName}
                                                                className="tag-dropdown-item"
                                                                onClick={() => handleProjectSelect(projectName, false)}
                                                            >
                                                                {projectName}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="task-field-value">{projectToProjectName(task.project)}</div>
                                        )}
                                    </div>

                                    <div className="task-field">
                                        <label>Tags</label>
                                        {editingId === task.taskId ? (
                                            <div className="tag-input-container">
                                                <div className="tag-chips">
                                                    {editData.tags && editData.tags.map((tag, idx) => (
                                                        <span key={idx} className="tag-chip">
                                                            {tag}
                                                            <button
                                                                type="button"
                                                                className="tag-remove"
                                                                onClick={() => removeTag(tag, false)}
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    value={editTaskTagInput}
                                                    onChange={(e) => handleEditChange('tags', e.target.value)}
                                                    onFocus={() => setShowEditTagDropdown(true)}
                                                    onBlur={() => setTimeout(() => setShowEditTagDropdown(false), 200)}
                                                    placeholder="Add tags (comma-separated)"
                                                />
                                                {showEditTagDropdown && getFilteredTags(editTaskTagInput, editData.tags || []).length > 0 && (
                                                    <div className="tag-dropdown">
                                                        {getFilteredTags(editTaskTagInput, editData.tags || []).map((tag, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="tag-dropdown-item"
                                                                onClick={() => handleTagSelect(tag, false)}
                                                            >
                                                                {tag}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="task-field-value">
                                                {task.tags && task.tags.length > 0 ? (
                                                    <div className="tag-chips-display">
                                                        {getTagNames(task.tags).map((tagName, idx) => (
                                                            <span key={idx} className="tag-chip-display">{tagName}</span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="no-tags">No tags</span>
                                                )}
                                            </div>
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
                                    <div className="tag-input-container">
                                        <input
                                            type="text"
                                            value={newTask.project}
                                            onChange={(e) => handleNewTaskChange('project', e.target.value)}
                                            onFocus={() => setShowNewTaskProjectDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowNewTaskProjectDropdown(false), 200)}
                                            placeholder="Select or type a project"
                                        />
                                        {showNewTaskProjectDropdown && getFilteredProjects(newTask.project).length > 0 && (
                                            <div className="tag-dropdown">
                                                {getFilteredProjects(newTask.project).map((projectName) => (
                                                    <div
                                                        key={projectName}
                                                        className="tag-dropdown-item"
                                                        onClick={() => handleProjectSelect(projectName, true)}
                                                    >
                                                        {projectName}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="task-field">
                                    <label>Tags</label>
                                    <div className="tag-input-container">
                                        <div className="tag-chips">
                                            {newTask.tags && newTask.tags.map((tag, idx) => (
                                                <span key={idx} className="tag-chip">
                                                    {tag}
                                                    <button
                                                        type="button"
                                                        className="tag-remove"
                                                        onClick={() => removeTag(tag, true)}
                                                    >
                                                        ×
                                                    </button>
                                                </span>
                                            ))}
                                        </div>
                                        <input
                                            type="text"
                                            value={newTaskTagInput}
                                            onChange={(e) => handleNewTaskChange('tags', e.target.value)}
                                            onFocus={() => setShowNewTaskTagDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowNewTaskTagDropdown(false), 200)}
                                            placeholder="Add tags (comma-separated)"
                                        />
                                        {showNewTaskTagDropdown && getFilteredTags(newTaskTagInput, newTask.tags || []).length > 0 && (
                                            <div className="tag-dropdown">
                                                {getFilteredTags(newTaskTagInput, newTask.tags || []).map((tag, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="tag-dropdown-item"
                                                        onClick={() => handleTagSelect(tag, true)}
                                                    >
                                                        {tag}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
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
                                            <div><strong>Project:</strong> {projectToProjectName(task.project)}</div>
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
