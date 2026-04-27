package app.CalendarApp.controller;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.GoogleCalendarProjectMapping;
import app.CalendarApp.repository.GoogleCalendarProjectMappingRepository;
import app.CalendarApp.service.AccountService;
import app.CalendarApp.service.GoogleCalendarService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Provides endpoints for linking Google Calendar, reading calendar data, and
 * managing calendar-to-project mappings.
 *
 * @author Gavin McDaniel
 * @author Adam Raddant
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/integrations/google")
public class GoogleCalendarIntegrationController {
	private final GoogleCalendarService googleCalendarService;
	private final AccountService accountService;
    private final GoogleCalendarProjectMappingRepository mappingRepository;
	@Value("${google.oauth.frontend-url}")
	private String frontendUrl;

	/**
	 * Reports whether the authenticated account currently has Google Calendar
	 * credentials stored.
	 *
	 * @param authentication authenticated Spring Security principal
	 * @return linked status or an authentication error response
	 */
	@GetMapping("/status")
	@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
	public ResponseEntity<?> getGoogleCalendarStatus(Authentication authentication) {
		Account account = resolveAccount(authentication);
		if (account == null) {
			return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
		}

		return ResponseEntity.ok(Map.of("linked", googleCalendarService.isCalendarLinked(account)));
	}

	/**
	 * Builds the OAuth authorization URL used by the frontend to start linking
	 * Google Calendar.
	 *
	 * @param authentication authenticated Spring Security principal
	 * @return authorization URL or an authentication error response
	 */
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

	/**
	 * Removes stored Google Calendar credentials for the authenticated account.
	 *
	 * @param authentication authenticated Spring Security principal
	 * @return 204 when disconnected
	 */
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

	/**
	 * Reads Google Calendar events in the requested time range, including enabled
	 * secondary calendars configured in project mappings.
	 *
	 * @param authentication authenticated Spring Security principal
	 * @param timeMin optional ISO-8601 lower bound
	 * @param timeMax optional ISO-8601 upper bound
	 * @return linked status and calendar events, or a validation error response
	 */
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

			List<Map<String, Object>> primaryEvents = safeEvents(
				googleCalendarService.fetchEvents(account, parsedTimeMin, parsedTimeMax)
			).stream()
				.map(event -> {
					Map<String, Object> eventWithSource = new HashMap<>(event);
					eventWithSource.put("googleCalendarId", "primary");
					eventWithSource.put("googleCalendarName", "Google Calendar");
					return eventWithSource;
				})
				.toList();

			List<GoogleCalendarProjectMapping> mappings = mappingRepository.findAllByAccountId(account.getId());
			Set<String> enabledCalendarIds = mappings.stream()
				.filter(mapping -> mapping != null && mapping.isEnabled())
				.map(GoogleCalendarProjectMapping::getGoogleCalendarId)
				.filter(calendarId -> calendarId != null && !calendarId.isBlank())
				.collect(Collectors.toSet());

			if (enabledCalendarIds.isEmpty()) {
				return ResponseEntity.ok(Map.of("linked", true, "events", primaryEvents));
			}

			Map<String, String> calendarNames = mappings.stream()
				.filter(mapping -> mapping != null && mapping.getGoogleCalendarId() != null)
				.collect(Collectors.toMap(
					GoogleCalendarProjectMapping::getGoogleCalendarId,
					mapping -> mapping.getGoogleCalendarName() != null ? mapping.getGoogleCalendarName() : mapping.getGoogleCalendarId(),
					(existing, replacement) -> existing
				));

			List<Map<String, Object>> events = new ArrayList<>(primaryEvents);
			for (String calendarId : enabledCalendarIds) {
				if ("primary".equalsIgnoreCase(calendarId)) {
					continue;
				}
				List<Map<String, Object>> calendarEvents = safeEvents(
					googleCalendarService.fetchEventsForCalendar(account, calendarId, parsedTimeMin, parsedTimeMax)
				);
				for (Map<String, Object> event : calendarEvents) {
					Map<String, Object> eventWithSource = new HashMap<>(event);
					eventWithSource.put("googleCalendarId", calendarId);
					eventWithSource.put("googleCalendarName", calendarNames.getOrDefault(calendarId, calendarId));
					events.add(eventWithSource);
				}
			}

