package app.CalendarApp.repository;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

public enum TaskPriority {
    LOW("low"),
    MEDIUM("medium"),
    HIGH("high");

    private final String value;

    TaskPriority(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static TaskPriority fromValue(String value) {
        if (value == null) {
            return null;
        }

        return Arrays.stream(values())
            .filter(priority -> priority.value.equalsIgnoreCase(value.trim()) || priority.name().equalsIgnoreCase(value.trim()))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Invalid task priority: " + value));
    }
}
