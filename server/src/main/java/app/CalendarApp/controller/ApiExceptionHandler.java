package app.CalendarApp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import tools.jackson.databind.exc.InvalidFormatException;

import java.util.Map;

/**
 * Converts malformed JSON and type conversion failures into user-friendly API
 * error responses.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    /**
     * Handles unreadable request bodies, including invalid date/time and enum
     * values.
     *
     * @param exception Spring exception raised while parsing the request body
     * @return a 400 response with a concise error message
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, String>> handleUnreadableMessage(HttpMessageNotReadableException exception) {
        Throwable cause = exception.getMostSpecificCause();
        if (cause instanceof InvalidFormatException invalidFormatException) {
            String fieldName = "";
            if (!invalidFormatException.getPath().isEmpty()) {
                fieldName = invalidFormatException.getPath().get(invalidFormatException.getPath().size() - 1).getPropertyName();
            }
            Class<?> targetType = invalidFormatException.getTargetType();

            if (targetType != null) {
                String typeName = targetType.getSimpleName();
                if ("LocalDateTime".equals(typeName)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Date-times must use YYYY-MM-DDTHH:mm format"));
                }
                if ("LocalDate".equals(typeName)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Dates must use YYYY-MM-DD format"));
                }
                if ("LocalTime".equals(typeName)) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Times must use HH:mm format"));
                }
                if (targetType.isEnum()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Invalid value for " + (fieldName.isBlank() ? "enum field" : fieldName)));
                }
            }
        }

        exception.getMostSpecificCause();
        String message = exception.getMostSpecificCause().getMessage();

        if (message != null) {
            if (message.contains("LocalDateTime")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Date-times must use YYYY-MM-DDTHH:mm format"));
            }
            if (message.contains("LocalDate")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Dates must use YYYY-MM-DD format"));
            }
            if (message.contains("LocalTime")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Times must use HH:mm format"));
            }
            if (message.contains("TaskPriority") && message.contains("priority")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid value for priority"));
            }
        }

        return ResponseEntity.badRequest().body(Map.of("error", "Invalid request payload"));
    }
}
