package app.CalendarApp;

import app.CalendarApp.repository.AccountRepository;
import app.CalendarApp.repository.GoogleCalendarProjectMappingRepository;
import app.CalendarApp.repository.ProjectRepository;
import app.CalendarApp.repository.TagRepository;
import app.CalendarApp.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(properties = {
    "spring.autoconfigure.exclude=org.springframework.boot.mongodb.autoconfigure.MongoAutoConfiguration,"
        + "org.springframework.boot.data.mongodb.autoconfigure.DataMongoAutoConfiguration,"
        + "org.springframework.boot.data.mongodb.autoconfigure.DataMongoRepositoriesAutoConfiguration"
})
class TaskSchedulerApplicationTests {

    @MockitoBean
    private AccountRepository accountRepository;

    @MockitoBean
    private TaskRepository taskRepository;

    @MockitoBean
    private ProjectRepository projectRepository;

    @MockitoBean
    private TagRepository tagRepository;

    @MockitoBean
    private GoogleCalendarProjectMappingRepository mappingRepository;

    @Test
    void contextLoads() {
    }

}
