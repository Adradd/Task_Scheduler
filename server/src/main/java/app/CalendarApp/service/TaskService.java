package app.CalendarApp.service;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.TaskPriority;

import java.time.LocalDate;
import java.util.List;

/**
 * Service contract for task lookup, persistence, completion state, and optional
 * auto-scheduling.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
public interface TaskService {
    /**
     * Finds a task by its task identifier.
     *
     * @param taskId task identifier
     * @return matching task or null
     */
    Task findTaskByTaskId(String taskId);

    /**
     * Finds one task owned by an account.
     *
     * @param owner account owner
     * @return a matching task or null
     */
    Task findTaskByOwner(Account owner);

    /**
     * Lists all tasks owned by an account.
     *
     * @param owner account owner
     * @return owned tasks
     */
    List<Task> findAllTasksByOwner(Account owner);

    /**
     * Finds one task by deadline.
     *
     * @param deadline deadline date
     * @return matching task or null
     */
    Task findTaskByDeadline(LocalDate deadline);

    /**
     * Finds one task by priority.
     *
     * @param priority task priority
     * @return matching task or null
     */
    Task findTaskByPriority(TaskPriority priority);

    /**
     * Finds one task assigned to a project.
     *
     * @param project project reference
     * @return matching task or null
     */
    Task findTaskByProject(Project project);

    /**
     * Lists tasks containing a tag.
     *
     * @param tag tag reference
     * @return matching tasks
     */
    List<Task> findTasksByTag(Tag tag);

    /**
     * Creates a task without auto-scheduling.
     *
     * @param task task to create
     * @return saved task
     */
    Task createTask(Task task);

    /**
     * Creates a task, optionally scheduling it into the owner's availability.
     *
     * @param task task to create
     * @param autoSchedule whether to auto-populate start and end time
     * @return saved task
     */
    Task createTask(Task task, boolean autoSchedule);

    /**
     * Updates a task without auto-scheduling.
     *
     * @param task task to update
     * @return saved task
     */
    Task updateTask(Task task);

    /**
     * Updates a task, optionally rescheduling it into the owner's availability.
     *
     * @param task task to update
     * @param autoSchedule whether to auto-populate start and end time
     * @return saved task
     */
    Task updateTask(Task task, boolean autoSchedule);

    /**
     * Deletes a task by identifier.
     *
     * @param taskId task identifier to delete
     */
    void deleteTask(String taskId);

    /**
     * Lists completed tasks owned by an account.
     *
     * @param owner account owner
     * @return completed tasks
     */
    List<Task> findAllCompletedTasksByOwner(Account owner);

    /**
     * Marks a task as completed.
     *
     * @param taskId task identifier
     * @return updated task
     */
    Task markTaskAsComplete(String taskId);
}
