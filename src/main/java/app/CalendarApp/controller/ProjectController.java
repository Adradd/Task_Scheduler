package app.CalendarApp.controller;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.service.ProjectService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final AccountService accountService;

    public ProjectController(ProjectService projectService, AccountService accountService) {
        this.projectService = projectService;
        this.accountService = accountService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<Project>> getProjectsForUser(Authentication authentication) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(projectService.findAllByOwner(account));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> createProject(Authentication authentication, @RequestBody Map<String, String> payload) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.notFound().build();
        }
        try {
            String projectName = payload.get("projectName");
            Project created = projectService.createProject(account, projectName);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{projectId}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> deleteProject(Authentication authentication, @PathVariable String projectId) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.notFound().build();
        }
        try {
            projectService.deleteProject(account, projectId);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private Account resolveAccount(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        return accountService.findAccountByUsername(authentication.getName());
    }
}
