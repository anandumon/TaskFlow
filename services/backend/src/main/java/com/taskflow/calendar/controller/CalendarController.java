package com.taskflow.calendar.controller;

import com.taskflow.calendar.dto.*;
import com.taskflow.calendar.service.CalendarConnectionService;
import com.taskflow.calendar.service.CalendarEventService;
import com.taskflow.calendar.service.CalendarSyncService;
import com.taskflow.common.dto.ApiResponse;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.time.Instant;
import java.util.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarConnectionService connectionService;
    private final CalendarSyncService syncService;
    private final CalendarEventService eventService;
    private final UserRepository userRepository;

    @GetMapping("/connections")
    public ResponseEntity<ApiResponse<List<CalendarConnectionDto>>> getConnections(
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = getUserId(userDetails);
        List<CalendarConnectionDto> connections = connectionService.getUserConnections(userId);
        return ResponseEntity.ok(ApiResponse.success(connections));
    }

    @GetMapping({"/connections/authorize", "/connect/{provider}"})
    public ResponseEntity<ApiResponse<Map<String, String>>> authorizeConnection(
        @PathVariable(value = "provider", required = false) String pathProvider,
        @RequestParam(value = "provider", required = false) String queryProvider,
        @RequestParam(value = "redirectUri", required = false) String redirectUri,
        @RequestParam(value = "workspaceId", required = false) UUID workspaceId,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = getUserId(userDetails);
        String provider = pathProvider != null ? pathProvider : queryProvider;
        if (redirectUri == null || redirectUri.isBlank()) {
            redirectUri = "http://localhost:3000/app/calendar/callback";
        }
        String authUrl = connectionService.buildAuthorizeUrl(userId, provider, redirectUri);
        return ResponseEntity.ok(ApiResponse.success(Map.of("authorizationUrl", authUrl, "url", authUrl)));
    }

    @GetMapping("/oauth/{provider}/callback")
    public ResponseEntity<ApiResponse<CalendarConnectionDto>> handleCallback(
        @PathVariable("provider") String provider,
        @RequestParam("code") String code,
        @RequestParam(value = "redirectUri", required = false) String redirectUri,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = getUserId(userDetails);
        if (redirectUri == null || redirectUri.isBlank()) {
            redirectUri = "http://localhost:3000/app/calendar/callback";
        }
        CalendarConnectionDto dto = connectionService.handleOAuthCallback(userId, provider, code, redirectUri);

        // Trigger initial full sync asynchronously
        syncService.syncConnection(dto.getId());

        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PostMapping("/callback/{provider}")
    public ResponseEntity<ApiResponse<CalendarConnectionDto>> handleCallbackPost(
        @PathVariable("provider") String provider,
        @RequestBody Map<String, Object> body,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = getUserId(userDetails);
        CalendarConnectionDto dto;

        if (body != null && body.containsKey("accessToken")) {
            String accessToken = (String) body.get("accessToken");
            String refreshToken = (String) body.get("refreshToken");
            String email = (String) body.get("email");
            dto = connectionService.saveDirectTokens(userId, provider, accessToken, refreshToken, email);
        } else {
            String code = body != null ? (String) body.get("code") : null;
            String redirectUri = body != null ? (String) body.getOrDefault("redirectUri", "http://localhost:3000/app/calendar/callback") : "http://localhost:3000/app/calendar/callback";
            dto = connectionService.handleOAuthCallback(userId, provider, code, redirectUri);
        }

        // Trigger initial full sync asynchronously
        syncService.syncConnection(dto.getId());

        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/connections/{id}/calendars")
    public ResponseEntity<ApiResponse<List<ExternalCalendarDto>>> getCalendars(
        @PathVariable("id") UUID connectionId,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        List<ExternalCalendarDto> calendars = connectionService.getCalendars(connectionId);
        return ResponseEntity.ok(ApiResponse.success(calendars));
    }

    @GetMapping("/policy")
    public ResponseEntity<ApiResponse<CalendarSyncPolicyDto>> getPolicy(
        @RequestParam(value = "workspaceId", required = false) UUID workspaceId,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = getUserId(userDetails);
        CalendarSyncPolicyDto policy = connectionService.getSyncPolicy(userId, workspaceId);
        return ResponseEntity.ok(ApiResponse.success(policy));
    }

    @PutMapping("/policy")
    public ResponseEntity<ApiResponse<CalendarSyncPolicyDto>> updatePolicy(
        @RequestBody CalendarSyncPolicyDto dto,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = getUserId(userDetails);
        CalendarSyncPolicyDto updated = connectionService.updateSyncPolicy(userId, dto);
        return ResponseEntity.ok(ApiResponse.success(updated));
    }

    @PostMapping({"/connections/{id}/sync", "/sync/{id}"})
    public ResponseEntity<ApiResponse<CalendarSyncResult>> syncConnection(
        @PathVariable("id") UUID connectionId,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        // Asynchronous manual sync per Section 52
        syncService.syncConnection(connectionId);
        CalendarSyncResult result = CalendarSyncResult.builder()
            .success(true)
            .createdCount(0)
            .updatedCount(0)
            .deletedCount(0)
            .build();
        return ResponseEntity.accepted().body(ApiResponse.success(result));
    }

    @DeleteMapping("/connections/{id}")
    public ResponseEntity<ApiResponse<Void>> disconnectConnection(
        @PathVariable("id") UUID connectionId,
        @RequestParam(value = "deleteExternalEvents", defaultValue = "false") boolean deleteExternalEvents,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = getUserId(userDetails);
        connectionService.disconnectCalendar(userId, connectionId, deleteExternalEvents);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/events")
    public ResponseEntity<ApiResponse<List<CalendarEventDto>>> getUnifiedEvents(
        @RequestParam(value = "workspaceId", required = false) UUID workspaceId,
        @RequestParam(value = "start", required = false) Instant start,
        @RequestParam(value = "end", required = false) Instant end,
        @AuthenticationPrincipal UserDetails userDetails
    ) {
        UUID userId = getUserId(userDetails);
        List<CalendarEventDto> events = eventService.getUnifiedCalendarEvents(userId, workspaceId, start, end);
        return ResponseEntity.ok(ApiResponse.success(events));
    }

    /**
     * Webhook push notification receiver for Google Calendar (Section 64)
     */
    @PostMapping("/webhooks/google")
    public ResponseEntity<Void> handleGoogleWebhook(
        @RequestHeader(value = "X-Goog-Channel-ID", required = false) String channelId,
        @RequestHeader(value = "X-Goog-Resource-State", required = false) String state
    ) {
        log.info("Google Calendar webhook received for channel [{}], state [{}]", channelId, state);
        if ("sync".equalsIgnoreCase(state)) {
            return ResponseEntity.ok().build();
        }
        // Trigger incremental synchronization
        syncService.runPeriodicSync();
        return ResponseEntity.ok().build();
    }

    /**
     * Webhook change notification receiver for Microsoft Graph (Section 64)
     */
    @PostMapping("/webhooks/microsoft")
    public ResponseEntity<String> handleMicrosoftWebhook(
        @RequestParam(value = "validationToken", required = false) String validationToken
    ) {
        // Handle validation challenge during subscription registration
        if (validationToken != null && !validationToken.isEmpty()) {
            log.info("Microsoft Graph webhook validation challenge received");
            return ResponseEntity.ok().body(validationToken);
        }

        log.info("Microsoft Graph calendar change notification received");
        syncService.runPeriodicSync();
        return ResponseEntity.accepted().build();
    }

    private UUID getUserId(UserDetails userDetails) {
        if (userDetails == null) {
            // Default demo fallback if authentication not passed
            return userRepository.findByEmailAndDeletedFalse("anandu2109@gmail.com")
                .map(User::getId)
                .orElse(UUID.fromString("9be8dc29-1065-4f40-a359-009c95b64c3c"));
        }
        return userRepository.findByEmailAndDeletedFalse(userDetails.getUsername())
            .map(User::getId)
            .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found: " + userDetails.getUsername()));
    }
}
