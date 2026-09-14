package com.taskflow.calendar.service;

import com.taskflow.calendar.dto.*;
import com.taskflow.calendar.entity.*;
import com.taskflow.calendar.provider.CalendarProvider;
import com.taskflow.calendar.provider.CalendarProviderFactory;
import com.taskflow.calendar.repository.*;
import com.taskflow.project.entity.Project;
import com.taskflow.task.entity.Task;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class CalendarSyncService {

    private final CalendarConnectionRepository connectionRepository;
    private final ExternalCalendarRepository externalCalendarRepository;
    private final CalendarEventMappingRepository eventMappingRepository;
    private final CalendarSyncStateRepository syncStateRepository;
    private final CalendarSyncPolicyRepository syncPolicyRepository;
    private final CalendarEventRepository calendarEventRepository;
    private final CalendarConnectionService connectionService;
    private final CalendarProviderFactory providerFactory;

    @Autowired(required = false)
    private RedisTemplate<String, Object> redisTemplate;

    private static final Map<String, Boolean> LOCAL_LOCKS = new ConcurrentHashMap<>();

    // Acquire lock on connection to prevent concurrent sync loops
    private boolean acquireLock(UUID connectionId) {
        String key = "calendar-sync-lock:" + connectionId;
        if (redisTemplate != null) {
            try {
                Boolean acquired = redisTemplate.opsForValue().setIfAbsent(key, "LOCKED", 10, TimeUnit.MINUTES);
                return Boolean.TRUE.equals(acquired);
            } catch (Exception e) {
                log.warn("Redis lock acquire failed, fallback to in-memory lock: {}", e.getMessage());
            }
        }
        return LOCAL_LOCKS.putIfAbsent(key, true) == null;
    }

    private void releaseLock(UUID connectionId) {
        String key = "calendar-sync-lock:" + connectionId;
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(key);
            } catch (Exception ignored) {}
        }
        LOCAL_LOCKS.remove(key);
    }

    /**
     * Outbound Task synchronization (TaskFlow -> Calendar)
     */
    @Async
    @Transactional
    public void syncTaskToCalendar(Task task, String action) {
        try {
            if (task == null || task.getWorkspaceId() == null) return;

            // Find calendar connections for the task workspace / user
            List<CalendarConnection> connections = connectionRepository.findByStatus("CONNECTED");
            if (connections.isEmpty()) return;

            for (CalendarConnection conn : connections) {
                // Check sync policy
                CalendarSyncPolicy policy = syncPolicyRepository.findFirstByUserIdAndWorkspaceIdOrderByCreatedAtDesc(conn.getUser().getId(), task.getWorkspaceId())
                    .or(() -> syncPolicyRepository.findFirstByUserIdOrderByCreatedAtDesc(conn.getUser().getId()))
                    .orElse(null);

                if (policy != null && Boolean.FALSE.equals(policy.getSyncTasks())) {
                    continue; // Task sync disabled by user
                }

                // Default external calendar
                String calendarId = policy != null && policy.getExternalCalendarId() != null
                    ? policy.getExternalCalendarId()
                    : externalCalendarRepository.findByConnectionIdAndIsPrimaryTrue(conn.getId())
                        .map(ExternalCalendar::getExternalCalendarId)
                        .orElse("primary");

                Optional<CalendarEventMapping> existingMapping = eventMappingRepository
                    .findByTaskIdAndCalendarConnectionId(task.getId(), conn.getId());

                if ("DELETE".equalsIgnoreCase(action)) {
                    if (existingMapping.isPresent()) {
                        CalendarEventMapping mapping = existingMapping.get();
                        if (policy == null || Boolean.TRUE.equals(policy.getDeleteExternalOnTaskDelete())) {
                            try {
                                String token = connectionService.getValidAccessToken(conn);
                                CalendarProvider provider = providerFactory.get(conn.getProvider());
                                provider.deleteEvent(token, mapping.getExternalCalendarId(), mapping.getExternalEventId());
                            } catch (Exception e) {
                                log.warn("Error deleting external calendar event: {}", e.getMessage());
                            }
                        }
                        eventMappingRepository.delete(mapping);
                    }
                    continue;
                }

                // Construct event dates
                Instant startAt = parseTaskStart(task);
                Instant endAt = parseTaskDue(task, startAt, policy != null ? policy.getDefaultTaskDurationMinutes() : 30);

                if (endAt == null && startAt == null) {
                    // Task has no schedulable date, skip creating calendar event per Section 58
                    continue;
                }

                if (startAt == null) startAt = endAt.minus(Duration.ofMinutes(30));
                if (endAt == null) endAt = startAt.plus(Duration.ofMinutes(30));

                List<Integer> reminderMinutes = (policy != null && policy.getDefaultReminderMinutes() != null)
                    ? List.of(policy.getDefaultReminderMinutes())
                    : List.of(30);

                CalendarEventRequest req = CalendarEventRequest.builder()
                    .title("[TaskFlow] " + task.getTitle())
                    .description(task.getDescription() != null ? task.getDescription() : "TaskFlow Deliverable")
                    .startAt(startAt)
                    .endAt(endAt)
                    .timezone("UTC")
                    .allDay(false)
                    .reminderMinutes(reminderMinutes)
                    .taskFlowTaskId(task.getId().toString())
                    .build();

                String token = connectionService.getValidAccessToken(conn);
                CalendarProvider provider = providerFactory.get(conn.getProvider());

                if (existingMapping.isPresent()) {
                    // Update existing external event (Section 24)
                    CalendarEventMapping mapping = existingMapping.get();
                    try {
                        CalendarEventDto updated = provider.updateEvent(token, mapping.getExternalCalendarId(), mapping.getExternalEventId(), req);
                        mapping.setExternalEventEtag(updated.getEtag());
                        mapping.setLastSyncedAt(Instant.now());
                        eventMappingRepository.save(mapping);
                    } catch (Exception e) {
                        log.warn("Error updating external calendar event: {}", e.getMessage());
                    }
                } else {
                    // Create new external event (Section 16, 18, 31)
                    try {
                        CalendarEventDto created = provider.createEvent(token, calendarId, req);
                        CalendarEventMapping mapping = CalendarEventMapping.builder()
                            .user(conn.getUser())
                            .task(task)
                            .calendarConnection(conn)
                            .externalCalendarId(calendarId)
                            .externalEventId(created.getExternalEventId())
                            .externalEventEtag(created.getEtag())
                            .syncDirection("TWO_WAY")
                            .source("TASKFLOW")
                            .lastSyncedAt(Instant.now())
                            .build();
                        eventMappingRepository.save(mapping);
                    } catch (Exception e) {
                        log.warn("Error creating external calendar event: {}", e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to sync task to calendar: {}", e.getMessage());
        }
    }

    /**
     * Inbound synchronization (Google/Microsoft -> TaskFlow)
     */
    @Async
    @Transactional
    public void syncConnection(UUID connectionId) {
        if (!acquireLock(connectionId)) {
            log.info("Sync already in progress for connection: {}", connectionId);
            return;
        }

        try {
            CalendarConnection conn = connectionRepository.findById(connectionId)
                .orElseThrow(() -> new IllegalArgumentException("Connection not found: " + connectionId));

            conn.setLastSyncStartedAt(Instant.now());
            connectionRepository.save(conn);

            String accessToken = connectionService.getValidAccessToken(conn);
            CalendarProvider provider = providerFactory.get(conn.getProvider());

            List<ExternalCalendar> calendars = externalCalendarRepository.findByConnectionId(conn.getId());
            if (calendars.isEmpty()) {
                calendars = List.of(ExternalCalendar.builder()
                    .connection(conn)
                    .externalCalendarId("primary")
                    .name("Primary Calendar")
                    .build());
            }

            int totalCreated = 0;
            int totalDeleted = 0;

            for (ExternalCalendar cal : calendars) {
                CalendarSyncState state = syncStateRepository
                    .findByCalendarConnectionIdAndExternalCalendarId(conn.getId(), cal.getExternalCalendarId())
                    .orElse(CalendarSyncState.builder()
                        .calendarConnection(conn)
                        .externalCalendarId(cal.getExternalCalendarId())
                        .build());

                CalendarSyncResult result;
                if ("GOOGLE".equalsIgnoreCase(conn.getProvider())) {
                    result = provider.incrementalSync(accessToken, cal.getExternalCalendarId(), state.getSyncToken());
                    if (result.isSuccess() && result.getNextSyncToken() != null) {
                        state.setSyncToken(result.getNextSyncToken());
                    }
                } else {
                    result = provider.incrementalSync(accessToken, cal.getExternalCalendarId(), state.getDeltaLink());
                    if (result.isSuccess() && result.getNextDeltaLink() != null) {
                        state.setDeltaLink(result.getNextDeltaLink());
                    }
                }

                if (result.isSuccess() && result.getEvents() != null) {
                    for (CalendarEventDto ev : result.getEvents()) {
                        // Loop prevention: check if this event was created by TaskFlow per Section 30 & 39
                        boolean isTaskFlowEvent = ev.getTitle() != null && ev.getTitle().startsWith("[TaskFlow]")
                            || (ev.getDescription() != null && ev.getDescription().contains("TaskFlow Task ID:"));

                        Optional<CalendarEvent> existingEvent = calendarEventRepository
                            .findByCalendarIdAndExternalEventId(cal.getId(), ev.getExternalEventId());

                        if ("CANCELLED".equalsIgnoreCase(ev.getStatus())) {
                            existingEvent.ifPresent(calendarEventRepository::delete);
                            totalDeleted++;
                        } else {
                            CalendarEvent localEvent = existingEvent.orElse(CalendarEvent.builder()
                                .user(conn.getUser())
                                .calendar(cal)
                                .externalEventId(ev.getExternalEventId())
                                .build());

                            localEvent.setTitle(ev.getTitle());
                            localEvent.setDescription(ev.getDescription());
                            localEvent.setStartAt(ev.getStartAt());
                            localEvent.setEndAt(ev.getEndAt());
                            localEvent.setTimezone(ev.getTimezone());
                            localEvent.setAllDay(ev.isAllDay());
                            localEvent.setStatus(ev.getStatus());
                            localEvent.setMeetingUrl(ev.getMeetingUrl());
                            localEvent.setEtag(ev.getEtag());
                            localEvent.setLastSyncedAt(Instant.now());
                            calendarEventRepository.save(localEvent);
                            totalCreated++;
                        }
                    }
                    state.setLastIncrementalSyncAt(Instant.now());
                    state.setStatus("IDLE");
                    state.setError(null);
                    syncStateRepository.save(state);
                }
            }

            conn.setLastSuccessfulSyncAt(Instant.now());
            conn.setStatus("CONNECTED");
            conn.setLastSyncError(null);
            connectionRepository.save(conn);
            log.info("Connection {} synced: {} created, {} deleted", connectionId, totalCreated, totalDeleted);
        } catch (Exception e) {
            log.error("Error during connection sync: {}", e.getMessage());
        } finally {
            releaseLock(connectionId);
        }
    }

    /**
     * Periodic synchronization fallback every 10 minutes per Section 15
     */
    @Scheduled(fixedDelay = 600000, initialDelay = 60000)
    public void runPeriodicSync() {
        List<CalendarConnection> active = connectionRepository.findByStatus("CONNECTED");
        for (CalendarConnection conn : active) {
            try {
                syncConnection(conn.getId());
            } catch (Exception e) {
                log.warn("Periodic sync failed for conn {}: {}", conn.getId(), e.getMessage());
            }
        }
    }

    private Instant parseTaskDue(Task task, Instant fallbackStart, int durationMinutes) {
        if (task.getDueDate() == null || task.getDueDate().isEmpty()) return null;
        try {
            if ("Today".equalsIgnoreCase(task.getDueDate())) {
                return LocalDate.now().atTime(17, 0).atZone(ZoneId.of("UTC")).toInstant();
            }
            if ("Tomorrow".equalsIgnoreCase(task.getDueDate())) {
                return LocalDate.now().plusDays(1).atTime(17, 0).atZone(ZoneId.of("UTC")).toInstant();
            }
            LocalDate ld = LocalDate.parse(task.getDueDate().trim());
            return ld.atTime(17, 0).atZone(ZoneId.of("UTC")).toInstant();
        } catch (Exception e) {
            if (fallbackStart != null) return fallbackStart.plus(Duration.ofMinutes(durationMinutes));
            return null;
        }
    }

    private Instant parseTaskStart(Task task) {
        return null; // By default TaskFlow task creates event based on due date minus duration
    }
}
