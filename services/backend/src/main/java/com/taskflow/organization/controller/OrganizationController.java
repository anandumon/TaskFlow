package com.taskflow.organization.controller;

import com.taskflow.common.dto.ApiResponse;
import com.taskflow.common.security.UserPrincipal;
import com.taskflow.organization.dto.*;
import com.taskflow.organization.service.OrganizationService;
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
@RequestMapping("/api/v1/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;

    @PostMapping
    public ResponseEntity<ApiResponse<OrganizationResponse>> create(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateOrganizationRequest request) {
        OrganizationResponse response = organizationService.create(principal.getId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<OrganizationResponse>>> list(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<OrganizationResponse> orgs = organizationService.listByUser(principal.getId());
        return ResponseEntity.ok(ApiResponse.success(orgs));
    }

    @GetMapping("/{orgId}")
    public ResponseEntity<ApiResponse<OrganizationResponse>> getById(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID orgId) {
        OrganizationResponse org = organizationService.getById(orgId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(org));
    }

    @PatchMapping("/{orgId}")
    public ResponseEntity<ApiResponse<OrganizationResponse>> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID orgId,
            @Valid @RequestBody UpdateOrganizationRequest request) {
        OrganizationResponse org = organizationService.update(orgId, principal.getId(), request);
        return ResponseEntity.ok(ApiResponse.success(org));
    }

    @DeleteMapping("/{orgId}")
    public ResponseEntity<ApiResponse<Void>> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID orgId) {
        organizationService.delete(orgId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @GetMapping("/{orgId}/members")
    public ResponseEntity<ApiResponse<List<MemberResponse>>> listMembers(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID orgId) {
        List<MemberResponse> members = organizationService.listMembers(orgId, principal.getId());
        return ResponseEntity.ok(ApiResponse.success(members));
    }

    @PostMapping("/{orgId}/members")
    public ResponseEntity<ApiResponse<MemberResponse>> addMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID orgId,
            @Valid @RequestBody AddMemberRequest request) {
        MemberResponse member = organizationService.addMember(
                orgId, principal.getId(), UUID.fromString(request.getUserId()),
                request.getRoleId() != null ? UUID.fromString(request.getRoleId()) : null);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.success(member));
    }

    @DeleteMapping("/{orgId}/members/{memberId}")
    public ResponseEntity<ApiResponse<Void>> removeMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID orgId,
            @PathVariable UUID memberId) {
        organizationService.removeMember(orgId, principal.getId(), memberId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @PatchMapping("/{orgId}/members/{memberId}")
    public ResponseEntity<ApiResponse<Void>> updateMemberRole(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID orgId,
            @PathVariable UUID memberId,
            @RequestBody UpdateRoleRequest request) {
        organizationService.updateMemberRole(orgId, principal.getId(), memberId,
                UUID.fromString(request.getRoleId()));
        return ResponseEntity.ok(ApiResponse.success(null));
    }

    @Data
    public static class AddMemberRequest {
        private String userId;
        private String roleId;
    }

    @Data
    public static class UpdateRoleRequest {
        private String roleId;
    }
}
