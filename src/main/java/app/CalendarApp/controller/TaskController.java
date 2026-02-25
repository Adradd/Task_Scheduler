package app.CalendarApp.controller;

import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.Account;
import app.CalendarApp.service.TaskService;
import app.CalendarApp.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;
    private final AccountService accountService;

    @Autowired
    public TaskController(TaskService taskService, AccountService accountService) {
        this.taskService = taskService;
        this.accountService = accountService;
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
            String username = authentication.getName();
            Account account = accountService.findAccountByUsername(username);
            if (account == null) {
                return ResponseEntity.badRequest().body("Account not found for user: " + username);
            }

            task.setOwner(account);
            Task created = taskService.createTask(task);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<Task> updateTask(@RequestBody Task task) {
        Task updated = taskService.updateTask(task);
        return ResponseEntity.ok(updated);
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
}
