package com.taskflow.calendar.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarEventDto {
    private UUID id;
    private String source; // 'TASKFLOW', 'GOOGLE', 'MICROSOFT'
    private String type;   // 'TASK', 'PROJECT_START', 'PROJECT_DEADLINE', 'CALENDAR_EVENT'
    private String externalEventId;
    private String title;
    private String description;
    private Instant startAt;
    private Instant endAt;
    private String timezone;
    private boolean allDay;
    private String status;
    private String meetingUrl;
    private String location;
    private String etag;
}
