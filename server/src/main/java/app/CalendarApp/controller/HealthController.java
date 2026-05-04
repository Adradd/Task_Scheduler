package app.CalendarApp.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Provides lightweight public endpoints for cloud load balancers and platform
 * health checks.
 */
@RestController
public class HealthController {
    @GetMapping({"/", "/health"})
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}
