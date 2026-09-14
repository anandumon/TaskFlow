package com.taskflow.calendar.dto;

import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarSyncResult {
    private boolean success;
    private int createdCount;
    private int updatedCount;
    private int deletedCount;
    private String nextSyncToken;
    private String nextDeltaLink;
    private String errorMessage;
    private List<CalendarEventDto> events;
}
