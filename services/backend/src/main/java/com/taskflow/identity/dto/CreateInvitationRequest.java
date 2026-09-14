package com.taskflow.identity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateInvitationRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Valid email is required")
    private String email;

    private String scope;

    private UUID organizationId;
    private UUID workspaceId;
    private UUID projectId;
    private UUID roleId;
    private String roleName;

    public void setRole(String role) {
        this.roleName = role;
    }
}
