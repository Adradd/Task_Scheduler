package app.CalendarApp.service;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.repository.Task;
import java.util.List;

public interface TaskService {
    Task findTaskByTaskId(String taskId);
    Task findTaskByOwner(Account owner);
    List<Task> findAllTasksByOwner(Account owner);
    Task findTaskByDeadline(String deadline);
    Task findTaskByPriority(String priority);
    Task findTaskByProject(Project project);
    List<Task> findTasksByTag(Tag tag);
    Task createTask(Task task);
    Task updateTask(Task task);
    void deleteTask(String taskId);
    List<Task> findAllCompletedTasksByOwner(Account owner);
    Task markTaskAsComplete(String taskId);
}
