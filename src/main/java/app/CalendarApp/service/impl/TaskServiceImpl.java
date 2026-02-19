package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.TaskRepository;
import app.CalendarApp.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class TaskServiceImpl implements TaskService {
    private final TaskRepository taskRepository;

    @Autowired
    public TaskServiceImpl(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Override
    public Task findTaskByTaskId(String taskId) {
        return taskRepository.findTaskByTaskId(taskId);
    }

    @Override
    public Task findTaskByOwner(Account owner) {
        return taskRepository.findTaskByOwner(owner);
    }

    @Override
    public Task findTaskByDeadline(String deadline) {
        return taskRepository.findTaskByDeadline(deadline);
    }

    @Override
    public Task findTaskByPriority(String priority) {
        return taskRepository.findTaskByPriority(priority);
    }

    @Override
    public Task findTaskByProject(String project) {
        return taskRepository.findTaskByProject(project);
    }

    @Override
    public Task findTaskByTags(String tags) {
        return taskRepository.findTaskByTags(tags);
    }

    @Override
    public Task createTask(Task task) {
        validateTask(task, false);
        return taskRepository.save(task);
    }

    @Override
    public Task updateTask(Task task) {
        if (task.getTaskId() == null || taskRepository.findTaskByTaskId(task.getTaskId()) == null) {
            throw new IllegalArgumentException("Task does not exist");
        }
        validateTask(task, true);
        return taskRepository.save(task);
    }

    @Override
    public void deleteTask(String taskId) {
        if (taskId == null || taskRepository.findTaskByTaskId(taskId) == null) {
            throw new IllegalArgumentException("Task does not exist");
        }
        taskRepository.deleteById(taskId);
    }

    private void validateTask(Task task, boolean isUpdate) {
        if (task.getTaskName() == null || task.getTaskName().trim().isEmpty()) {
            throw new IllegalArgumentException("Task name is required");
        }
        if (task.getOwner() == null) {
            throw new IllegalArgumentException("Owner is required");
        }
        // Optionally check owner fields
        if (task.getOwner().getUsername() == null || task.getOwner().getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Owner username is required");
        }
        if (task.getDeadline() != null && !task.getDeadline().matches("\\d{2}-\\d{2}-\\d{4}")) {
            throw new IllegalArgumentException("Deadline must be in DD-MM-YYYY format");
        }
        if (task.getPriority() != null &&
            !(task.getPriority().equalsIgnoreCase("low") ||
              task.getPriority().equalsIgnoreCase("medium") ||
              task.getPriority().equalsIgnoreCase("high"))) {
            throw new IllegalArgumentException("Priority must be low, medium, or high");
        }
        // Optionally check uniqueness for create
        if (!isUpdate && taskRepository.findTaskByTaskId(task.getTaskId()) != null) {
            throw new IllegalArgumentException("Task ID already exists");
        }
    }
}
