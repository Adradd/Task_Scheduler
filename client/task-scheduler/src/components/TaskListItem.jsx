import ConfirmPopoverButton from './ConfirmPopoverButton.jsx';

function TaskListItem({
    task,
    isEditing = false,
    editorPanel = null,
    getProjectName,
    getTagNames,
    onToggleComplete,
    onEdit,
    onDelete,
    onSelect,
    className = '',
    showDateTime = true,
    showCheckbox = true,
    showTags = true,
    showActions = true,
    metaItems = null,
    metaSeparator = ' • ',
}) {
    const taskTagNames = getTagNames(task.tags);
    const projectName = getProjectName(task.project) || 'Uncategorized';
    const taskMeta = (metaItems || [
        projectName,
        task.priority || 'No priority',
        task.comments || '',
    ]).filter(Boolean);
    const isSelectable = typeof onSelect === 'function';

    return (
        <div className={`task-card ${className} ${isEditing ? 'editing' : ''}`.trim()}>
            <div className="task-row">
                {showCheckbox && (
                    <input
                        type="checkbox"
                        className="task-checkbox"
                        checked={task.isCompleted || false}
                        onChange={() => onToggleComplete?.(task.taskId)}
                        title="Mark task as complete"
                    />
                )}

                <div className="task-main-copy">
                    {isSelectable ? (
                        <button type="button" className="calendar-sidebar-title-button" onClick={() => onSelect(task)}>
                            {task.taskName}
                        </button>
                    ) : (
                        <h3 className="task-title">{task.taskName}</h3>
                    )}
                    {showTags && (
                        <div className="task-tags-inline">
                            {taskTagNames.length > 0 ? taskTagNames.join(' • ') : 'No tags'}
                        </div>
                    )}
                    <div className="task-meta-inline">
                        {taskMeta.join(metaSeparator)}
                    </div>
                    {showActions && (
                        <div className="task-row-actions">
                            {onEdit && (
                                <button type="button" className="btn-edit" onClick={() => onEdit(task)}>
                                    Edit
                                </button>
                            )}
                            {onDelete && (
                                <ConfirmPopoverButton
                                    buttonClassName="btn-delete"
                                    buttonLabel="Delete"
                                    title="Delete task?"
                                    message={<><strong>{task.taskName}</strong> will be permanently removed.</>}
                                    onConfirm={() => onDelete(task.taskId)}
                                />
                            )}
                        </div>
                    )}
                </div>

                {showDateTime && (
                    <div className="task-datetime">
                        <span>{task.deadline || 'No date'}</span>
                        <span>{task.timeToComplete || 'No estimate'}</span>
                    </div>
                )}
            </div>

            {isEditing && editorPanel}
        </div>
    );
}

export default TaskListItem;
