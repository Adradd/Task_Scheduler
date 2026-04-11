import { useState } from 'react';
import bookIcon from '../assets/book.svg';
import inboxIcon from '../assets/inbox.svg';
import targetIcon from '../assets/target.svg';
import ConfirmPopoverButton from '../components/ConfirmPopoverButton.jsx';
import TaskEditorPanel from '../components/TaskEditorPanel.jsx';
import TaskListItem from '../components/TaskListItem.jsx';
import useResizableSidebar from '../hooks/useResizableSidebar.js';
import useTaskData from '../hooks/useTaskData.js';
import { extractApiErrorMessage } from '../utils/api.js';
import {
    buildTimeOptions,
    formatTags,
    getTagNames,
    isGoogleReadOnlyTask,
    parseTagInput,
    projectNameToProjectObject,
    projectToProjectColor,
    projectToProjectName,
    tagNameToTagObject,
} from '../utils/taskAdapters.js';
import { getTodayKey } from '../utils/dateFormatters.js';
import { formatPriorityLabel, getPriorityRank } from '../utils/taskFormatting.js';
import '../styles/TaskView.css';

const PROJECT_COLOR_OPTIONS = [
    '#dc2626', '#ef4444', '#f43f5e', '#ec4899',
    '#f97316', '#f59e0b', '#eab308', '#84cc16',
    '#65a30d', '#22c55e', '#10b981', '#14b8a6',
    '#06b6d4', '#0ea5e9', '#0576f3', '#1d4ed8',
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
];

