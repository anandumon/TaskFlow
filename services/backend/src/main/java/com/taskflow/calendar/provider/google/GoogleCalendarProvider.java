package com.taskflow.calendar.provider.google;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.calendar.dto.*;
import com.taskflow.calendar.provider.CalendarProvider;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Component
public class GoogleCalendarProvider implements CalendarProvider {

    private final String clientId;
    private final String clientSecret;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    private static final String GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
    private static final String GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
    private static final String GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";
    private static final String GOOGLE_CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3";
    private static final String CALENDAR_SCOPES = "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events email profile";

    public GoogleCalendarProvider(
        @Value("${taskflow.calendar.google.client-id:${GOOGLE_CLIENT_ID:}}") String clientId,
        @Value("${taskflow.calendar.google.client-secret:${GOOGLE_CLIENT_SECRET:}}") String clientSecret,
        ObjectMapper objectMapper
    ) {
        this.clientId = clientId != null ? clientId.trim() : "";
        this.clientSecret = clientSecret != null ? clientSecret.trim() : "";
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    }

    @Override
    public String getProviderName() {
        return "GOOGLE";
    }

    @Override
    public String buildAuthorizationUrl(String redirectUri, String state) {
        if (clientId == null || clientId.trim().isEmpty()) {
            throw new IllegalStateException("Google Calendar OAuth client_id is not configured. Please verify GOOGLE_CLIENT_ID in services/backend/.env");
        }
        return GOOGLE_AUTH_URL + "?"
            + "client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
            + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
            + "&response_type=code"
            + "&scope=" + URLEncoder.encode(CALENDAR_SCOPES, StandardCharsets.UTF_8)
            + "&access_type=offline"
            + "&prompt=consent"
            + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);
    }

    @Override
    public OAuthTokenResponse exchangeCode(String code, String redirectUri) {
        try {
            String form = "code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
                + "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8)
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
                + "&grant_type=authorization_code";

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_TOKEN_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.error("Google OAuth token exchange failed: {} {}", response.statusCode(), response.body());
                throw new RuntimeException("Failed to exchange Google OAuth code: " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String accessToken = root.path("access_token").asText();
            String refreshToken = root.path("refresh_token").asText(null);
            int expiresIn = root.path("expires_in").asInt(3600);
            String scope = root.path("scope").asText("");

            // Fetch user profile
            String email = "";
            String accountId = "";
            try {
                HttpRequest userInfoReq = HttpRequest.newBuilder()
                    .uri(URI.create(GOOGLE_USERINFO_URL))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();
                HttpResponse<String> userInfoRes = httpClient.send(userInfoReq, HttpResponse.BodyHandlers.ofString());
                if (userInfoRes.statusCode() == 200) {
                    JsonNode userRoot = objectMapper.readTree(userInfoRes.body());
                    email = userRoot.path("email").asText("");
                    accountId = userRoot.path("sub").asText("");
                }
            } catch (Exception e) {
                log.warn("Failed to fetch Google userInfo: {}", e.getMessage());
            }

            return OAuthTokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenExpiresAt(Instant.now().plusSeconds(expiresIn))
                .scope(scope)
                .providerAccountId(accountId)
                .providerEmail(email)
                .build();
        } catch (Exception e) {
            throw new RuntimeException("Google OAuth token exchange error", e);
        }
    }

    @Override
    public OAuthTokenResponse refreshAccessToken(String refreshToken) {
        try {
            String form = "client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8)
                + "&refresh_token=" + URLEncoder.encode(refreshToken, StandardCharsets.UTF_8)
                + "&grant_type=refresh_token";

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_TOKEN_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.error("Google token refresh failed: {} {}", response.statusCode(), response.body());
                throw new RuntimeException("Failed to refresh Google token: " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String newAccessToken = root.path("access_token").asText();
            int expiresIn = root.path("expires_in").asInt(3600);

            return OAuthTokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken) // Refresh token typically remains unchanged
                .tokenExpiresAt(Instant.now().plusSeconds(expiresIn))
                .build();
        } catch (Exception e) {
            throw new RuntimeException("Google token refresh error", e);
        }
    }

    @Override
    public List<ExternalCalendarDto> listCalendars(String accessToken) {
        List<ExternalCalendarDto> list = new ArrayList<>();
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_CALENDAR_API_BASE + "/users/me/calendarList"))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode items = root.path("items");
                if (items.isArray()) {
                    for (JsonNode it : items) {
                        String id = it.path("id").asText();
                        String summary = it.path("summary").asText("Calendar");
                        String desc = it.path("description").asText("");
                        String tz = it.path("timeZone").asText("UTC");
                        boolean primary = it.path("primary").asBoolean(false);
                        String accessRole = it.path("accessRole").asText("reader");
                        boolean canWrite = "writer".equalsIgnoreCase(accessRole) || "owner".equalsIgnoreCase(accessRole);

                        list.add(ExternalCalendarDto.builder()
                            .externalCalendarId(id)
                            .name(summary)
                            .description(desc)
                            .timezone(tz)
                            .isPrimary(primary)
                            .canRead(true)
                            .canWrite(canWrite)
                            .syncEnabled(true)
                            .build());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error listing Google calendars: {}", e.getMessage());
        }
        return list;
    }

    @Override
    public ExternalCalendarDto getCalendar(String accessToken, String calendarId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_CALENDAR_API_BASE + "/calendars/" + URLEncoder.encode(calendarId, StandardCharsets.UTF_8)))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode it = objectMapper.readTree(response.body());
                return ExternalCalendarDto.builder()
                    .externalCalendarId(it.path("id").asText())
                    .name(it.path("summary").asText("Calendar"))
                    .description(it.path("description").asText(""))
                    .timezone(it.path("timeZone").asText("UTC"))
                    .isPrimary("primary".equalsIgnoreCase(calendarId))
                    .canRead(true)
                    .canWrite(true)
                    .syncEnabled(true)
                    .build();
            }
        } catch (Exception e) {
            log.error("Error getting Google calendar: {}", e.getMessage());
        }
        return null;
    }

    @Override
    public CalendarEventDto createEvent(String accessToken, String calendarId, CalendarEventRequest request) {
        try {
            Map<String, Object> payload = buildGoogleEventPayload(request);
            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_CALENDAR_API_BASE + "/calendars/" + URLEncoder.encode(calendarId, StandardCharsets.UTF_8) + "/events"))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.error("Failed to create Google event: {} {}", response.statusCode(), response.body());
                throw new RuntimeException("Failed to create Google Calendar event: " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            return mapGoogleJsonToDto(root);
        } catch (Exception e) {
            throw new RuntimeException("Error creating Google event", e);
        }
    }

    @Override
    public CalendarEventDto updateEvent(String accessToken, String calendarId, String externalEventId, CalendarEventRequest request) {
        try {
            Map<String, Object> payload = buildGoogleEventPayload(request);
            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_CALENDAR_API_BASE + "/calendars/" + URLEncoder.encode(calendarId, StandardCharsets.UTF_8) + "/events/" + URLEncoder.encode(externalEventId, StandardCharsets.UTF_8)))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.error("Failed to update Google event: {} {}", response.statusCode(), response.body());
                throw new RuntimeException("Failed to update Google Calendar event: " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            return mapGoogleJsonToDto(root);
        } catch (Exception e) {
            throw new RuntimeException("Error updating Google event", e);
        }
    }

    @Override
    public void deleteEvent(String accessToken, String calendarId, String externalEventId) {
        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_CALENDAR_API_BASE + "/calendars/" + URLEncoder.encode(calendarId, StandardCharsets.UTF_8) + "/events/" + URLEncoder.encode(externalEventId, StandardCharsets.UTF_8)))
                .header("Authorization", "Bearer " + accessToken)
                .DELETE()
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 204 && response.statusCode() != 200 && response.statusCode() != 404) {
                log.warn("Google deleteEvent returned code: {}", response.statusCode());
            }
        } catch (Exception e) {
            log.error("Error deleting Google event: {}", e.getMessage());
        }
    }

    @Override
    public CalendarSyncResult fullSync(String accessToken, String calendarId) {
        return fetchEvents(accessToken, calendarId, null);
    }

    @Override
    public CalendarSyncResult incrementalSync(String accessToken, String calendarId, String syncToken) {
        if (syncToken == null || syncToken.isEmpty()) {
            return fullSync(accessToken, calendarId);
        }
        CalendarSyncResult res = fetchEvents(accessToken, calendarId, syncToken);
        // If Google returns 410 Gone, the sync token is invalidated; fall back to fullSync per Section 68
        if (!res.isSuccess() && res.getErrorMessage() != null && res.getErrorMessage().contains("410")) {
            log.warn("Google syncToken expired (410 Gone), performing full synchronization fallback");
            return fullSync(accessToken, calendarId);
        }
        return res;
    }

    private CalendarSyncResult fetchEvents(String accessToken, String calendarId, String syncToken) {
        List<CalendarEventDto> events = new ArrayList<>();
        try {
            String url = GOOGLE_CALENDAR_API_BASE + "/calendars/" + URLEncoder.encode(calendarId, StandardCharsets.UTF_8) + "/events?maxResults=250";
            if (syncToken != null && !syncToken.isEmpty()) {
                url += "&syncToken=" + URLEncoder.encode(syncToken, StandardCharsets.UTF_8);
            } else {
                // For initial sync, pull active events from 3 months back
                Instant threeMonthsAgo = Instant.now().minus(Duration.ofDays(90));
                url += "&timeMin=" + URLEncoder.encode(DateTimeFormatter.ISO_INSTANT.format(threeMonthsAgo), StandardCharsets.UTF_8);
            }

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 410) {
                return CalendarSyncResult.builder().success(false).errorMessage("410 Gone: sync token expired").build();
            }
            if (response.statusCode() >= 400) {
                return CalendarSyncResult.builder().success(false).errorMessage("Google API error: " + response.statusCode()).build();
            }

            JsonNode root = objectMapper.readTree(response.body());
            String nextSyncToken = root.path("nextSyncToken").asText(null);
            JsonNode items = root.path("items");
            int created = 0;
            int deleted = 0;

            if (items.isArray()) {
                for (JsonNode it : items) {
                    String status = it.path("status").asText();
                    CalendarEventDto dto = mapGoogleJsonToDto(it);
                    events.add(dto);
                    if ("cancelled".equalsIgnoreCase(status)) {
                        deleted++;
                    } else {
                        created++;
                    }
                }
            }

            return CalendarSyncResult.builder()
                .success(true)
                .createdCount(created)
                .deletedCount(deleted)
                .nextSyncToken(nextSyncToken)
                .events(events)
                .build();
        } catch (Exception e) {
            log.error("Google fetchEvents failed: {}", e.getMessage());
            return CalendarSyncResult.builder().success(false).errorMessage(e.getMessage()).build();
        }
    }

    private Map<String, Object> buildGoogleEventPayload(CalendarEventRequest request) {
        Map<String, Object> map = new HashMap<>();
        map.put("summary", request.getTitle());

        // Structured marker per Section 39
        String desc = request.getDescription() != null ? request.getDescription() : "";
        if (request.getTaskFlowTaskId() != null) {
            desc += "\n\n---\nTaskFlow Task ID: " + request.getTaskFlowTaskId();
        }
        if (request.getTaskFlowProjectId() != null) {
            desc += "\nTaskFlow Project ID: " + request.getTaskFlowProjectId();
        }
        map.put("description", desc);

        String tz = request.getTimezone() != null ? request.getTimezone() : "UTC";

        if (request.isAllDay()) {
            // YYYY-MM-DD for all day events
            String startDateStr = DateTimeFormatter.ofPattern("yyyy-MM-dd")
                .withZone(ZoneId.of(tz))
                .format(request.getStartAt());
            String endDateStr = DateTimeFormatter.ofPattern("yyyy-MM-dd")
                .withZone(ZoneId.of(tz))
                .format(request.getEndAt() != null ? request.getEndAt() : request.getStartAt().plus(Duration.ofDays(1)));

            map.put("start", Map.of("date", startDateStr));
            map.put("end", Map.of("date", endDateStr));
        } else {
            String startIso = DateTimeFormatter.ISO_INSTANT.format(request.getStartAt());
            String endIso = DateTimeFormatter.ISO_INSTANT.format(request.getEndAt() != null ? request.getEndAt() : request.getStartAt().plus(Duration.ofMinutes(30)));

            map.put("start", Map.of("dateTime", startIso, "timeZone", tz));
            map.put("end", Map.of("dateTime", endIso, "timeZone", tz));
        }

        if (request.getLocation() != null && !request.getLocation().isEmpty()) {
            map.put("location", request.getLocation());
        }

        // Reminders mapping per Section 21 & 22
        if (request.getReminderMinutes() != null && !request.getReminderMinutes().isEmpty()) {
            List<Map<String, Object>> overrides = new ArrayList<>();
            for (int mins : request.getReminderMinutes()) {
                overrides.add(Map.of("method", "popup", "minutes", mins));
            }
            map.put("reminders", Map.of(
                "useDefault", false,
                "overrides", overrides
            ));
        }

        return map;
    }

    private CalendarEventDto mapGoogleJsonToDto(JsonNode root) {
        String id = root.path("id").asText();
        String summary = root.path("summary").asText("Untitled Event");
        String desc = root.path("description").asText("");
        String status = root.path("status").asText("confirmed");
        String htmlLink = root.path("htmlLink").asText(null);
        String etag = root.path("etag").asText("");

        JsonNode startNode = root.path("start");
        JsonNode endNode = root.path("end");

        boolean allDay = startNode.has("date");
        Instant startAt = Instant.now();
        Instant endAt = Instant.now().plus(Duration.ofMinutes(30));
        String tz = "UTC";

        try {
            if (allDay) {
                String dateStr = startNode.path("date").asText();
                startAt = Instant.parse(dateStr + "T00:00:00Z");
                if (endNode.has("date")) {
                    endAt = Instant.parse(endNode.path("date").asText() + "T00:00:00Z");
                }
            } else {
                if (startNode.has("dateTime")) {
                    startAt = Instant.parse(startNode.path("dateTime").asText());
                }
                if (endNode.has("dateTime")) {
                    endAt = Instant.parse(endNode.path("dateTime").asText());
                }
                if (startNode.has("timeZone")) {
                    tz = startNode.path("timeZone").asText("UTC");
                }
            }
        } catch (Exception e) {
            log.warn("Error parsing Google event date: {}", e.getMessage());
        }

        return CalendarEventDto.builder()
            .source("GOOGLE")
            .type("CALENDAR_EVENT")
            .externalEventId(id)
            .title(summary)
            .description(desc)
            .startAt(startAt)
            .endAt(endAt)
            .timezone(tz)
            .allDay(allDay)
            .status("cancelled".equalsIgnoreCase(status) ? "CANCELLED" : "CONFIRMED")
            .meetingUrl(htmlLink)
            .etag(etag)
            .build();
    }
}
