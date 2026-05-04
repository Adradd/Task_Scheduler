package app.CalendarApp.repository;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

/**
 * Priority values accepted by task payloads and serialized as lowercase text.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
public enum TaskPriority {
    LOW("low"),
    MEDIUM("medium"),
    HIGH("high");

    private final String value;

    TaskPriority(String value) {
        this.value = value;
    }

    /**
     * Returns the lowercase JSON representation for the priority.
     *
     * @return serialized priority value
     */
    @JsonValue
    public String getValue() {
        return value;
    }

    /**
     * Parses priorities from either enum names or lowercase API values.
     *
     * @param value raw priority text
     * @return matching priority, or null for null input
     * @throws IllegalArgumentException when the value does not map to a priority
     */
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
