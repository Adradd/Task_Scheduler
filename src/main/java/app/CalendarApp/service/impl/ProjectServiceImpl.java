package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;
import app.CalendarApp.repository.ProjectRepository;
import app.CalendarApp.service.ProjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProjectServiceImpl implements ProjectService {
    private final ProjectRepository projectRepository;

    @Autowired
    public ProjectServiceImpl(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

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
    public Project createProject(Account owner, String projectName) {
        validateProject(owner, projectName);

        String normalizedName = projectName.trim();
        Project existing = projectRepository.findProjectByOwnerAndProjectNameIgnoreCase(owner, normalizedName);
        if (existing != null) {
            return existing;
        }

        Project project = new Project();
        project.setOwner(owner);
        project.setProjectName(normalizedName);
        return projectRepository.save(project);
    }

    @Override
    public Project ensureProjectExists(Account owner, Project project) {
        if (project == null || project.getProjectName() == null || project.getProjectName().trim().isEmpty()) {
            throw new IllegalArgumentException("Project is required");
        }

        String projectName = project.getProjectName().trim();
        Project resolvedProject = findProjectByOwnerAndName(owner, projectName);
        if (resolvedProject == null) {
            resolvedProject = createProject(owner, projectName);
        }
        return resolvedProject;
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

