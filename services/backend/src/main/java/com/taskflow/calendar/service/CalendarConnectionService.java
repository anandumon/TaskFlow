package com.taskflow.calendar.service;

import com.taskflow.calendar.dto.*;
import com.taskflow.calendar.entity.*;
import com.taskflow.calendar.provider.CalendarProvider;
import com.taskflow.calendar.provider.CalendarProviderFactory;
import com.taskflow.calendar.repository.*;
import com.taskflow.calendar.security.CalendarEncryptionService;
import com.taskflow.identity.entity.User;
import com.taskflow.identity.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CalendarConnectionService {

    private final CalendarConnectionRepository connectionRepository;
    private final ExternalCalendarRepository externalCalendarRepository;
    private final CalendarSyncPolicyRepository syncPolicyRepository;
    private final CalendarEventMappingRepository eventMappingRepository;
    private final UserRepository userRepository;
    private final CalendarEncryptionService encryptionService;
    private final CalendarProviderFactory providerFactory;

    public String buildAuthorizeUrl(UUID userId, String providerName, String redirectUri) {
        CalendarProvider provider = providerFactory.get(providerName);
        String state = userId.toString() + ":" + UUID.randomUUID();
        return provider.buildAuthorizationUrl(redirectUri, state);
    }

    @Transactional
    public CalendarConnectionDto handleOAuthCallback(UUID userId, String providerName, String code, String redirectUri) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        CalendarProvider provider = providerFactory.get(providerName);
        OAuthTokenResponse tokenResponse = provider.exchangeCode(code, redirectUri);

        String providerUpper = providerName.trim().toUpperCase();
        CalendarConnection connection = connectionRepository.findByUserAndProvider(userId, providerUpper)
            .orElseGet(() -> connectionRepository.findFirstByUserIdAndProviderOrderByCreatedAtDesc(userId, providerUpper)
                .orElse(CalendarConnection.builder()
                    .user(user)
                    .provider(providerUpper)
                    .build()));

        connection.setProviderAccountId(tokenResponse.getProviderAccountId());
        connection.setProviderEmail(tokenResponse.getProviderEmail());
        connection.setAccessToken(encryptionService.encrypt(tokenResponse.getAccessToken()));
        if (tokenResponse.getRefreshToken() != null && !tokenResponse.getRefreshToken().isEmpty()) {
            connection.setRefreshToken(encryptionService.encrypt(tokenResponse.getRefreshToken()));
        }
        connection.setTokenExpiresAt(tokenResponse.getTokenExpiresAt());
        connection.setScope(tokenResponse.getScope());
        connection.setStatus("CONNECTED");
        connection.setLastSyncStartedAt(Instant.now());
        try {
            connection = connectionRepository.saveAndFlush(connection);
        } catch (Exception ex) {
            connection = connectionRepository.findByUserAndProvider(userId, providerUpper).orElse(connection);
            connection.setProviderAccountId(tokenResponse.getProviderAccountId());
            connection.setProviderEmail(tokenResponse.getProviderEmail());
            connection.setAccessToken(encryptionService.encrypt(tokenResponse.getAccessToken()));
            if (tokenResponse.getRefreshToken() != null && !tokenResponse.getRefreshToken().isEmpty()) {
                connection.setRefreshToken(encryptionService.encrypt(tokenResponse.getRefreshToken()));
            }
            connection.setTokenExpiresAt(tokenResponse.getTokenExpiresAt());
            connection.setScope(tokenResponse.getScope());
            connection.setStatus("CONNECTED");
            connection = connectionRepository.saveAndFlush(connection);
        }

        // Discover and store external calendars
        try {
            List<ExternalCalendarDto> discovered = provider.listCalendars(tokenResponse.getAccessToken());
            for (ExternalCalendarDto dto : discovered) {
                ExternalCalendar ext = externalCalendarRepository
                    .findByConnectionIdAndExternalCalendarId(connection.getId(), dto.getExternalCalendarId())
                    .orElse(ExternalCalendar.builder()
                        .connection(connection)
                        .externalCalendarId(dto.getExternalCalendarId())
                        .build());

                ext.setName(dto.getName());
                ext.setDescription(dto.getDescription());
                ext.setTimezone(dto.getTimezone());
                ext.setIsPrimary(dto.isPrimary());
                ext.setCanRead(dto.isCanRead());
                ext.setCanWrite(dto.isCanWrite());
                ext.setSyncEnabled(true);
                externalCalendarRepository.save(ext);
            }
        } catch (Exception e) {
            log.error("Failed to discover calendars for user {}: {}", userId, e.getMessage());
        }

        // Initialize default sync policy if not existing
        if (syncPolicyRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).isEmpty()) {
            syncPolicyRepository.save(CalendarSyncPolicy.builder()
                .user(user)
                .calendarConnection(connection)
                .syncTasks(true)
                .syncProjects(true)
                .syncDeadlines(true)
                .syncReminders(true)
                .defaultTaskDurationMinutes(30)
                .defaultReminderMinutes(30)
                .deleteExternalOnTaskDelete(true)
                .build());
        }

        return mapToDto(connection);
    }

    @Transactional
    public CalendarConnectionDto saveDirectTokens(UUID userId, String providerName, String accessToken, String refreshToken, String email) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        String providerUpper = providerName.trim().toUpperCase();
        CalendarConnection connection = connectionRepository.findByUserAndProvider(userId, providerUpper)
            .orElseGet(() -> connectionRepository.findFirstByUserIdAndProviderOrderByCreatedAtDesc(userId, providerUpper)
                .orElse(CalendarConnection.builder()
                    .user(user)
                    .provider(providerUpper)
                    .build()));

        connection.setProviderEmail(email != null ? email : user.getEmail());
        connection.setAccessToken(encryptionService.encrypt(accessToken));
        if (refreshToken != null && !refreshToken.isEmpty()) {
            connection.setRefreshToken(encryptionService.encrypt(refreshToken));
        }
        connection.setTokenExpiresAt(Instant.now().plusSeconds(3600));
        connection.setStatus("CONNECTED");
        connection.setLastSyncStartedAt(Instant.now());
        try {
            connection = connectionRepository.saveAndFlush(connection);
        } catch (Exception ex) {
            connection = connectionRepository.findByUserAndProvider(userId, providerUpper).orElse(connection);
            connection.setProviderEmail(email != null ? email : user.getEmail());
            connection.setAccessToken(encryptionService.encrypt(accessToken));
            if (refreshToken != null && !refreshToken.isEmpty()) {
                connection.setRefreshToken(encryptionService.encrypt(refreshToken));
            }
            connection.setTokenExpiresAt(Instant.now().plusSeconds(3600));
            connection.setStatus("CONNECTED");
            connection = connectionRepository.saveAndFlush(connection);
        }

        // Discover and store external calendars
        try {
            CalendarProvider provider = providerFactory.get(providerName);
            List<ExternalCalendarDto> discovered = provider.listCalendars(accessToken);
            for (ExternalCalendarDto dto : discovered) {
                ExternalCalendar ext = externalCalendarRepository
                    .findByConnectionIdAndExternalCalendarId(connection.getId(), dto.getExternalCalendarId())
                    .orElse(ExternalCalendar.builder()
                        .connection(connection)
                        .externalCalendarId(dto.getExternalCalendarId())
                        .build());

                ext.setName(dto.getName());
                ext.setDescription(dto.getDescription());
                ext.setTimezone(dto.getTimezone());
                ext.setIsPrimary(dto.isPrimary());
                ext.setCanRead(dto.isCanRead());
                ext.setCanWrite(dto.isCanWrite());
                ext.setSyncEnabled(true);
                externalCalendarRepository.save(ext);
            }
        } catch (Exception e) {
            log.error("Failed to discover calendars for direct tokens user {}: {}", userId, e.getMessage());
        }

        // Initialize default sync policy if not existing
        if (syncPolicyRepository.findFirstByUserIdOrderByCreatedAtDesc(userId).isEmpty()) {
            syncPolicyRepository.save(CalendarSyncPolicy.builder()
                .user(user)
                .calendarConnection(connection)
                .syncTasks(true)
                .syncProjects(true)
                .syncDeadlines(true)
                .syncReminders(true)
                .defaultTaskDurationMinutes(30)
                .defaultReminderMinutes(30)
                .deleteExternalOnTaskDelete(true)
                .build());
        }

        return mapToDto(connection);
    }

    public String getValidAccessToken(CalendarConnection connection) {
        if (connection.getTokenExpiresAt() != null && connection.getTokenExpiresAt().isBefore(Instant.now().plusSeconds(300))) {
            // Token is expired or expiring within 5 minutes, refresh it
            refreshConnectionToken(connection);
        }
        return encryptionService.decrypt(connection.getAccessToken());
    }

    @Transactional
    public void refreshConnectionToken(CalendarConnection connection) {
        try {
            String refreshToken = encryptionService.decrypt(connection.getRefreshToken());
            if (refreshToken == null || refreshToken.isEmpty()) {
                connection.setStatus("REAUTH_REQUIRED");
                connection.setLastSyncError("No refresh token available");
                connectionRepository.save(connection);
                return;
            }

            CalendarProvider provider = providerFactory.get(connection.getProvider());
            OAuthTokenResponse refreshResponse = provider.refreshAccessToken(refreshToken);

            connection.setAccessToken(encryptionService.encrypt(refreshResponse.getAccessToken()));
            if (refreshResponse.getTokenExpiresAt() != null) {
                connection.setTokenExpiresAt(refreshResponse.getTokenExpiresAt());
            }
            connection.setStatus("CONNECTED");
            connectionRepository.save(connection);
        } catch (Exception e) {
            log.error("Failed to refresh token for connection {}: {}", connection.getId(), e.getMessage());
            connection.setStatus("REAUTH_REQUIRED");
            connection.setLastSyncError("Token refresh failed: " + e.getMessage());
            connectionRepository.save(connection);
        }
    }

    @Transactional
    public void disconnectCalendar(UUID userId, UUID connectionId, boolean deleteExternalEvents) {
        CalendarConnection connection = connectionRepository.findById(connectionId)
            .filter(c -> c.getUser().getId().equals(userId))
            .orElseThrow(() -> new IllegalArgumentException("Connection not found: " + connectionId));

        if (deleteExternalEvents) {
            try {
                String accessToken = getValidAccessToken(connection);
                CalendarProvider provider = providerFactory.get(connection.getProvider());
                List<CalendarEventMapping> mappings = eventMappingRepository.findByTaskId(null); // or mappings for connection
                for (CalendarEventMapping m : mappings) {
                    if (m.getCalendarConnection().getId().equals(connection.getId())) {
                        try {
                            provider.deleteEvent(accessToken, m.getExternalCalendarId(), m.getExternalEventId());
                        } catch (Exception ignored) {}
                    }
                }
            } catch (Exception e) {
                log.warn("Error deleting external events on disconnect: {}", e.getMessage());
            }
        }

        connection.setAccessToken(null);
        connection.setRefreshToken(null);
        connection.setStatus("DISCONNECTED");
        connectionRepository.save(connection);
    }

    public List<CalendarConnectionDto> getUserConnections(UUID userId) {
        List<CalendarConnection> list = connectionRepository.findByUserId(userId);
        List<CalendarConnectionDto> dtos = new ArrayList<>();
        for (CalendarConnection c : list) {
            dtos.add(mapToDto(c));
        }
        return dtos;
    }

    public CalendarConnectionDto getConnectionDto(UUID connectionId) {
        CalendarConnection conn = connectionRepository.findById(connectionId)
            .orElseThrow(() -> new IllegalArgumentException("Connection not found: " + connectionId));
        return mapToDto(conn);
    }

    private CalendarConnectionDto mapToDto(CalendarConnection conn) {
        List<ExternalCalendar> calendars = externalCalendarRepository.findByConnectionId(conn.getId());
        List<ExternalCalendarDto> calDtos = new ArrayList<>();
        String defaultCalId = null;

        for (ExternalCalendar ec : calendars) {
            boolean isPrimary = Boolean.TRUE.equals(ec.getIsPrimary());
            if (isPrimary && defaultCalId == null) {
                defaultCalId = ec.getExternalCalendarId();
            }
            calDtos.add(ExternalCalendarDto.builder()
                .id(ec.getId())
                .externalCalendarId(ec.getExternalCalendarId())
                .name(ec.getName())
                .description(ec.getDescription())
                .timezone(ec.getTimezone())
                .isPrimary(isPrimary)
                .canRead(Boolean.TRUE.equals(ec.getCanRead()))
                .canWrite(Boolean.TRUE.equals(ec.getCanWrite()))
                .syncEnabled(Boolean.TRUE.equals(ec.getSyncEnabled()))
                .build());
        }

        if (defaultCalId == null && !calDtos.isEmpty()) {
            defaultCalId = calDtos.get(0).getExternalCalendarId();
        }

        return CalendarConnectionDto.builder()
            .id(conn.getId())
            .provider(conn.getProvider())
            .providerAccountId(conn.getProviderAccountId())
            .providerEmail(conn.getProviderEmail())
            .status(conn.getStatus())
            .lastSuccessfulSyncAt(conn.getLastSuccessfulSyncAt())
            .lastSyncStartedAt(conn.getLastSyncStartedAt())
            .lastSyncError(conn.getLastSyncError())
            .calendars(calDtos)
            .defaultCalendarId(defaultCalId)
            .build();
    }

    public List<ExternalCalendarDto> getCalendars(UUID connectionId) {
        List<ExternalCalendar> calendars = externalCalendarRepository.findByConnectionId(connectionId);
        List<ExternalCalendarDto> dtos = new ArrayList<>();
        for (ExternalCalendar ec : calendars) {
            dtos.add(ExternalCalendarDto.builder()
                .id(ec.getId())
                .externalCalendarId(ec.getExternalCalendarId())
                .name(ec.getName())
                .description(ec.getDescription())
                .timezone(ec.getTimezone())
                .isPrimary(Boolean.TRUE.equals(ec.getIsPrimary()))
                .canRead(Boolean.TRUE.equals(ec.getCanRead()))
                .canWrite(Boolean.TRUE.equals(ec.getCanWrite()))
                .syncEnabled(Boolean.TRUE.equals(ec.getSyncEnabled()))
                .build());
        }
        return dtos;
    }

    public CalendarSyncPolicyDto getSyncPolicy(UUID userId, UUID workspaceId) {
        Optional<CalendarSyncPolicy> policyOpt = workspaceId != null
            ? syncPolicyRepository.findFirstByUserIdAndWorkspaceIdOrderByCreatedAtDesc(userId, workspaceId)
            : syncPolicyRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);

        CalendarSyncPolicy policy = policyOpt.orElseGet(() -> {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
            return syncPolicyRepository.save(CalendarSyncPolicy.builder()
                .user(user)
                .syncTasks(true)
                .syncProjects(true)
                .syncDeadlines(true)
                .syncReminders(true)
                .importExternalEvents(false)
                .exportTaskflowEvents(true)
                .defaultTaskDurationMinutes(30)
                .defaultReminderMinutes(30)
                .deleteExternalOnTaskDelete(true)
                .build());
        });

        return mapPolicyToDto(policy);
    }

    @Transactional
    public CalendarSyncPolicyDto updateSyncPolicy(UUID userId, CalendarSyncPolicyDto dto) {
        Optional<CalendarSyncPolicy> policyOpt = dto.getWorkspaceId() != null
            ? syncPolicyRepository.findFirstByUserIdAndWorkspaceIdOrderByCreatedAtDesc(userId, dto.getWorkspaceId())
            : syncPolicyRepository.findFirstByUserIdOrderByCreatedAtDesc(userId);

        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        CalendarSyncPolicy policy = policyOpt.orElse(CalendarSyncPolicy.builder().user(user).build());
        policy.setSyncTasks(dto.isSyncTasks());
        policy.setSyncProjects(dto.isSyncProjects());
        policy.setSyncDeadlines(dto.isSyncDeadlines());
        policy.setSyncReminders(dto.isSyncReminders());
        policy.setImportExternalEvents(dto.isImportExternalEvents());
        policy.setExportTaskflowEvents(dto.isExportTaskflowEvents());
        policy.setDefaultTaskDurationMinutes(dto.getDefaultTaskDurationMinutes() > 0 ? dto.getDefaultTaskDurationMinutes() : 30);
        policy.setDefaultReminderMinutes(dto.getDefaultReminderMinutes() >= 0 ? dto.getDefaultReminderMinutes() : 30);
        policy.setDeleteExternalOnTaskDelete(dto.isDeleteExternalOnTaskDelete());
        if (dto.getExternalCalendarId() != null && !dto.getExternalCalendarId().isEmpty()) {
            policy.setExternalCalendarId(dto.getExternalCalendarId());
        }

        policy = syncPolicyRepository.save(policy);
        return mapPolicyToDto(policy);
    }

    private CalendarSyncPolicyDto mapPolicyToDto(CalendarSyncPolicy policy) {
        return CalendarSyncPolicyDto.builder()
            .id(policy.getId())
            .workspaceId(policy.getWorkspace() != null ? policy.getWorkspace().getId() : null)
            .calendarConnectionId(policy.getCalendarConnection() != null ? policy.getCalendarConnection().getId() : null)
            .externalCalendarId(policy.getExternalCalendarId())
            .syncTasks(Boolean.TRUE.equals(policy.getSyncTasks()))
            .syncProjects(Boolean.TRUE.equals(policy.getSyncProjects()))
            .syncDeadlines(Boolean.TRUE.equals(policy.getSyncDeadlines()))
            .syncReminders(Boolean.TRUE.equals(policy.getSyncReminders()))
            .importExternalEvents(Boolean.TRUE.equals(policy.getImportExternalEvents()))
            .exportTaskflowEvents(Boolean.TRUE.equals(policy.getExportTaskflowEvents()))
            .defaultTaskDurationMinutes(policy.getDefaultTaskDurationMinutes() != null ? policy.getDefaultTaskDurationMinutes() : 30)
            .defaultReminderMinutes(policy.getDefaultReminderMinutes() != null ? policy.getDefaultReminderMinutes() : 30)
            .deleteExternalOnTaskDelete(Boolean.TRUE.equals(policy.getDeleteExternalOnTaskDelete()))
            .build();
    }
}
