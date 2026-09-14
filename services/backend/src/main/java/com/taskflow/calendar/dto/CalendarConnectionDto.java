package com.taskflow.calendar.dto;

import lombok.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarConnectionDto {
    private UUID id;
    private String provider; // 'GOOGLE', 'MICROSOFT'
    private String providerAccountId;
    private String providerEmail;
    private String status; // 'CONNECTED', 'SYNCING', 'REAUTH_REQUIRED', 'DISCONNECTED', 'ERROR'
    private Instant lastSuccessfulSyncAt;
    private Instant lastSyncStartedAt;
    private String lastSyncError;
    private List<ExternalCalendarDto> calendars;
    private String defaultCalendarId;
}
