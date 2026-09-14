package com.taskflow.identity.dto;

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
public class InvitationResponse {

    private UUID id;
    private String email;
    private String scope;
    private UUID organizationId;
    private String organizationName;
    private UUID workspaceId;
    private String workspaceName;
    private UUID projectId;
    private String projectName;
    private UUID roleId;
    private String roleName;
    private String status;
    private Instant expiresAt;
    private Instant acceptedAt;
    private Instant createdAt;
    private String invitationUrl;
    private String token;

    public String getRole() {
        return roleName != null ? roleName : "Member";
    }

    public String getOrgName() {
        return organizationName != null ? organizationName : "";
    }
}
