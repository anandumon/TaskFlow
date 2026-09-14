package com.taskflow.project.dto;

import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProjectInvitationResponse {
    private UUID id;
    private UUID projectId;
    private UUID workspaceId;
    private UUID organizationId;
    private String email;
    private String projectName;
    private String workspaceName;
    private String orgName;
    private String inviterName;
    private String status;
    private String role;
    private String token;
    private String inviteUrl;
    private Instant expiresAt;
    private Instant createdAt;
}
