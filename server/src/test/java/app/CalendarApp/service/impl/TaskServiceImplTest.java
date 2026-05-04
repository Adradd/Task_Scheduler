package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.GoogleCalendarProjectMappingRepository;
import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.TaskRepository;
import app.CalendarApp.service.GoogleCalendarService;
import app.CalendarApp.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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

    @Mock
    private GoogleCalendarProjectMappingRepository mappingRepository;

    @InjectMocks
    private TaskServiceImpl taskService;

    private Account owner;
    private Task task;

    @BeforeEach
    void setUp() {
        owner = TestDataFactory.account("acc-1", "jane");
        task = TestDataFactory.task("task-1", owner, "Plan sprint");
        setDefaultTimeZone(taskService);
    }

    @Test
    void createTaskSavesWithoutAutoScheduling() {
        when(taskRepository.save(task)).thenReturn(task);

        Task created = taskService.createTask(task, false);

        assertSame(task, created);
        verify(autoSchedulerService, never()).scheduleTask(any(), any(), any());
    }

    @Test
    void createTaskAutoSchedulesBeforeSaving() {
        Task scheduled = TestDataFactory.task("task-1", owner, "Plan sprint");
        scheduled.setStartTime(LocalDateTime.of(2026, 4, 9, 9, 0));
        when(taskRepository.findAllByOwner(owner)).thenReturn(List.of());
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(false);
        when(autoSchedulerService.scheduleTask(task, owner, List.of(), List.of())).thenReturn(scheduled);
        when(taskRepository.save(scheduled)).thenReturn(scheduled);

        Task created = taskService.createTask(task, true);

        assertEquals(LocalDateTime.of(2026, 4, 9, 9, 0), created.getStartTime());
        verify(autoSchedulerService).scheduleTask(task, owner, List.of(), List.of());
    }

    @Test
    void createTaskAutoSchedulesWithGoogleBusyIntervals() {
        Task scheduled = TestDataFactory.task("task-1", owner, "Plan sprint");
        scheduled.setStartTime(LocalDateTime.of(2026, 4, 9, 11, 0));
        scheduled.setDeadline(LocalDate.of(2026, 4, 10));
        task.setDeadline(LocalDate.of(2026, 4, 10));

        when(taskRepository.findAllByOwner(owner)).thenReturn(List.of());
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(true);
        when(mappingRepository.findAllByAccountId("acc-1")).thenReturn(List.of());
        when(googleCalendarService.fetchEvents(eq(owner), any(), any())).thenReturn(List.of(Map.of(
            "start", Map.of("dateTime", "2026-04-09T09:00:00Z"),
            "end", Map.of("dateTime", "2026-04-09T10:00:00Z")
        )));
        when(autoSchedulerService.scheduleTask(eq(task), eq(owner), eq(List.of()), any())).thenReturn(scheduled);
        when(taskRepository.save(scheduled)).thenReturn(scheduled);

        Task created = taskService.createTask(task, true);

        assertEquals(LocalDateTime.of(2026, 4, 9, 11, 0), created.getStartTime());
        verify(autoSchedulerService).scheduleTask(eq(task), eq(owner), eq(List.of()), any());
    }

    @Test
    void createTaskParsesGoogleDateTimesWithoutOffsetForBusyIntervals() {
        Task scheduled = TestDataFactory.task("task-1", owner, "Plan sprint");
        scheduled.setStartTime(LocalDateTime.of(2026, 4, 24, 11, 0));
        task.setDeadline(LocalDate.of(2026, 4, 24));

        when(taskRepository.findAllByOwner(owner)).thenReturn(List.of());
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(true);
        when(mappingRepository.findAllByAccountId("acc-1")).thenReturn(List.of());
        when(googleCalendarService.fetchEvents(eq(owner), any(), any())).thenReturn(List.of(Map.of(
            "start", Map.of("dateTime", "2026-04-24T09:00:00", "timeZone", "America/New_York"),
            "end", Map.of("dateTime", "2026-04-24T10:00:00", "timeZone", "America/New_York")
        )));
        when(autoSchedulerService.scheduleTask(eq(task), eq(owner), eq(List.of()), any())).thenReturn(scheduled);
        when(taskRepository.save(scheduled)).thenReturn(scheduled);

        Task created = taskService.createTask(task, true);

        assertEquals(LocalDateTime.of(2026, 4, 24, 11, 0), created.getStartTime());

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TaskAutoSchedulerService.BusyInterval>> busyCaptor = ArgumentCaptor.forClass(List.class);
        verify(autoSchedulerService).scheduleTask(eq(task), eq(owner), eq(List.of()), busyCaptor.capture());
        List<TaskAutoSchedulerService.BusyInterval> intervals = busyCaptor.getValue();

        assertEquals(1, intervals.size());
        assertEquals(LocalDateTime.of(2026, 4, 24, 9, 0), intervals.getFirst().start());
        assertEquals(LocalDateTime.of(2026, 4, 24, 10, 0), intervals.getFirst().end());
    }

    @Test
    void createTaskConvertsUtcGoogleDateTimesIntoSchedulingTimezone() {
        Task scheduled = TestDataFactory.task("task-1", owner, "Plan sprint");
        scheduled.setStartTime(LocalDateTime.of(2026, 4, 24, 11, 0));
        task.setDeadline(LocalDate.of(2026, 4, 24));

        when(taskRepository.findAllByOwner(owner)).thenReturn(List.of());
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(true);
        when(mappingRepository.findAllByAccountId("acc-1")).thenReturn(List.of());
        when(googleCalendarService.fetchEvents(eq(owner), any(), any())).thenReturn(List.of(Map.of(
            "start", Map.of("dateTime", "2026-04-24T13:00:00Z"),
            "end", Map.of("dateTime", "2026-04-24T14:00:00Z")
        )));
        when(autoSchedulerService.scheduleTask(eq(task), eq(owner), eq(List.of()), any())).thenReturn(scheduled);
        when(taskRepository.save(scheduled)).thenReturn(scheduled);

        taskService.createTask(task, true);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<TaskAutoSchedulerService.BusyInterval>> busyCaptor = ArgumentCaptor.forClass(List.class);
        verify(autoSchedulerService).scheduleTask(eq(task), eq(owner), eq(List.of()), busyCaptor.capture());
        List<TaskAutoSchedulerService.BusyInterval> intervals = busyCaptor.getValue();

        assertEquals(1, intervals.size());
        assertEquals(LocalDateTime.of(2026, 4, 24, 9, 0), intervals.getFirst().start());
        assertEquals(LocalDateTime.of(2026, 4, 24, 10, 0), intervals.getFirst().end());
    }

    @Test
    void createTaskPrefersTomorrowOpenTimeOverDeadlineDayGoogleBusyEvent() {
        TaskAutoSchedulerService realScheduler = new TaskAutoSchedulerService();
        TaskServiceImpl realTaskService = new TaskServiceImpl(taskRepository, realScheduler, googleCalendarService, mappingRepository);
        setDefaultTimeZone(realTaskService);

        LocalDate deadline = LocalDate.now().plusDays(2);
        Task toSchedule = TestDataFactory.task("task-5", owner, "Task 5");
        toSchedule.setDeadline(deadline);
        toSchedule.setTimeToComplete("1h 0m");

        Task blockToday = TestDataFactory.task("busy-today", owner, "Busy today");
        blockToday.setStartTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(9, 0)));
        blockToday.setEndTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(17, 0)));

        when(taskRepository.findAllByOwner(owner)).thenReturn(List.of(blockToday));
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(true);
        when(mappingRepository.findAllByAccountId("acc-1")).thenReturn(List.of());
        when(googleCalendarService.fetchEvents(eq(owner), any(), any())).thenReturn(List.of(Map.of(
            "start", Map.of("dateTime", deadline.atTime(13, 0) + "Z"),
            "end", Map.of("dateTime", deadline.atTime(14, 0) + "Z")
        )));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Task created = realTaskService.createTask(toSchedule, true);

        LocalDate tomorrow = LocalDate.now().plusDays(1);
        assertEquals(LocalDateTime.of(tomorrow, LocalTime.of(9, 0)), created.getStartTime());
        assertEquals(LocalDateTime.of(tomorrow, LocalTime.of(10, 0)), created.getEndTime());
        assertTrue(created.getEndTime().isAfter(created.getStartTime()));
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
        scheduled.setStartTime(LocalDateTime.of(2026, 4, 9, 11, 0));
        when(taskRepository.findTaskByTaskId("task-1")).thenReturn(existing);
        when(taskRepository.findAllByOwner(owner)).thenReturn(List.of(existing));
        when(googleCalendarService.isCalendarLinked(owner)).thenReturn(false);
        when(autoSchedulerService.scheduleTask(task, owner, List.of(existing), List.of())).thenReturn(scheduled);
        when(taskRepository.save(scheduled)).thenReturn(scheduled);

        Task updated = taskService.updateTask(task, true);

        assertEquals(LocalDateTime.of(2026, 4, 9, 11, 0), updated.getStartTime());
    }

    @Test
    void createTaskRejectsInvalidScheduleRange() {
        task.setStartTime(LocalDateTime.of(2026, 4, 10, 12, 0));
        task.setEndTime(LocalDateTime.of(2026, 4, 10, 11, 0));

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> taskService.createTask(task, false));

        assertEquals("End time must be after start time", exception.getMessage());
    }

    @Test
    void createTaskDoesNotSyncToGoogleCalendar() {
        when(taskRepository.save(task)).thenReturn(task);

        Task created = taskService.createTask(task, false);

        assertSame(task, created);
        verify(googleCalendarService, never()).syncTaskUpsert(any());
    }

    @Test
    void deleteTaskDeletesWithoutGoogleSync() {
        when(taskRepository.findTaskByTaskId("task-1")).thenReturn(task);

        taskService.deleteTask("task-1");

        verify(googleCalendarService, never()).syncTaskDelete(any());
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
        assertTrue(completed.isCompleted());
    }

    private static void setDefaultTimeZone(TaskServiceImpl service) {
        try {
            Field field = TaskServiceImpl.class.getDeclaredField("defaultTimeZone");
            field.setAccessible(true);
            field.set(service, "America/New_York");
        } catch (ReflectiveOperationException ex) {
            throw new RuntimeException("Failed to set TaskServiceImpl defaultTimeZone for tests", ex);
        }
    }

    @Test
    void updateTaskWithoutGoogleSync() {
        when(taskRepository.findTaskByTaskId("task-1")).thenReturn(task);
        when(taskRepository.save(task)).thenReturn(task);

        Task updated = taskService.updateTask(task, false);

        assertSame(task, updated);
        verify(googleCalendarService, never()).syncTaskUpsert(any());
        assertNull(updated.getGoogleCalendarEventId());
    }
}
