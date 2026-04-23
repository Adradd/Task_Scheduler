package app.CalendarApp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.time.LocalDate;

@Repository
public interface TaskRepository extends MongoRepository<Task, String> {
    Task findTaskByTaskId(String taskId);
    Task findTaskByOwner(Account owner);
    List<Task> findAllByOwner(Account owner);
    Task findTaskByDeadline(LocalDate deadline);
    Task findTaskByPriority(TaskPriority priority);
    Task findTaskByProject(Project project);
    List<Task> findAllByTagsContaining(Tag tag);
    List<Task> findAllByOwnerAndIsCompleted(Account owner, boolean isCompleted);
    Task findTaskByOwnerAndGoogleSourceCalendarIdAndGoogleSourceEventId(Account owner, String googleSourceCalendarId, String googleSourceEventId);
    void deleteAllByOwnerAndProject(Account owner, Project project);
    void deleteAllByOwner(Account owner);
}
