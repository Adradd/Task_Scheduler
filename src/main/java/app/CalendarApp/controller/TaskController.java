package app.CalendarApp.controller;

import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.Account;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.service.ProjectService;
import app.CalendarApp.service.TagService;
import app.CalendarApp.service.TaskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;
    private final AccountService accountService;
    private final TagService tagService;
    private final ProjectService projectService;

    @Autowired
    public TaskController(TaskService taskService, AccountService accountService, TagService tagService, ProjectService projectService) {
        this.taskService = taskService;
        this.accountService = accountService;
        this.tagService = tagService;
        this.projectService = projectService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<Task>> getAllTasksForUser(Authentication authentication) {
        String username = authentication.getName();
        Account account = accountService.findAccountByUsername(username);
        if (account == null) {
            return ResponseEntity.notFound().build();
        }
        List<Task> tasks = taskService.findAllTasksByOwner(account);
        // Filter to only return uncompleted tasks
        tasks.removeIf(Task::isCompleted);
        return ResponseEntity.ok(tasks);
    }

    @GetMapping("/{taskId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Task> getTaskById(@PathVariable String taskId) {
        Task task = taskService.findTaskByTaskId(taskId);
        return task != null ? ResponseEntity.ok(task) : ResponseEntity.notFound().build();
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> createTask(@RequestBody Task task, Authentication authentication) {
        try {
            Account account = resolveAccount(authentication);
            if (account == null) {
                return ResponseEntity.badRequest().body("Account not found for authenticated user");
            }

            task.setOwner(account);
            if (task.getProject() != null && task.getProject().getProjectName() != null && !task.getProject().getProjectName().trim().isEmpty()) {
                task.setProject(projectService.ensureProjectExists(account, task.getProject()));
            } else {
                task.setProject(null);
            }
            task.setTags(tagService.ensureTagsExist(account, task.getTags()));
            Task created = taskService.createTask(task, task.isAutoSchedule());
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> updateTask(@RequestBody Task task, Authentication authentication) {
        try {
            Account account = resolveAccount(authentication);
            if (account == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Authenticated account not found"));
            }

            Task existing = taskService.findTaskByTaskId(task.getTaskId());
            if (existing == null) {
                return ResponseEntity.notFound().build();
            }
            if (existing.getOwner() == null || !account.getId().equals(existing.getOwner().getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "You can only update your own tasks"));
            }

            task.setOwner(account);
            if (task.getProject() != null && task.getProject().getProjectName() != null && !task.getProject().getProjectName().trim().isEmpty()) {
                task.setProject(projectService.ensureProjectExists(account, task.getProject()));
            } else {
                task.setProject(null);
            }
            task.setTags(tagService.ensureTagsExist(account, task.getTags()));
            Task updated = taskService.updateTask(task, task.isAutoSchedule());
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{taskId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Void> deleteTask(@PathVariable String taskId) {
        taskService.deleteTask(taskId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/completed")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<Task>> getCompletedTasksForUser(Authentication authentication) {
        String username = authentication.getName();
        Account account = accountService.findAccountByUsername(username);
        if (account == null) {
            return ResponseEntity.notFound().build();
        }
        List<Task> completedTasks = taskService.findAllCompletedTasksByOwner(account);
        return ResponseEntity.ok(completedTasks);
    }

    @PutMapping("/{taskId}/complete")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Task> markTaskAsComplete(@PathVariable String taskId) {
        Task task = taskService.markTaskAsComplete(taskId);
        return ResponseEntity.ok(task);
    }

    @PutMapping("/{taskId}/reopen")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Task> reopenTask(@PathVariable String taskId) {
        Task task = taskService.findTaskByTaskId(taskId);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }
        task.setIsCompleted(false);
        Task updated = taskService.updateTask(task);
        return ResponseEntity.ok(updated);
    }

    private Account resolveAccount(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return accountService.findAccountByUsername(authentication.getName());
    }
}
