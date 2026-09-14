package com.taskflow.project.controller;

import com.taskflow.common.dto.ApiResponse;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.project.dto.AcceptInvitationResponse;
import com.taskflow.project.dto.CreateProjectInvitationRequest;
import com.taskflow.project.dto.ProjectInvitationResponse;
import com.taskflow.project.service.ProjectInvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

// Deprecated in favor of unified com.taskflow.identity.controller.InvitationController
// @RestController
// @RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProjectInvitationController {

    private final ProjectInvitationService invitationService;

    @PostMapping("/projects/{projectId}/invitations")
    public ResponseEntity<ApiResponse<ProjectInvitationResponse>> createInvitation(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateProjectInvitationRequest request) {
        ProjectInvitationResponse response = invitationService.createInvitation(projectId, principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping("/projects/{projectId}/invitations")
    public ResponseEntity<ApiResponse<List<ProjectInvitationResponse>>> listInvitations(
            @PathVariable UUID projectId) {
        List<ProjectInvitationResponse> responses = invitationService.listInvitationsForProject(projectId);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/organizations/{orgId}/invitations")
    public ResponseEntity<ApiResponse<List<ProjectInvitationResponse>>> listOrganizationInvitations(
            @PathVariable UUID orgId) {
        List<ProjectInvitationResponse> responses = invitationService.listInvitationsForOrganization(orgId);
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/invitations/pending-for-me")
    public ResponseEntity<ApiResponse<List<ProjectInvitationResponse>>> listPendingInvitationsForMe(
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null || principal.getEmail() == null) {
            return ResponseEntity.ok(ApiResponse.success(List.of()));
        }
        List<ProjectInvitationResponse> responses = invitationService.listPendingInvitationsForUser(principal.getEmail());
        return ResponseEntity.ok(ApiResponse.success(responses));
    }

    @GetMapping("/invitations/{token}")
    public ResponseEntity<ApiResponse<ProjectInvitationResponse>> getInvitation(
            @PathVariable String token) {
        ProjectInvitationResponse response = invitationService.getInvitationByToken(token);
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/invitations/{token}/accept")
    public ResponseEntity<ApiResponse<AcceptInvitationResponse>> acceptInvitation(
            @PathVariable String token,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        AcceptInvitationResponse response = invitationService.acceptInvitation(token, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(response));
    }

    @PostMapping("/invitations/{token}/decline")
    public ResponseEntity<ApiResponse<Void>> declineInvitation(
            @PathVariable String token,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        invitationService.declineInvitation(token, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
