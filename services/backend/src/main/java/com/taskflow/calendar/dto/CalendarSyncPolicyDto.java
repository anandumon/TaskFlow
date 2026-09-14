package com.taskflow.calendar.dto;

import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarSyncPolicyDto {
    private UUID id;
    private UUID workspaceId;
    private UUID calendarConnectionId;
    private String externalCalendarId;
    private boolean syncTasks;
    private boolean syncProjects;
    private boolean syncDeadlines;
    private boolean syncReminders;
    private boolean importExternalEvents;
    private boolean exportTaskflowEvents;
    private int defaultTaskDurationMinutes;
    private int defaultReminderMinutes;
    private boolean deleteExternalOnTaskDelete;
}
