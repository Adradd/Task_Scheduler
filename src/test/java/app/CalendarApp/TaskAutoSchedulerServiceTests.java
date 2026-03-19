package app.CalendarApp;

import app.CalendarApp.repository.Task;
import app.CalendarApp.service.impl.TaskAutoSchedulerService;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

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

    private Task createTask(String taskId, String priority, String deadline) {
        Task task = new Task();
        task.setTaskId(taskId);
        task.setPriority(priority);
        task.setDeadline(deadline);
        return task;
    }
}

