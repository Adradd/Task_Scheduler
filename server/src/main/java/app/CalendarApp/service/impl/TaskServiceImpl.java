package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.GoogleCalendarProjectMapping;
import app.CalendarApp.repository.GoogleCalendarProjectMappingRepository;
import app.CalendarApp.repository.Project;
import app.CalendarApp.repository.Tag;
import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.TaskPriority;
import app.CalendarApp.repository.TaskRepository;
import app.CalendarApp.service.GoogleCalendarService;
import app.CalendarApp.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {
    private static final DateTimeFormatter GOOGLE_DATE_TIME_FORMATTER = DateTimeFormatter.ISO_DATE_TIME;

    private final TaskRepository taskRepository;
    private final TaskAutoSchedulerService autoSchedulerService;
    private final GoogleCalendarService googleCalendarService;
    private final GoogleCalendarProjectMappingRepository mappingRepository;

    @Value("${google.calendar.default-time-zone:America/New_York}")
    private String defaultTimeZone;

    @Override
    public Task findTaskByTaskId(String taskId) {
        return taskRepository.findTaskByTaskId(taskId);
    }

    @Override
    public Task findTaskByOwner(Account owner) {
        return taskRepository.findTaskByOwner(owner);
    }

    @Override
    public List<Task> findAllTasksByOwner(Account owner) {
        return taskRepository.findAllByOwner(owner);
    }

    @Override
    public Task findTaskByDeadline(LocalDate deadline) {
        return taskRepository.findTaskByDeadline(deadline);
    }

    @Override
    public Task findTaskByPriority(TaskPriority priority) {
        return taskRepository.findTaskByPriority(priority);
    }

    @Override
    public Task findTaskByProject(Project project) {
        return taskRepository.findTaskByProject(project);
    }

    @Override
    public List<Task> findTasksByTag(Tag tag) {
        return taskRepository.findAllByTagsContaining(tag);
    }

    @Override
    public Task createTask(Task task) {
        return createTask(task, false);
    }

    @Override
    public Task createTask(Task task, boolean autoSchedule) {
        validateTask(task, false);
        if (autoSchedule) {
            task = scheduleWithGoogleAvailability(task);
        }
        return taskRepository.save(task);
    }

    @Override
    public Task updateTask(Task task) {
        return updateTask(task, false);
    }

    @Override
    public Task updateTask(Task task, boolean autoSchedule) {
        if (task.getTaskId() == null || taskRepository.findTaskByTaskId(task.getTaskId()) == null) {
            throw new IllegalArgumentException("Task does not exist");
        }
        validateTask(task, true);
        if (autoSchedule) {
            task = scheduleWithGoogleAvailability(task);
        }
        return taskRepository.save(task);
    }

    @Override
    public void deleteTask(String taskId) {
        Task existingTask = taskId == null ? null : taskRepository.findTaskByTaskId(taskId);
        if (existingTask == null) {
            throw new IllegalArgumentException("Task does not exist");
        }
        taskRepository.deleteById(taskId);
    }

    @Override
    public List<Task> findAllCompletedTasksByOwner(Account owner) {
        return taskRepository.findAllByOwnerAndIsCompleted(owner, true);
    }

    @Override
    public Task markTaskAsComplete(String taskId) {
        Task task = taskRepository.findTaskByTaskId(taskId);
        if (task == null) {
            throw new IllegalArgumentException("Task does not exist");
        }
        task.setIsCompleted(true);
        return taskRepository.save(task);
    }

    private void validateTask(Task task, boolean isUpdate) {
        if (task.getTaskName() == null || task.getTaskName().trim().isEmpty()) {
            throw new IllegalArgumentException("Task name is required");
        }
        if (task.getOwner() == null) {
            throw new IllegalArgumentException("Owner is required");
        }

        if (task.getOwner().getUsername() == null || task.getOwner().getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Owner username is required");
        }
        if (task.getStartTime() != null && task.getEndTime() != null && !task.getEndTime().isAfter(task.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time");
        }
        if (!isUpdate && taskRepository.findTaskByTaskId(task.getTaskId()) != null) {
            throw new IllegalArgumentException("Task ID already exists");
        }
    }

    private Task scheduleWithGoogleAvailability(Task task) {
        if (task == null || task.getOwner() == null) {
            return task;
        }

        List<Task> existingTasks = taskRepository.findAllByOwner(task.getOwner());
        List<TaskAutoSchedulerService.BusyInterval> googleBusyIntervals = collectGoogleBusyIntervals(task.getOwner(), task.getDeadline());
        return autoSchedulerService.scheduleTask(task, task.getOwner(), existingTasks, googleBusyIntervals);
    }

    private List<TaskAutoSchedulerService.BusyInterval> collectGoogleBusyIntervals(Account owner, LocalDate deadline) {
        if (owner == null || owner.getId() == null || deadline == null || !googleCalendarService.isCalendarLinked(owner)) {
            return List.of();
        }

        ZoneId schedulingZone = resolveSchedulingZone();
        Instant timeMin = Instant.now().minusSeconds(60);
        Instant timeMax = deadline.plusDays(1).atStartOfDay(schedulingZone).toInstant();

        List<Map<String, Object>> rawEvents = new ArrayList<>(safeEvents(googleCalendarService.fetchEvents(owner, timeMin, timeMax)));

        List<GoogleCalendarProjectMapping> mappings = mappingRepository.findAllByAccountId(owner.getId());
        Set<String> enabledCalendarIds = mappings.stream()
            .filter(mapping -> mapping != null && mapping.isEnabled())
            .map(GoogleCalendarProjectMapping::getGoogleCalendarId)
            .filter(calendarId -> calendarId != null && !calendarId.isBlank())
            .collect(Collectors.toSet());

        if (!enabledCalendarIds.isEmpty()) {
            for (String calendarId : enabledCalendarIds) {
                if ("primary".equalsIgnoreCase(calendarId)) {
                    continue;
                }
                rawEvents.addAll(safeEvents(googleCalendarService.fetchEventsForCalendar(owner, calendarId, timeMin, timeMax)));
            }
        }

        List<TaskAutoSchedulerService.BusyInterval> intervals = new ArrayList<>();
        for (Map<String, Object> event : rawEvents) {
            TaskAutoSchedulerService.BusyInterval parsed = toBusyInterval(event);
            if (parsed != null) {
                intervals.add(parsed);
            }
        }
        return intervals;
    }

    private TaskAutoSchedulerService.BusyInterval toBusyInterval(Map<String, Object> event) {
        if (event == null) {
            return null;
        }

        Map<String, Object> startMap = toMap(event.get("start"));
        Map<String, Object> endMap = toMap(event.get("end"));
        String startDateTime = getText(startMap.get("dateTime"));
        String endDateTime = getText(endMap.get("dateTime"));
        String startTimeZone = getText(startMap.get("timeZone"));
        String endTimeZone = getText(endMap.get("timeZone"));

        // All-day events are treated as unscheduled and should not block auto-scheduling slots.
        if (startDateTime == null || endDateTime == null) {
            return null;
        }

        ZoneId schedulingZone = resolveSchedulingZone();
        LocalDateTime start = parseGoogleEventDateTime(startDateTime, startTimeZone, schedulingZone);
        LocalDateTime end = parseGoogleEventDateTime(endDateTime, endTimeZone, schedulingZone);
        if (start == null || end == null || !end.isAfter(start)) {
            return null;
        }
        return new TaskAutoSchedulerService.BusyInterval(start, end);
    }

    private LocalDateTime parseGoogleEventDateTime(String dateTime, String timeZone, ZoneId schedulingZone) {
        if (dateTime == null || dateTime.isBlank()) {
            return null;
        }

        try {
            return OffsetDateTime.parse(dateTime)
                .atZoneSameInstant(schedulingZone)
                .toLocalDateTime()
                .withSecond(0)
                .withNano(0);
        } catch (DateTimeParseException ignored) {
            // Fall back for dateTime values that omit offset and rely on a separate timeZone field.
        }

        try {
            LocalDateTime localDateTime = LocalDateTime.parse(dateTime, GOOGLE_DATE_TIME_FORMATTER).withSecond(0).withNano(0);
            ZoneId sourceZone = resolveZoneId(timeZone, schedulingZone);
            return localDateTime.atZone(sourceZone).withZoneSameInstant(schedulingZone).toLocalDateTime();
        } catch (DateTimeParseException ignored) {
            // Continue to zone-based fallback.
        }

        try {
            LocalDateTime localDateTime = LocalDateTime.parse(dateTime).withSecond(0).withNano(0);
            ZoneId sourceZone = resolveZoneId(timeZone, schedulingZone);
            return localDateTime.atZone(sourceZone).withZoneSameInstant(schedulingZone).toLocalDateTime();
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private ZoneId resolveSchedulingZone() {
        return resolveZoneId(defaultTimeZone, ZoneId.systemDefault());
    }

    private ZoneId resolveZoneId(String zoneIdText, ZoneId fallback) {
        if (zoneIdText == null || zoneIdText.isBlank()) {
            return fallback;
        }
        try {
            return ZoneId.of(zoneIdText);
        } catch (RuntimeException ex) {
            return fallback;
        }
    }

    private Map<String, Object> toMap(Object value) {
        if (!(value instanceof Map<?, ?> rawMap)) {
            return Map.of();
        }

        return rawMap.entrySet().stream()
            .filter(entry -> entry.getKey() != null)
            .collect(Collectors.toMap(entry -> String.valueOf(entry.getKey()), Map.Entry::getValue));
    }

    private String getText(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).trim();
        return text.isEmpty() ? null : text;
    }

    private List<Map<String, Object>> safeEvents(List<Map<String, Object>> events) {
        return events != null ? events : List.of();
    }
}
