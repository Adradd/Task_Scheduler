package app.CalendarApp.controller;

import app.CalendarApp.repository.Account;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.service.GoogleCalendarService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/integrations/google")
public class GoogleCalendarIntegrationController {
	private final GoogleCalendarService googleCalendarService;
	private final AccountService accountService;
	private final String frontendUrl;

	public GoogleCalendarIntegrationController(
		GoogleCalendarService googleCalendarService,
		AccountService accountService,
		@Value("${google.oauth.frontend-url:http://localhost:5173}") String frontendUrl
	) {
		this.googleCalendarService = googleCalendarService;
		this.accountService = accountService;
		this.frontendUrl = frontendUrl;
	}

	@GetMapping("/status")
	@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
	public ResponseEntity<?> getGoogleCalendarStatus(Authentication authentication) {
		Account account = resolveAccount(authentication);
		if (account == null) {
			return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
		}

		return ResponseEntity.ok(Map.of("linked", googleCalendarService.isCalendarLinked(account)));
	}

	@GetMapping("/connect")
	@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
	public ResponseEntity<?> getGoogleCalendarConnectUrl(Authentication authentication) {
		Account account = resolveAccount(authentication);
		if (account == null) {
			return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
		}

		String authorizationUrl = googleCalendarService.buildAuthorizationUrl(account);
		return ResponseEntity.ok(Map.of("authorizationUrl", authorizationUrl));
	}

	@DeleteMapping("/disconnect")
	@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
	public ResponseEntity<?> disconnectGoogleCalendar(Authentication authentication) {
		Account account = resolveAccount(authentication);
		if (account == null) {
			return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
		}

		googleCalendarService.disconnect(account);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/events")
	@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
	public ResponseEntity<?> getGoogleCalendarEvents(
		Authentication authentication,
		@RequestParam(name = "timeMin", required = false) String timeMin,
		@RequestParam(name = "timeMax", required = false) String timeMax
	) {
		Account account = resolveAccount(authentication);
		if (account == null) {
			return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
		}

		if (!googleCalendarService.isCalendarLinked(account)) {
			return ResponseEntity.ok(Map.of("linked", false, "events", List.of()));
		}

		try {
			Instant parsedTimeMin = parseInstant(timeMin);
			Instant parsedTimeMax = parseInstant(timeMax);
			List<Map<String, Object>> events = googleCalendarService.fetchEvents(account, parsedTimeMin, parsedTimeMax);
			return ResponseEntity.ok(Map.of("linked", true, "events", events));
		} catch (DateTimeParseException ex) {
			return ResponseEntity.badRequest().body(Map.of("error", "timeMin/timeMax must be ISO-8601 timestamps"));
		}
	}

	@GetMapping("/callback")
	public void handleGoogleCallback(
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

	private Account resolveAccount(Authentication authentication) {
		if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
			return null;
		}
		return accountService.findAccountByUsername(authentication.getName());
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

	private Instant parseInstant(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		return Instant.parse(value);
	}
}


