package com.taskflow.identity.controller;

import com.taskflow.common.dto.ApiResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.identity.dto.CreateInvitationRequest;
import com.taskflow.identity.dto.InvitationResponse;
import com.taskflow.identity.service.InvitationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Invitations", description = "Multi-tenant scoped invitations API")
public class InvitationController {

    private final InvitationService invitationService;

    @PostMapping("/invitations")
    @Operation(summary = "Create invitation (ORGANIZATION, WORKSPACE, or PROJECT scope)")
    public ResponseEntity<ApiResponse<InvitationResponse>> createInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateInvitationRequest request
    ) {
        InvitationResponse response = invitationService.createInvitation(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping("/organizations/{organizationId}/invitations")
    @Operation(summary = "Invite user to organization")
    public ResponseEntity<ApiResponse<InvitationResponse>> createOrgInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID organizationId,
            @Valid @RequestBody CreateInvitationRequest request
    ) {
        request.setScope("ORGANIZATION");
        request.setOrganizationId(organizationId);
        InvitationResponse response = invitationService.createInvitation(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping("/workspaces/{workspaceId}/invitations")
    @Operation(summary = "Invite user to workspace")
    public ResponseEntity<ApiResponse<InvitationResponse>> createWorkspaceInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID workspaceId,
            @Valid @RequestBody CreateInvitationRequest request
    ) {
        request.setScope("WORKSPACE");
        request.setWorkspaceId(workspaceId);
        InvitationResponse response = invitationService.createInvitation(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @PostMapping("/projects/{projectId}/invitations")
    @Operation(summary = "Invite user to project")
    public ResponseEntity<ApiResponse<InvitationResponse>> createProjectInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateInvitationRequest request
    ) {
        request.setScope("PROJECT");
        request.setProjectId(projectId);
        InvitationResponse response = invitationService.createInvitation(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/invitations")
    @Operation(summary = "Get pending invitations for current user")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getPendingInvitations(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        if (principal == null || principal.getEmail() == null) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        List<InvitationResponse> list = invitationService.getPendingInvitationsForUser(principal.getEmail());
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/invitations/pending-for-me")
    @Operation(summary = "Get pending invitations for current user (compatibility alias)")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getPendingInvitationsForMe(
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        return getPendingInvitations(principal);
    }

    @GetMapping("/invitations/{token}")
    @Operation(summary = "Get public invitation details by token")
    public ResponseEntity<ApiResponse<InvitationResponse>> getInvitationByToken(
            @PathVariable String token
    ) {
        InvitationResponse response = invitationService.getInvitationByToken(token);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @GetMapping("/projects/{projectId}/invitations")
    @Operation(summary = "List pending invitations for a project")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getProjectInvitations(
            @PathVariable UUID projectId
    ) {
        List<InvitationResponse> list = invitationService.getInvitationsForResource("PROJECT", projectId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/organizations/{organizationId}/invitations")
    @Operation(summary = "List pending invitations for an organization")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getOrganizationInvitations(
            @PathVariable UUID organizationId
    ) {
        List<InvitationResponse> list = invitationService.getInvitationsForResource("ORGANIZATION", organizationId);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @PostMapping("/invitations/{identifier}/accept")
    @Operation(summary = "Accept invitation by token or ID")
    public ResponseEntity<ApiResponse<InvitationResponse>> acceptInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String identifier
    ) {
        UUID id = null;
        String token = null;
        try {
            id = UUID.fromString(identifier);
        } catch (IllegalArgumentException e) {
            token = identifier;
        }
        InvitationResponse response = invitationService.acceptInvitation(principal.getId(), token, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/invitations/accept")
    @Operation(summary = "Accept invitation by token in JSON body")
    public ResponseEntity<ApiResponse<InvitationResponse>> acceptInvitationByBody(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody Map<String, String> body
    ) {
        String token = body.get("token");
        String idStr = body.get("id");
        UUID id = (idStr != null && !idStr.isBlank()) ? UUID.fromString(idStr) : null;
        InvitationResponse response = invitationService.acceptInvitation(principal.getId(), token, id);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/invitations/{identifier}/decline")
    @Operation(summary = "Decline invitation by token or ID")
    public ResponseEntity<ApiResponse<Map<String, String>>> declineInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable String identifier
    ) {
        try {
            UUID id = UUID.fromString(identifier);
            invitationService.declineInvitation(principal.getId(), id);
        } catch (IllegalArgumentException e) {
            invitationService.declineInvitationByToken(principal.getId(), identifier);
        }
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Invitation declined")));
    }

    @DeleteMapping("/invitations/{invitationId}")
    @Operation(summary = "Revoke invitation")
    public ResponseEntity<ApiResponse<Map<String, String>>> revokeInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID invitationId
    ) {
        invitationService.revokeInvitation(principal.getId(), invitationId);
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Invitation revoked")));
    }
}
