package com.taskflow.team.controller;

import com.taskflow.common.dto.ApiResponse;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.team.dto.*;
import com.taskflow.team.service.TeamService;
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
public class TeamController {

    private final TeamService teamService;

    @PostMapping("/api/v1/workspaces/{wsId}/teams")
    public ResponseEntity<ApiResponse<TeamResponse>> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID wsId,
            @Valid @RequestBody CreateTeamRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(teamService.create(wsId, principal.getId(), request)));
    }

    @GetMapping("/api/v1/workspaces/{wsId}/teams")
    public ResponseEntity<ApiResponse<List<TeamResponse>>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID wsId) {
        return ResponseEntity.ok(ApiResponse.success(teamService.listByWorkspace(wsId, principal.getId())));
    }

    @PatchMapping("/api/v1/teams/{teamId}")
    public ResponseEntity<ApiResponse<TeamResponse>> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID teamId,
            @Valid @RequestBody UpdateTeamRequest request) {
        return ResponseEntity.ok(ApiResponse.success(teamService.update(teamId, principal.getId(), request)));
    }

    @DeleteMapping("/api/v1/teams/{teamId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID teamId) {
        teamService.delete(teamId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/api/v1/teams/{teamId}/members")
    public ResponseEntity<ApiResponse<List<TeamMemberResponse>>> listMembers(@PathVariable UUID teamId) {
        return ResponseEntity.ok(ApiResponse.success(teamService.listMembers(teamId)));
    }

    @PostMapping("/api/v1/teams/{teamId}/members")
    public ResponseEntity<ApiResponse<Void>> addMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID teamId,
            @RequestBody AddTeamMemberRequest request) {
        teamService.addMember(teamId, principal.getId(), UUID.fromString(request.getUserId()));
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(null));
    }

    @DeleteMapping("/api/v1/teams/{teamId}/members/{userId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID teamId,
            @PathVariable UUID userId) {
        teamService.removeMember(teamId, principal.getId(), userId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Data
    public static class AddTeamMemberRequest {
        private String userId;
    }
}