function TaskView({ user }) {
    const {
        tasks,
        completedTasks,
        availableTags,
        allTagObjects,
        availableProjects,
        allProjectObjects,
        error,
        setError,
        loading,
        createTask,
        updateTask,
        deleteTask,
        completeTask,
        reopenTask,
        createProject,
        deleteProject,
    } = useTaskData(user);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [sortBy] = useState('deadline'); // 'deadline', 'project', 'priority'
    const [newTask, setNewTask] = useState({
        taskName: '',
        deadline: '',
        timeToComplete: '',
        priority: '',
        project: '',
        tags: [],
        comments: ''
    });
    const [showNewTaskTagDropdown, setShowNewTaskTagDropdown] = useState(false);
    const [showEditTagDropdown, setShowEditTagDropdown] = useState(false);
    const [showNewTaskProjectDropdown, setShowNewTaskProjectDropdown] = useState(false);
    const [showEditProjectDropdown, setShowEditProjectDropdown] = useState(false);
    const [newTaskTagInput, setNewTaskTagInput] = useState('');
    const [editTaskTagInput, setEditTaskTagInput] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('overview');
    const [showNewProjectInput, setShowNewProjectInput] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [newProjectColor, setNewProjectColor] = useState('#3fb0ba');
    const [isCreatingProject, setIsCreatingProject] = useState(false);
    const [showNewTaskForm, setShowNewTaskForm] = useState(false);
    const [showCompletedTasks, setShowCompletedTasks] = useState(false);
    const [newTaskAutoSchedule, setNewTaskAutoSchedule] = useState(false);
    const [editTaskAutoSchedule, setEditTaskAutoSchedule] = useState(false);
    const { isResizing, sidebarWidth, startResizing } = useResizableSidebar();

    const timeOptions = buildTimeOptions();
    const todayKey = getTodayKey();

    const handleEdit = (task) => {
        if (isGoogleReadOnlyTask(task)) {
            setError('Google Calendar events are view-only and cannot be edited in this app.');
            return;
        }
        setShowNewTaskForm(false);
        setEditingId(task.taskId);
        const normalized = task;
        // Convert Tag objects to tag name strings for editing
        const tagNames = getTagNames(normalized.tags);
        const editDataWithNames = {
            ...normalized,
            project: projectToProjectName(normalized.project),
            tags: tagNames
        };
        setEditData(editDataWithNames);
        setEditTaskTagInput(formatTags(tagNames));
        setEditTaskAutoSchedule(false);
    };

    const handleSaveEdit = async () => {
        try {
            setError(null);
            const tagObjects = (editData.tags || []).map((tagName) => tagNameToTagObject(tagName, allTagObjects));
            const dataToSend = {
                ...editData,
                project: projectNameToProjectObject(editData.project || '', allProjectObjects),
                tags: tagObjects,
                autoSchedule: editTaskAutoSchedule
            };

            await updateTask(dataToSend);
            setEditingId(null);
            setEditData({});
            setEditTaskAutoSchedule(false);
        } catch (err) {
            setError('Failed to update task: ' + extractApiErrorMessage(err));
        }
    };

    const handleCancel = () => {
        setEditingId(null);
        setEditData({});
        setEditTaskAutoSchedule(false);
    };

    const resetNewTaskForm = () => {
        setNewTask({
            taskName: '',
            deadline: '',
            timeToComplete: '',
            priority: '',
            project: '',
            tags: [],
            comments: ''
        });
        setNewTaskTagInput('');
        setShowNewTaskTagDropdown(false);
        setShowNewTaskProjectDropdown(false);
        setShowNewTaskForm(false);
        setNewTaskAutoSchedule(false);
    };

    const handleDelete = async (taskId) => {
        try {
            setError(null);
            const targetTask = tasks.find(t => t.taskId === taskId);
            if (isGoogleReadOnlyTask(targetTask)) {
                setError('Google Calendar events are view-only and cannot be deleted in this app.');
                return;
            }
            await deleteTask(taskId);
        } catch (err) {
            setError('Failed to delete task: ' + extractApiErrorMessage(err));
        }
    };

    const handleCompleteTask = async (taskId) => {
        try {
            setError(null);
            const targetTask = tasks.find(t => t.taskId === taskId);
            if (isGoogleReadOnlyTask(targetTask)) {
                setError('Google Calendar events are view-only and cannot be updated in this app.');
                return;
            }
            await completeTask(taskId);
        } catch (err) {
            setError('Failed to complete task: ' + extractApiErrorMessage(err));
        }
    };

    const handleReopenTask = async (taskId) => {
        try {
            setError(null);
            const targetTask = completedTasks.find(t => t.taskId === taskId);
            if (isGoogleReadOnlyTask(targetTask)) {
                setError('Google Calendar events are view-only and cannot be updated in this app.');
                return;
            }
            await reopenTask(taskId);
        } catch (err) {
            setError('Failed to reopen task: ' + extractApiErrorMessage(err));
        }
    };

    const handleDeleteCompleted = async (taskId) => {
        try {
            setError(null);
            const targetTask = completedTasks.find(t => t.taskId === taskId);
            if (isGoogleReadOnlyTask(targetTask)) {
                setError('Google Calendar events are view-only and cannot be deleted in this app.');
                return;
            }
            await deleteTask(taskId);
        } catch (err) {
            setError('Failed to delete task: ' + extractApiErrorMessage(err));
        }
    };

    const validateTask = (task) => {
        if (!task.taskName.trim()) return 'Task name is required';
        if (!task.deadline.trim()) return 'Deadline is required';
        if (!task.timeToComplete.trim()) return 'Time to complete is required';
        if (!task.priority.trim()) return 'Priority is required';
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
            const tagObjects = newTask.tags.map((tagName) => tagNameToTagObject(tagName, allTagObjects));

            const taskToCreate = {
                taskId: `task_${Date.now()}`,
                taskName: newTask.taskName,
                deadline: newTask.deadline,
                timeToComplete: newTask.timeToComplete,
                priority: newTask.priority,
                project: projectNameToProjectObject(newTask.project, allProjectObjects),
                tags: tagObjects,
                comments: newTask.comments,
                autoSchedule: newTaskAutoSchedule
            };

            await createTask(taskToCreate);
            resetNewTaskForm();
        } catch (err) {
            setError('Failed to create task: ' + extractApiErrorMessage(err));
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

    const handleCreateProject = async () => {
        const trimmedName = newProjectName.trim();
        if (!trimmedName) {
            setError('Project name is required');
            return;
        }

        try {
            setIsCreatingProject(true);
            setError(null);
            const createdProject = await createProject({
                projectName: trimmedName,
                projectColor: newProjectColor,
            });
            const createdProjectName = createdProject?.projectName || trimmedName;
            setSelectedFilter(`project:${createdProjectName}`);
            setNewTask(prev => ({ ...prev, project: createdProjectName }));
            setNewProjectName('');
            setNewProjectColor('#3fb0ba');
            setShowNewProjectInput(false);
        } catch (err) {
            setError('Failed to create project: ' + extractApiErrorMessage(err));
        } finally {
            setIsCreatingProject(false);
        }
    };

    const handleDeleteProject = async (project) => {
        const projectIdentifier = project?.projectId || project?.projectName;
        if (!projectIdentifier) {
            return;
        }

        try {
            setError(null);
            await deleteProject(project);

            if (selectedFilter === `project:${project.projectName}`) {
                setSelectedFilter('overview');
            }
        } catch (err) {
            setError('Failed to delete project: ' + extractApiErrorMessage(err));
        }
    };

    const getEditorProps = (isNewTask = false) => {
        const taskData = isNewTask ? newTask : editData;
        const projectDropdownVisible = isNewTask ? showNewTaskProjectDropdown : showEditProjectDropdown;
        const tagDropdownVisible = isNewTask ? showNewTaskTagDropdown : showEditTagDropdown;
        const tagInputValue = isNewTask ? newTaskTagInput : editTaskTagInput;

        return {
            mode: isNewTask ? 'create' : 'edit',
            taskData,
            timeOptions,
            projectDropdownVisible,
            tagDropdownVisible,
            tagInputValue,
            filteredProjects: getFilteredProjects(taskData.project),
            filteredTags: getFilteredTags(tagInputValue, taskData.tags || []),
            autoSchedule: isNewTask ? newTaskAutoSchedule : editTaskAutoSchedule,
            onChange: (field, value) => (isNewTask ? handleNewTaskChange(field, value) : handleEditChange(field, value)),
            onProjectFocus: () => (isNewTask ? setShowNewTaskProjectDropdown(true) : setShowEditProjectDropdown(true)),
            onProjectBlur: () => setTimeout(() => (isNewTask ? setShowNewTaskProjectDropdown(false) : setShowEditProjectDropdown(false)), 200),
            onTagFocus: () => (isNewTask ? setShowNewTaskTagDropdown(true) : setShowEditTagDropdown(true)),
            onTagBlur: () => setTimeout(() => (isNewTask ? setShowNewTaskTagDropdown(false) : setShowEditTagDropdown(false)), 200),
            onProjectSelect: (projectName) => handleProjectSelect(projectName, isNewTask),
            onTagSelect: (tagName) => handleTagSelect(tagName, isNewTask),
            onRemoveTag: (tagName) => removeTag(tagName, isNewTask),
            onAutoScheduleChange: (checked) => (isNewTask ? setNewTaskAutoSchedule(checked) : setEditTaskAutoSchedule(checked)),
            onSave: () => (isNewTask ? handleCreateTask() : handleSaveEdit()),
            onCancel: () => (isNewTask ? resetNewTaskForm() : handleCancel()),
        };
    };

    const renderSidebarIcon = (icon) => (
        <img className="sidebar-view-icon" src={icon} alt="" aria-hidden="true" />
    );

    const renderTaskCard = (task) => (
        <TaskListItem
            key={task.taskId}
            task={task}
            isEditing={editingId === task.taskId}
            editorPanel={<TaskEditorPanel {...getEditorProps(false, task.taskId)} />}
            getProjectName={projectToProjectName}
            getTagNames={getTagNames}
            onToggleComplete={handleCompleteTask}
            onEdit={handleEdit}
            onDelete={handleDelete}
            canToggleComplete={!isGoogleReadOnlyTask(task)}
            canEdit={!isGoogleReadOnlyTask(task)}
            canDelete={!isGoogleReadOnlyTask(task)}
            metaItems={[
                projectToProjectName(task.project) || 'Uncategorized',
                formatPriorityLabel(task.priority) || 'No priority',
                ...(isGoogleReadOnlyTask(task) ? ['Google Calendar (read-only)'] : []),
                task.comments || '',
            ].filter(Boolean)}
        />
    );

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
                const orderA = getPriorityRank(a.priority);
                const orderB = getPriorityRank(b.priority);
                return orderA - orderB;
            }
            return 0;
        });
        return sorted;
    };

    if (loading) {
        return (
            <main className="task-view-container">
                <div className="task-content">
                    <div className="task-layout task-layout-loading">
                        <aside className="project-sidebar task-loading-sidebar" />
                        <div className="task-main-panel loading loading-panel">Loading tasks…</div>
                    </div>
                </div>
            </main>
        );
    }

    const taskCountByProject = tasks.reduce((counts, task) => {
        const projectName = projectToProjectName(task.project);
        if (!projectName) {
            return counts;
        }

        counts[projectName] = (counts[projectName] || 0) + 1;
        return counts;
    }, {});

    const sidebarProjects = allProjectObjects
        .filter(project => project?.projectName)
        .map((project) => ({
            projectId: project.projectId,
            projectName: project.projectName,
            projectColor: project.projectColor,
            taskCount: taskCountByProject[project.projectName] || 0
        }))
        .sort((a, b) => a.projectName.localeCompare(b.projectName));

    const filteredTasks = selectedFilter === 'overview'
        ? tasks
        : selectedFilter === 'inbox'
            ? tasks.filter(task => !projectToProjectName(task.project))
            : selectedFilter === 'today'
                ? tasks.filter(task => task.deadline === todayKey)
                : selectedFilter.startsWith('project:')
                    ? tasks.filter(task => projectToProjectName(task.project) === selectedFilter.replace('project:', ''))
                    : tasks;

    const filteredCompletedTasks = selectedFilter === 'overview'
        ? completedTasks
        : selectedFilter === 'inbox'
            ? completedTasks.filter(task => !projectToProjectName(task.project))
            : selectedFilter === 'today'
                ? completedTasks.filter(task => task.deadline === todayKey)
                : selectedFilter.startsWith('project:')
                    ? completedTasks.filter(task => projectToProjectName(task.project) === selectedFilter.replace('project:', ''))
                    : completedTasks;

    const sortedTasks = sortTasks(filteredTasks);
    const sortedCompletedTasks = sortTasks(filteredCompletedTasks);
    const selectedProjectName = selectedFilter.startsWith('project:') ? selectedFilter.replace('project:', '') : '';
    const selectedProjectObject = selectedProjectName
        ? allProjectObjects.find(project => project.projectName === selectedProjectName) || { projectName: selectedProjectName }
        : null;
    const sectionTitle = selectedFilter === 'inbox'
        ? 'Inbox'
        : selectedFilter === 'today'
            ? 'Today'
            : selectedFilter === 'overview'
                ? 'Overview'
                : selectedProjectName;
    const sectionSubtitle = selectedFilter === 'inbox'
        ? `${sortedTasks.length} active task${sortedTasks.length === 1 ? '' : 's'}`
        : selectedFilter === 'today'
            ? `${sortedTasks.length} active task${sortedTasks.length === 1 ? '' : 's'}`
            : selectedFilter === 'overview'
                ? `${tasks.length} active task${tasks.length === 1 ? '' : 's'}`
                : `${sortedTasks.length} active task${sortedTasks.length === 1 ? '' : 's'}`;
    const emptyStateTitle = selectedFilter === 'inbox'
        ? 'Inbox is clear'
        : selectedFilter === 'today'
            ? 'Nothing due today'
            : selectedFilter === 'overview'
                ? 'No active tasks yet'
                : 'No tasks in this project';
    const emptyStateMessage = selectedFilter === 'inbox'
        ? 'Tasks without a project will appear here.'
        : selectedFilter === 'today'
            ? 'Tasks due today will show up here from any project.'
            : selectedFilter === 'overview'
                ? 'Create a task below to get started.'
                : 'Pick another section or create a new task below.';

    return (
        <main className="task-view-container">
            <div className="task-content">
                {error && <div className="error-message" role="alert">{error}</div>}

                <div
                    className={`task-layout task-layout-resizable ${isResizing ? 'is-resizing' : ''}`}
                    style={{ gridTemplateColumns: `${sidebarWidth}px 10px minmax(0, 1fr)` }}
                >
                    <aside className="project-sidebar">
                        <div className="project-sidebar-main">
                            <div className="sidebar-views">
                                <button
                                    type="button"
                                    className={`sidebar-view-button ${selectedFilter === 'inbox' ? 'active' : ''}`}
                                    onClick={() => setSelectedFilter('inbox')}
                                >
                                    {renderSidebarIcon(inboxIcon)}
                                    Inbox
                                </button>
                                <button
                                    type="button"
                                    className={`sidebar-view-button ${selectedFilter === 'today' ? 'active' : ''}`}
                                    onClick={() => setSelectedFilter('today')}
                                >
                                    {renderSidebarIcon(targetIcon)}
                                    Today
                                </button>
                                <button
                                    type="button"
                                    className={`sidebar-view-button ${selectedFilter === 'overview' ? 'active' : ''}`}
                                    onClick={() => setSelectedFilter('overview')}
                                >
                                    {renderSidebarIcon(bookIcon)}
                                    Overview
                                </button>
                            </div>

                            <div className="project-section">
                                <p className="project-sidebar-eyebrow">Projects</p>
                                <div className="project-nav-list">
                                    {sidebarProjects.length > 0 ? (
                                        sidebarProjects.map((project) => (
                                            <button
                                                type="button"
                                                key={project.projectId || project.projectName}
                                                className={`project-nav-item ${selectedFilter === `project:${project.projectName}` ? 'active' : ''}`}
                                                onClick={() => setSelectedFilter(`project:${project.projectName}`)}
                                                title={project.projectName}
                                            >
                                                <span className="project-nav-label-wrap">
                                                    <span
                                                        className="project-nav-color-dot"
                                                        style={{ backgroundColor: projectToProjectColor(project) }}
                                                        aria-hidden="true"
                                                    />
                                                    <span className="project-nav-label">{project.projectName}</span>
                                                </span>
                                                <span className="project-count">{project.taskCount}</span>
                                            </button>
                                        ))
                                    ) : (
                                        <p className="project-empty-state">No active projects yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="project-sidebar-footer">
                            {showNewProjectInput && (
                                <div className="project-create-panel">
                                    <input
                                        type="text"
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        placeholder="New project name…"
                                        aria-label="New project name"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleCreateProject();
                                            } else if (e.key === 'Escape') {
                                                setShowNewProjectInput(false);
                                                setNewProjectName('');
                                                setNewProjectColor('#3fb0ba');
                                            }
                                        }}
                                    />
                                    <div className="project-color-picker-group">
                                        <p className="project-color-picker-label">Project Color</p>
                                        <div className="project-color-options">
                                            {PROJECT_COLOR_OPTIONS.map((color) => (
                                                <button
                                                    type="button"
                                                    key={color}
                                                    className={`project-color-option ${newProjectColor === color ? 'selected' : ''}`}
                                                    onClick={() => setNewProjectColor(color)}
                                                    aria-label={`Set project color ${color}`}
                                                    title={color}
                                                >
                                                    <span className="project-color-option-fill" style={{ backgroundColor: color }} aria-hidden="true" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="project-create-actions">
                                        <button type="button" className="project-create-button" onClick={handleCreateProject} disabled={isCreatingProject}>
                                            {isCreatingProject ? 'Saving…' : 'Create'}
                                        </button>
                                        <button
                                            type="button"
                                            className="project-create-button project-create-button-secondary"
                                            onClick={() => {
                                                setShowNewProjectInput(false);
                                                setNewProjectName('');
                                                setNewProjectColor('#3fb0ba');
                                            }}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            <button
                                type="button"
                                className="project-add-footer-button"
                                onClick={() => setShowNewProjectInput(prev => !prev)}
                            >
                                + Add Project
                            </button>
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
                        <div className="task-section-header">
                            <div className="task-header-actions">
                                <button
                                    type="button"
                                    className="new-task-button"
                                    onClick={() => {
                                        handleCancel();
                                        setShowNewTaskForm(prev => !prev);
                                    }}
                                >
                                    {showNewTaskForm ? 'Close New Task' : '+ New Task'}
                                </button>
                                {selectedProjectObject && (
                                    <ConfirmPopoverButton
                                        buttonClassName="project-delete-header-button"
                                        buttonLabel="Delete Project"
                                        title="Delete project?"
                                        message={<><strong>{selectedProjectObject.projectName}</strong> and its associated tasks will be removed.</>}
                                        onConfirm={() => handleDeleteProject(selectedProjectObject)}
                                    />
                                )}
                            </div>

                            <div className="task-title-group">
                                <div className="task-section-title">
                                    <span>{sectionTitle}</span>
                                </div>
                                <div className="task-section-subtitle">
                                    {sectionSubtitle}
                                </div>
                            </div>
                        </div>

                        <div className="tasks-container">
                            {showNewTaskForm && <TaskEditorPanel {...getEditorProps(true)} />}

                            {sortedTasks.length > 0 ? sortedTasks.map(renderTaskCard) : (
                                <div className="empty-task-state">
                                    <h3>{emptyStateTitle}</h3>
                                    <p>{emptyStateMessage}</p>
                                </div>
                            )}

                            {sortedCompletedTasks.length > 0 && (
                                <div className="completed-tasks-toggle-wrap">
                                    <button
                                        type="button"
                                        className="completed-tasks-toggle"
                                        onClick={() => setShowCompletedTasks(prev => !prev)}
                                    >
                                        {showCompletedTasks
                                            ? `Hide Completed (${sortedCompletedTasks.length})`
                                            : `Show Completed (${sortedCompletedTasks.length})`}
                                    </button>
                                </div>
                            )}

                            {sortedCompletedTasks.length > 0 && showCompletedTasks && (
                                <div className="completed-tasks-section">
                                    <div className="completed-section-header">
                                        <div className="task-section-title">
                                            <span>Completed</span>
                                        </div>
                                        <div className="task-section-subtitle">
                                            {sortedCompletedTasks.length} completed task{sortedCompletedTasks.length === 1 ? '' : 's'}
                                        </div>
                                    </div>
                                    <div className="completed-tasks-grid">
                                        {sortedCompletedTasks.map(task => (
                                            <div key={task.taskId} className="completed-task-card">
                                                <div className="completed-task-main">
                                                    <h3 className="completed-task-title">{task.taskName}</h3>
                                                    <div className="completed-task-info">
                                                        <span className="completed-project-name" title={projectToProjectName(task.project) || 'Uncategorized'}>
                                                            {projectToProjectName(task.project) || 'Uncategorized'}
                                                        </span>
                                                        <span>{formatPriorityLabel(task.priority) || 'No priority'}</span>
                                                        {task.comments ? <span>{task.comments}</span> : null}
                                                    </div>
                                                </div>
                                                <div className="completed-task-datetime">
                                                    <span>{task.deadline || 'No date'}</span>
                                                    <span>{task.timeToComplete || 'No estimate'}</span>
                                                </div>
                                                <div className="completed-task-actions">
                                                    {!isGoogleReadOnlyTask(task) ? (
                                                        <>
                                                            <button
                                                                className="btn-reopen"
                                                                onClick={() => handleReopenTask(task.taskId)}
                                                            >
                                                                Reopen
                                                            </button>
                                                            <ConfirmPopoverButton
                                                                buttonClassName="btn-delete"
                                                                buttonLabel="Delete"
                                                                popoverClassName="confirm-popover-left"
                                                                title="Delete completed task?"
                                                                message={<><strong>{task.taskName}</strong> will be permanently removed.</>}
                                                                onConfirm={() => handleDeleteCompleted(task.taskId)}
                                                            />
                                                        </>
                                                    ) : (
                                                        <span className="completed-task-readonly">Google Calendar event (read-only)</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

export default TaskView;
