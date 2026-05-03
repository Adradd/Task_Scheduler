package app.CalendarApp.controller;

import app.CalendarApp.service.GoogleCalendarService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;

/**
 * Handles the previously documented Google callback path so old deployed
 * environment variables fail gracefully instead of showing a Whitelabel page.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/integration.envs/google")
public class LegacyGoogleCalendarCallbackController {
    private final GoogleCalendarService googleCalendarService;

    @Value("${google.oauth.frontend-url}")
    private String frontendUrl;

    @GetMapping("/callback")
    public void handleLegacyGoogleCallback(
        @RequestParam(name = "code", required = false) String code,
        @RequestParam(name = "state", required = false) String state,
        HttpServletResponse response
    ) throws IOException {
        try {
            googleCalendarService.handleAuthorizationCallback(code, state);
            response.sendRedirect(buildFrontendRedirect("connected", null));
        } catch (Exception ex) {
            response.sendRedirect(buildFrontendRedirect("failed", ex.getMessage()));
        }
    }

    private String buildFrontendRedirect(String status, String message) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(frontendUrl)
            .path("/account")
            .queryParam("google", status);

        if (message != null && !message.isBlank()) {
            builder.queryParam("googleMessage", message);
        }

        return builder.build().encode().toUriString();
    }
}
