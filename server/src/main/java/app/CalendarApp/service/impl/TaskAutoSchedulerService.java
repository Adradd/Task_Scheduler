package app.CalendarApp.service.impl;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.TaskPriority;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeFormatterBuilder;
import java.time.format.SignStyle;
import java.time.temporal.ChronoField;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class TaskAutoSchedulerService {
    private static final DateTimeFormatter WORK_HOUR_24H = DateTimeFormatter.ofPattern("H:mm");
    private static final DateTimeFormatter WORK_HOUR_12H = new DateTimeFormatterBuilder()
        .parseCaseInsensitive()
        .appendValue(ChronoField.CLOCK_HOUR_OF_AMPM, 1, 2, SignStyle.NOT_NEGATIVE)
        .appendLiteral(':')
        .appendValue(ChronoField.MINUTE_OF_HOUR, 2)
        .appendText(ChronoField.AMPM_OF_DAY)
        .toFormatter(Locale.US);
    private static final Pattern HOURS_MINUTES_PATTERN = Pattern.compile("(?i)^(\\d+)h\\s*(\\d+)m$");
    private static final Pattern HOURS_ONLY_PATTERN = Pattern.compile("(?i)^(\\d+)\\s*hours?$");
    private static final Pattern MINUTES_ONLY_PATTERN = Pattern.compile("(?i)^(\\d+)m$");
    private static final Pattern TASK_ID_TIMESTAMP_PATTERN = Pattern.compile("^task_(\\d+)$");

    public Task scheduleTask(Task task, Account owner, Collection<Task> existingTasks) {
        if (task == null || owner == null) {
            return task;
        }

        int durationMinutes = parseTimeToCompleteMinutes(task.getTimeToComplete());
        LocalDate deadlineDate = task.getDeadline();
        LocalTime workStart = parseWorkingHour(owner.getStartWorkingHours(), LocalTime.of(9, 0));
        LocalTime workEnd = parseWorkingHour(owner.getEndWorkingHours(), LocalTime.of(17, 0));

        if (deadlineDate == null) {
            throw new IllegalArgumentException("Deadline is required for auto-scheduling");
        }

        if (!workEnd.isAfter(workStart)) {
            throw new IllegalArgumentException("End working hour must be after start working hour");
        }

        LocalDateTime earliest = roundUpToNextQuarterHour(LocalDateTime.now());
        LocalDate scanDate = earliest.toLocalDate();

        if (scanDate.isAfter(deadlineDate)) {
            task.setStartTime(null);
            task.setEndTime(null);
            return task;
        }

        Map<LocalDate, List<int[]>> occupiedByDate = buildOccupiedIntervals(existingTasks, task.getTaskId(), workStart, workEnd);

        while (!scanDate.isAfter(deadlineDate)) {
            LocalDateTime dayStart = LocalDateTime.of(scanDate, workStart);
            LocalDateTime candidateStart = dayStart;

            if (scanDate.equals(earliest.toLocalDate()) && earliest.isAfter(dayStart)) {
                candidateStart = earliest;
            }

            int candidateMinutes = candidateStart.getHour() * 60 + candidateStart.getMinute();
            int dayEndMinutes = workEnd.getHour() * 60 + workEnd.getMinute();

            if (candidateMinutes < dayEndMinutes) {
                List<int[]> occupied = occupiedByDate.getOrDefault(scanDate, new ArrayList<>());
                occupied.sort(Comparator.comparingInt(interval -> interval[0]));

                int pointer = candidateMinutes;
                for (int[] interval : occupied) {
                    int intervalStart = Math.max(interval[0], workStart.getHour() * 60 + workStart.getMinute());
                    int intervalEnd = Math.min(interval[1], dayEndMinutes);
                    if (intervalEnd <= pointer) {
                        continue;
                    }
                    if (intervalStart - pointer >= durationMinutes) {
                        break;
                    }
                    pointer = intervalEnd;
                }

                if (dayEndMinutes - pointer >= durationMinutes) {
                    LocalDateTime scheduledStart = LocalDateTime.of(scanDate, LocalTime.of(pointer / 60, pointer % 60));
                    LocalDateTime scheduledEnd = scheduledStart.plusMinutes(durationMinutes);
                    task.setStartTime(scheduledStart.withSecond(0).withNano(0));
                    task.setEndTime(scheduledEnd.withSecond(0).withNano(0));
                    return task;
                }
            }

            scanDate = scanDate.plusDays(1);
        }

        task.setStartTime(null);
        task.setEndTime(null);
        return task;
    }

    public int parseTimeToCompleteMinutes(String timeToComplete) {
        if (timeToComplete == null || timeToComplete.trim().isEmpty()) {
            throw new IllegalArgumentException("Time to complete is required for auto-scheduling");
        }

        String normalized = timeToComplete.trim();

        Matcher hourMinuteMatcher = HOURS_MINUTES_PATTERN.matcher(normalized);
        if (hourMinuteMatcher.matches()) {
            return Integer.parseInt(hourMinuteMatcher.group(1)) * 60 + Integer.parseInt(hourMinuteMatcher.group(2));
        }

        Matcher hoursOnlyMatcher = HOURS_ONLY_PATTERN.matcher(normalized);
        if (hoursOnlyMatcher.matches()) {
            return Integer.parseInt(hoursOnlyMatcher.group(1)) * 60;
        }

        Matcher minutesOnlyMatcher = MINUTES_ONLY_PATTERN.matcher(normalized);
        if (minutesOnlyMatcher.matches()) {
            return Integer.parseInt(minutesOnlyMatcher.group(1));
        }

        throw new IllegalArgumentException("Unsupported time format: " + timeToComplete);
    }

    public LocalTime parseWorkingHour(String workingHour, LocalTime fallback) {
        if (workingHour == null || workingHour.trim().isEmpty()) {
            if (fallback != null) {
                return fallback;
            }
            throw new IllegalArgumentException("Working hour value is required");
        }

        String normalized = workingHour.trim().toUpperCase(Locale.US).replace(" ", "");
        if (normalized.endsWith("AM") || normalized.endsWith("PM")) {
            return LocalTime.parse(normalized, WORK_HOUR_12H);
        }
        return LocalTime.parse(normalized, WORK_HOUR_24H);
    }

    public LocalDateTime roundUpToNextQuarterHour(LocalDateTime dateTime) {
        if (dateTime == null) {
            throw new IllegalArgumentException("Date time is required");
        }

        LocalDateTime normalized = dateTime.withSecond(0).withNano(0);
        int minutesPastQuarter = normalized.getMinute() % 15;
        int minutesToAdd = (minutesPastQuarter == 0) ? 15 : (15 - minutesPastQuarter);
        return normalized.plusMinutes(minutesToAdd);
    }

    public List<Task> orderTasksForScheduling(Collection<Task> tasks) {
        List<Task> ordered = new ArrayList<>(tasks == null ? List.of() : tasks);
        ordered.sort(
            Comparator.comparingInt((Task task) -> priorityRank(task != null ? task.getPriority() : null))
                .thenComparing(task -> safeDeadline(task != null ? task.getDeadline() : null))
                .thenComparingLong(task -> creationOrder(task != null ? task.getTaskId() : null))
                .thenComparing(task -> task != null && task.getTaskId() != null ? task.getTaskId() : "")
        );
        return ordered;
    }

    private int priorityRank(TaskPriority priority) {
        if (priority == null) {
            return 3;
        }
        return switch (priority) {
            case HIGH -> 0;
            case MEDIUM -> 1;
            case LOW -> 2;
        };
    }

    private LocalDate safeDeadline(LocalDate deadline) {
        return deadline != null ? deadline : LocalDate.MAX;
    }

    private long creationOrder(String taskId) {
        if (taskId == null) {
            return Long.MAX_VALUE;
        }

        Matcher matcher = TASK_ID_TIMESTAMP_PATTERN.matcher(taskId);
        if (!matcher.matches()) {
            return Long.MAX_VALUE;
        }

        try {
            return Long.parseLong(matcher.group(1));
        } catch (NumberFormatException ex) {
            return Long.MAX_VALUE;
        }
    }

    private Map<LocalDate, List<int[]>> buildOccupiedIntervals(Collection<Task> existingTasks, String currentTaskId, LocalTime workStart, LocalTime workEnd) {
        Map<LocalDate, List<int[]>> occupiedByDate = new HashMap<>();
        if (existingTasks == null) {
            return occupiedByDate;
        }

        for (Task existingTask : existingTasks) {
            if (existingTask == null || existingTask.isCompleted()) {
                continue;
            }
            if (currentTaskId != null && currentTaskId.equals(existingTask.getTaskId())) {
                continue;
            }

            LocalDateTime start = existingTask.getStartTime();
            LocalDateTime end = existingTask.getEndTime();
            if (start == null || end == null || !end.isAfter(start)) {
                continue;
            }
            if (!start.toLocalDate().equals(end.toLocalDate())) {
                continue;
            }

            LocalDate date = start.toLocalDate();
            int startMinutes = start.getHour() * 60 + start.getMinute();
            int endMinutes = end.getHour() * 60 + end.getMinute();
            int dayStart = workStart.getHour() * 60 + workStart.getMinute();
            int dayEnd = workEnd.getHour() * 60 + workEnd.getMinute();

            int clippedStart = Math.max(startMinutes, dayStart);
            int clippedEnd = Math.min(endMinutes, dayEnd);
            if (clippedEnd <= clippedStart) {
                continue;
            }

            occupiedByDate.computeIfAbsent(date, key -> new ArrayList<>()).add(new int[]{clippedStart, clippedEnd});
        }

        return occupiedByDate;
    }
}
