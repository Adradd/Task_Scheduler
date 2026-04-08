package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Project;
import app.CalendarApp.repository.ProjectRepository;
import app.CalendarApp.repository.TaskRepository;
import app.CalendarApp.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectServiceImplTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private ProjectServiceImpl projectService;

    private Account owner;

    @BeforeEach
    void setUp() {
        owner = TestDataFactory.account("acc-1", "jane");
    }

    @Test
    void findAllByOwnerReturnsEmptyListForNullOwner() {
        assertEquals(List.of(), projectService.findAllByOwner(null));
    }

    @Test
    void createProjectNormalizesNameAndDefaultsColor() {
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Project created = projectService.createProject(owner, "  Work  ", null);

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());
        assertEquals("Work", created.getProjectName());
        assertEquals("#3fb0ba", created.getProjectColor());
        assertEquals("#3fb0ba", captor.getValue().getProjectColor());
    }

    @Test
    void createProjectReturnsExistingProjectWhenAlreadyPresent() {
        Project existing = TestDataFactory.project("proj-1", owner, "Work");
        when(projectRepository.findProjectByOwnerAndProjectNameIgnoreCase(owner, "Work")).thenReturn(existing);

        Project result = projectService.createProject(owner, "Work", "#3fb0ba");

        assertSame(existing, result);
    }

    @Test
    void createProjectUpdatesColorForExistingProject() {
        Project existing = TestDataFactory.project("proj-1", owner, "Work");
        existing.setProjectColor("#3fb0ba");
        when(projectRepository.findProjectByOwnerAndProjectNameIgnoreCase(owner, "Work")).thenReturn(existing);
        when(projectRepository.save(existing)).thenReturn(existing);

        Project result = projectService.createProject(owner, "Work", "#123456");

        assertEquals("#123456", result.getProjectColor());
        verify(projectRepository).save(existing);
    }

    @Test
    void deleteProjectDeletesByProjectId() {
        Project project = TestDataFactory.project("proj-1", owner, "Work");
        when(projectRepository.findProjectByProjectIdAndOwner("proj-1", owner)).thenReturn(project);

        projectService.deleteProject(owner, "proj-1");

        verify(taskRepository).deleteAllByOwnerAndProject(owner, project);
        verify(projectRepository).delete(project);
    }

    @Test
    void deleteProjectFallsBackToProjectName() {
        Project project = TestDataFactory.project("proj-1", owner, "Work");
        when(projectRepository.findProjectByProjectIdAndOwner("Work", owner)).thenReturn(null);
        when(projectRepository.findProjectByOwnerAndProjectNameIgnoreCase(owner, "Work")).thenReturn(project);

        projectService.deleteProject(owner, "Work");

        verify(projectRepository).delete(project);
    }

    @Test
    void deleteProjectRejectsMissingProject() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> projectService.deleteProject(owner, "missing"));

        assertEquals("Project does not exist", exception.getMessage());
    }

    @Test
    void ensureProjectExistsCreatesMissingProject() {
        Project incoming = TestDataFactory.project(null, null, "Inbox");
        incoming.setProjectColor("#999999");
        when(projectRepository.findProjectByOwnerAndProjectNameIgnoreCase(owner, "Inbox")).thenReturn(null);
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Project resolved = projectService.ensureProjectExists(owner, incoming);

        assertNotNull(resolved);
        assertEquals("Inbox", resolved.getProjectName());
        assertEquals("#999999", resolved.getProjectColor());
    }

    @Test
    void ensureProjectExistsUpdatesColorForExistingProject() {
        Project existing = TestDataFactory.project("proj-1", owner, "Inbox");
        Project incoming = TestDataFactory.project(null, null, "Inbox");
        incoming.setProjectColor("#654321");
        when(projectRepository.findProjectByOwnerAndProjectNameIgnoreCase(owner, "Inbox")).thenReturn(existing);
        when(projectRepository.save(existing)).thenReturn(existing);

        Project resolved = projectService.ensureProjectExists(owner, incoming);

        assertEquals("#654321", resolved.getProjectColor());
        verify(projectRepository).save(existing);
    }

    @Test
    void createProjectRejectsMissingOwner() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> projectService.createProject(null, "Work", null));

        assertEquals("Owner is required", exception.getMessage());
    }

    @Test
    void createProjectRejectsBlankName() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> projectService.createProject(owner, "   ", null));

        assertEquals("Project name is required", exception.getMessage());
    }
}
