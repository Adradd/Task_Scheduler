function TaskEditorPanel({
    mode,
    taskData,
    timeOptions,
    projectDropdownVisible,
    tagDropdownVisible,
    tagInputValue,
    filteredProjects,
    filteredTags,
    autoSchedule,
    onChange,
    onProjectFocus,
    onProjectBlur,
    onTagFocus,
    onTagBlur,
    onProjectSelect,
    onTagSelect,
    onRemoveTag,
    onAutoScheduleChange,
    onSave,
    onCancel,
}) {
    const currentTags = taskData.tags || [];
    const isNewTask = mode === 'create';

    return (
        <div className="task-editor-panel">
            <div className="task-editor-grid">
                <div className="task-field task-field-wide">
                    <label>Task Name *</label>
                    <input
                        type="text"
                        value={taskData.taskName || ''}
                        onChange={(e) => onChange('taskName', e.target.value)}
                        placeholder="Enter task name"
                    />
                </div>

                <div className="task-field">
                    <label>Deadline *</label>
                    <input
                        type="date"
                        value={taskData.deadline || ''}
                        onChange={(e) => onChange('deadline', e.target.value)}
                    />
                </div>

                <div className="task-field">
                    <label>Time to Complete *</label>
                    <select
                        value={taskData.timeToComplete || ''}
                        onChange={(e) => onChange('timeToComplete', e.target.value)}
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
                        value={taskData.priority || ''}
                        onChange={(e) => onChange('priority', e.target.value)}
                    >
                        <option value="">Select Priority</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>

                <div className="task-field">
                    <label>Project</label>
                    <div className="tag-input-container">
                        <input
                            type="text"
                            value={taskData.project || ''}
                            onChange={(e) => onChange('project', e.target.value)}
                            onFocus={onProjectFocus}
                            onBlur={onProjectBlur}
                            placeholder="Project"
                        />
                        {projectDropdownVisible && filteredProjects.length > 0 && (
                            <div className="tag-dropdown">
                                {filteredProjects.map((projectName) => (
                                    <div
                                        key={projectName}
                                        className="tag-dropdown-item"
                                        onClick={() => onProjectSelect(projectName)}
                                    >
                                        {projectName}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="task-field task-field-wide">
                    <label>Tags</label>
                    <div className="tag-input-container">
                        <div className="tag-chips">
                            {currentTags.map((tag, idx) => (
                                <span key={`${tag}-${idx}`} className="tag-chip">
                                    {tag}
                                    <button
                                        type="button"
                                        className="tag-remove"
                                        onClick={() => onRemoveTag(tag)}
                                    >
                                        x
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            type="text"
                            value={tagInputValue}
                            onChange={(e) => onChange('tags', e.target.value)}
                            onFocus={onTagFocus}
                            onBlur={onTagBlur}
                            placeholder="Add tags"
                        />
                        {tagDropdownVisible && filteredTags.length > 0 && (
                            <div className="tag-dropdown">
                                {filteredTags.map((tag, idx) => (
                                    <div
                                        key={`${tag}-${idx}`}
                                        className="tag-dropdown-item"
                                        onClick={() => onTagSelect(tag)}
                                    >
                                        {tag}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="task-field task-field-wide">
                    <label>Comments</label>
                    <textarea
                        value={taskData.comments || ''}
                        onChange={(e) => onChange('comments', e.target.value)}
                        placeholder="Add notes"
                    />
                </div>

                <div className="task-field task-field-wide">
                    <label className="task-auto-schedule-row">
                        <input
                            type="checkbox"
                            checked={autoSchedule}
                            onChange={(e) => onAutoScheduleChange(e.target.checked)}
                        />
                        <span>Auto Schedule</span>
                    </label>
                </div>
            </div>

            <div className="task-editor-actions">
                <button className="btn-save" onClick={onSave}>
                    {isNewTask ? 'Create Task' : 'Save'}
                </button>
                <button className="btn-cancel" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </div>
    );
}

export default TaskEditorPanel;
