package com.taskflow.calendar.dto;

import lombok.*;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExternalCalendarDto {
    private UUID id;
    private String externalCalendarId;
    private String name;
    private String description;
    private String timezone;
    private boolean isPrimary;
    private boolean canRead;
    private boolean canWrite;
    private boolean syncEnabled;
}
