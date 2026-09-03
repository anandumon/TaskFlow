package com.taskflow.organization.dto;

import lombok.*;
import java.time.Instant;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class OrganizationResponse {
    private String id;
    private String name;
    private String slug;
    private String logoUrl;
    private String plan;
    private String ownerId;
    private Instant createdAt;
}
