package app.CalendarApp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findAllByOwner(Account owner);
    Project findProjectByOwnerAndProjectNameIgnoreCase(Account owner, String projectName);
}

