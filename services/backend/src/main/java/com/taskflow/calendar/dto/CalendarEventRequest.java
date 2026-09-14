package com.taskflow.calendar.dto;

import lombok.*;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CalendarEventRequest {
    private String title;
    private String description;
    private Instant startAt;
    private Instant endAt;
    private String timezone;
    private boolean allDay;
    private String location;
    private String colorId;
    private List<Integer> reminderMinutes;
    private String taskFlowTaskId;
    private String taskFlowProjectId;
}
