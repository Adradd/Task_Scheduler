package app.CalendarApp;

import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.Account;
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
    void parsesDeadlinesAndWorkingHours() {
        assertEquals(LocalDate.of(2026, 3, 19), schedulerService.parseDeadline("2026-03-19"));
        assertEquals(LocalDate.of(2026, 3, 19), schedulerService.parseDeadline("19-03-2026"));

        assertEquals(LocalTime.of(9, 0), schedulerService.parseWorkingHour("09:00", LocalTime.of(8, 0)));
        assertEquals(LocalTime.of(13, 30), schedulerService.parseWorkingHour("1:30PM", LocalTime.of(8, 0)));
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
        occupied.setStartTime(earliest.toString());
        occupied.setEndTime(earliest.plusHours(1).toString());

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(occupied));

        assertEquals(earliest.plusHours(1).withSecond(0).withNano(0).toString(), scheduled.getStartTime());
        assertEquals(earliest.plusHours(2).withSecond(0).withNano(0).toString(), scheduled.getEndTime());
    }

    @Test
    void skipsCompletedTasksAndCurrentTaskWhileScheduling() {
        LocalDateTime earliest = schedulerService.roundUpToNextQuarterHour(LocalDateTime.now());
        LocalDate targetDate = earliest.toLocalDate();
        Account owner = createOwner("00:00", "23:59");
        Task task = createTask("task_same", "High", targetDate.toString());
        task.setTimeToComplete("30m");

        Task completed = createTask("task_completed", "High", targetDate.toString());
        completed.setStartTime(earliest.toString());
        completed.setEndTime(earliest.plusHours(3).toString());
        completed.setIsCompleted(true);

        Task sameTask = createTask("task_same", "High", targetDate.toString());
        sameTask.setStartTime(earliest.toString());
        sameTask.setEndTime(earliest.plusHours(3).toString());

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(completed, sameTask));

        assertEquals(earliest.withSecond(0).withNano(0).toString(), scheduled.getStartTime());
        assertEquals(earliest.plusMinutes(30).withSecond(0).withNano(0).toString(), scheduled.getEndTime());
    }

    @Test
    void clipsExistingIntervalsToWorkingHours() {
        LocalDate targetDate = LocalDate.now().plusDays(1);
        Account owner = createOwner("09:00", "17:00");
        Task task = createTask("task_new", "High", targetDate.toString());
        task.setTimeToComplete("1h 0m");

        Task blockToday = createTask("task_today", "High", LocalDate.now().toString());
        blockToday.setStartTime(LocalDate.now() + "T09:00");
        blockToday.setEndTime(LocalDate.now() + "T17:00");

        Task occupied = createTask("task_busy", "Medium", targetDate.toString());
        occupied.setStartTime(targetDate + "T07:30");
        occupied.setEndTime(targetDate + "T09:30");

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(blockToday, occupied));

        assertEquals(targetDate + "T09:30", scheduled.getStartTime());
        assertEquals(targetDate + "T10:30", scheduled.getEndTime());
    }

    @Test
    void movesToNextDayWhenTodayHasNoRoom() {
        Account owner = createOwner("09:00", "10:00");
        Task task = createTask("task_new", "High", LocalDate.now().plusDays(1).toString());
        task.setTimeToComplete("1h 0m");

        Task occupied = createTask("task_busy", "Medium", LocalDate.now().toString());
        occupied.setStartTime(LocalDate.now() + "T09:00");
        occupied.setEndTime(LocalDate.now() + "T10:00");

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(occupied));

        assertEquals(LocalDate.now().plusDays(1) + "T09:00", scheduled.getStartTime());
        assertEquals(LocalDate.now().plusDays(1) + "T10:00", scheduled.getEndTime());
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

        IllegalArgumentException badDeadline = assertThrows(IllegalArgumentException.class,
            () -> schedulerService.parseDeadline("2026/03/19"));
        assertEquals("Deadline must be YYYY-MM-DD or DD-MM-YYYY", badDeadline.getMessage());

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
        blockToday.setStartTime(LocalDate.now() + "T09:00");
        blockToday.setEndTime(LocalDate.now() + "T17:00");

        Task iso = createTask("task_iso", "High", targetDate.toString());
        iso.setStartTime(targetDate + "T09:00:00");
        iso.setEndTime(targetDate + "T09:45:00");

        Task offset = createTask("task_offset", "High", targetDate.toString());
        offset.setStartTime(targetDate + "T10:00:00Z");
        offset.setEndTime(targetDate + "T10:30:00Z");

        Task scheduled = schedulerService.scheduleTask(task, owner, List.of(blockToday, iso, offset));

        assertEquals(targetDate + "T10:30", scheduled.getStartTime());
        assertEquals(targetDate + "T11:15", scheduled.getEndTime());
    }

    private Task createTask(String taskId, String priority, String deadline) {
        Task task = new Task();
        task.setTaskId(taskId);
        task.setPriority(priority);
        task.setDeadline(deadline);
        return task;
    }

    private Account createOwner(String startWorkingHours, String endWorkingHours) {
        Account owner = new Account("acc-1", "jane", "password123", "jane@example.com", null, startWorkingHours, endWorkingHours);
        owner.setRole("user");
        return owner;
    }
}
