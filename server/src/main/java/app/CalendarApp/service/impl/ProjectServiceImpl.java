package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;
import app.CalendarApp.repository.ProjectRepository;
import app.CalendarApp.repository.TaskRepository;
import app.CalendarApp.service.ProjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProjectServiceImpl implements ProjectService {
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private static final String DEFAULT_PROJECT_COLOR = "#3fb0ba";

    @Override
    public List<Project> findAllByOwner(Account owner) {
        if (owner == null) {
            return new ArrayList<>();
        }
        return projectRepository.findAllByOwner(owner);
    }

    @Override
    public Project findProjectByOwnerAndName(Account owner, String projectName) {
        validateProject(owner, projectName);
        return projectRepository.findProjectByOwnerAndProjectNameIgnoreCase(owner, projectName.trim());
    }

    @Override
    public Project createProject(Account owner, String projectName, String projectColor) {
        validateProject(owner, projectName);

        String normalizedName = projectName.trim();
        String requestedColor = normalizeProjectColorOrNull(projectColor);
        String normalizedColor = requestedColor != null ? requestedColor : DEFAULT_PROJECT_COLOR;
        Project existing = projectRepository.findProjectByOwnerAndProjectNameIgnoreCase(owner, normalizedName);
        if (existing != null) {
            if (requestedColor != null && !requestedColor.equalsIgnoreCase(existing.getProjectColor())) {
                existing.setProjectColor(requestedColor);
                return projectRepository.save(existing);
            }
            if (existing.getProjectColor() == null || existing.getProjectColor().isBlank()) {
                existing.setProjectColor(DEFAULT_PROJECT_COLOR);
                return projectRepository.save(existing);
            }
            return existing;
        }

        Project project = new Project();
        project.setOwner(owner);
        project.setProjectName(normalizedName);
        project.setProjectColor(normalizedColor);
        return projectRepository.save(project);
    }

    @Override
    public void deleteProject(Account owner, String projectId) {
        if (owner == null) {
            throw new IllegalArgumentException("Owner is required");
        }
        if (projectId == null || projectId.trim().isEmpty()) {
            throw new IllegalArgumentException("Project ID is required");
        }

        String identifier = projectId.trim();
        Project project = projectRepository.findProjectByProjectIdAndOwner(identifier, owner);
        if (project == null) {
            project = projectRepository.findProjectByOwnerAndProjectNameIgnoreCase(owner, identifier);
        }
        if (project == null) {
            throw new IllegalArgumentException("Project does not exist");
        }

        taskRepository.deleteAllByOwnerAndProject(owner, project);
        projectRepository.delete(project);
    }

    @Override
    public Project ensureProjectExists(Account owner, Project project) {
        if (project == null || project.getProjectName() == null || project.getProjectName().trim().isEmpty()) {
            throw new IllegalArgumentException("Project is required");
        }

        String projectName = project.getProjectName().trim();
        Project resolvedProject = findProjectByOwnerAndName(owner, projectName);
        if (resolvedProject == null) {
            resolvedProject = createProject(owner, projectName, project.getProjectColor());
        } else {
            String incomingColor = normalizeProjectColorOrNull(project.getProjectColor());
            if (incomingColor != null && !incomingColor.equalsIgnoreCase(resolvedProject.getProjectColor())) {
                resolvedProject.setProjectColor(incomingColor);
                resolvedProject = projectRepository.save(resolvedProject);
            }
        }
        return resolvedProject;
    }

    private String normalizeProjectColorOrNull(String projectColor) {
        if (projectColor == null || projectColor.isBlank()) {
            return null;
        }
        String trimmed = projectColor.trim();
        if (trimmed.matches("^#[0-9a-fA-F]{6}$")) {
            return trimmed.toLowerCase();
        }
        return null;
    }

    private void validateProject(Account owner, String projectName) {
        if (owner == null) {
            throw new IllegalArgumentException("Owner is required");
        }
        if (projectName == null || projectName.trim().isEmpty()) {
            throw new IllegalArgumentException("Project name is required");
        }
    }
}
