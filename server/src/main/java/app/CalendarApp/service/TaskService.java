package app.CalendarApp.service;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.TaskPriority;

import java.time.LocalDate;
import java.util.List;

public interface TaskService {
    Task findTaskByTaskId(String taskId);
    Task findTaskByOwner(Account owner);
    List<Task> findAllTasksByOwner(Account owner);
    Task findTaskByDeadline(LocalDate deadline);
    Task findTaskByPriority(TaskPriority priority);
    Task findTaskByProject(Project project);
    List<Task> findTasksByTag(Tag tag);
    Task createTask(Task task);
    Task createTask(Task task, boolean autoSchedule);
    Task updateTask(Task task);
    Task updateTask(Task task, boolean autoSchedule);
    void deleteTask(String taskId);
    List<Task> findAllCompletedTasksByOwner(Account owner);
    Task markTaskAsComplete(String taskId);
}