			return ResponseEntity.ok(Map.of("linked", true, "events", events));
		} catch (DateTimeParseException ex) {
			return ResponseEntity.badRequest().body(Map.of("error", "timeMin/timeMax must be ISO-8601 timestamps"));
		}
	}

	/**
	 * Lists calendars available to the linked Google account.
	 *
	 * @param authentication authenticated Spring Security principal
	 * @return linked status and calendars, or a reconnect error response
	 */
	@GetMapping("/calendars")
	@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
	public ResponseEntity<?> getGoogleCalendars(Authentication authentication) {
		Account account = resolveAccount(authentication);
		if (account == null) {
			return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
		}

		if (!googleCalendarService.isCalendarLinked(account)) {
			return ResponseEntity.ok(Map.of("linked", false, "calendars", List.of()));
		}

		try {
			List<Map<String, Object>> calendars = googleCalendarService.listCalendars(account);
			return ResponseEntity.ok(Map.of("linked", true, "calendars", calendars));
		} catch (IllegalStateException ex) {
			return ResponseEntity.status(403).body(Map.of(
				"error", ex.getMessage(),
				"reconnectRequired", true
			));
		}
	}

	/**
	 * Returns saved Google Calendar project mappings for the authenticated
	 * account.
	 *
	 * @param authentication authenticated Spring Security principal
	 * @return saved mapping records
	 */
	@GetMapping("/project-mappings")
	@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
	public ResponseEntity<?> getProjectMappings(Authentication authentication) {
		Account account = resolveAccount(authentication);
		if (account == null) {
			return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
		}

		List<GoogleCalendarProjectMapping> mappings = mappingRepository.findAllByAccountId(account.getId());
		return ResponseEntity.ok(Map.of("mappings", mappings));
	}

	/**
	 * Upserts Google Calendar project mappings supplied by the frontend.
	 *
	 * @param authentication authenticated Spring Security principal
	 * @param payload request body containing a {@code mappings} array
	 * @return success message or a validation error response
	 */
	@PutMapping("/project-mappings")
	@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
	public ResponseEntity<?> saveProjectMappings(Authentication authentication, @RequestBody Map<String, Object> payload) {
		Account account = resolveAccount(authentication);
		if (account == null) {
			return ResponseEntity.status(401).body(Map.of("error", "Authenticated account not found"));
		}

		Object rawMappings = payload.get("mappings");
		if (!(rawMappings instanceof List<?> list)) {
			return ResponseEntity.badRequest().body(Map.of("error", "mappings must be an array"));
		}

		for (Object item : list) {
			if (!(item instanceof Map<?, ?> rawMap)) {
				continue;
			}

			String calendarId = getString(rawMap, "googleCalendarId");
			if (calendarId == null || calendarId.isBlank()) {
				continue;
			}

			GoogleCalendarProjectMapping mapping = mappingRepository.findByAccountIdAndGoogleCalendarId(account.getId(), calendarId);
			if (mapping == null) {
				mapping = new GoogleCalendarProjectMapping();
				mapping.setAccountId(account.getId());
				mapping.setGoogleCalendarId(calendarId);
			}

			mapping.setGoogleCalendarName(getString(rawMap, "googleCalendarName"));
			mapping.setProjectId(getString(rawMap, "projectId"));
			mapping.setEnabled(getBoolean(rawMap));
			mappingRepository.save(mapping);
		}

		return ResponseEntity.ok(Map.of("message", "Mappings saved"));
	}

	/**
	 * Placeholder endpoint for imports, intentionally disabled while external
	 * Google Calendar events are view-only.
	 *
	 * @param authentication authenticated Spring Security principal
	 * @return 403 response explaining that imports are disabled
	 */
	@PostMapping("/import-mapped-calendars")
	@PreAuthorize("hasAnyRole('USER', 'ADMIN')")
	public ResponseEntity<?> importMappedCalendars(Authentication authentication) {
		return ResponseEntity.status(403).body(Map.of(
			"error", "Google Calendar import is disabled in view-only mode"
		));
	}

	/**
	 * Handles Google's OAuth redirect and sends the browser back to the account
	 * page with a connection status.
	 *
	 * @param code authorization code returned by Google
	 * @param state OAuth state value generated by the backend
	 * @param response servlet response used for the redirect
	 * @throws IOException when the redirect cannot be sent
	 */
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

	private String getString(Map<?, ?> map, String key) {
		Object value = map.get(key);
		if (value == null) {
			return null;
		}
		String text = String.valueOf(value).trim();
		return text.isEmpty() ? null : text;
	}

	private List<Map<String, Object>> safeEvents(List<Map<String, Object>> events) {
		return events != null ? events : List.of();
	}

	private boolean getBoolean(Map<?, ?> map) {
		Object value = map.get("enabled");
		if (value == null) {
			return false;
		}
		if (value instanceof Boolean bool) {
			return bool;
		}
		return Boolean.parseBoolean(String.valueOf(value));
	}
}
