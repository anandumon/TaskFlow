package com.taskflow.team.dto;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class TeamResponse {
    private String id;
    private String workspaceId;
    private String name;
    private String description;
    private String color;
    private String icon;
    private long memberCount;
    private Instant createdAt;
}
