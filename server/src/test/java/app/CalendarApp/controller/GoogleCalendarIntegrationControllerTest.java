package app.CalendarApp.controller;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.GoogleCalendarProjectMapping;
import app.CalendarApp.repository.GoogleCalendarProjectMappingRepository;
import app.CalendarApp.repository.Project;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.service.GoogleCalendarService;
import app.CalendarApp.service.ProjectService;
import app.CalendarApp.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GoogleCalendarIntegrationController.class)
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = "google.oauth.frontend-url=http://localhost:5173")
class GoogleCalendarIntegrationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GoogleCalendarService googleCalendarService;

    @MockitoBean
    private AccountService accountService;

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
    void statusReturnsUnauthorizedWhenAccountMissing() throws Exception {
        mockMvc.perform(get("/api/integrations/google/status").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.error").value("Authenticated account not found"));
    }

    @Test
    void connectReturnsAuthorizationUrl() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(googleCalendarService.buildAuthorizationUrl(owner)).thenReturn("https://accounts.google.com/o/oauth2/v2/auth?state=abc");

        mockMvc.perform(get("/api/integrations/google/connect").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.authorizationUrl").value("https://accounts.google.com/o/oauth2/v2/auth?state=abc"));
    }

    @Test
    void disconnectReturnsNoContent() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);

        mockMvc.perform(delete("/api/integrations/google/disconnect").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isNoContent());

        verify(googleCalendarService).disconnect(owner);
    }

    @Test
    void eventsReturnsLinkedFalseWhenCalendarNotLinked() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(false);

        mockMvc.perform(get("/api/integrations/google/events").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.linked").value(false))
            .andExpect(jsonPath("$.events.length()").value(0));
    }

    @Test
    void eventsFallsBackToPrimaryCalendarWhenAllMappingsDisabled() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(true);
        when(mappingRepository.findAllByAccountId("acc-1")).thenReturn(List.of(TestDataFactory.mapping("acc-1", "cal-1", false)));
        when(googleCalendarService.fetchEvents(eq(owner), any(), any())).thenReturn(List.of(Map.of("id", "evt-primary")));

        mockMvc.perform(get("/api/integrations/google/events").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.linked").value(true))
            .andExpect(jsonPath("$.events.length()").value(1))
            .andExpect(jsonPath("$.events[0].id").value("evt-primary"))
            .andExpect(jsonPath("$.events[0].googleCalendarId").value("primary"));
    }

    @Test
    void eventsMergesEnabledCalendarsAndAddsMetadata() throws Exception {
        GoogleCalendarProjectMapping enabled = TestDataFactory.mapping("acc-1", "cal-1", true);
        enabled.setGoogleCalendarName("Engineering");
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(true);
        when(mappingRepository.findAllByAccountId("acc-1")).thenReturn(List.of(enabled));
        when(googleCalendarService.fetchEventsForCalendar(eq(owner), eq("cal-1"), any(), any())).thenReturn(List.of(Map.of("id", "evt-1", "summary", "Standup")));

        mockMvc.perform(get("/api/integrations/google/events")
                .param("timeMin", "2026-04-08T00:00:00Z")
                .param("timeMax", "2026-04-09T00:00:00Z")
                .principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.linked").value(true))
            .andExpect(jsonPath("$.events[0].id").value("evt-1"))
            .andExpect(jsonPath("$.events[0].googleCalendarId").value("cal-1"))
            .andExpect(jsonPath("$.events[0].googleCalendarName").value("Engineering"));
    }

    @Test
    void eventsRejectsInvalidTimestamps() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(true);

        mockMvc.perform(get("/api/integrations/google/events")
                .param("timeMin", "not-a-timestamp")
                .principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("timeMin/timeMax must be ISO-8601 timestamps"));
    }

    @Test
    void calendarsReturnsReconnectRequiredOnServiceFailure() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(true);
        when(googleCalendarService.listCalendars(owner)).thenThrow(new IllegalStateException("Reconnect required"));

        mockMvc.perform(get("/api/integrations/google/calendars").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.reconnectRequired").value(true))
            .andExpect(jsonPath("$.error").value("Reconnect required"));
    }

    @Test
    void getProjectMappingsReturnsStoredMappings() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(mappingRepository.findAllByAccountId("acc-1")).thenReturn(List.of(TestDataFactory.mapping("acc-1", "cal-1", true)));

        mockMvc.perform(get("/api/integrations/google/project-mappings").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.mappings[0].googleCalendarId").value("cal-1"));
    }

    @Test
    void saveProjectMappingsRejectsNonArrayPayload() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);

        mockMvc.perform(put("/api/integrations/google/project-mappings")
                .principal(new TestingAuthenticationToken("jane", null, "ROLE_USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"mappings\":{}}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("mappings must be an array"));
    }

    @Test
    void saveProjectMappingsUpsertsValidMappings() throws Exception {
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(mappingRepository.findByAccountIdAndGoogleCalendarId("acc-1", "cal-1")).thenReturn(null);

        mockMvc.perform(put("/api/integrations/google/project-mappings")
                .principal(new TestingAuthenticationToken("jane", null, "ROLE_USER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "mappings": [
                        {
                          "googleCalendarId": "cal-1",
                          "googleCalendarName": "Engineering",
                          "projectId": "proj-1",
                          "enabled": true
                        },
                        {
                          "googleCalendarId": ""
                        }
                      ]
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Mappings saved"));

        verify(mappingRepository).save(any(GoogleCalendarProjectMapping.class));
    }

    @Test
    void importMappedCalendarsImportsOnlyEnabledMappedProjects() throws Exception {
        Project project = TestDataFactory.project("proj-1", owner, "Work");
        GoogleCalendarProjectMapping enabled = TestDataFactory.mapping("acc-1", "cal-1", true);
        enabled.setProjectId("proj-1");
        GoogleCalendarProjectMapping disabled = TestDataFactory.mapping("acc-1", "cal-2", false);
        disabled.setProjectId("proj-1");
        when(accountService.findAccountByUsername("jane")).thenReturn(owner);
        when(projectService.findAllByOwner(owner)).thenReturn(List.of(project));
        when(mappingRepository.findAllByAccountId("acc-1")).thenReturn(List.of(enabled, disabled));
        when(googleCalendarService.importCalendarEventsToProject(owner, project, "cal-1", null, null)).thenReturn(3);

        mockMvc.perform(post("/api/integrations/google/import-mapped-calendars").principal(new TestingAuthenticationToken("jane", null, "ROLE_USER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.importedCount").value(3));
    }
}
