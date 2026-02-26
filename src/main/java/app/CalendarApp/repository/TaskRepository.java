package app.CalendarApp.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskRepository extends MongoRepository<Task, String> {
    Task findTaskByTaskId(String taskId);
    Task findTaskByOwner(Account owner);
    List<Task> findAllByOwner(Account owner);
    Task findTaskByDeadline(String deadline);
    Task findTaskByPriority(String priority);
    Task findTaskByProject(String project);
    Task findTaskByTags(String tags);
    List<Task> findAllByOwnerAndIsCompleted(Account owner, boolean isCompleted);
}
