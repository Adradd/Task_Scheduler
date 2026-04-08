package app.CalendarApp.controller;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.GoogleCalendarProjectMappingRepository;
import app.CalendarApp.repository.Project;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.repository.Task;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.service.ProjectService;
import app.CalendarApp.service.TagService;
import app.CalendarApp.service.TaskService;
import app.CalendarApp.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
@AutoConfigureMockMvc(addFilters = false)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TaskService taskService;

    @MockitoBean
    private AccountService accountService;

    @MockitoBean
    private TagService tagService;

    @MockitoBean
    private ProjectService projectService;

    @MockitoBean
    private GoogleCalendarProjectMappingRepository mappingRepository;

    private Account owner;

    @BeforeEach
    void setUp() {
        owner = TestDataFactory.account("acc-1", "jane");
    }

    @Test
    void getTasksReturnsOnlyUncompletedAndEnabledTasks() throws Exception {
        Task visible = TestDataFactory.task("task-1", owner, "Visible");
        Task completed = TestDataFactory.task("task-2", owner, "Completed");
        completed.setIsCompleted(true);
        Task importedDisabled = TestDataFactory.task("task-3", owner, "Imported");
        importedDisabled.setImportedFromGoogle(true);
        importedDisabled.setGoogleSourceCalendarId("cal-1");
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(taskService.findAllTasksByOwner(owner)).thenReturn(new java.util.ArrayList<>(List.of(visible, completed, importedDisabled)));
        when(mappingRepository.findAllByAccountId("acc-1")).thenReturn(List.of(TestDataFactory.mapping("acc-1", "cal-1", false)));

        mockMvc.perform(get("/api/tasks").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].taskId").value("task-1"));
    }

    @Test
    void getTasksReturnsNotFoundWhenAccountMissing() throws Exception {
        mockMvc.perform(get("/api/tasks").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isNotFound());
    }

    @Test
    void createTaskSetsOwnerProjectAndTags() throws Exception {
        Project project = TestDataFactory.project("proj-1", owner, "Work");
        Tag tag = TestDataFactory.tag("tag-1", owner, "urgent");
        Task created = TestDataFactory.task("task-1", owner, "Write tests");
        created.setProject(project);
        created.setTags(List.of(tag));
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(projectService.ensureProjectExists(eq(owner), any(Project.class))).thenReturn(project);
        when(tagService.ensureTagsExist(eq(owner), any())).thenReturn(List.of(tag));
        when(taskService.createTask(any(Task.class), eq(true))).thenReturn(created);

        mockMvc.perform(post("/api/tasks")
                .principal(new TestingAuthenticationToken("jane", null, "ROLE_USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "taskId": "task-1",
                      "taskName": "Write tests",
                      "deadline": "2026-04-10",
                      "timeToComplete": "1h",
                      "priority": "high",
                      "autoSchedule": true,
                      "project": {"projectName": "Work"},
                      "tags": [{"tagName": "urgent"}]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.taskId").value("task-1"))
            .andExpect(jsonPath("$.project.projectName").value("Work"))
            .andExpect(jsonPath("$.tags[0].tagName").value("urgent"));
    }

    @Test
    void createTaskReturnsBadRequestWhenAccountMissing() throws Exception {
        mockMvc.perform(post("/api/tasks")
                .principal(new TestingAuthenticationToken("jane", null, "ROLE_USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"taskName\":\"Write tests\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$").value("Account not found for authenticated user"));
    }

    @Test
    void updateTaskReturnsForbiddenForDifferentOwner() throws Exception {
        Account other = TestDataFactory.account("acc-2", "other");
        Task existing = TestDataFactory.task("task-1", other, "Existing");
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(taskService.findTaskByTaskId("task-1")).thenReturn(existing);

        mockMvc.perform(put("/api/tasks")
                .principal(new TestingAuthenticationToken("jane", null, "ROLE_USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"taskId":"task-1","taskName":"Existing","deadline":"2026-04-10","priority":"high"}
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.error").value("You can only update your own tasks"));
    }

    @Test
    void deleteTaskReturnsNoContentForOwner() throws Exception {
        Task existing = TestDataFactory.task("task-1", owner, "Existing");
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(taskService.findTaskByTaskId("task-1")).thenReturn(existing);

        mockMvc.perform(delete("/api/tasks/task-1").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isNoContent());

        verify(taskService).deleteTask("task-1");
    }

    @Test
    void markTaskAsCompleteReturnsUnauthorizedWhenAccountMissing() throws Exception {
        mockMvc.perform(put("/api/tasks/task-1/complete").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Authenticated account not found"));
    }

    @Test
    void reopenTaskReturnsUpdatedTaskForOwner() throws Exception {
        Task existing = TestDataFactory.task("task-1", owner, "Existing");
        existing.setIsCompleted(true);
        Task reopened = TestDataFactory.task("task-1", owner, "Existing");
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(taskService.findTaskByTaskId("task-1")).thenReturn(existing);
        when(taskService.updateTask(any(Task.class))).thenReturn(reopened);

        mockMvc.perform(put("/api/tasks/task-1/reopen").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.taskId").value("task-1"));
    }
}
