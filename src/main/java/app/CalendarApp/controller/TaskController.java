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
    public ResponseEntity<Task> createTask(@RequestBody Task task, Authentication authentication) {
//        String username = authentication.getName();
//        Account account = accountService.findAccountByUsername(username);
//        if (account == null) {
//            return ResponseEntity.badRequest().build();
//        }
//        task.setOwner(account);
        Task created = taskService.createTask(task);
//        // TODO: Create Account login section and create task with the logged in user as owner.
        return ResponseEntity.ok(created);
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
}
