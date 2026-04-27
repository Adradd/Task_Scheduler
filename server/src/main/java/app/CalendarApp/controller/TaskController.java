package app.CalendarApp.controller;

import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.GoogleCalendarProjectMapping;
import app.CalendarApp.repository.GoogleCalendarProjectMappingRepository;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.service.ProjectService;
import app.CalendarApp.service.TagService;
import app.CalendarApp.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService taskService;
    private final AccountService accountService;
    private final TagService tagService;
    private final ProjectService projectService;
    private final GoogleCalendarProjectMappingRepository mappingRepository;

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
        filterDisabledGoogleCalendarTasks(account, tasks);
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
            task.setImportedFromGoogle(false);
            task.setGoogleSourceCalendarId(null);
            task.setGoogleSourceEventId(null);
            if (task.getProject() != null && task.getProject().getProjectName() != null && !task.getProject().getProjectName().trim().isEmpty()) {
                String projectName = task.getProject().getProjectName().trim();
                var existingProject = projectService.findProjectByOwnerAndName(account, projectName);
                if (existingProject == null) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Project must be selected from existing projects"));
                }
                task.setProject(existingProject);
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
            if (existing.isImportedFromGoogle()) {
                return ResponseEntity.status(403).body(Map.of("error", "Google Calendar events are view-only and cannot be edited in this app"));
            }

            task.setOwner(account);
            task.setImportedFromGoogle(false);
            task.setGoogleSourceCalendarId(existing.getGoogleSourceCalendarId());
            task.setGoogleSourceEventId(existing.getGoogleSourceEventId());
            if (task.getProject() != null && task.getProject().getProjectName() != null && !task.getProject().getProjectName().trim().isEmpty()) {
                String projectName = task.getProject().getProjectName().trim();
                var existingProject = projectService.findProjectByOwnerAndName(account, projectName);
                if (existingProject == null) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Project must be selected from existing projects"));
                }
                task.setProject(existingProject);
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
    public ResponseEntity<?> deleteTask(@PathVariable String taskId, Authentication authentication) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
        }

        Task task = taskService.findTaskByTaskId(taskId);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }
        if (task.getOwner() == null || !account.getId().equals(task.getOwner().getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "You can only delete your own tasks"));
        }
        if (task.isImportedFromGoogle()) {
            return ResponseEntity.status(403).body(Map.of("error", "Google Calendar events are view-only and cannot be deleted in this app"));
        }

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
        filterDisabledGoogleCalendarTasks(account, completedTasks);
        return ResponseEntity.ok(completedTasks);
    }

    private void filterDisabledGoogleCalendarTasks(Account account, List<Task> tasks) {
        if (account == null || account.getId() == null || tasks == null || tasks.isEmpty()) {
            return;
        }

        Set<String> disabledCalendarIds = mappingRepository.findAllByAccountId(account.getId()).stream()
            .filter(mapping -> mapping != null && !mapping.isEnabled())
            .map(GoogleCalendarProjectMapping::getGoogleCalendarId)
            .filter(calendarId -> calendarId != null && !calendarId.isBlank())
            .collect(Collectors.toSet());

        if (disabledCalendarIds.isEmpty()) {
            return;
        }

        tasks.removeIf(task -> task != null
            && task.isImportedFromGoogle()
            && disabledCalendarIds.contains(task.getGoogleSourceCalendarId()));
    }

    @PutMapping("/{taskId}/complete")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> markTaskAsComplete(@PathVariable String taskId, Authentication authentication) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
        }

        Task existing = taskService.findTaskByTaskId(taskId);
        if (existing == null) {
            return ResponseEntity.notFound().build();
        }
        if (existing.getOwner() == null || !account.getId().equals(existing.getOwner().getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "You can only update your own tasks"));
        }
        if (existing.isImportedFromGoogle()) {
            return ResponseEntity.status(403).body(Map.of("error", "Google Calendar events are view-only and cannot be updated in this app"));
        }

        Task task = taskService.markTaskAsComplete(taskId);
        return ResponseEntity.ok(task);
    }

    @PutMapping("/{taskId}/reopen")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> reopenTask(@PathVariable String taskId, Authentication authentication) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
        }

        Task task = taskService.findTaskByTaskId(taskId);
        if (task == null) {
            return ResponseEntity.notFound().build();
        }
        if (task.getOwner() == null || !account.getId().equals(task.getOwner().getId())) {
            return ResponseEntity.status(403).body(Map.of("error", "You can only update your own tasks"));
        }
        if (task.isImportedFromGoogle()) {
            return ResponseEntity.status(403).body(Map.of("error", "Google Calendar events are view-only and cannot be updated in this app"));
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
