package app.CalendarApp.service;

import app.CalendarApp.repository.Account;
import app.CalendarApp.repository.AccountRepository;
import app.CalendarApp.repository.Task;
import app.CalendarApp.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GoogleCalendarService {
    private static final String GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    private static final DateTimeFormatter TASK_DATE_TIME_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm");
    private static final DateTimeFormatter DEADLINE_DMY = DateTimeFormatter.ofPattern("dd-MM-uuuu");
    private static final long OAUTH_STATE_TTL_SECONDS = 600;

    private final AccountRepository accountRepository;
    private final TaskRepository taskRepository;
    private final RestClient restClient;
    private final String clientId;
    private final String clientSecret;
    private final String redirectUri;
    private final String defaultTimeZone;

    private final Map<String, OAuthState> oauthStates = new ConcurrentHashMap<>();

    public GoogleCalendarService(
        AccountRepository accountRepository,
        TaskRepository taskRepository,
        @Value("${google.oauth.client-id:}") String clientId,
        @Value("${google.oauth.client-secret:}") String clientSecret,
        @Value("${google.oauth.redirect-uri:}") String redirectUri,
        @Value("${google.calendar.default-time-zone:UTC}") String defaultTimeZone
    ) {
        this.accountRepository = accountRepository;
        this.taskRepository = taskRepository;
        this.restClient = RestClient.create();
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.redirectUri = redirectUri;
        this.defaultTimeZone = defaultTimeZone;
    }

    public boolean isCalendarLinked(Account account) {
        return account != null && account.getGoogleRefreshToken() != null && !account.getGoogleRefreshToken().isBlank();
    }

    public String buildAuthorizationUrl(Account account) {
        validateOAuthConfiguration();
        if (account == null || account.getId() == null || account.getId().isBlank()) {
            throw new IllegalArgumentException("Account is required");
        }

        cleanupExpiredStates();

        String state = UUID.randomUUID().toString();
        oauthStates.put(state, new OAuthState(account.getId(), Instant.now().plusSeconds(OAUTH_STATE_TTL_SECONDS)));

        return UriComponentsBuilder.fromUriString(GOOGLE_OAUTH_AUTHORIZE_URL)
            .queryParam("response_type", "code")
            .queryParam("client_id", clientId)
            .queryParam("redirect_uri", redirectUri)
            .queryParam("scope", "https://www.googleapis.com/auth/calendar.events")
            .queryParam("access_type", "offline")
            .queryParam("prompt", "consent")
            .queryParam("state", state)
            .build(true)
            .toUriString();
    }

    public void handleAuthorizationCallback(String code, String state) {
        validateOAuthConfiguration();
        if (code == null || code.isBlank() || state == null || state.isBlank()) {
            throw new IllegalArgumentException("Missing code or state");
        }

        cleanupExpiredStates();

        OAuthState oauthState = oauthStates.remove(state);
        if (oauthState == null || oauthState.expiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException("OAuth state is invalid or expired");
        }

        Account account = accountRepository.findAccountByAccountId(oauthState.accountId());
        if (account == null) {
            throw new IllegalArgumentException("Account not found for OAuth callback");
        }

        Map<String, Object> tokenResponse = exchangeAuthorizationCode(code);
        String refreshToken = getText(tokenResponse, "refresh_token");
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalStateException("Google did not return a refresh token. Reconnect with consent prompt.");
        }

        String accessToken = getText(tokenResponse, "access_token");
        long expiresInSeconds = getLong(tokenResponse, "expires_in", 3600L);
        Instant expiresAt = Instant.now().plusSeconds(expiresInSeconds);

        account.setGoogleRefreshToken(refreshToken);
        account.setGoogleAccessToken(accessToken);
        account.setGoogleAccessTokenExpiresAt(expiresAt.toString());
        accountRepository.save(account);

        // Backfill existing active tasks so users see them in Google Calendar right after linking.
        backfillExistingTasks(account);
    }

    public void disconnect(Account account) {
        if (account == null) {
            return;
        }
        account.setGoogleRefreshToken(null);
        account.setGoogleAccessToken(null);
        account.setGoogleAccessTokenExpiresAt(null);
        accountRepository.save(account);
    }

    public Task syncTaskUpsert(Task task) {
        if (task == null || task.getOwner() == null || task.getOwner().getId() == null) {
            return task;
        }

        Account owner = accountRepository.findAccountByAccountId(task.getOwner().getId());
        if (!isCalendarLinked(owner)) {
            return task;
        }

        String accessToken = ensureValidAccessToken(owner);
        Map<String, Object> payload = buildEventPayload(task);
        String existingEventId = task.getGoogleCalendarEventId();

        try {
            if (existingEventId == null || existingEventId.isBlank()) {
                Map<String, Object> created = createEvent(accessToken, payload);
                String createdEventId = getText(created, "id");
                if (createdEventId != null && !createdEventId.isBlank()) {
                    task.setGoogleCalendarEventId(createdEventId);
                }
                return task;
            }

            updateEvent(accessToken, existingEventId, payload);
            return task;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() == 404 && existingEventId != null && !existingEventId.isBlank()) {
                Map<String, Object> created = createEvent(accessToken, payload);
                String createdEventId = getText(created, "id");
                if (createdEventId != null && !createdEventId.isBlank()) {
                    task.setGoogleCalendarEventId(createdEventId);
                }
                return task;
            }
            throw ex;
        }
    }

    public Task syncTaskDelete(Task task) {
        if (task == null || task.getOwner() == null || task.getOwner().getId() == null) {
            return task;
        }

        String existingEventId = task.getGoogleCalendarEventId();
        if (existingEventId == null || existingEventId.isBlank()) {
            return task;
        }

        Account owner = accountRepository.findAccountByAccountId(task.getOwner().getId());
        if (!isCalendarLinked(owner)) {
            return task;
        }

        String accessToken = ensureValidAccessToken(owner);
        try {
            restClient.delete()
                .uri(GOOGLE_CALENDAR_EVENTS_URL + "/{eventId}", URLEncoder.encode(existingEventId, StandardCharsets.UTF_8))
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .retrieve()
                .toBodilessEntity();
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().value() != 404) {
                throw ex;
            }
        }

        task.setGoogleCalendarEventId(null);
        return task;
    }

    public List<Map<String, Object>> fetchEvents(Account account, Instant timeMin, Instant timeMax) {
        if (account == null || !isCalendarLinked(account)) {
            return List.of();
        }

        String accessToken = ensureValidAccessToken(account);
        String eventsUrl = UriComponentsBuilder.fromUriString(GOOGLE_CALENDAR_EVENTS_URL)
            .queryParam("singleEvents", "true")
            .queryParam("orderBy", "startTime")
            .queryParam("timeMin", (timeMin != null ? timeMin : Instant.now().minusSeconds(7L * 24L * 60L * 60L)).toString())
            .queryParam("timeMax", (timeMax != null ? timeMax : Instant.now().plusSeconds(30L * 24L * 60L * 60L)).toString())
            .build(true)
            .toUriString();

        Map<String, Object> response = restClient.get()
            .uri(eventsUrl)
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
            .retrieve()
            .body(Map.class);

        if (response == null) {
            return List.of();
        }

        return toMapList(response.get("items"));
    }

    private Map<String, Object> createEvent(String accessToken, Map<String, Object> payload) {
        Map<String, Object> response = restClient.post()
            .uri(GOOGLE_CALENDAR_EVENTS_URL)
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(payload)
            .retrieve()
            .body(Map.class);
        return response == null ? Map.of() : response;
    }

    private void updateEvent(String accessToken, String eventId, Map<String, Object> payload) {
        restClient.patch()
            .uri(GOOGLE_CALENDAR_EVENTS_URL + "/{eventId}", URLEncoder.encode(eventId, StandardCharsets.UTF_8))
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
            .contentType(MediaType.APPLICATION_JSON)
            .body(payload)
            .retrieve()
            .toBodilessEntity();
    }

    private String ensureValidAccessToken(Account account) {
        String accessToken = account.getGoogleAccessToken();
        Instant expiresAt = parseInstant(account.getGoogleAccessTokenExpiresAt());
        if (accessToken != null && expiresAt != null && expiresAt.isAfter(Instant.now().plusSeconds(60))) {
            return accessToken;
        }

        Map<String, Object> refreshed = refreshAccessToken(account.getGoogleRefreshToken());
        String refreshedAccessToken = getText(refreshed, "access_token");
        long expiresInSeconds = getLong(refreshed, "expires_in", 3600L);
        Instant refreshedExpiresAt = Instant.now().plusSeconds(expiresInSeconds);

        account.setGoogleAccessToken(refreshedAccessToken);
        account.setGoogleAccessTokenExpiresAt(refreshedExpiresAt.toString());

        String returnedRefreshToken = getText(refreshed, "refresh_token");
        if (returnedRefreshToken != null && !returnedRefreshToken.isBlank()) {
            account.setGoogleRefreshToken(returnedRefreshToken);
        }

        accountRepository.save(account);
        return refreshedAccessToken;
    }

    private Map<String, Object> refreshAccessToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new IllegalStateException("Google refresh token is missing");
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("grant_type", "refresh_token");
        form.add("refresh_token", refreshToken);

        Map<String, Object> response = restClient.post()
            .uri(GOOGLE_OAUTH_TOKEN_URL)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(form)
            .retrieve()
            .body(Map.class);

        return response == null ? Map.of() : response;
    }

    private Map<String, Object> exchangeAuthorizationCode(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", clientId);
        form.add("client_secret", clientSecret);
        form.add("code", code);
        form.add("grant_type", "authorization_code");
        form.add("redirect_uri", redirectUri);

        Map<String, Object> response = restClient.post()
            .uri(GOOGLE_OAUTH_TOKEN_URL)
            .contentType(MediaType.APPLICATION_FORM_URLENCODED)
            .body(form)
            .retrieve()
            .body(Map.class);

        return response == null ? Map.of() : response;
    }

    private Map<String, Object> buildEventPayload(Task task) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("summary", task.getTaskName());
        payload.put("description", buildTaskDescription(task));

        Map<String, Object> start = new HashMap<>();
        Map<String, Object> end = new HashMap<>();

        LocalDateTime startDateTime = parseTaskDateTime(task.getStartTime());
        LocalDateTime endDateTime = parseTaskDateTime(task.getEndTime());

        if (startDateTime != null && endDateTime != null && endDateTime.isAfter(startDateTime)) {
            ZoneId zoneId = ZoneId.of(defaultTimeZone);
            start.put("dateTime", startDateTime.atZone(zoneId).toOffsetDateTime().toString());
            start.put("timeZone", defaultTimeZone);
            end.put("dateTime", endDateTime.atZone(zoneId).toOffsetDateTime().toString());
            end.put("timeZone", defaultTimeZone);
        } else {
            LocalDate deadline = parseDeadline(task.getDeadline());
            if (deadline == null) {
                deadline = LocalDate.now();
            }
            start.put("date", deadline.toString());
            end.put("date", deadline.plusDays(1).toString());
        }

        payload.put("start", start);
        payload.put("end", end);
        return payload;
    }

    private String buildTaskDescription(Task task) {
        StringBuilder builder = new StringBuilder();
        if (task.getComments() != null && !task.getComments().isBlank()) {
            builder.append(task.getComments().trim()).append("\n\n");
        }
        builder.append("Priority: ").append(task.getPriority() != null ? task.getPriority() : "N/A").append("\n");
        builder.append("Deadline: ").append(task.getDeadline() != null ? task.getDeadline() : "N/A").append("\n");
        builder.append("Time to complete: ").append(task.getTimeToComplete() != null ? task.getTimeToComplete() : "N/A");
        return builder.toString();
    }

    private LocalDate parseDeadline(String deadline) {
        if (deadline == null || deadline.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(deadline);
        } catch (DateTimeParseException ignored) {
            // Fall through to alternate format.
        }
        try {
            return LocalDate.parse(deadline, DEADLINE_DMY);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private LocalDateTime parseTaskDateTime(String dateTime) {
        if (dateTime == null || dateTime.isBlank()) {
            return null;
        }

        String normalized = dateTime.trim().replace(' ', 'T');
        try {
            return LocalDateTime.parse(normalized, TASK_DATE_TIME_FORMAT);
        } catch (DateTimeParseException ignored) {
            // Try ISO parser as fallback.
        }
        try {
            return LocalDateTime.parse(normalized);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private Instant parseInstant(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Instant.parse(value);
        } catch (DateTimeParseException ignored) {
            return null;
        }
    }

    private String getText(Map<String, Object> data, String field) {
        if (data == null || !data.containsKey(field) || data.get(field) == null) {
            return null;
        }
        String text = String.valueOf(data.get(field));
        return text == null || text.isBlank() ? null : text;
    }

    private long getLong(Map<String, Object> data, String field, long fallback) {
        if (data == null || !data.containsKey(field) || data.get(field) == null) {
            return fallback;
        }
        Object value = data.get(field);
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private void backfillExistingTasks(Account account) {
        if (account == null) {
            return;
        }

        List<Task> existingTasks = taskRepository.findAllByOwner(account);
        for (Task existingTask : existingTasks) {
            if (existingTask == null || existingTask.isCompleted()) {
                continue;
            }

            String previousEventId = existingTask.getGoogleCalendarEventId();
            try {
                Task syncedTask = syncTaskUpsert(existingTask);
                if (syncedTask != null && syncedTask.getGoogleCalendarEventId() != null
                    && !syncedTask.getGoogleCalendarEventId().equals(previousEventId)) {
                    taskRepository.save(syncedTask);
                }
            } catch (Exception ignored) {
                // Continue backfill for remaining tasks even if one task fails.
            }
        }
    }

    private List<Map<String, Object>> toMapList(Object items) {
        if (!(items instanceof List<?> list)) {
            return List.of();
        }

        List<Map<String, Object>> mapped = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> rawMap) {
                Map<String, Object> converted = new HashMap<>();
                for (Map.Entry<?, ?> entry : rawMap.entrySet()) {
                    if (entry.getKey() != null) {
                        converted.put(String.valueOf(entry.getKey()), entry.getValue());
                    }
                }
                mapped.add(converted);
            }
        }
        return mapped;
    }

    private void cleanupExpiredStates() {
        Instant now = Instant.now();
        List<String> expired = oauthStates.entrySet().stream()
            .filter(entry -> entry.getValue().expiresAt().isBefore(now))
            .map(Map.Entry::getKey)
            .toList();
        expired.forEach(oauthStates::remove);
    }

    private void validateOAuthConfiguration() {
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank() || redirectUri == null || redirectUri.isBlank()) {
            throw new IllegalStateException("Google OAuth configuration is incomplete");
        }
    }

    private record OAuthState(String accountId, Instant expiresAt) {
    }
}


