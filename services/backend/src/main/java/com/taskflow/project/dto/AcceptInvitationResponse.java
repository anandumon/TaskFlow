package com.taskflow.project.dto;

import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AcceptInvitationResponse {
    private UUID organizationId;
    private UUID workspaceId;
    private UUID projectId;
    private String organizationName;
    private String workspaceName;
    private String projectName;
    private String message;
}
