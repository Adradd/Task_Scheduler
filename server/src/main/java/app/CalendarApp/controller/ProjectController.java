package app.CalendarApp.controller;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.service.ProjectService;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Exposes project endpoints scoped to the authenticated account.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
@RestController
@AllArgsConstructor
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService projectService;
    private final AccountService accountService;

    /**
     * Lists projects owned by the authenticated account.
     *
     * @param authentication authenticated Spring Security principal
     * @return owned projects or 404 when the account cannot be resolved
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<Project>> getProjectsForUser(Authentication authentication) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(projectService.findAllByOwner(account));
    }

    /**
     * Creates or reuses a project for the authenticated account.
     *
     * @param authentication authenticated Spring Security principal
     * @param payload map containing projectName and optional projectColor
     * @return created project or validation error response
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<?> createProject(Authentication authentication, @RequestBody Map<String, String> payload) {
        Account account = resolveAccount(authentication);
        if (account == null) {
            return ResponseEntity.notFound().build();
        }
        try {
            String projectName = payload.get("projectName");
            String projectColor = payload.get("projectColor");
            Project created = projectService.createProject(account, projectName, projectColor);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Deletes a project and tasks assigned to it for the authenticated account.
     *
     * @param authentication authenticated Spring Security principal
     * @param projectId project identifier or name
     * @return 204 when deleted or validation error response
     */
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
