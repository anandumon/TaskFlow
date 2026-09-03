package com.taskflow.project.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {
    private UUID id;
    private UUID workspaceId;
    private String name;
    private String slug;
    private String description;
    private String status;
    private Integer progress;
    private String color;
    private String icon;
    private String environments;
    private Long totalTasks;
    private Long completedTasks;
    private Instant createdAt;
    private Instant updatedAt;
}
