package app.CalendarApp.service;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Task;
import java.util.List;

public interface TaskService {
    Task findTaskByTaskId(String taskId);
    Task findTaskByOwner(Account owner);
    List<Task> findAllTasksByOwner(Account owner);
    Task findTaskByDeadline(String deadline);
    Task findTaskByPriority(String priority);
    Task findTaskByProject(String project);
    Task findTaskByTags(String tags);
    Task createTask(Task task);
    Task updateTask(Task task);
    void deleteTask(String taskId);
}

