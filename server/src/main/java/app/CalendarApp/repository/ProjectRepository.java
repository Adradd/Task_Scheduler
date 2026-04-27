package app.CalendarApp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

/**
 * Mongo repository for user-owned projects.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findAllByOwner(Account owner);
    Project findProjectByProjectIdAndOwner(String projectId, Account owner);
    Project findProjectByOwnerAndProjectNameIgnoreCase(Account owner, String projectName);
    void deleteAllByOwner(Account owner);
}
