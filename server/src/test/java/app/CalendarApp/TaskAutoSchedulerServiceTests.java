package app.CalendarApp;

import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.TaskPriority;
import app.CalendarApp.service.impl.TaskAutoSchedulerService;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TaskAutoSchedulerServiceTests {

    private final TaskAutoSchedulerService schedulerService = new TaskAutoSchedulerService();

    @Test
    void parsesTimeToCompleteFormats() {
        assertEquals(90, schedulerService.parseTimeToCompleteMinutes("1h 30m"));
        assertEquals(120, schedulerService.parseTimeToCompleteMinutes("2 hours"));
        assertEquals(45, schedulerService.parseTimeToCompleteMinutes("45m"));
    }

    @Test
    void roundsUpToNextQuarterHourAlways() {
        LocalDateTime atQuarter = LocalDateTime.of(2026, 3, 19, 14, 15, 0);
        LocalDateTime notQuarter = LocalDateTime.of(2026, 3, 19, 14, 16, 0);

        assertEquals(LocalDateTime.of(2026, 3, 19, 14, 30, 0), schedulerService.roundUpToNextQuarterHour(atQuarter));
        assertEquals(LocalDateTime.of(2026, 3, 19, 14, 30, 0), schedulerService.roundUpToNextQuarterHour(notQuarter));
    }

    @Test
    void ordersByPriorityThenDeadlineThenCreationOrder() {
        Task lowEarlierId = createTask("task_100", "Low", "2026-03-20");
        Task highLaterDeadline = createTask("task_300", "High", "2026-03-21");
        Task highEarlierDeadline = createTask("task_200", "High", "2026-03-20");

        List<Task> ordered = schedulerService.orderTasksForScheduling(List.of(lowEarlierId, highLaterDeadline, highEarlierDeadline));

        assertEquals("task_200", ordered.get(0).getTaskId());
        assertEquals("task_300", ordered.get(1).getTaskId());
        assertEquals("task_100", ordered.get(2).getTaskId());
    }

    @Test
    void schedulesIntoEarliestAvailableGapInsideWorkingHours() {
        LocalDateTime earliest = schedulerService.roundUpToNextQuarterHour(LocalDateTime.now());
        LocalDate targetDate = earliest.toLocalDate();
        Account owner = createOwner("00:00", "23:59");
        Task task = createTask("task_new", "High", targetDate.toString());
        task.setTimeToComplete("1h 0m");

        Task occupied = createTask("task_busy", "Medium", targetDate.toString());
        occupied.setStartTime(earliest.withSecond(0).withNano(0));
        occupied.setEndTime(earliest.plusHours(1).withSecond(0).withNano(0));

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(occupied));

        assertEquals(earliest.plusHours(1).withSecond(0).withNano(0), scheduled.getStartTime());
        assertEquals(earliest.plusHours(2).withSecond(0).withNano(0), scheduled.getEndTime());
    }

    @Test
    void skipsCompletedTasksAndCurrentTaskWhileScheduling() {
        LocalDateTime earliest = schedulerService.roundUpToNextQuarterHour(LocalDateTime.now());
        LocalDate targetDate = earliest.toLocalDate();
        Account owner = createOwner("00:00", "23:59");
        Task task = createTask("task_same", "High", targetDate.toString());
        task.setTimeToComplete("30m");

        Task completed = createTask("task_completed", "High", targetDate.toString());
        completed.setStartTime(earliest.withSecond(0).withNano(0));
        completed.setEndTime(earliest.plusHours(3).withSecond(0).withNano(0));
        completed.setIsCompleted(true);

        Task sameTask = createTask("task_same", "High", targetDate.toString());
        sameTask.setStartTime(earliest.withSecond(0).withNano(0));
        sameTask.setEndTime(earliest.plusHours(3).withSecond(0).withNano(0));

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(completed, sameTask));

        assertEquals(earliest.withSecond(0).withNano(0), scheduled.getStartTime());
        assertEquals(earliest.plusMinutes(30).withSecond(0).withNano(0), scheduled.getEndTime());
    }

    @Test
    void clipsExistingIntervalsToWorkingHours() {
        LocalDate targetDate = LocalDate.now().plusDays(1);
        Account owner = createOwner("09:00", "17:00");
        Task task = createTask("task_new", "High", targetDate.toString());
        task.setTimeToComplete("1h 0m");

        Task blockToday = createTask("task_today", "High", LocalDate.now().toString());
        blockToday.setStartTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(9, 0)));
        blockToday.setEndTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(17, 0)));

        Task occupied = createTask("task_busy", "Medium", targetDate.toString());
        occupied.setStartTime(LocalDateTime.of(targetDate, LocalTime.of(7, 30)));
        occupied.setEndTime(LocalDateTime.of(targetDate, LocalTime.of(9, 30)));

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(blockToday, occupied));

        assertEquals(LocalDateTime.of(targetDate, LocalTime.of(9, 30)), scheduled.getStartTime());
        assertEquals(LocalDateTime.of(targetDate, LocalTime.of(10, 30)), scheduled.getEndTime());
    }

    @Test
    void movesToNextDayWhenTodayHasNoRoom() {
        Account owner = createOwner("09:00", "10:00");
        Task task = createTask("task_new", "High", LocalDate.now().plusDays(1).toString());
        task.setTimeToComplete("1h 0m");

        Task occupied = createTask("task_busy", "Medium", LocalDate.now().toString());
        occupied.setStartTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(9, 0)));
        occupied.setEndTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(10, 0)));

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(occupied));

        assertEquals(LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.of(9, 0)), scheduled.getStartTime());
        assertEquals(LocalDateTime.of(LocalDate.now().plusDays(1), LocalTime.of(10, 0)), scheduled.getEndTime());
    }

    @Test
    void avoidsExternalBusyIntervalsDuringAutoScheduling() {
        LocalDate targetDate = LocalDate.now().plusDays(1);
        Account owner = createOwner("09:00", "17:00");
        Task task = createTask("task_new", "High", targetDate.toString());
        task.setTimeToComplete("1h 0m");

        Task blockToday = createTask("task_today", "High", LocalDate.now().toString());
        blockToday.setStartTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(9, 0)));
        blockToday.setEndTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(17, 0)));

        List<TaskAutoSchedulerService.BusyInterval> googleBusy = List.of(
            new TaskAutoSchedulerService.BusyInterval(
                LocalDateTime.of(targetDate, LocalTime.of(9, 0)),
                LocalDateTime.of(targetDate, LocalTime.of(10, 30))
            )
        );

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(blockToday), googleBusy);

        assertEquals(LocalDateTime.of(targetDate, LocalTime.of(10, 30)), scheduled.getStartTime());
        assertEquals(LocalDateTime.of(targetDate, LocalTime.of(11, 30)), scheduled.getEndTime());
    }

    @Test
    void returnsNullTimesWhenDeadlineCannotBeMet() {
        Account owner = createOwner("09:00", "10:00");
        Task task = createTask("task_new", "High", LocalDate.now().toString());
        task.setTimeToComplete("2 hours");

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of());

        assertNull(scheduled.getStartTime());
        assertNull(scheduled.getEndTime());
    }

    @Test
    void rejectsInvalidSchedulingInputs() {
        Task task = createTask("task_new", "High", LocalDate.now().toString());
        task.setTimeToComplete("soon");

        IllegalArgumentException badDuration = assertThrows(IllegalArgumentException.class,
            () -> schedulerService.scheduleTask(task, createOwner("09:00", "17:00"), List.of()));
        assertEquals("Unsupported time format: soon", badDuration.getMessage());

        IllegalArgumentException nullDateTime = assertThrows(IllegalArgumentException.class,
            () -> schedulerService.roundUpToNextQuarterHour(null));
        assertEquals("Date time is required", nullDateTime.getMessage());

        Task invalidHoursTask = createTask("task_invalid", "High", LocalDate.now().plusDays(1).toString());
        invalidHoursTask.setTimeToComplete("30m");
        IllegalArgumentException badHours = assertThrows(IllegalArgumentException.class,
            () -> schedulerService.scheduleTask(invalidHoursTask, createOwner("17:00", "09:00"), List.of()));
        assertEquals("End working hour must be after start working hour", badHours.getMessage());
    }

    @Test
    void parsesTaskDateTimeFormatsUsedByScheduler() {
        LocalDate targetDate = LocalDate.now().plusDays(1);
        Account owner = createOwner("09:00", "17:00");
        Task task = createTask("task_new", "High", targetDate.toString());
        task.setTimeToComplete("45m");

        Task blockToday = createTask("task_today", "High", LocalDate.now().toString());
        blockToday.setStartTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(9, 0)));
        blockToday.setEndTime(LocalDateTime.of(LocalDate.now(), LocalTime.of(17, 0)));

        Task iso = createTask("task_iso", "High", targetDate.toString());
        iso.setStartTime(LocalDateTime.of(targetDate, LocalTime.of(9, 0)));
        iso.setEndTime(LocalDateTime.of(targetDate, LocalTime.of(9, 45)));

        Task offset = createTask("task_offset", "High", targetDate.toString());
        offset.setStartTime(LocalDateTime.of(targetDate, LocalTime.of(10, 0)));
        offset.setEndTime(LocalDateTime.of(targetDate, LocalTime.of(10, 30)));

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(blockToday, iso, offset));

        assertEquals(LocalDateTime.of(targetDate, LocalTime.of(10, 30)), scheduled.getStartTime());
        assertEquals(LocalDateTime.of(targetDate, LocalTime.of(11, 15)), scheduled.getEndTime());
    }

    private Task createTask(String taskId, String priority, String deadline) {
        Task task = new Task();
        task.setTaskId(taskId);
        task.setPriority(TaskPriority.fromValue(priority));
        task.setDeadline(LocalDate.parse(deadline));
        return task;
    }

    private Account createOwner(String startWorkingHours, String endWorkingHours) {
        Account owner = new Account("acc-1", "jane", "password123", "jane@example.com", null, startWorkingHours, endWorkingHours);
        owner.setRole("user");
        return owner;
    }
}
