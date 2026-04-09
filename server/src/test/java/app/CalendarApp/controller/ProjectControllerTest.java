package app.CalendarApp.controller;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.service.ProjectService;
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

import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProjectController.class)
@AutoConfigureMockMvc(addFilters = false)
class ProjectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ProjectService projectService;

    @MockitoBean
    private AccountService accountService;

    private Account owner;

    @BeforeEach
    void setUp() {
        owner = TestDataFactory.account("acc-1", "jane");
    }

    @Test
    void getProjectsReturnsUserProjects() throws Exception {
        Project project = TestDataFactory.project("proj-1", owner, "Work");
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(projectService.findAllByOwner(owner)).thenReturn(List.of(project));

        mockMvc.perform(get("/api/projects").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].projectName").value("Work"));
    }

    @Test
    void createProjectReturnsBadRequestOnValidationError() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(projectService.createProject(owner, "Work", "#123456")).thenThrow(new IllegalArgumentException("Project name is required"));

        mockMvc.perform(post("/api/projects")
                .principal(new TestingAuthenticationToken("jane", null, "ROLE_USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"projectName\":\"Work\",\"projectColor\":\"#123456\"}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Project name is required"));
    }

    @Test
    void deleteProjectReturnsNoContentOnSuccess() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);

        mockMvc.perform(delete("/api/projects/proj-1").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isNoContent());
    }

    @Test
    void deleteProjectReturnsBadRequestOnServiceFailure() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        doThrow(new IllegalArgumentException("Project does not exist")).when(projectService).deleteProject(owner, "missing");

        mockMvc.perform(delete("/api/projects/missing").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("Project does not exist"));
    }

    @Test
    void unresolvedAccountReturnsNotFound() throws Exception {
        mockMvc.perform(get("/api/projects").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isNotFound());
    }
}
