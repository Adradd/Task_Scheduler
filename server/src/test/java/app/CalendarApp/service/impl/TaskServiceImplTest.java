package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.TaskRepository;
import app.CalendarApp.service.GoogleCalendarService;
import app.CalendarApp.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceImplTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TaskAutoSchedulerService autoSchedulerService;

    @Mock
    private GoogleCalendarService googleCalendarService;

    @InjectMocks
    private TaskServiceImpl taskService;

    private Account owner;
    private Task task;

    @BeforeEach
    void setUp() {
        owner = TestDataFactory.account("acc-1", "jane");
        task = TestDataFactory.task("task-1", owner, "Plan sprint");
    }

    @Test
    void createTaskSavesWithoutAutoScheduling() {
        when(taskRepository.save(task)).thenReturn(task);
        when(googleCalendarService.syncTaskUpsert(task)).thenReturn(task);

        Task created = taskService.createTask(task, false);

        assertSame(task, created);
        verify(autoSchedulerService, never()).scheduleTask(any(), any(), any());
    }

    @Test
    void createTaskAutoSchedulesBeforeSaving() {
        Task scheduled = TestDataFactory.task("task-1", owner, "Plan sprint");
        scheduled.setStartTime("2026-04-09T09:00");
        when(taskRepository.findAllByOwner(owner)).thenReturn(List.of());
        when(autoSchedulerService.scheduleTask(task, owner, List.of())).thenReturn(scheduled);
        when(taskRepository.save(scheduled)).thenReturn(scheduled);
        when(googleCalendarService.syncTaskUpsert(scheduled)).thenReturn(scheduled);

        Task created = taskService.createTask(task, true);

        assertEquals("2026-04-09T09:00", created.getStartTime());
        verify(autoSchedulerService).scheduleTask(task, owner, List.of());
    }

    @Test
    void createTaskRejectsMissingTaskName() {
        task.setTaskName("   ");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> taskService.createTask(task, false));

        assertEquals("Task name is required", exception.getMessage());
    }

    @Test
    void createTaskRejectsMissingOwnerUsername() {
        owner.setUsername(" ");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> taskService.createTask(task, false));

        assertEquals("Owner username is required", exception.getMessage());
    }

    @Test
    void createTaskRejectsInvalidDeadline() {
        task.setDeadline("04/10/2026");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> taskService.createTask(task, false));

        assertEquals("Deadline must be in DD-MM-YYYY or YYYY-MM-DD format", exception.getMessage());
    }

    @Test
    void createTaskRejectsInvalidPriority() {
        task.setPriority("urgent");

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> taskService.createTask(task, false));

        assertEquals("Priority must be low, medium, or high", exception.getMessage());
    }

    @Test
    void createTaskRejectsDuplicateTaskId() {
        when(taskRepository.findTaskByTaskId("task-1")).thenReturn(TestDataFactory.task("task-1", owner, "Existing"));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> taskService.createTask(task, false));

        assertEquals("Task ID already exists", exception.getMessage());
    }

    @Test
    void updateTaskRejectsMissingTask() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> taskService.updateTask(task, false));

        assertEquals("Task does not exist", exception.getMessage());
    }

    @Test
    void updateTaskAutoSchedulesAndSyncs() {
        Task existing = TestDataFactory.task("task-1", owner, "Existing");
        Task scheduled = TestDataFactory.task("task-1", owner, "Existing");
        scheduled.setStartTime("2026-04-09T11:00");
        when(taskRepository.findTaskByTaskId("task-1")).thenReturn(existing);
        when(taskRepository.findAllByOwner(owner)).thenReturn(List.of(existing));
        when(autoSchedulerService.scheduleTask(task, owner, List.of(existing))).thenReturn(scheduled);
        when(taskRepository.save(scheduled)).thenReturn(scheduled);
        when(googleCalendarService.syncTaskUpsert(scheduled)).thenReturn(scheduled);

        Task updated = taskService.updateTask(task, true);

        assertEquals("2026-04-09T11:00", updated.getStartTime());
    }

    @Test
    void createTaskResavesWhenGoogleUpsertReturnsNewEventId() {
        Task saved = TestDataFactory.task("task-1", owner, "Plan sprint");
        Task synced = TestDataFactory.task("task-1", owner, "Plan sprint");
        synced.setGoogleCalendarEventId("event-123");
        when(taskRepository.save(task)).thenReturn(saved);
        when(googleCalendarService.syncTaskUpsert(saved)).thenReturn(synced);
        when(taskRepository.save(synced)).thenReturn(synced);

        Task created = taskService.createTask(task, false);

        assertEquals("event-123", created.getGoogleCalendarEventId());
        verify(taskRepository).save(synced);
    }

    @Test
    void createTaskReturnsSavedTaskWhenGoogleSyncFails() {
        when(taskRepository.save(task)).thenReturn(task);
        when(googleCalendarService.syncTaskUpsert(task)).thenThrow(new RuntimeException("google down"));

        Task created = taskService.createTask(task, false);

        assertSame(task, created);
    }

    @Test
    void deleteTaskSyncsGoogleDeleteForNonImportedTasks() {
        task.setGoogleCalendarEventId("event-1");
        when(taskRepository.findTaskByTaskId("task-1")).thenReturn(task);

        taskService.deleteTask("task-1");

        verify(googleCalendarService).syncTaskDelete(task);
        verify(taskRepository).deleteById("task-1");
    }

    @Test
    void deleteTaskSkipsGoogleDeleteForImportedTasks() {
        task.setImportedFromGoogle(true);
        when(taskRepository.findTaskByTaskId("task-1")).thenReturn(task);

        taskService.deleteTask("task-1");

        verify(googleCalendarService, never()).syncTaskDelete(any());
        verify(taskRepository).deleteById("task-1");
    }

    @Test
    void deleteTaskStillDeletesWhenGoogleSyncFails() {
        when(taskRepository.findTaskByTaskId("task-1")).thenReturn(task);
        when(googleCalendarService.syncTaskDelete(task)).thenThrow(new RuntimeException("google down"));

        taskService.deleteTask("task-1");

        verify(taskRepository).deleteById("task-1");
    }

    @Test
    void markTaskAsCompleteRejectsUnknownTask() {
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> taskService.markTaskAsComplete("missing"));

        assertEquals("Task does not exist", exception.getMessage());
    }

    @Test
    void markTaskAsCompleteUpdatesTask() {
        when(taskRepository.findTaskByTaskId("task-1")).thenReturn(task);
        when(taskRepository.save(task)).thenReturn(task);

        Task completed = taskService.markTaskAsComplete("task-1");

        assertSame(task, completed);
        assertEquals(true, completed.isCompleted());
    }

    @Test
    void updateTaskWithoutGoogleEventIdDoesNotResave() {
        when(taskRepository.findTaskByTaskId("task-1")).thenReturn(task);
        when(taskRepository.save(task)).thenReturn(task);
        when(googleCalendarService.syncTaskUpsert(task)).thenReturn(task);

        Task updated = taskService.updateTask(task, false);

        assertSame(task, updated);
        verify(taskRepository, never()).save(eq((Task) null));
        assertNull(updated.getGoogleCalendarEventId());
    }
}
