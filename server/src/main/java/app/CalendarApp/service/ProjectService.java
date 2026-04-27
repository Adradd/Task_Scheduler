package app.CalendarApp.service;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;

import java.util.List;

/**
 * Service contract for managing projects owned by an account.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
public interface ProjectService {
    /**
     * Lists all projects owned by an account.
     *
     * @param owner account owner
     * @return owned projects, or an empty list when owner is null
     */
    List<Project> findAllByOwner(Account owner);

    /**
     * Finds a project by owner and case-insensitive name.
     *
     * @param owner account owner
     * @param projectName project name to search for
     * @return matching project or null
     */
    Project findProjectByOwnerAndName(Account owner, String projectName);

    /**
     * Creates a project or returns an existing matching project.
     *
     * @param owner account owner
     * @param projectName project display name
     * @param projectColor optional hex color
     * @return created or existing project
     */
    Project createProject(Account owner, String projectName, String projectColor);

    /**
     * Deletes a project and the owner's tasks assigned to it.
     *
     * @param owner account owner
     * @param projectId project identifier or name
     */
    void deleteProject(Account owner, String projectId);

    /**
     * Resolves a project reference, creating it when needed.
     *
     * @param owner account owner
     * @param project project reference from a task payload
     * @return persisted project
     */
    Project ensureProjectExists(Account owner, Project project);
}
