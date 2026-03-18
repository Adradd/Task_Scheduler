package app.CalendarApp.service;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;

import java.util.List;

public interface ProjectService {
    List<Project> findAllByOwner(Account owner);
    Project findProjectByOwnerAndName(Account owner, String projectName);
    Project createProject(Account owner, String projectName);
    void deleteProject(Account owner, String projectId);
    Project ensureProjectExists(Account owner, Project project);
}
