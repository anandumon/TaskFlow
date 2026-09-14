package com.taskflow.calendar.provider.microsoft;

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
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Component
public class MicrosoftCalendarProvider implements CalendarProvider {

    private final String clientId;
    private final String clientSecret;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    private static final String MS_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
    private static final String MS_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
    private static final String GRAPH_API_BASE = "https://graph.microsoft.com/v1.0";
    private static final String GRAPH_SCOPES = "Calendars.ReadWrite offline_access User.Read";

    public MicrosoftCalendarProvider(
        @Value("${taskflow.calendar.microsoft.client-id:${MICROSOFT_CLIENT_ID:${AZURE_CLIENT_ID:}}}") String clientId,
        @Value("${taskflow.calendar.microsoft.client-secret:${MICROSOFT_CLIENT_SECRET:${AZURE_CLIENT_SECRET:}}}") String clientSecret,
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
        return "MICROSOFT";
    }

    @Override
    public String buildAuthorizationUrl(String redirectUri, String state) {
        if (clientId == null || clientId.trim().isEmpty()) {
            throw new IllegalStateException("Microsoft Calendar OAuth client_id is not configured. Please set MICROSOFT_CLIENT_ID or AZURE_CLIENT_ID in services/backend/.env");
        }
        return MS_AUTH_URL + "?"
            + "client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
            + "&response_type=code"
            + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
            + "&response_mode=query"
            + "&scope=" + URLEncoder.encode(GRAPH_SCOPES, StandardCharsets.UTF_8)
            + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8);
    }

    @Override
    public OAuthTokenResponse exchangeCode(String code, String redirectUri) {
        try {
            String form = "client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8)
                + "&code=" + URLEncoder.encode(code, StandardCharsets.UTF_8)
                + "&redirect_uri=" + URLEncoder.encode(redirectUri, StandardCharsets.UTF_8)
                + "&grant_type=authorization_code";

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(MS_TOKEN_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.error("Microsoft token exchange failed: {} {}", response.statusCode(), response.body());
                throw new RuntimeException("Microsoft token exchange failed: " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String accessToken = root.path("access_token").asText();
            String refreshToken = root.path("refresh_token").asText(null);
            int expiresIn = root.path("expires_in").asInt(3600);
            String scope = root.path("scope").asText("");

            // Fetch user profile from /me
            String email = "";
            String accountId = "";
            try {
                HttpRequest profileReq = HttpRequest.newBuilder()
                    .uri(URI.create(GRAPH_API_BASE + "/me"))
                    .header("Authorization", "Bearer " + accessToken)
                    .GET()
                    .build();
                HttpResponse<String> profileRes = httpClient.send(profileReq, HttpResponse.BodyHandlers.ofString());
                if (profileRes.statusCode() == 200) {
                    JsonNode pRoot = objectMapper.readTree(profileRes.body());
                    email = pRoot.path("mail").asText(pRoot.path("userPrincipalName").asText(""));
                    accountId = pRoot.path("id").asText("");
                }
            } catch (Exception e) {
                log.warn("Failed to fetch Microsoft user profile: {}", e.getMessage());
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
            throw new RuntimeException("Microsoft OAuth token exchange error", e);
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
                .uri(URI.create(MS_TOKEN_URL))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.error("Microsoft token refresh failed: {} {}", response.statusCode(), response.body());
                throw new RuntimeException("Microsoft token refresh failed: " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            String newAccessToken = root.path("access_token").asText();
            String newRefreshToken = root.path("refresh_token").asText(refreshToken);
            int expiresIn = root.path("expires_in").asInt(3600);

            return OAuthTokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenExpiresAt(Instant.now().plusSeconds(expiresIn))
                .build();
        } catch (Exception e) {
            throw new RuntimeException("Microsoft token refresh error", e);
        }
    }

    @Override
    public List<ExternalCalendarDto> listCalendars(String accessToken) {
        List<ExternalCalendarDto> list = new ArrayList<>();
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GRAPH_API_BASE + "/me/calendars"))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode value = root.path("value");
                if (value.isArray()) {
                    for (JsonNode it : value) {
                        String id = it.path("id").asText();
                        String name = it.path("name").asText("Outlook Calendar");
                        boolean isDefault = it.path("isDefaultCalendar").asBoolean(false);
                        boolean canEdit = it.path("canEdit").asBoolean(true);

                        list.add(ExternalCalendarDto.builder()
                            .externalCalendarId(id)
                            .name(name)
                            .description("Microsoft Outlook Calendar")
                            .timezone("UTC")
                            .isPrimary(isDefault)
                            .canRead(true)
                            .canWrite(canEdit)
                            .syncEnabled(true)
                            .build());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Error listing Microsoft calendars: {}", e.getMessage());
        }
        return list;
    }

    @Override
    public ExternalCalendarDto getCalendar(String accessToken, String calendarId) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GRAPH_API_BASE + "/me/calendars/" + calendarId))
                .header("Authorization", "Bearer " + accessToken)
                .GET()
                .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode it = objectMapper.readTree(response.body());
                return ExternalCalendarDto.builder()
                    .externalCalendarId(it.path("id").asText())
                    .name(it.path("name").asText("Outlook Calendar"))
                    .description("Microsoft Outlook Calendar")
                    .timezone("UTC")
                    .isPrimary(it.path("isDefaultCalendar").asBoolean(false))
                    .canRead(true)
                    .canWrite(it.path("canEdit").asBoolean(true))
                    .syncEnabled(true)
                    .build();
            }
        } catch (Exception e) {
            log.error("Error getting Microsoft calendar: {}", e.getMessage());
        }
        return null;
    }

    @Override
    public CalendarEventDto createEvent(String accessToken, String calendarId, CalendarEventRequest request) {
        try {
            Map<String, Object> payload = buildGraphEventPayload(request);
            String jsonBody = objectMapper.writeValueAsString(payload);

            String url = (calendarId != null && !calendarId.equalsIgnoreCase("primary"))
                ? GRAPH_API_BASE + "/me/calendars/" + calendarId + "/events"
                : GRAPH_API_BASE + "/me/events";

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.error("Microsoft event creation failed: {} {}", response.statusCode(), response.body());
                throw new RuntimeException("Failed to create Outlook event: " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            return mapGraphJsonToDto(root);
        } catch (Exception e) {
            throw new RuntimeException("Error creating Microsoft event", e);
        }
    }

    @Override
    public CalendarEventDto updateEvent(String accessToken, String calendarId, String externalEventId, CalendarEventRequest request) {
        try {
            Map<String, Object> payload = buildGraphEventPayload(request);
            String jsonBody = objectMapper.writeValueAsString(payload);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(GRAPH_API_BASE + "/me/events/" + externalEventId))
                .header("Authorization", "Bearer " + accessToken)
                .header("Content-Type", "application/json")
                .method("PATCH", HttpRequest.BodyPublishers.ofString(jsonBody))
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                log.error("Microsoft event update failed: {} {}", response.statusCode(), response.body());
                throw new RuntimeException("Failed to update Outlook event: " + response.body());
            }

            JsonNode root = objectMapper.readTree(response.body());
            return mapGraphJsonToDto(root);
        } catch (Exception e) {
            throw new RuntimeException("Error updating Microsoft event", e);
        }
    }

    @Override
    public void deleteEvent(String accessToken, String calendarId, String externalEventId) {
        try {
            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(GRAPH_API_BASE + "/me/events/" + externalEventId))
                .header("Authorization", "Bearer " + accessToken)
                .DELETE()
                .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 204 && response.statusCode() != 200 && response.statusCode() != 404) {
                log.warn("Microsoft deleteEvent returned code: {}", response.statusCode());
            }
        } catch (Exception e) {
            log.error("Error deleting Microsoft event: {}", e.getMessage());
        }
    }

    @Override
    public CalendarSyncResult fullSync(String accessToken, String calendarId) {
        return fetchDeltaEvents(accessToken, null);
    }

    @Override
    public CalendarSyncResult incrementalSync(String accessToken, String calendarId, String deltaLink) {
        if (deltaLink == null || deltaLink.isEmpty()) {
            return fullSync(accessToken, calendarId);
        }
        CalendarSyncResult res = fetchDeltaEvents(accessToken, deltaLink);
        // Fallback if delta token is expired / resync required
        if (!res.isSuccess()) {
            log.warn("Microsoft deltaLink expired, performing full delta re-sync");
            return fullSync(accessToken, calendarId);
        }
        return res;
    }

    private CalendarSyncResult fetchDeltaEvents(String accessToken, String deltaLink) {
        List<CalendarEventDto> events = new ArrayList<>();
        try {
            String url = deltaLink;
            if (url == null || url.isEmpty()) {
                Instant start = Instant.now().minus(Duration.ofDays(90));
                Instant end = Instant.now().plus(Duration.ofDays(180));
                url = GRAPH_API_BASE + "/me/calendarView/delta?"
                    + "startDateTime=" + URLEncoder.encode(DateTimeFormatter.ISO_INSTANT.format(start), StandardCharsets.UTF_8)
                    + "&endDateTime=" + URLEncoder.encode(DateTimeFormatter.ISO_INSTANT.format(end), StandardCharsets.UTF_8);
            }

            String nextDeltaLink = null;
            int created = 0;
            int deleted = 0;

            while (url != null && !url.isEmpty()) {
                HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Prefer", "outlook.timezone=\"UTC\"")
                    .GET()
                    .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() >= 400) {
                    return CalendarSyncResult.builder().success(false).errorMessage("Graph delta error: " + response.statusCode()).build();
                }

                JsonNode root = objectMapper.readTree(response.body());
                JsonNode value = root.path("value");
                if (value.isArray()) {
                    for (JsonNode it : value) {
                        CalendarEventDto dto = mapGraphJsonToDto(it);
                        events.add(dto);
                        if ("CANCELLED".equals(dto.getStatus())) {
                            deleted++;
                        } else {
                            created++;
                        }
                    }
                }

                if (root.has("@odata.nextLink")) {
                    url = root.path("@odata.nextLink").asText();
                } else if (root.has("@odata.deltaLink")) {
                    nextDeltaLink = root.path("@odata.deltaLink").asText();
                    url = null;
                } else {
                    url = null;
                }
            }

            return CalendarSyncResult.builder()
                .success(true)
                .createdCount(created)
                .deletedCount(deleted)
                .nextDeltaLink(nextDeltaLink)
                .events(events)
                .build();
        } catch (Exception e) {
            log.error("Microsoft fetchDeltaEvents failed: {}", e.getMessage());
            return CalendarSyncResult.builder().success(false).errorMessage(e.getMessage()).build();
        }
    }

    private Map<String, Object> buildGraphEventPayload(CalendarEventRequest request) {
        Map<String, Object> map = new HashMap<>();
        map.put("subject", request.getTitle());

        String bodyContent = request.getDescription() != null ? request.getDescription() : "";
        if (request.getTaskFlowTaskId() != null) {
            bodyContent += "\n\n---\nTaskFlow Task ID: " + request.getTaskFlowTaskId();
        }
        if (request.getTaskFlowProjectId() != null) {
            bodyContent += "\nTaskFlow Project ID: " + request.getTaskFlowProjectId();
        }
        map.put("body", Map.of("contentType", "text", "content", bodyContent));

        String tz = request.getTimezone() != null ? request.getTimezone() : "UTC";

        String startIso = DateTimeFormatter.ISO_INSTANT.format(request.getStartAt());
        String endIso = DateTimeFormatter.ISO_INSTANT.format(request.getEndAt() != null ? request.getEndAt() : request.getStartAt().plus(Duration.ofMinutes(30)));

        map.put("start", Map.of("dateTime", startIso, "timeZone", tz));
        map.put("end", Map.of("dateTime", endIso, "timeZone", tz));
        map.put("isAllDay", request.isAllDay());

        if (request.getLocation() != null && !request.getLocation().isEmpty()) {
            map.put("location", Map.of("displayName", request.getLocation()));
        }

        if (request.getReminderMinutes() != null && !request.getReminderMinutes().isEmpty()) {
            map.put("isReminderOn", true);
            map.put("reminderMinutesBeforeStart", request.getReminderMinutes().get(0));
        }

        return map;
    }

    private CalendarEventDto mapGraphJsonToDto(JsonNode root) {
        String id = root.path("id").asText();
        String subject = root.path("subject").asText("Untitled Event");
        String desc = root.path("body").path("content").asText("");
        String onlineMeetingUrl = root.path("onlineMeeting").path("joinUrl").asText(null);
        String etag = root.path("@odata.etag").asText("");
        boolean isAllDay = root.path("isAllDay").asBoolean(false);

        boolean isDeleted = root.has("@removed");

        Instant startAt = Instant.now();
        Instant endAt = Instant.now().plus(Duration.ofMinutes(30));
        String tz = "UTC";

        try {
            if (root.has("start") && root.path("start").has("dateTime")) {
                startAt = Instant.parse(root.path("start").path("dateTime").asText());
                tz = root.path("start").path("timeZone").asText("UTC");
            }
            if (root.has("end") && root.path("end").has("dateTime")) {
                endAt = Instant.parse(root.path("end").path("dateTime").asText());
            }
        } catch (Exception e) {
            log.warn("Error parsing Microsoft event date: {}", e.getMessage());
        }

        return CalendarEventDto.builder()
            .source("MICROSOFT")
            .type("CALENDAR_EVENT")
            .externalEventId(id)
            .title(subject)
            .description(desc)
            .startAt(startAt)
            .endAt(endAt)
            .timezone(tz)
            .allDay(isAllDay)
            .status(isDeleted ? "CANCELLED" : "CONFIRMED")
            .meetingUrl(onlineMeetingUrl)
            .etag(etag)
            .build();
    }
}
