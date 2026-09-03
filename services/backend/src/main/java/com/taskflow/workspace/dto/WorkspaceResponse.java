package com.taskflow.workspace.dto;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class WorkspaceResponse {
    private String id;
    private String organizationId;
    private String name;
    private String slug;
    private String description;
    private String color;
    private String icon;
    private Instant createdAt;
}
