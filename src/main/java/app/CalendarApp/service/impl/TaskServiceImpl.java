package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.TaskRepository;
import app.CalendarApp.service.GoogleCalendarService;
import app.CalendarApp.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskServiceImpl implements TaskService {
    private final TaskRepository taskRepository;
    private final TaskAutoSchedulerService autoSchedulerService;
    private final GoogleCalendarService googleCalendarService;

    @Autowired
    public TaskServiceImpl(TaskRepository taskRepository, TaskAutoSchedulerService autoSchedulerService, GoogleCalendarService googleCalendarService) {
        this.taskRepository = taskRepository;
        this.autoSchedulerService = autoSchedulerService;
        this.googleCalendarService = googleCalendarService;
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
    public List<Task> findAllTasksByOwner(Account owner) {
        return taskRepository.findAllByOwner(owner);
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
    public Task findTaskByProject(Project project) {
        return taskRepository.findTaskByProject(project);
    }

    @Override
    public List<Task> findTasksByTag(Tag tag) {
        return taskRepository.findAllByTagsContaining(tag);
    }

    @Override
    public Task createTask(Task task) {
        return createTask(task, false);
    }

    @Override
    public Task createTask(Task task, boolean autoSchedule) {
        validateTask(task, false);
        if (autoSchedule) {
            task = autoSchedulerService.scheduleTask(task, task.getOwner(), taskRepository.findAllByOwner(task.getOwner()));
        }
        Task saved = taskRepository.save(task);
        return syncTaskToGoogleCalendar(saved);
    }

    @Override
    public Task updateTask(Task task) {
        return updateTask(task, false);
    }

    @Override
    public Task updateTask(Task task, boolean autoSchedule) {
        if (task.getTaskId() == null || taskRepository.findTaskByTaskId(task.getTaskId()) == null) {
            throw new IllegalArgumentException("Task does not exist");
        }
        validateTask(task, true);
        if (autoSchedule) {
            task = autoSchedulerService.scheduleTask(task, task.getOwner(), taskRepository.findAllByOwner(task.getOwner()));
        }
        Task saved = taskRepository.save(task);
        return syncTaskToGoogleCalendar(saved);
    }

    @Override
    public void deleteTask(String taskId) {
        Task existingTask = taskId == null ? null : taskRepository.findTaskByTaskId(taskId);
        if (existingTask == null) {
            throw new IllegalArgumentException("Task does not exist");
        }
        try {
            googleCalendarService.syncTaskDelete(existingTask);
        } catch (Exception ignored) {
            // Keep app data consistent even if external calendar sync fails.
        }
        taskRepository.deleteById(taskId);
    }

    @Override
    public List<Task> findAllCompletedTasksByOwner(Account owner) {
        return taskRepository.findAllByOwnerAndIsCompleted(owner, true);
    }

    @Override
    public Task markTaskAsComplete(String taskId) {
        Task task = taskRepository.findTaskByTaskId(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task does not exist");
        }
        task.setIsCompleted(true);
        return taskRepository.save(task);
    }

    private void validateTask(Task task, boolean isUpdate) {
        if (task.getTaskName() == null || task.getTaskName().trim().isEmpty()) {
            throw new IllegalArgumentException("Task name is required");
        }
        if (task.getOwner() == null) {
            throw new IllegalArgumentException("Owner is required");
        }

        if (task.getOwner().getUsername() == null || task.getOwner().getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Owner username is required");
        }
        if (task.getDeadline() != null && !task.getDeadline().matches("\\d{2}-\\d{2}-\\d{4}|\\d{4}-\\d{2}-\\d{2}")) {
            throw new IllegalArgumentException("Deadline must be in DD-MM-YYYY or YYYY-MM-DD format");
        }
        if (task.getPriority() != null &&
            !(task.getPriority().equalsIgnoreCase("low") ||
              task.getPriority().equalsIgnoreCase("medium") ||
              task.getPriority().equalsIgnoreCase("high"))) {
            throw new IllegalArgumentException("Priority must be low, medium, or high");
        }
        if (!isUpdate && taskRepository.findTaskByTaskId(task.getTaskId()) != null) {
            throw new IllegalArgumentException("Task ID already exists");
        }
    }

    private Task syncTaskToGoogleCalendar(Task task) {
        try {
            String previousEventId = task.getGoogleCalendarEventId();
            Task syncedTask = googleCalendarService.syncTaskUpsert(task);
            if (syncedTask != null && syncedTask.getGoogleCalendarEventId() != null
                && !syncedTask.getGoogleCalendarEventId().equals(previousEventId)) {
                return taskRepository.save(syncedTask);
            }
            return syncedTask;
        } catch (Exception ignored) {
            // Keep app data consistent even if external calendar sync fails.
            return task;
        }
    }
}
