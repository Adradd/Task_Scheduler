import { useId } from 'react';

export default function TaskEditorPanel ({
    mode,
    taskData,
    timeOptions,
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
    onTagSelect,
    onRemoveTag,
    onAutoScheduleChange,
    onSave,
    onCancel,
}) {
    const currentTags = taskData.tags || [];
    const isNewTask = mode === 'create';
    const todayKey = new Date().toISOString().slice(0, 10);
    const isPastDeadline = Boolean(taskData.deadline && taskData.deadline < todayKey);
    const fieldPrefix = useId();
    const ids = {
        autoSchedule: `${fieldPrefix}-auto-schedule`,
        comments: `${fieldPrefix}-comments`,
        deadline: `${fieldPrefix}-deadline`,
        priority: `${fieldPrefix}-priority`,
        project: `${fieldPrefix}-project`,
        tags: `${fieldPrefix}-tags`,
        tagList: `${fieldPrefix}-tag-list`,
        taskName: `${fieldPrefix}-task-name`,
        timeToComplete: `${fieldPrefix}-time-to-complete`,
    };

    return (
        <div className="task-editor-panel">
            <div className="task-editor-grid">
                <div className="task-field task-field-wide">
                    <label htmlFor={ids.taskName}>Task Name *</label>
                    <input
                        id={ids.taskName}
                        type="text"
                        value={taskData.taskName || ''}
                        onChange={(e) => onChange('taskName', e.target.value)}
                        placeholder="Enter task name…"
                    />
                </div>

                <div className="task-field">
                    <label htmlFor={ids.deadline}>Deadline *</label>
                    <input
                        id={ids.deadline}
                        type="date"
                        value={taskData.deadline || ''}
                        onChange={(e) => onChange('deadline', e.target.value)}
                    />
                    {isPastDeadline && (
                        <p className="task-field-warning" role="status">
                            This date is in the past - this task will be immediately overdue.
                        </p>
                    )}
                </div>

                <div className="task-field">
                    <label htmlFor={ids.timeToComplete}>Time to Complete *</label>
                    <select
                        id={ids.timeToComplete}
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
                    <label htmlFor={ids.priority}>Priority *</label>
                    <select
                        id={ids.priority}
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
                    <label htmlFor={ids.project}>Project</label>
                    <select
                        id={ids.project}
                        value={taskData.project || ''}
                        onChange={(e) => onChange('project', e.target.value)}
                        onFocus={onProjectFocus}
                        onBlur={onProjectBlur}
                    >
                        <option value="">No Project</option>
                        {filteredProjects.map((projectName) => (
                            <option key={projectName} value={projectName}>{projectName}</option>
                        ))}
                    </select>
                </div>

                <div className="task-field task-field-wide">
                    <label htmlFor={ids.tags}>Tags</label>
                    <div className="tag-input-container">
                        <div className="tag-chips">
                            {currentTags.map((tag, idx) => (
                                <span key={`${tag}-${idx}`} className="tag-chip">
                                    {tag}
                                    <button
                                        type="button"
                                        className="tag-remove"
                                        onClick={() => onRemoveTag(tag)}
                                        aria-label={`Remove ${tag}`}
                                    >
                                        ×
                                    </button>
                                </span>
                            ))}
                        </div>
                        <input
                            id={ids.tags}
                            type="text"
                            value={tagInputValue}
                            onChange={(e) => onChange('tags', e.target.value)}
                            onFocus={onTagFocus}
                            onBlur={onTagBlur}
                            placeholder="Add tags…"
                            aria-expanded={tagDropdownVisible}
                            aria-controls={tagDropdownVisible ? ids.tagList : undefined}
                        />
                        {tagDropdownVisible && filteredTags.length > 0 && (
                            <ul id={ids.tagList} className="tag-dropdown" role="listbox" aria-label="Tag suggestions">
                                {filteredTags.map((tag, idx) => (
                                    <li key={`${tag}-${idx}`}>
                                        <button
                                            type="button"
                                            className="tag-dropdown-item"
                                            onMouseDown={(event) => event.preventDefault()}
                                            onClick={() => onTagSelect(tag)}
                                        >
                                            {tag}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                <div className="task-field task-field-wide">
                    <label htmlFor={ids.comments}>Comments</label>
                    <textarea
                        id={ids.comments}
                        value={taskData.comments || ''}
                        onChange={(e) => onChange('comments', e.target.value)}
                        placeholder="Add notes…"
                    />
                </div>

                <div className="task-field task-field-wide">
                    <label className="task-auto-schedule-row" htmlFor={ids.autoSchedule}>
                        <input
                            id={ids.autoSchedule}
                            type="checkbox"
                            checked={autoSchedule}
                            onChange={(e) => onAutoScheduleChange(e.target.checked)}
                        />
                        <span>Auto Schedule</span>
                    </label>
                </div>
            </div>

            <div className="task-editor-actions">
                <button type="button" className="btn-save" onClick={onSave}>
                    {isNewTask ? 'Create Task' : 'Save'}
                </button>
                <button type="button" className="btn-cancel" onClick={onCancel}>
                    Cancel
                </button>
            </div>
        </div>
    );
}
