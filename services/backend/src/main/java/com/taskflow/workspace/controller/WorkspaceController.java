package com.taskflow.workspace.controller;

import com.taskflow.common.dto.ApiResponse;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.workspace.dto.*;
import com.taskflow.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @PostMapping("/api/v1/organizations/{orgId}/workspaces")
    public ResponseEntity<ApiResponse<WorkspaceResponse>> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID orgId,
            @Valid @RequestBody CreateWorkspaceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(workspaceService.create(orgId, principal.getId(), request)));
    }

    @GetMapping("/api/v1/organizations/{orgId}/workspaces")
    public ResponseEntity<ApiResponse<List<WorkspaceResponse>>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID orgId) {
        return ResponseEntity.ok(ApiResponse.success(workspaceService.listByOrg(orgId, principal.getId())));
    }

    @GetMapping("/api/v1/workspaces/{wsId}")
    public ResponseEntity<ApiResponse<WorkspaceResponse>> get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID wsId) {
        return ResponseEntity.ok(ApiResponse.success(workspaceService.getById(wsId, principal.getId())));
    }

    @PatchMapping("/api/v1/workspaces/{wsId}")
    public ResponseEntity<ApiResponse<WorkspaceResponse>> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID wsId,
            @Valid @RequestBody UpdateWorkspaceRequest request) {
        return ResponseEntity.ok(ApiResponse.success(workspaceService.update(wsId, principal.getId(), request)));
    }

    @DeleteMapping("/api/v1/workspaces/{wsId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID wsId) {
        workspaceService.delete(wsId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/api/v1/workspaces/{wsId}/members")
    public ResponseEntity<ApiResponse<List<WorkspaceMemberResponse>>> listMembers(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID wsId) {
        return ResponseEntity.ok(ApiResponse.success(workspaceService.listMembers(wsId, principal.getId())));
    }

    @PostMapping("/api/v1/workspaces/{wsId}/members")
    public ResponseEntity<ApiResponse<Void>> addMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID wsId,
            @RequestBody AddWsMemberRequest request) {
        workspaceService.addMember(wsId, principal.getId(),
                UUID.fromString(request.getUserId()),
                request.getRoleId() != null ? UUID.fromString(request.getRoleId()) : null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(null));
    }

    @DeleteMapping("/api/v1/workspaces/{wsId}/members/{memberId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID wsId,
            @PathVariable UUID memberId) {
        workspaceService.removeMember(wsId, principal.getId(), memberId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Data
    public static class AddWsMemberRequest {
        private String userId;
        private String roleId;
    }
}
