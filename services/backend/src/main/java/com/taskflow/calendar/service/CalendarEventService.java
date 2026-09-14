package com.taskflow.calendar.service;

import com.taskflow.calendar.dto.CalendarEventDto;
import com.taskflow.calendar.entity.CalendarEvent;
import com.taskflow.calendar.entity.CalendarEventMapping;
import com.taskflow.calendar.repository.CalendarEventMappingRepository;
import com.taskflow.calendar.repository.CalendarEventRepository;
import com.taskflow.task.entity.Task;
import com.taskflow.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class CalendarEventService {

    private final CalendarEventRepository calendarEventRepository;
    private final CalendarEventMappingRepository eventMappingRepository;
    private final TaskRepository taskRepository;

    @Transactional(readOnly = true)
    public List<CalendarEventDto> getUnifiedCalendarEvents(UUID userId, UUID workspaceId, Instant start, Instant end) {
        List<CalendarEventDto> unified = new ArrayList<>();
        Set<String> mappedExternalIds = new HashSet<>();

        // 1. Fetch TaskFlow tasks with due dates in this workspace
        if (workspaceId != null) {
            List<Task> tasks = taskRepository.findByWorkspaceIdAndDeletedFalseOrderByCreatedAtDesc(workspaceId);
            for (Task t : tasks) {
                Instant dueInstant = parseDueDate(t.getDueDate());
                if (dueInstant != null) {
                    if ((start == null || !dueInstant.isBefore(start)) && (end == null || !dueInstant.isAfter(end))) {
                        unified.add(CalendarEventDto.builder()
                            .id(t.getId())
                            .source("TASKFLOW")
                            .type("TASK")
                            .title(t.getTitle())
                            .description(t.getDescription())
                            .startAt(dueInstant.minus(Duration.ofMinutes(30)))
                            .endAt(dueInstant)
                            .timezone("UTC")
                            .allDay(false)
                            .status(t.getStatus())
                            .build());

                        // Collect mappings to avoid duplicates from external import
                        List<CalendarEventMapping> mappings = eventMappingRepository.findByTaskId(t.getId());
                        for (CalendarEventMapping m : mappings) {
                            mappedExternalIds.add(m.getExternalEventId());
                        }
                    }
                }
            }
        }

        // 2. Fetch external imported calendar events (Google / Outlook)
        List<CalendarEvent> externalEvents;
        if (start != null && end != null) {
            externalEvents = calendarEventRepository.findByUserIdAndDateRange(userId, start, end);
        } else {
            externalEvents = calendarEventRepository.findByUserId(userId);
        }

        for (CalendarEvent ce : externalEvents) {
            // De-duplicate if already represented as a TaskFlow task
            if (ce.getExternalEventId() != null && mappedExternalIds.contains(ce.getExternalEventId())) {
                continue;
            }

            String source = (ce.getCalendar() != null && ce.getCalendar().getConnection() != null)
                ? ce.getCalendar().getConnection().getProvider()
                : "EXTERNAL";

            unified.add(CalendarEventDto.builder()
                .id(ce.getId())
                .source(source)
                .type("CALENDAR_EVENT")
                .externalEventId(ce.getExternalEventId())
                .title(ce.getTitle())
                .description(ce.getDescription())
                .startAt(ce.getStartAt())
                .endAt(ce.getEndAt())
                .timezone(ce.getTimezone())
                .allDay(Boolean.TRUE.equals(ce.getAllDay()))
                .status(ce.getStatus())
                .meetingUrl(ce.getMeetingUrl())
                .location(ce.getLocation())
                .etag(ce.getEtag())
                .build());
        }

        // Sort by start date
        unified.sort(Comparator.comparing(CalendarEventDto::getStartAt));
        return unified;
    }

    private Instant parseDueDate(String dueStr) {
        if (dueStr == null || dueStr.trim().isEmpty()) return null;
        try {
            if ("Today".equalsIgnoreCase(dueStr)) {
                return LocalDate.now().atTime(17, 0).atZone(ZoneId.of("UTC")).toInstant();
            }
            if ("Tomorrow".equalsIgnoreCase(dueStr)) {
                return LocalDate.now().plusDays(1).atTime(17, 0).atZone(ZoneId.of("UTC")).toInstant();
            }
            LocalDate ld = LocalDate.parse(dueStr.trim());
            return ld.atTime(17, 0).atZone(ZoneId.of("UTC")).toInstant();
        } catch (Exception e) {
            return null;
        }
    }
}
